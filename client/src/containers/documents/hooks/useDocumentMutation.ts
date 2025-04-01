import { useMutation } from '@tanstack/react-query';
import { noop } from 'lodash';

import { useRefreshQueries } from '../../../common/hooks/useRefreshQueries';
import { upsertDocument } from '../../project/api/document';
import { LegacyDocumentOutput } from '../../project/types/projectType';

const DOCUMENT_QUERY_KEY = 'DOCUMENT_QUERY_KEY';

interface HookArgs {
  onError?: (err: string) => void;
  onSuccess?: (document: LegacyDocumentOutput) => void;
}

export function useDocumentMutation({
  onError = noop,
  onSuccess = noop,
}: HookArgs) {
  const refreshQueries = useRefreshQueries({
    queryKey: [DOCUMENT_QUERY_KEY],
  });

  return {
    createDocumentMutation: useMutation(upsertDocument, {
      onSuccess: (document: LegacyDocumentOutput) => {
        onSuccess(document);
        refreshQueries();
      },
      onError,
    }),
  };
}

export function useUpdateDocumentMutation({
  onError = noop,
  onSuccess = noop,
}: HookArgs) {
  const refreshQueries = useRefreshQueries({
    queryKey: [DOCUMENT_QUERY_KEY],
  });

  return {
    updateDocumentMutation: useMutation(upsertDocument, {
      onSuccess: (document) => {
        onSuccess(document);
        refreshQueries();
      },
      onError,
    }),
  };
}
