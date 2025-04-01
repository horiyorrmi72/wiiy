import {
  CreateProjectInput,
  ProjectOutput,
  UpdateProjectInput,
} from '../../../../../shared/types';
import { getHeaders } from '../../../common/util/apiHeaders';
import { api_url } from '../../../lib/constants';

export async function createProjectApi(
  input: CreateProjectInput
): Promise<ProjectOutput> {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/projects`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const { success, data, errorMsg } = await result.json();
  if (!success) {
    throw new Error('Error creating project: ' + errorMsg);
  }
  return data;
}

export async function updateProjectApi(
  input: UpdateProjectInput
): Promise<ProjectOutput> {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/projects/${input.projectId}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const { success, data, errorMsg } = await result.json();
  if (!success) {
    throw new Error(`Error updating project (${input.projectId}): ${errorMsg}`);
  }
  return data;
}

export async function getProjectApi(projectId: string): Promise<ProjectOutput> {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/projects/${projectId}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  const { success, data, errorMsg } = await result.json();
  if (success) {
    return data;
  } else {
    throw new Error(`Error loading project (${projectId}): ${errorMsg}`);
  }
}

export async function deleteProjectApi(
  projectId: string
): Promise<ProjectOutput> {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/projects/${projectId}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  const { success, data, errorMsg } = await result.json();
  if (success) {
    return data;
  } else {
    throw new Error(`Error deleting project (${projectId}): ${errorMsg}`);
  }
}
