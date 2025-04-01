import { User } from '@prisma/client';
import prisma from '../db/prisma';
import {
  CREDITS_ACTIONS,
  OMNIFLOW_INVITE_USER_CREDIT_AWARD,
} from '../lib/constant';
import { AuthenticatedUserWithProfile } from '../types/authTypes';
import { OmniflowCreditToTokenConversion } from './llmService/llmUtil';

export async function updateOrgCreditsAfterContentGen(
  user: Partial<AuthenticatedUserWithProfile>,
  docType: string,
  tokenInfo: any,
  docId?: string,
  templateDocId?: string
) {
  console.log(
    'in services.creditService.updateOrgCreditsAfterContentGen.start:',
    {
      user,
      tokenInfo,
    }
  );
  // update org credits
  const { userId, organizationId, email } = user;
  const { completionTokens, promptTokens, totalTokens } = tokenInfo;

  const usedCredits = Math.ceil(totalTokens / OmniflowCreditToTokenConversion);

  try {
    // first: update org credits
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        credits: {
          decrement: usedCredits,
        },
      },
    });

    // second:insert record into credit history
    const doc = !!docId
      ? await prisma.document.findUnique({
          where: { id: docId },
        })
      : await prisma.templateDocument.findUnique({
          where: { id: templateDocId },
        });
    await prisma.creditAction.create({
      data: {
        userId: userId as string,
        organizationId: organizationId as string,
        amount: -usedCredits,
        status: 'success',
        action: CREDITS_ACTIONS.CREDIT_CONSUME,
        meta: {
          docId,
          templateDocId,
          docName: doc?.name,
          docType,
          email,
          completionTokens,
          promptTokens,
          totalTokens,
        },
      },
    });
    // TODO - Hook up email notification
  } catch (error) {
    console.error('Error in updateOrgCreditsAfterContentGen:', error);
  }
  return;
}

export async function updateOrgCreditsAfterUserInvite(
  inviterUser: User,
  inviteeEmail: string
) {
  console.log(
    'in services.creditService.updateOrgCreditsAfterUserInvite.start:',
    {
      inviterUser,
      inviteeEmail,
    }
  );
  // update org credits
  const { id: userId, organizationId } = inviterUser;

  try {
    // first: update org credits
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        credits: {
          increment: OMNIFLOW_INVITE_USER_CREDIT_AWARD,
        },
      },
    });

    // second:insert record into credit history
    await prisma.creditAction.create({
      data: {
        userId: userId as string,
        organizationId: organizationId as string,
        amount: OMNIFLOW_INVITE_USER_CREDIT_AWARD,
        status: 'success',
        action: CREDITS_ACTIONS.CREDIT_INVITER_REWARD,
        meta: {
          inviteeEmail,
          inviterEmail: inviterUser.email,
        },
      },
    });
    // TODO - Hook up email notification
  } catch (error) {
    console.error('Error in updateOrgCreditsAfterUserInvite:', error);
  }
  return;
}
