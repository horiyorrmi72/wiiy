import { getHeaders } from '../../../common/util/apiHeaders';
import { api_url } from '../../../lib/constants';

export async function getTablesList(documentId: string) {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/database/${documentId}/tables`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  const data = await result.json();
  return data;
}

export async function getTableData(
  documentId: string,
  tableName: string,
  columns: string[]
) {
  const headers = await getHeaders();

  const result = await fetch(
    `${api_url}/api/database/${documentId}/tables/${tableName}/data`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ columns }),
    }
  );

  const { data } = await result.json();
  return data;
}

export interface Condition {
  field: string;
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'like'
    | 'ilike'
    | 'in'
    | 'is';
  value: any;
}

export async function queryTableData(
  documentId: string,
  tableName: string,
  fields: string[],
  conditions: Condition[]
) {
  const headers = await getHeaders();
  const result = await fetch(
    `${api_url}/api/database/${documentId}/tables/${tableName}/query`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ fields, conditions }),
    }
  );

  const data = await result.json();
  return data;
}

export async function saveDocumentToDatabaseApi(
  documentId: string,
  content: string
) {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/database/${documentId}/save`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ content }),
  });

  const data = await result.json();
  return data;
}
