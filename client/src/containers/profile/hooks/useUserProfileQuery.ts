import { useQuery } from '@tanstack/react-query';

import { DEFAULT_QUERY_STALE_TIME } from '../../../lib/constants';
import { fetchUserProfile } from '../api/profileApi';

export const USER_PROFILE_QUERY_KEY = 'USER_PROFILE_QUERY';

export default function useUserProfileQuery(
  id: string,
  isAuthenticated: boolean = true
) {
  return useQuery([USER_PROFILE_QUERY_KEY, id], () => fetchUserProfile(id), {
    staleTime: DEFAULT_QUERY_STALE_TIME,
    enabled: isAuthenticated,
  });
}
