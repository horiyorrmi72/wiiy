import { Request } from 'express';
import { ProfileResponse } from '../../types/response';
import { userProfileRequestHandler } from '../../lib/util';
import { UserProfile } from '../types/userTypes';
import Stripe from 'stripe';
import prisma from '../../db/prisma';
import { Prisma } from '@prisma/client';
import { sendEmail } from '../../services/emailService';
import { accountCancellation } from '../../lib/emailTemplate';

const router = require('express').Router();
router.use(userProfileRequestHandler);

// Initialize the Stripe client with your secret key
const stripe = new Stripe(process.env.STRIPE_KEY as string, {
  apiVersion: '2024-06-20', // Ensure to use the latest API version
});

router.post(
  '/cancel',
  async function (req: Request, res: ProfileResponse<Partial<UserProfile>>) {
    const currentUser = res.locals.currentUser;
    console.log(
      'in server.routes.api.subscriptions.cancel.start:',
      currentUser?.organizationId
    );

    let result;
    try {
      // first: find org
      let org = await prisma.organization.findUnique({
        where: { id: currentUser.organizationId },
      });
      if (!org) {
        throw new Error(
          `Organization not found for user ${currentUser.userId}, org ${currentUser.organizationId}`
        );
      }
      let orgMeta = org.meta as Prisma.JsonObject;
      if (!orgMeta?.subscriptionId) {
        throw new Error(`Subscription not found for org ${org.id}`);
      }
      // Cancel the subscription
      const canceledSubscription = await stripe.subscriptions.cancel(
        orgMeta.subscriptionId as string
      );

      // Log the result
      console.log(
        'in server.routes.api.subscriptions.cancel.success:',
        `user ${currentUser.userId}, org ${org.id} canceled successfully.`
      );

      await sendEmail({
        email: currentUser.email,
        subject: 'Your subscription has been cancelled',
        body: accountCancellation(
          currentUser.firstname?.trim()
            ? currentUser.firstname
            : currentUser.userName,
          new Date().toDateString()
        ),
      });
      res.status(201).json({ success: true, data: currentUser });
    } catch (err) {
      console.error('in server.api.subscriptions.cancel.failure:', err);
      res.status(500).json({
        success: false,
        errorMsg: JSON.stringify(err),
      });
    }
  }
);

module.exports = {
  className: 'subscriptions',
  routes: router,
};
