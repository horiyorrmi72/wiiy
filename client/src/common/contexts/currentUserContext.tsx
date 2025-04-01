import { createContext, useContext, useRef } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
// import Intercom from '@intercom/messenger-js-sdk';
import { Organization, RecordStatus } from '@prisma/client';
import { Typography } from 'antd';
import { Amplify } from 'aws-amplify';
import { AuthUser, signUp } from 'aws-amplify/auth';
import { useSearchParams } from 'react-router-dom';

import { LoadingScreen } from '../../containers/layout/components/LoadingScreen';
import { HomePath } from '../../containers/nav/paths';
import useUserProfileQuery from '../../containers/profile/hooks/useUserProfileQuery';
import { createNewUserApi } from '../../containers/user/api/createNewUserApi';
import trackEvent from '../../trackingClient';
import { ComponentProps, UserInfo } from '../types/common';

import '@aws-amplify/ui-react/styles.css';
import './authenticator.scss';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID as string,
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID as string,
      signUpVerificationMethod: 'link',
      loginWith: {
        email: true,
        oauth: {
          domain: process.env.REACT_APP_COGNITO_DOMAIN as string,
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [
            process.env.REACT_APP_COGNITO_REDIRECT_SIGNIN as string,
          ],
          redirectSignOut: [
            process.env.REACT_APP_COGNITO_REDIRECT_SIGNOUT as string,
          ],
          responseType: 'code',
        },
      },
    },
  },
});

type CurrentUserContextType = Readonly<{
  user: UserInfo;
  hasProfile: boolean;
  isAdmin: boolean;
  signOut: () => void;
  subscriptionStatus: string;
  subscriptionTier: string;
  organization: Partial<Organization>;
}>;

const UserContext = createContext<CurrentUserContextType | undefined>(
  undefined
);

export function useCurrentUser(): CurrentUserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('Current user context is not available');
  }
  return context;
}

function UserProfileProvider({
  user,
  signOut,
  children,
}: ComponentProps & { user?: AuthUser; signOut?: () => void }) {
  if (!user?.userId) {
    throw new Error('User Id is not available');
  }
  const {
    data: userProfile,
    isLoading,
    isError,
    isSuccess,
    error,
  } = useUserProfileQuery(user?.userId, Boolean(user));

  const isGoogleOAuthSignUpTracked = useRef(false);
  const isUserLoginTracked = useRef(false);

  console.log('In User Profile Provider user', user);
  console.log('In User Profile Provider userProfile', userProfile);

  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');

  if (!user || !signOut || isLoading || !userProfile?.id) {
    return <LoadingScreen />;
  }

  if (isError || !isSuccess) {
    return (
      <div>Error loading user profile: {(error || 'unknown').toString()}</div>
    );
  }

  // set up intercom
  // Intercom({
  //   app_id: 'gxyaxpes',
  //   user_id: userProfile.id,
  //   user_hash: createIntercomHmac(userProfile.id),
  // });

  // track user sign up with google oauth
  if (code && !isGoogleOAuthSignUpTracked.current) {
    console.log('google oauth code:', code);
    // tracking google oauth sign up
    trackEvent('signup', {
      distinct_id: userProfile.email,
      payload: JSON.stringify({
        source: 'google_oauth',
        userId: userProfile.id,
      }),
    });
    isGoogleOAuthSignUpTracked.current = true;
  }
  // track user login
  if (!isUserLoginTracked.current) {
    console.log('User login:', userProfile.email);
    // tracking google oauth sign up
    trackEvent('login', {
      distinct_id: userProfile.email,
      name: userProfile.firstname + ' ' + userProfile.lastname,
      email: userProfile.email,
      source: code ? 'google_oauth' : 'email_login',
      userId: userProfile.id,
    });
    isUserLoginTracked.current = true;
  }

  // redirect to home page if user is logged in and route is /signin or /signup
  const { pathname } = window.location;
  if (pathname === '/signup' || pathname === '/signin') {
    window.location.href = `/${HomePath}`;
    return;
  }

  const pendingStatus =
    userProfile && userProfile.status === RecordStatus.PENDING;
  const currentUserContext: CurrentUserContextType = {
    user: {
      id: user.userId,
      username: userProfile.username,
      email: userProfile.email,
      status: userProfile.status,
      firstname: userProfile.firstname,
      lastname: userProfile.lastname,
      specialty: userProfile.specialty || '',
    },
    hasProfile: userProfile && !pendingStatus,
    isAdmin: userProfile?.isAdmin || false,
    signOut,
    subscriptionStatus: userProfile.subscriptionStatus,
    subscriptionTier: userProfile.subscriptionTier,
    organization: userProfile.organization || {},
  };
  console.log('Using new user context', currentUserContext);
  return (
    <UserContext.Provider value={currentUserContext}>
      {children}
    </UserContext.Provider>
  );
}

function LoginHeader() {
  return (
    <div className="login-header">
      <Typography.Title>Omniflow AI</Typography.Title>
    </div>
  );
}

const formFields = {
  signUp: {
    email: {
      order: 1,
      isRequired: true,
    },
    password: {
      order: 2,
      isRequired: true,
      placeholder: 'Use upper, lower, and special character',
    },
    confirm_password: {
      order: 3,
      isRequired: true,
    },
    // 'custom:organization_name': {
    //   label: 'Organization Name',
    //   order: 4,
    //   isRequired: true,
    //   placeholder: 'Enter your Organization Name',
    // },
    // 'custom:organization_website': {
    //   order: 5,
    //   label: 'Organization Website',
    //   placeholder: 'Enter your Organization Website (optional)',
    // },
  },
};

export function UserProvider({ children }: ComponentProps) {
  const services = {
    async handleSignUp(formData: any) {
      let { username, password, options } = formData;
      const newUserEmail =
        options?.userAttributes?.email?.toLowerCase() || username;
      const organizationName =
        options?.userAttributes['custom:organization_name'];
      const organizationWebsite =
        options?.userAttributes['custom:organization_website']?.toLowerCase();

      const signedUpUser = await signUp({
        username,
        password,
        options: {
          userAttributes: {},
          autoSignIn: true,
        },
      });

      const newUserId = signedUpUser.userId;

      await createNewUserApi({
        newUserId: newUserId!,
        email: newUserEmail,
        organizationName: organizationName,
        organizationWebsite: organizationWebsite,
      });

      trackEvent('signup', {
        distinct_id: newUserEmail,
        payload: JSON.stringify({
          userId: newUserId,
          source: 'email_signup',
        }),
      });
      return signedUpUser;
    },
  };
  const { pathname } = window.location;
  console.log('UserProvider.pathname:', pathname);
  return (
    <Authenticator
      initialState={pathname === '/signup' ? 'signUp' : 'signIn'}
      className="login-screen"
      socialProviders={['google']}
      formFields={formFields}
      services={services}
      components={{
        Header: LoginHeader,
      }}
    >
      {({ signOut, user }) => (
        <UserProfileProvider user={user} signOut={signOut}>
          {children}
        </UserProfileProvider>
      )}
    </Authenticator>
  );
}
