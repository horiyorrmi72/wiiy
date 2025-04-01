import { useEffect, useState } from 'react';
import { Access, DOCTYPE } from '@prisma/client';
import { Button, Flex, Input } from 'antd';
import { useNavigate } from 'react-router';

import { ReactComponent as DevTaskIcon } from '../../../common/icons/dev-task-icon.svg';
import trackEvent from '../../../trackingClient';
import { useDocumentMutation } from '../../documents/hooks/useDocumentMutation';
import { DevPlansPath } from '../../nav/paths';
import { LegacyDocumentOutput } from '../../project/types/projectType';

let selfClicked = false;
export function GenerateTaskCard() {
  const [isSaving, setIsSaving] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const navigate = useNavigate();

  const { createDocumentMutation } = useDocumentMutation({
    onSuccess: (document: LegacyDocumentOutput) => {
      setIsSaving(false);
      navigate(`/${DevPlansPath}/${document.id}`);
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  const onSave = () => {
    if (!inputValue) {
      return;
    }
    createDocumentMutation.mutate({
      name: inputValue,
      type: DOCTYPE.DEVELOPMENT_PLAN,
      access: Access.SELF,
    });
    setIsSaving(true);
    trackEvent('devTaskClientClicked', {
      name: inputValue,
      type: DOCTYPE.DEVELOPMENT_PLAN,
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
      <DevTaskIcon />
      <Flex className="home-card-title">Generate dev tasks</Flex>
      {isEditMode ? (
        <Flex vertical style={{ height: '36px', width: '100%' }}>
          <Input
            className="form-input"
            placeholder="Enter dev plan name"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyUp={(event) => {
              if (event.key === 'Enter') {
                onSave();
              }
            }}
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
          Automate technical development plan creation, task estimation and
          scheduling.
        </div>
      )}
    </Flex>
  );
}
