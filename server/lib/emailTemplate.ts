import { SubscriptionTier } from '@prisma/client';
import { planNamesMap } from './constant';

export const errorTemplete = (error: any) => {
  return `
  <p>Hey</p>
  <p>An error occurred during a credit purchase process where the user could not be found by the associated email.</p>
  <p>Error Details:</p>
  <b>${error}</b>

  <p>Please investigate this issue promptly to ensure no disruption in the user's experience.</p>
  <p>Best Regards,</p>
  <p>The Omniflow Team</p>`;
};

export const welcomeEmail = (UserName: string) => {
  return `<p>Hey ${UserName},</p>
  <p>Welcome to Omniflow! We're thrilled to have you on board.</p>
  <p>We started Omniflow to help teams to automate their entire product development lifecycle. We believe you'll love what you can accomplish with us.</p>
  <p>If you need help getting started, feel free to contact us at <a href="mailto:support@Omniflow.team">support@Omniflow.team</a>. You may also join our <a href="https://bit.ly/3B88K2g">Slack Community</a> if you need anything.</p>

  <p>Best Regards,</p>
  <p>The Omniflow Team</p>`;
};

export const postProjectCreation = (UserName: string, projectName: string) => {
  return `<p>Hey ${UserName},</p>
  <p>Congratulations on creating your first project "${projectName}" in Omniflow! We hope the process went smoothly.</p>
  <p>We'd love to hear about your experience. How did we do? Please share your feedback with us at <a href="mailto:support@Omniflow.team">support@Omniflow.team</a>.</p>
  <p>Your thoughts help us make our service better for everyone. You may also join our slack group to be part of <a href="https://bit.ly/3B88K2g">our community</a>.</p>
  <p>Thanks again for choosing Omniflow!</p>
  
  <p>Best Regards,</p>
  <p>The Omniflow Team</p>`;
};

export const subscriptionExpirationEmail = (
  userName: string,
  organizationName: string | null,
  expirationDate: string | null
) => {
  return `<p>Hey ${userName},</p>
  <p> We wanted to remind you that your subscription with ${organizationName} is set to expire on <strong>${expirationDate}</strong>.</p>
  <p> To avoid any interruption in service, please renew your subscription at your earliest convenience. You may do that in the Billing Page (Clicking on your Profile Picture, then Billing).</p>
  <p> If you have any questions or need assistance, feel free to reach out to us at <a href="mailto:support@Omniflow.team">support@Omniflow.team</a>.</p>

  <p> Thank you for being a valued member of our community!</p>
  <p> Best Regards,</p>
  <p>The Omniflow Team</p>`;
};

export const reminderEmail = (UserName: string) => {
  return `<p>Hey ${UserName},</p>
  <p>It's been a week since you signed up for Omniflow, and we noticed you haven't had the chance to start yet. No worries – we're here to help you get the most out of Omniflow.</p>
  <p> Our users usually start by Adding a Project, or Creating a Document. Our AI agents will help you complete days of work in minutes.</p>
  <p>If you have any questions or need assistance, feel free to reach out to us at <a href="mailto:support@Omniflow.team">support@Omniflow.team</a> or join our <a href="https://bit.ly/3B88K2g">Slack Community</a>.</p> 
  <p>Looking forward to seeing what you'll create!</p>

  <p>Best Regards,</p>
  <p>The Omniflow Team</p>`;
};

export const accountUpgradeDowngrade = (
  UserName: string,
  plan: SubscriptionTier,
  isUpgrade: boolean
) => {
  return `<p>Hey ${UserName},</p>
  <p>Your account has been successfully ${
    isUpgrade ? 'upgraded' : 'downgraded'
  } to the ${planNamesMap[plan]}.</p>
  <p>If you have any questions about your new plan or need help with your account, feel free to reach out to us at <a href="mailto:support@Omniflow.team">support@Omniflow.team</a>. You may also join our <a href="https://bit.ly/3B88K2g">Slack Community</a> to ask questions and get early access to product updates.</p>

  <p>Best Regards</p>
  <p>The Omniflow Team</p>`;
};

export const accountCancellation = (
  UserName: string | undefined,
  endDate: string | undefined
) => {
  return `<p>Hey ${UserName},</p>
  <p>We're sorry to see you go! Your subscription with Omniflow has been successfully canceled.</p>
  <p>Your subscription will remain active till ${endDate}.</p>
  <p>If there's anything we could have done to make your experience better, we'd love to hear your feedback. Please feel free to email us at <a href="mailto:support@Omniflow.team">support@Omniflow.team</a>.</p>
  <p>If you ever decide to come back, we'll be thrilled to have you.</p>
  <p>Thank you for giving us a try.</p>

  <p>Best Regards</p>
  <p>The Omniflow Team</p>`;
};

export const creditsRefill = (UserName: string) => {
  return `<p>Hey ${UserName},</p> 
  <p>Great news! Your Omniflow credits have been successfully refilled.</p>
  <p>Please go back to the Omniflow app and continue to experience the magic of it.</p>
  <p>If you have any questions, don't hesitate to reach out to us at <a href="mailto:support@Omniflow.team">support@Omniflow.team</a>.  You may also join our <a href="https://bit.ly/3B88K2g">Slack Community</a> if you need anything.</p>

  <p>Best Regards</p>
  <p>The Omniflow Team</p>`;
};

export const newUserSignup = (email: string) => {
  return `${email} has just signed up for omniflow.`;
};
