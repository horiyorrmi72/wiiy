import { getHeaders } from '../../../common/util/apiHeaders';
import { api_url } from '../../../lib/constants';
import { IssueOutput } from '../types/issueTypes';

export async function getMyIssuesApi(): Promise<ReadonlyArray<IssueOutput>> {
  const headers = await getHeaders();

  const result = await fetch(`${api_url}/api/issues`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  const { success, data, errorMsg } = await result.json();
  if (success) {
    return data;
  } else {
    throw new Error('Error loading issues: ' + errorMsg);
  }
}
