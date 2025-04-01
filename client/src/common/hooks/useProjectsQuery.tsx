import { useQuery } from '@tanstack/react-query';

import { getProjectApi } from '../../containers/project/api/project';
import { DEFAULT_QUERY_STALE_TIME } from '../../lib/constants';

export const PROJECT_QUERY_KEY = 'PROJECT_QUERY_KEY';

export function useProjectQuery(projectId: string) {
  return useQuery({
    queryKey: [PROJECT_QUERY_KEY, projectId],
    queryFn: async () => {
      // TODO - WHY is still firing?
      console.log('in useProjectQuery.queryFn:', projectId);
      const data = projectId ? await getProjectApi(projectId) : null;
      return data;
    },
    staleTime: DEFAULT_QUERY_STALE_TIME,
  });
}
