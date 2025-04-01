import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { RequestHandler } from 'express';
import prisma from '../db/prisma';
import {
  AuthenticatedUser,
  AuthenticatedUserWithProfile,
} from '../types/authTypes';
import { RedisSingleton } from '../services/redis/redis';
import { REDIS_PREFIX_JIRA } from '../services/jiraService';
import { SubscriptionTier } from '@prisma/client';
import { SpecialtyToIssueType } from '../../shared/constants';
import {
  CreditAmountMapping,
  CREDITS_FOR_SUBSCRIPTION,
  LANGUAGES,
} from './constant';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.REACT_APP_USER_POOL_ID as string,
  clientId: process.env.REACT_APP_USER_POOL_CLIENT_ID as string,
  tokenUse: 'access',
});

export const authenticatedRequestHandler: RequestHandler = async (
  request,
  response,
  next
) => {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    if (
      request.originalUrl.indexOf('/api/documents/shared') !== -1 &&
      request.method === 'GET'
    ) {
      // TODO: use passCode, replace email
      next();
      return;
    }
    console.error(
      'server.lib.utils.authenticatedRequestHandler.error: No token was found in these headers: ' +
        JSON.stringify(Object.keys(request.headers))
    );
    response
      .status(403)
      .json({ success: false, errorMsg: 'Permission denied.' });
    return;
  }

  const [tokenType, accessToken, ...otherParts] = authHeader.split(' ');
  if (otherParts.length !== 0 || tokenType !== 'Bearer') {
    console.error(
      'server.lib.utils.authenticatedRequestHandler: Incorrectly formated authorization header'
    );
    response
      .status(403)
      .json({ success: false, errorMsg: 'Permission denied.' });
    return;
  }

  try {
    const payload = await verifier.verify(accessToken);
    const user: AuthenticatedUser = {
      userId: payload.sub,
      userName: payload.username,
    };
    response.locals.currentUser = user;
    next();
  } catch (error) {
    console.error(
      'server.lib.utils.authenticatedRequestHandler: An error occurred while validating an access token',
      {
        error,
      }
    );
    response
      .status(403)
      .json({ success: false, errorMsg: 'Permission denied.' });
  }
};

export const callbackRequestHandler: RequestHandler = async (
  request,
  response,
  next
) => {
  const nonce = request.query.state as string;
  console.log('Callback request, nonce = ', nonce);
  const userId = await RedisSingleton.getData(REDIS_PREFIX_JIRA + nonce);
  if (userId) {
    console.log('Authentication passed for callback request.');
    const user: AuthenticatedUser = {
      userId: userId,
      userName: '',
    };
    response.locals.currentUser = user;
    RedisSingleton.clearData(REDIS_PREFIX_JIRA + nonce);
    next();
  } else {
    console.error(
      'server.lib.utils.callbackRequestHandler: Invalid nonce for callback request.'
    );
    response.status(500).json({
      success: false,
      errorMsg: 'Invalid credential for callback request.',
    });
  }
};

export const userProfileRequestHandler: RequestHandler = async (
  request,
  response,
  next
) => {
  const currentUser = response.locals.currentUser;
  if (!currentUser) {
    if (
      request.originalUrl.indexOf('/api/documents/shared') !== -1 &&
      request.method === 'GET'
    ) {
      // TODO: use passCode, replace email
      next();
      return;
    }
    console.error(
      'server.lib.utils.userProfileRequestHandler: The currentUser is not available'
    );
    response.status(500).json({
      success: false,
      errorMsg: 'currentUser not available on server',
    });
    return;
  }

  // const userProfile = userProfileCache[currentUser.userId] || await prisma.user.findUnique({
  //   where: { id: currentUser.userId },
  //   select: { organizationId: true, email: true }, // Only get the new fields we need for most use cases
  // });

  const userProfile = await prisma.user.findUnique({
    where: { id: currentUser.userId },
    select: { organizationId: true, email: true, role: true, firstname: true }, // Only get the new fields we need for most use cases
  });

  if (!userProfile) {
    console.error(
      'server.lib.utils.userProfileRequestHandler: No profile exists for use = ' +
        currentUser.userId
    );
    response.status(404).json({
      success: false,
      errorMsg: 'This user does not have a profile yet',
    });
    return;
  }

  // userProfileCache[currentUser.userId] = userProfile;

  const updatedCurrentUser: AuthenticatedUserWithProfile = {
    ...currentUser,
    ...userProfile,
  };

  response.locals.currentUser = updatedCurrentUser;

  next();
};

export function getTierFromPrice(description: string): SubscriptionTier {
  const desc = description.toLowerCase();
  if (desc.includes('essential')) {
    return SubscriptionTier.STARTER;
  } else if (desc.includes('premium')) {
    return SubscriptionTier.PRO;
  } else if (desc.includes('scale')) {
    return SubscriptionTier.BUSINESS;
  } else if (desc.includes('enterprise')) {
    return SubscriptionTier.ENTERPRISE;
  } else {
    return SubscriptionTier.FREE;
  }
  throw new Error('Tier not found for subscription price: ' + description);
}

export function getSeatNumberForTier(lineItems: any): number {
  return lineItems.reduce((acc: number, item: any) => {
    if (item.description.toLowerCase().includes('user license')) {
      acc = item.quantity;
    }
    return acc;
  }, 1);
}

export function getCreditAmount(amount: number) {
  let key = amount + '';
  if (!CreditAmountMapping[key]) {
    throw new Error(
      'Payment amount received not found for credit purchase: ' + amount
    );
    return;
  }
  return CreditAmountMapping[key];
}

export function getCreditsForSubscription(
  subscriptionTier: string,
  planInterval: string
): number {
  const interval =
    planInterval.toLowerCase() === 'month' ? 'MONTHLY' : 'YEARLY';
  return CREDITS_FOR_SUBSCRIPTION[interval][subscriptionTier];
}

export function getTaskTypeFromSpecialtyName(specialty: string): string {
  if (specialty === 'FULLSTACK_ENGINEER') {
    // swap out fullstack with frontend and backend
    return 'Frontend,Backend';
  }
  let result = SpecialtyToIssueType[specialty];
  if (!result) {
    result = specialty
      .replace('_', ' ')
      .toLowerCase()
      .replace(/engineer(s)?/g, '');
    // write regex to capitalize first letter of each word from result above
    result = result.replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return result;
}

export function getLanguageNameFromCode(code: string) {
  let language = LANGUAGES.find((lang) => lang.code === code)?.name;
  return language || 'English';
}

export function isEmail(email: string): boolean {
  var pattern = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
  return pattern.test(email);
}

export function extractJsonObject(str: string) {
  const regex = /```json\n([\s\S]*?)\n```/;
  const match = str.match(regex);
  console.log('server.lib.util.extractJsonObject:', match);
  if (match && match[1]) {
    return JSON.parse(match[1]);
  }
  return null;
}
