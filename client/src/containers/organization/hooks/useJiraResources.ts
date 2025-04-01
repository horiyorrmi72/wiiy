import { useQuery } from '@tanstack/react-query';

import { DEFAULT_QUERY_STALE_TIME } from '../../../lib/constants';
import { getJiraResource } from '../api/jiraApi';

export const USE_JIRA_RESOURCES_KEY = 'USE_JIRA_RESOURCES';

export default function useJiraResources(isAuthenticated: boolean = true) {
  return useQuery([USE_JIRA_RESOURCES_KEY], getJiraResource, {
    staleTime: DEFAULT_QUERY_STALE_TIME,
    enabled: isAuthenticated,
  });
}
