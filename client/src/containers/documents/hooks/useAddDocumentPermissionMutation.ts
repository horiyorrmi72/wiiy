import { useMutation, useQueryClient } from '@tanstack/react-query';

import { UserProfile } from '../../profile/types/profileTypes';
import { addDocumentPremissionApi } from '../api/documentPremissionApi';
import { DOCUMENT_PERMISSION_QUERY_KEY } from './useDocumentPermissionQuery';

type MutationArgs = {
  documentId: string;
  onSuccess: (data: UserProfile[]) => void;
  onError: (error: Error | string) => void;
};

export function useAddDocumentPermissionMutation({
  documentId,
  onSuccess,
  onError,
}: MutationArgs) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addDocumentPremissionApi,
    onSuccess: (data) => {
      console.log('useAddDocumentPermissionMutation success');
      onSuccess(data);
      queryClient.invalidateQueries([
        DOCUMENT_PERMISSION_QUERY_KEY,
        documentId,
      ]);
    },
    onError: (error) => {
      console.log('useAddDocumentPermissionMutation error', error);
      onError(error as string | Error);
    },
  });
}
