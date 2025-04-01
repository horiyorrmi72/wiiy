import { getHeaders } from '../../../common/util/apiHeaders';
import { api_url } from '../../../lib/constants';

// get uploaded file content
export async function getUploadedFileContent(docId: string) {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${api_url}/api/files/proxy-download/${docId}`,
      {
        method: 'GET',
        headers: headers,
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${response.statusText}`);
    }

    const { success, data, errorMsg } = await response.json();
    if (success) {
      return data;
    } else {
      throw new Error('Error fetching file content: ' + errorMsg);
    }
  } catch (error) {
    console.error('Error in getUploadedFileContent:', error);
    throw error;
  }
}
