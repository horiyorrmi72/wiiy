import { useEffect, useState } from 'react';
import { Access } from '@prisma/client';
import { Button, DatePicker, Flex, Input } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router';

import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { ReactComponent as StartProject } from '../../../common/icons/start-project.svg';
import trackEvent from '../../../trackingClient';
import { useAddProjectMutation } from '../../project/hooks/useProjectMutation';

let selfClicked = false;
export function ProjectCard() {
  const [isSaving, setIsSaving] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [dueDate, setDueDate] = useState<dayjs.Dayjs>();
  const [isEditMode, setIsEditMode] = useState(false);
  const { user } = useCurrentUser();
  const navigate = useNavigate();

  const { createProjectMutation } = useAddProjectMutation({
    onSuccess: (project) => {
      setIsSaving(false);
      navigate(`/projects/${project.id}/planning/builder`);
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  const onSave = () => {
    if (!projectName || !dueDate) {
      return;
    }
    let dateValue = new Date(
      dayjs(dueDate).endOf('month').format('MM/DD/YYYY')
    );
    createProjectMutation.mutate({
      name: projectName,
      access: Access.SELF,
      dueDate: dateValue,
      ownerUserId: user?.id,
    });
    setIsSaving(true);
    trackEvent('startProjectClientClicked', {
      name: projectName,
      ownerUserId: user?.id,
      dueDate: dateValue,
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
      <StartProject />
      <Flex className="home-card-title">Start a project</Flex>
      {isEditMode ? (
        <Flex vertical style={{ height: '36px' }}>
          <Flex>
            <Input
              className="project-name"
              placeholder="New project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyUp={(event) => {
                if (event.key === 'Enter') {
                  onSave();
                }
              }}
            />
            <DatePicker
              size="large"
              mode="month"
              picker="month"
              className="project-due-date"
              placeholder="Due date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e);
              }}
              disabledDate={(current) =>
                current &&
                current < dayjs().startOf('day').subtract(1, 'second')
              }
            />
          </Flex>
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
          Create end to end project workflow including PRD, technical design,
          QA/Test plan etc.
        </div>
      )}
    </Flex>
  );
}
