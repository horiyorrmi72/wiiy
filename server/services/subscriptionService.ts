import { SubscriptionCancelData } from './../types/subscriptionTypes';
import { Prisma, SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import prisma from '../db/prisma';
import { sendEmail } from './emailService';
import {
  CreditPurchasePaymentData,
  InvoicePaymentData,
} from '../types/subscriptionTypes';
import dayjs from 'dayjs';
import { getCreditAmount, getCreditsForSubscription } from '../lib/util';
import { CREDITS_ACTIONS, PAYMENT_TYPES } from '../lib/constant';
import {
  accountCancellation,
  accountUpgradeDowngrade,
  creditsRefill,
  errorTemplete,
} from '../lib/emailTemplate';

export async function handleInvoicePaymentSuccess(data: InvoicePaymentData) {
  let user;
  let userError;
  try {
    user = await prisma.user.findUnique({
      where: { email: data.customerEmail },
      include: { organization: true },
    });
  } catch (error) {
    userError = error;
  }
  if (!user || userError) {
    console.error(
      'in services.subscriptionService.handleInvoicePaymentSuccess: user not found for email:',
      data.customerEmail
    );
    await sendEmail({
      email: 'support@omniflow.team',
      subject: 'P0 - User not found for email after invoice.paid',
      body: errorTemplete(JSON.stringify(userError)),
    });
    return;
  }

  const { evtId, customerEmail, status } = data;
  const txn = await prisma.payment.findFirst({
    where: { eventId: evtId, status },
  });
  if (txn) {
    console.log(
      `Invoice.paid event already processed: ${evtId} for ${customerEmail}`
    );
    return;
  }

  let paymentTxn;
  try {
    const currentPlanLevel = Object.values(SubscriptionTier).indexOf(
      data.productInfo.tier as SubscriptionTier
    );
    const oldPlanLevel = Object.values(SubscriptionTier).indexOf(
      user.subscriptionTier as any
    );
    const isUpgrade = currentPlanLevel > oldPlanLevel;

    paymentTxn = await prisma.payment.create({
      data: {
        payerUserId: user.id,
        email: data.customerEmail,
        subscriptionTier: data.productInfo.tier as SubscriptionTier,
        organizationId: user.organizationId,
        seats: data.productInfo.seats,
        amount: data.amountPaid,
        currency: data.currency,
        invoiceId: data.invoiceId,
        invoiceUrl: data.invoiceUrl,
        status: data.status,
        type: PAYMENT_TYPES.SUBSCRIPTION_START,
        eventId: data.evtId,
        meta: {
          interval: data.productInfo.interval,
          amountDue: data.amountDue,
          startAt: data.productInfo.period.start,
          endAt: data.productInfo.period.end,
          stripeCustomerId: data.stripeCustomerId,
          subscriptionId: data.subscriptionId,
          discount: data.discount,
        },
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionTier: data.productInfo.tier as SubscriptionTier,
      },
    });

    const credits = getCreditsForSubscription(
      data.productInfo.tier,
      data.productInfo.interval
    );
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        subscriptionTier: data.productInfo.tier as SubscriptionTier,
        subscriptionStatus: data.amountPaid
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.TRIAL,
        subscriptionInterval: data.productInfo.interval,
        subscriptionStart: new Date(data.productInfo.period.start * 1000),
        subscriptionEnd: new Date(data.productInfo.period.end * 1000),
        totalSeats: data.productInfo.seats,
        availableSeats: data.productInfo.seats - 1,
        stripeCustomerId: data.stripeCustomerId,
        credits: { increment: credits },
        meta: {
          ...(user.organization.meta as Prisma.JsonObject),
          subscriptionId: data.subscriptionId,
          lastPayment: {
            amount: data.amountPaid,
            currency: data.currency,
            invoiceUrl: data.invoiceUrl,
            status: data.status,
            evtId: data.evtId,
            userId: user.id,
          },
        },
      },
    });

    await prisma.creditAction.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        action: CREDITS_ACTIONS.SUBSCRIPTION_ADD,
        amount: credits,
        status: 'success',
        meta: {
          evtId: data.evtId,
          paymentId: paymentTxn.id,
          amount: data.amountPaid,
        },
      },
    });

    const emailSubject = isUpgrade
      ? 'Account Upgrade Successful'
      : 'Account Downgrade Successful';

    await sendEmail({
      email: user.email,
      subject: emailSubject,
      body: accountUpgradeDowngrade(
        `${user.firstname.trim() ? user.firstname : user.username}`,
        data.productInfo.tier as SubscriptionTier,
        isUpgrade
      ),
    });
  } catch (error) {
    console.error('Error in handleInvoicePaymentSuccess:', error);
    await sendEmail({
      email: 'support@omniflow.team',
      subject: `P0: Error in handleInvoicePaymentSuccess: ${error}`,
      body: errorTemplete(JSON.stringify(data)),
    });
  }
}

export async function handleCreditPurchasePaymentSuccess(
  data: CreditPurchasePaymentData
) {
  const { id, customerEmail, amount, currency, receiptUrl, status } = data;
  // TODO - move evtId to a separate field and add index for it
  // first check if the event is already processed
  const txn = await prisma.payment.findFirst({
    where: { eventId: id, status },
  });
  if (txn) {
    console.log(
      `Credit purchase payment event already processed: ${id} for ${customerEmail}`
    );
    return;
  }
  let user;
  let userError;
  try {
    user = await prisma.user.findUnique({
      where: { email: customerEmail },
      include: { organization: true },
    });
  } catch (error) {
    userError = error;
  }
  if (!user || userError) {
    console.error(
      'in services.subscriptionService.handleCreditPurchasePaymentSuccess: user not found for email:',
      customerEmail
    );
    await sendEmail({
      email: customerEmail,
      subject: 'P0 - User not found for email after credit purchase',
      body: errorTemplete(JSON.stringify(userError)),
    });
    return;
  }

  let paymentTxn;
  try {
    // First: insert payment info into Payment table
    paymentTxn = await prisma.payment.create({
      data: {
        payerUserId: user.id,
        email: customerEmail,
        subscriptionTier: user.subscriptionTier as SubscriptionTier,
        organizationId: user.organizationId,
        amount,
        currency,
        invoiceId: '',
        invoiceUrl: receiptUrl,
        status,
        type: PAYMENT_TYPES.CREDIT_PURCHASE,
        eventId: id,
      },
    });

    // second: add credits to the organization
    let credits = getCreditAmount(amount);
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        credits: { increment: credits },
        meta: {
          ...(user.organization.meta as Prisma.JsonObject),
          lastPayment: {
            amount,
            currency,
            invoiceUrl: receiptUrl,
            status,
            evtId: id,
            userId: user.id,
          },
        },
      },
    });

    // third: insert credit history
    await prisma.creditAction.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        action: CREDITS_ACTIONS.CREDIT_PURCHASE,
        amount: credits || 0,
        status: 'success',
        meta: {
          evtId: id,
          amount,
        },
      },
    });

    await sendEmail({
      email: user.email,
      subject: 'Congrats! Your Omniflow credits have been refilled.',
      body: creditsRefill(
        `${user.firstname.trim() ? user.firstname : user.username}`
      ),
    });
  } catch (error) {
    console.error('Error in handleCreditPurchasePaymentSuccess:', error);
    await sendEmail({
      email: 'support@omniflow.team',
      subject: `P0: Error in handleCreditPurchasePaymentSuccess: ${error}`,
      body: errorTemplete(JSON.stringify(data)),
    });
  }
}

export async function handleSubscriptionCanceling(
  data: SubscriptionCancelData
) {
  const { stripeCustomerId, canceledDate, eventId, currentUser } = data;
  let user;
  let org;
  let orgError;
  try {
    user = await prisma.user.findUnique({
      where: { id: currentUser.email },
    });
    org = await prisma.organization.findUnique({
      where: { stripeCustomerId },
    });
  } catch (error) {
    orgError = error;
  }
  if (!org || orgError) {
    console.error(
      'in services.subscriptionService.handleSubscriptionCanceling: org not found for stripeCustomerId:',
      stripeCustomerId
    );
    await sendEmail({
      email: 'support@omniflow.team',
      subject: 'P0 - Org not found for email after subscription canceled',
      body: errorTemplete(JSON.stringify(orgError)),
    });
    return;
  }

  try {
    let isSubscriptionOverDue = dayjs(canceledDate * 1000).isAfter(
      org.subscriptionEnd
    );
    // First: update organization subscription info
    let orgMeta = org.meta as Prisma.JsonObject;
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        subscriptionStatus: isSubscriptionOverDue
          ? SubscriptionStatus.CANCELED
          : SubscriptionStatus.CANCELED_YET_ACTIVE,
        meta: {
          ...orgMeta,
          canceledDate,
          canceledEventId: eventId,
        },
      },
    });
    // second: disable all users in the organization
    await prisma.user.updateMany({
      where: { organizationId: org.id },
      data: {
        subscriptionStatus: isSubscriptionOverDue
          ? SubscriptionStatus.CANCELED
          : SubscriptionStatus.CANCELED_YET_ACTIVE,
      },
    });

    if (user) {
      await sendEmail({
        email: user.email,
        subject: 'Your subscription has been cancelled',
        body: accountCancellation(
          `${user.firstname.trim() ? user.firstname : user.username}`,
          new Date().toDateString()
        ),
      });
    }
  } catch (error) {
    console.error(
      'in services.subscriptionService.handleSubscriptionCanceling.error:',
      stripeCustomerId,
      error
    );

    await sendEmail({
      email: 'support@omniflow.team',
      subject: 'P0 - Org handleSubscriptionCanceling failure',
      body: errorTemplete(JSON.stringify(error)),
    });
  }
}
