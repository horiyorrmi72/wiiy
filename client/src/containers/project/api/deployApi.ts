import { getHeaders } from '../../../common/util/apiHeaders';
import { api_url } from '../../../lib/constants';

export interface VercelDeploymentResponse {
  url: string;
  id: string;
  status: string;
}

interface ProjectFile {
  path: string;
  content: string;
  type: 'file';
}

export interface UploadWebpageAssetsResponse {
  fileUrl: string;
  success: boolean;
}

export async function deployToVercel(
  documentId: string,
  files: ProjectFile[]
): Promise<VercelDeploymentResponse> {
  try {
    const headers = await getHeaders();
    const result = await fetch(`${api_url}/api/deploy/deployToVercel`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ files, documentId }),
    });

    const data = await result.json();
    return data;
  } catch (error) {
    console.error('Failed to deploy to Vercel:', error);
    throw error;
  }
}

export async function checkDeploymentStatus(
  deploymentId: string,
  documentId: string
): Promise<VercelDeploymentResponse> {
  try {
    const headers = await getHeaders();
    const result = await fetch(
      `${api_url}/api/deploy/checkDeploymentStatus/${deploymentId}/${documentId}`,
      {
        method: 'GET',
        headers,
        credentials: 'include',
      }
    );

    const data = await result.json();
    return data;
  } catch (error) {
    console.error('Failed to check deployment status:', error);
    throw error;
  }
}

export async function uploadWebpageAssets(
  documentId: string,
  sourceUrl: string
): Promise<UploadWebpageAssetsResponse> {
  try {
    const headers = await getHeaders();
    const result = await fetch(`${api_url}/api/deploy/uploadWebpageAssets`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ documentId, sourceUrl }),
    });

    const data = await result.json();
    return data;
  } catch (error) {
    console.error('Failed to upload webpage assets:', error);
    throw error;
  }
}
