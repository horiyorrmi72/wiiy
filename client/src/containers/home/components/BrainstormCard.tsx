import { useEffect, useState } from 'react';
import { Access, ChatSession } from '@prisma/client';
import { Button, Flex, Input } from 'antd';
import { useNavigate } from 'react-router-dom';

import { ReactComponent as BrainstormIdea } from '../../../common/icons/brainstorm-idea.svg';
import trackEvent from '../../../trackingClient';
import { useChatMutation } from '../../chats/hooks/useChatMutation';
import { IdeasPath } from '../../nav/paths';

let selfClicked = false;
export function BrainstormCard() {
  const [isSaving, setIsSaving] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const navigate = useNavigate();
  const { upsertChatSessionMutation } = useChatMutation({
    onSuccess: (chatSession: ChatSession) => {
      setIsSaving(false);
      navigate(`/${IdeasPath}/${chatSession.id}`);
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  const onSave = () => {
    if (!inputValue) {
      return;
    }
    upsertChatSessionMutation.mutate({ name: inputValue, access: Access.SELF });
    setIsSaving(true);
    trackEvent('chatClientClicked', {
      inputValue,
    });
  };

  useEffect(() => {
    const clickBody = () => {
      if (!selfClicked) {
        setIsEditMode(false);
      }
      selfClicked = false;
    };

    window.document.body.addEventListener('click', clickBody);
    return () => {
      window.document.body.removeEventListener('click', clickBody);
    };
  }, []);

  return (
    <Flex
      className="home-card"
      onClick={() => {
        selfClicked = true;
        if (!isEditMode) {
          setIsEditMode(true);
        }
      }}
    >
      <BrainstormIdea />
      <Flex className="home-card-title">Brainstorm an idea</Flex>
      {isEditMode ? (
        <Flex vertical style={{ height: '36px', width: '100%' }}>
          <Input
            className="form-input"
            placeholder="Enter a name for this chat"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Flex style={{ marginTop: '15px', justifyContent: 'flex-end' }}>
            <Button
              className="cancel-button"
              type="default"
              onClick={() => setIsEditMode(false)}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSaving}
              onClick={onSave}
            >
              Go
            </Button>
          </Flex>
        </Flex>
      ) : (
        <div className="home-card-description">
          Get expert advice and feedback when refining an idea or addressing a
          question.
        </div>
      )}
    </Flex>
  );
}
