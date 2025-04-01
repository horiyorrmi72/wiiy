import { Document } from '@prisma/client';

import { getHeaders } from '../../../common/util/apiHeaders';
import { api_url } from '../../../lib/constants';
import { FileContent } from '../../documents/components/ChatBox';
import { DocHistoryItem } from '../../documents/components/DocumentEditor';
import {
  LegacyDocumentOutput,
  RefinementGenerationInput,
  RefinementGenerationOutput,
} from '../types/projectType';

export async function upsertDocument(
  doc: Partial<Document | LegacyDocumentOutput>
): Promise<LegacyDocumentOutput> {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/documents/upsert`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(doc),
  });
  const { success, data, errorMsg } = await result.json();
  if (!success) {
    throw new Error('Error upserting document: ' + errorMsg);
  }
  return data;
}

export async function uploadDocumentImage({
  id,
  history,
}: {
  id: string;
  history: DocHistoryItem;
}): Promise<{ id: string; history: DocHistoryItem }> {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/documents/upload-image`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      id,
      history,
    }),
  });
  const { success, data, errorMsg } = await result.json();
  if (!success) {
    throw new Error('Error upserting document: ' + errorMsg);
  }
  return data;
}

export async function rateGeneration(
  doc: Partial<Document>
): Promise<LegacyDocumentOutput> {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/documents/rating`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(doc),
  });
  const { success, data, errorMsg } = await result.json();
  if (!success) {
    throw new Error('Error upserting document: ' + errorMsg);
  }
  return data;
}

export async function generateDocument(
  doc: Partial<Document> & {
    contents?: string;
    templateId?: string;
    uploadedFileContent?: FileContent[];
    chosenDocumentIds?: string;
    chatSessionId?: string;
  }
): Promise<LegacyDocumentOutput> {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/documents/generate`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(doc),
  });

  const { success, data, errorMsg } = await result.json();
  if (!success) {
    throw new Error('Error upserting document: ' + errorMsg);
  }
  return data;
}

export async function generateRefinement(
  doc: RefinementGenerationInput
): Promise<RefinementGenerationOutput> {
  // The api trims spaces if doc.selection has leading or trailing spaces
  // To solve: if selection contains leading or trailing space,
  // they need to be added to the result
  const leadingSpaces = doc.selection?.match(/^(\s*)/)?.[0] ?? '';
  const trailingSpaces = doc.selection?.match(/(\s*)$/)?.[0] ?? '';

  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/documents/generate-refinement`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(doc),
  });

  const { success, data, errorMsg } = await result.json();
  if (!success) {
    throw new Error('Error generating refinement: ' + errorMsg);
  }

  let resultContent = data.contentStr;

  // If the original selection did not have a <p> tag, trim <p> and </p> tags from the result
  if (!doc.selection?.startsWith('<p>')) {
    resultContent = resultContent.replace(/^<p>/, '').replace(/<\/p>$/, '');
  }
  // If the original selection did not end with a dot, remove the trailing dot from the result content
  if (!doc.selection?.trim().endsWith('.')) {
    resultContent = resultContent.replace(/\.$/, '');
  }
  return {
    ...data,
    contentStr: `${leadingSpaces}${resultContent}${trailingSpaces}`,
  };
}

export async function requestDocumentAccess(doc: {
  documentId: string;
  message?: string;
}) {
  const headers = await getHeaders();
  const result = await fetch(`${api_url}/api/documents/requestAccess`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(doc),
  });

  const { success, data, errorMsg } = await result.json();
  if (!success) {
    throw new Error('Error request document access:' + errorMsg);
  }
  return data;
}
