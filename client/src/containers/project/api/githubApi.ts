import { GithubUserProfile } from '../../../../../shared/types/githubTypes';
import { getHeaders } from '../../../common/util/apiHeaders';
import { api_url } from '../../../lib/constants';
import { ProjectFile } from '../components/prototype/PrototypeEditor';

export async function connectToGithubApi(
  code: string
): Promise<GithubUserProfile> {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/githubSign/callback/${code}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  const { success, data, errorMsg } = await result.json();
  if (success) {
    return data;
  } else {
    throw new Error(`Error connect to github (${code}): ${errorMsg}`);
  }
}

export async function getUserGithubProfile(): Promise<GithubUserProfile> {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/githubSign/getUserGithubProfile`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  const { success, data, errorMsg } = await result.json();
  if (success) {
    return data;
  } else {
    throw new Error(`Error get user github profile: ${errorMsg}`);
  }
}

export async function createAndUploadToGithub(
  files: ProjectFile[],
  repoName: string,
  description: string = '',
  accessToken: string
): Promise<{ repoUrl: string }> {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/githubSign/create-repo`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      name: repoName,
      description,
      files,
      accessToken,
    }),
  });

  const { success, data, errorMsg } = await result.json();
  if (success) {
    return { repoUrl: data.html_url };
  } else {
    throw new Error(errorMsg);
  }
}
