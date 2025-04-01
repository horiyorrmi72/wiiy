import Stripe from 'stripe';
import { Router } from 'express';
import express from 'express';

import { StandardResponse } from '../../types/response';
import {
  handleCreditPurchasePaymentSuccess,
  handleInvoicePaymentSuccess,
  handleSubscriptionCanceling,
} from '../../services/subscriptionService';
import {
  CreditPurchasePaymentData,
  InvoicePaymentData,
  SubscriptionCancelData,
  SubscriptionProductItem,
} from '../../types/subscriptionTypes';
import { getSeatNumberForTier, getTierFromPrice } from '../../lib/util';
import mixpanel from '../../services/trackingService';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_KEY as string);

router.post(
  '/',
  express.raw({ type: 'application/json' }),
  async function (request, response: StandardResponse<string>) {
    const sig = request.headers['stripe-signature'];
    console.log('in services.routes.webhook:', sig, request.body);

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        sig as string,
        process.env.STRIPE_ENDPOINT_SECRET as string
      );
    } catch (err: any) {
      console.error("Error in webhook's stripe event:", err);
      response.status(400).json({
        success: false,
        errorMsg: `Webhook Error: ${err as string | Error}.toString()`,
      });
      return;
    }

    let subscription;
    // Handle the event
    switch (event.type) {
      // handle subscription payment success
      case 'invoice.paid':
        subscription = event.data.object;
        console.log(`strip invoice.paid for ${JSON.stringify(subscription)}.`);
        const invoicePaymentData = {
          evtId: event.id,
          invoiceId: subscription.id,
          amountPaid: subscription.amount_paid,
          amountDue: subscription.amount_due,
          currency: subscription.currency,
          customerEmail: subscription.customer_email,
          customerName: subscription.customer_name,
          stripeCustomerId: subscription.customer as string,
          invoiceUrl: subscription.invoice_pdf,
          subscriptionId: subscription.lines.data[0].subscription as string,
          discount: {
            id: subscription.discount?.id as string,
            name: subscription.discount?.coupon?.name as string,
            percent_off: subscription.discount?.coupon?.percent_off as number,
          },
          productInfo: {
            amount: subscription.amount_paid,
            amountExcludingTax: subscription.amount_paid,
            tier: getTierFromPrice(
              subscription.lines.data[0].description as string
            ),
            description: subscription.lines.data[0].description,
            interval: subscription.lines.data[0].plan?.interval,
            period: {
              end: subscription.lines.data[0].period.end,
              start: subscription.lines.data[0].period.start,
            },
            seats: getSeatNumberForTier(subscription.lines.data),
          } as SubscriptionProductItem,
          status: subscription.status,
        } as InvoicePaymentData;
        handleInvoicePaymentSuccess(invoicePaymentData);
        // track event
        mixpanel.track('Plan Purchased', {
          distinct_id: subscription.customer_email,
          planType: subscription.lines.data[0].description,
        });
        break;
      case 'charge.updated':
        console.log(`strip charge.updated for ${JSON.stringify(event)}.`);
        const {
          id,
          object,
          paid,
          currency,
          refunded,
          status,
          billing_details,
          amount,
          receipt_url,
        } = event.data.object;
        if (
          object === 'charge' &&
          paid &&
          !refunded &&
          status === 'succeeded'
        ) {
          console.log(
            `strip charge.updated for ${JSON.stringify(billing_details)}.`
          );
          let paymentData = {
            id,
            amount,
            currency,
            paymentMethod: 'card',
            customerEmail: billing_details.email,
            customerName: billing_details.name,
            receiptUrl: receipt_url,
            status: status,
          } as CreditPurchasePaymentData;
          handleCreditPurchasePaymentSuccess(paymentData);
          // track event
          mixpanel.track('Credit Purchased', {
            distinct_id: billing_details.email,
            amount: amount,
          });
        }
        break;
      case 'customer.subscription.deleted':
        subscription = event.data.object;
        console.log(
          `strip invoice.upcoming for ${JSON.stringify(subscription)}.`
        );

        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        );

        const subscriptionCancelData: SubscriptionCancelData = {
          stripeCustomerId: subscription.customer as string,
          canceledDate: subscription.canceled_at as number,
          currentUser: customer,
          eventId: event.id,
        };
        handleSubscriptionCanceling(subscriptionCancelData);
        break;
      default:
        // Unexpected event type
        console.log(
          `strip unhandled event type ${event.type}: ${JSON.stringify(
            event.data.object
          )}`
        );
        break;
    }

    // Return a 200 response to acknowledge receipt of the event
    response.status(200).json({
      success: true,
      data: `Webhook received and processed: ${event.id}`,
    });
  }
);

export const className = 'stripe';
export const routes = router;
