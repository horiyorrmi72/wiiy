import React, { useEffect, useState } from 'react';
import { message, Select, Spin } from 'antd';
import { isEmpty } from 'lodash';

import { useRefinementDocumentMutation } from '../../containers/project/hooks/useDocumentMutation';
import trackEvent from '../../trackingClient';
import { GenerationMinimumCredit } from '../constants';
import { useCurrentUser } from '../contexts/currentUserContext';
import { ISelectionContext } from '../util/editor-helpers';
import { useAppModal } from './AppModal';

import './selection-menu.scss';

const { Option } = Select;

interface IProps {
  editorData: ISelectionContext;
  onAccept: (response: string) => void;
}

export const SelectionMenu: React.FC<IProps> = (props: IProps) => {
  const {
    editorData: { after, before, selection },
    onAccept,
  } = props;
  const [userInput, setUserInput] = useState('');
  const { user, organization } = useCurrentUser();
  const isGenerationLocked =
    (organization?.credits ?? 0) <= GenerationMinimumCredit;
  const { showAppModal } = useAppModal();

  const { generateRefinementDocumentMutation: genRefinement } =
    useRefinementDocumentMutation({
      onSuccess: () => {
        setUserInput('');
      },
      onError: () => {
        message.error('Failed to get AI response. Please try again.');
      },
    });

  const handleSubmit = (value: string) => {
    if (isGenerationLocked) {
      showAppModal({
        type: 'updateSubscription',
        payload: {
          email: user.email,
          source: 'selectionMenu',
          destination: 'refinement',
        },
      });
    } else {
      if (
        // before !== '' &&
        // after !== '' &&
        selection !== '' &&
        (userInput !== '' || !isEmpty(value))
      ) {
        genRefinement.mutate({
          paragraphAfter: after,
          paragraphBefore: before,
          selection: selection,
          userInput: userInput === '' ? (value as string) : userInput,
        });
        // track event
        trackEvent('refineDocument', {
          distinct_id: user.email,
          payload: JSON.stringify({
            selection: selection,
            userInput: userInput === '' ? (value as string) : userInput,
          }),
        });
      }
    }
  };

  useEffect(() => {
    if (genRefinement?.data?.contentStr) {
      const trimmedStr = genRefinement?.data?.contentStr.replace(
        /^<.*?>|<\/.*?>$/g,
        ''
      );
      onAccept(trimmedStr);
    }
  }, [genRefinement?.data?.contentStr, onAccept]);

  return (
    <div className="editor-context-menu" style={{ position: 'relative' }}>
      {genRefinement?.isLoading ? (
        <Spin tip="AI is generating a response..." />
      ) : genRefinement?.isError ? (
        <div>Error occurred. Please try again.</div>
      ) : (
        <Select
          disabled={!!userInput}
          placeholder="AI"
          popupMatchSelectWidth={false}
          allowClear
          onSelect={handleSubmit}
        >
          {[
            'Make this shorter',
            'Make this longer',
            'Simplify this',
            'Expand on this',
            'Change the tone',
            'Complete sentence',
          ].map((val) => (
            <Option key={val} value={val}>
              {val}
            </Option>
          ))}
        </Select>
      )}
    </div>
  );
};
