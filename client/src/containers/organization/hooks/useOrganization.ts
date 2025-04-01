import { Organization } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";

import { useCurrentUser } from "../../../common/contexts/currentUserContext";
import { DEFAULT_QUERY_STALE_TIME } from "../../../lib/constants";
import { getOrganizationApi } from "../api/getOrganizationApi";
import { OrganizationWithContents } from "../types/organizationTypes";

export const ORGANIZATION_QUERY_KEY = 'ORGANIZATION_QUERY';
export const ORGANIZATION_WITH_CONTENTS_QUERY_KEY = 'ORGANIZATION_WITH_CONTENTSQUERY';

export function useOrganization() {
  const { hasProfile } = useCurrentUser();
  return useQuery(
    [ORGANIZATION_QUERY_KEY],
    () => getOrganizationApi(false) as Promise<Organization>,
    { enabled: hasProfile, staleTime: DEFAULT_QUERY_STALE_TIME },
  );
}

export function useOrganizationWithContents() {
  const { hasProfile } = useCurrentUser();
  return useQuery(
    [ORGANIZATION_WITH_CONTENTS_QUERY_KEY],
    () => getOrganizationApi(true) as Promise<OrganizationWithContents>,
    { enabled: hasProfile, staleTime: DEFAULT_QUERY_STALE_TIME },
  );
}