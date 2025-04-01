import { Organization } from '@prisma/client';

import { getHeaders } from '../../../common/util/apiHeaders';
import { api_url } from '../../../lib/constants';

export async function getOrganizationApi(
  withContents: boolean
): Promise<Organization> {
  const headers = await getHeaders();

  const queryParams = withContents ? '?includeContents=true' : '';

  const result = await fetch(`${api_url}/api/organization${queryParams}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  const { success, data, errorMsg } = await result.json();
  if (success) {
    return data;
  } else {
    throw new Error('Error loading user organization: ' + errorMsg);
  }
}

interface UpdateOrgProps {
  id: string;
  website: string;
  industry: string;
  size: string;
  name: string;
}

export async function updateOrganization({
  id,
  website,
  industry,
  size,
  name,
}: UpdateOrgProps): Promise<{ success: any }> {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/organization/update`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      id,
      website,
      industry,
      size,
      name,
    }),
  });

  const { success, data, errorMsg } = await result.json();

  if (!success) {
    throw new Error('Error generating refinement: ' + errorMsg);
  }

  return data;
}
