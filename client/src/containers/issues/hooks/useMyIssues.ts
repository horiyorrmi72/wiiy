import { useQuery } from "@tanstack/react-query";

import { DEFAULT_QUERY_STALE_TIME } from "../../../lib/constants";
import { getMyIssuesApi } from "../api/getMyIssuesApi";

export const GET_MY_ISSUES_QUERY_KEY = 'GET_MY_ISSUES_QUERY';

export function useMyIssues() {
  return useQuery(
    [GET_MY_ISSUES_QUERY_KEY],
    getMyIssuesApi,
    { staleTime: DEFAULT_QUERY_STALE_TIME },
  );
}
