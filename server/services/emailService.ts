import { SubscriptionStatus } from '@prisma/client';
import prisma from '../db/prisma';
import {
  reminderEmail,
  subscriptionExpirationEmail,
} from '../lib/emailTemplate';

type sendEmailProps = {
  email: string;
  subject: string;
  body: string;
};
const adminId = process.env.INTERCOM_ADMIN_ID;
const accessToken = process.env.INTERCOM_API_TOKEN;

// Function to send email
const createContact = async (email: string) => {
  try {
    const response = await fetch(`https://api.intercom.io/contacts/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Intercom-Version': '2.11',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query: {
          operator: 'AND',
          value: [
            {
              field: 'email',
              operator: '=',
              value: email,
            },
          ],
        },
      }),
    }).then((response) => response.json());

    const isExisting =
      response.data && response.data.length > 0 ? response?.data[0] : null;

    if (isExisting) {
      return isExisting;
    } else {
      return await fetch(`https://api.intercom.io/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Intercom-Version': '2.11',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email,
        }),
      }).then((resp) => resp.json());
    }
  } catch (error) {
    console.error('Error creating contact:', error);
  }
};

export async function sendEmail({ email, subject, body }: sendEmailProps) {
  try {
    const contact = await createContact(email);
    if (contact) {
      const resp = await fetch('https://api.intercom.io/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_type: 'email',
          subject,
          body: body,
          from: {
            type: 'admin',
            id: adminId,
          },
          to: {
            type: 'contact',
            id: contact.id,
          },
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        return {
          success: false,
          errorMsg: 'Error sending email',
        };
      }

      return {
        success: true,
        data,
      };
    } else {
      return {
        success: false,
        errorMsg: 'No contact found or error creating contact',
      };
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Subscription end reminder
async function notifyUsersOfExpiringSubscriptions({
  gte,
  lt,
}: {
  gte: Date;
  lt: Date;
}) {
  const organizations = await prisma.organization.findMany({
    where: {
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionEnd: {
        gte,
        lt,
      },
    },
  });

  for (const org of organizations) {
    const users = await prisma.user.findMany({
      where: {
        organizationId: org.id,
      },
    });

    for (const user of users) {
      if (user?.email) {
        await sendEmail({
          email: user.email,
          subject: `Subscription Expiration Reminder for Omniflow`,
          body: subscriptionExpirationEmail(
            user.firstname.trim() ? user.firstname : user.username,
            org?.name,
            new Date(org.subscriptionEnd as Date).toDateString()
          ),
        });
      }
    }
  }
}

// Users created a week ago
async function checkUserAction() {
  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        lt: new Date(new Date().setDate(new Date().getDate() - 6)),
      },
      AND: [
        { ownedProjects: { none: {} } }, // No owned projects
        { createdDocuments: { none: {} } }, // No created documents
      ],
    },
    select: {
      email: true,
      createdAt: true,
      username: true,
      firstname: true,
    },
  });

  for (const user of users) {
    await sendEmail({
      email: user.email,
      subject: `Create your first Project in Omniflow`,
      body: reminderEmail(
        user.firstname.trim() ? user.firstname : user.username
      ),
    });
  }
}

// Update the subscription status to 'EXPIRED'
async function handleSubscriptionExpiration() {
  const organizations = await prisma.organization.findMany({
    where: {
      subscriptionStatus: 'ACTIVE',
      subscriptionEnd: {
        lt: new Date(),
      },
    },
  });

  for (const org of organizations) {
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        subscriptionStatus: 'EXPIRED',
      },
    });
    await prisma.user.updateMany({
      where: { organizationId: org.id },
      data: {
        subscriptionStatus: 'EXPIRED',
      },
    });
  }
}

export async function runScheduledTasks() {
  // Subscription end reminder - 14 days
  notifyUsersOfExpiringSubscriptions({
    gte: new Date(new Date().setDate(new Date().getDate() + 14)),
    lt: new Date(new Date().setDate(new Date().getDate() + 15)),
  });

  // Subscription end reminder - 7 days
  notifyUsersOfExpiringSubscriptions({
    gte: new Date(new Date().setDate(new Date().getDate() + 7)),
    lt: new Date(new Date().setDate(new Date().getDate() + 8)),
  });

  // Subscription end reminder - 1 day
  notifyUsersOfExpiringSubscriptions({
    gte: new Date(new Date().setDate(new Date().getDate() + 1)),
    lt: new Date(new Date().setDate(new Date().getDate() + 2)),
  });

  //  updated subscription expiration
  handleSubscriptionExpiration();

  // Users created a week ago and no owned projects or created documents
  checkUserAction();
}
