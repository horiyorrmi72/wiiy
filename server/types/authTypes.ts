import { UserRole } from '@prisma/client';

export type AuthenticatedUser = Readonly<{
  userId: string;
  userName: string;
}>;

export type UserProfile = Readonly<{
  organizationId: string;
  email: string;
  language?: string;
  role?: UserRole;
  firstname?: string;
}>;

export type AuthenticatedUserWithProfile = AuthenticatedUser & UserProfile;

export type AuthenticatedLocals = Readonly<{
  currentUser: AuthenticatedUser;
}>;

export type AuthenticatedProfileLocals = Readonly<{
  currentUser: AuthenticatedUserWithProfile;
}>;
