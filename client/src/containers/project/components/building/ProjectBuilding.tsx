// create a react component that display a line of text "Project Execution - {projectId}"

import { useState } from 'react';
import {
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  PlusCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Prisma } from '@prisma/client';
import { Button, Flex, Tooltip } from 'antd';
import { Outlet, redirect, useLocation } from 'react-router';

import { ProjectOutput } from '../../../../../../shared/types';
import ActionGroup, {
  ActionGroupItem,
} from '../../../../common/components/ActionGroup';
import { useAppModal } from '../../../../common/components/AppModal';
import SecondaryMenu, {
  SecondaryMenuItem,
} from '../../../../common/components/SecondaryMenu';
import { useCurrentUser } from '../../../../common/contexts/currentUserContext';
import { isFeatureLocked } from '../../../../common/util/app';
import { createJiraProject } from '../../../../containers/organization/api/jiraApi';
import { JiraEntity } from '../../../../containers/organization/types/jiraTypes';
import trackEvent from '../../../../trackingClient';
import {
  IssueBoardPath,
  MilestonesPath,
  ProjectOrganizationPath,
} from '../../../nav/paths';
import { useProject } from '../Project';

const MenuItems: ReadonlyArray<SecondaryMenuItem> = [
  {
    key: MilestonesPath,
    label: 'Milestones',
    link: MilestonesPath,
  },
  {
    key: ProjectOrganizationPath,
    label: 'Work Plan',
    link: ProjectOrganizationPath,
  },
  {
    key: IssueBoardPath,
    label: 'Task Board',
    link: IssueBoardPath,
  },
];

function useActiveMenuKey(): string {
  const location = useLocation();
  const pathComponents = location.pathname.split('/');
  // Note: the pathname starts with a / so the first pathComponent will be empty
  return pathComponents.length >= 5 ? pathComponents[4] : MenuItems[0].key;
}

export function ProjectBuildingIndex() {
  return redirect(MilestonesPath);
}

export function ProjectBuilding() {
  const { showAppModal } = useAppModal();
  const { project, filterMode } = useProject();
  const activeKey = useActiveMenuKey();
  const [syncButtonEnabled, setSyncButtonEnabled] = useState(true);
  const [syncError, setSyncError] = useState(false);

  const { user, subscriptionStatus, subscriptionTier } = useCurrentUser();
  const isJIRASyncLocked = isFeatureLocked(
    subscriptionStatus as string,
    subscriptionTier as string
  );

  const meta = (project?.meta as Prisma.JsonObject) ?? {};
  let jiraInfo = meta?.jira ? (meta.jira as JiraEntity) : null;
  console.log('jiraInfo', jiraInfo);

  async function createProject(project: ProjectOutput) {
    setSyncButtonEnabled(false);
    try {
      await createJiraProject({
        name: project.name,
        id: project.id,
        jira_key: jiraInfo?.key || '',
      });
      // track event
      trackEvent('syncToJira', {
        distinct_id: user.email,
        payload: JSON.stringify({
          projectName: project.name,
        }),
      });
    } catch (error) {
      setSyncError(true);
      console.error('Error syncing project to Jira', error);
    }
  }

  const actionItems: ReadonlyArray<ActionGroupItem> = [
    {
      key: 'addIssue',
      label: 'Add Issue',
      render: () => (
        <Tooltip title={'add issue'} key="addIssueTooltip">
          <Button
            type="link"
            icon={<PlusCircleOutlined />}
            size={'middle'}
            onClick={() => {
              showAppModal({ type: 'addIssue' });
            }}
          >
            Add Issue
          </Button>
        </Tooltip>
      ),
      handler: () => {
        showAppModal({ type: 'addIssue' });
      },
    },
    {
      key: 'syncToJira',
      label: 'Sync To Jira',
      render: () => {
        if (isJIRASyncLocked) {
          return (
            <Tooltip
              title="Upgrade to Performance plan for access"
              key="syncToJiraIssueTooltip"
            >
              <Button
                type="link"
                icon={<InfoCircleOutlined style={{ color: 'orange' }} />}
                size={'middle'}
                onClick={() => {
                  showAppModal({
                    type: 'updateSubscription',
                    payload: {
                      email: user.email,
                      source: 'projectBuildingSyncToJira',
                      destination: 'JiraSync',
                    },
                  });
                }}
              >
                Sync To Jira
              </Button>
            </Tooltip>
          );
        }
        return (
          <div key="syncToJira" style={{ textAlign: 'center' }}>
            {syncError && (
              <Button
                type="link"
                size={'middle'}
                icon={<CloseOutlined />}
                style={{ backgroundColor: 'red' }}
              >
                Error
              </Button>
            )}
            {syncError ? null : (
              <>
                {syncButtonEnabled && !jiraInfo ? (
                  <Tooltip
                    title={'Sync Project To Jira'}
                    key="syncToJiraIssueTooltip"
                  >
                    <Button
                      type="link"
                      icon={<SyncOutlined />}
                      size={'middle'}
                      onClick={() => {
                        createProject(project);
                      }}
                    >
                      Sync To Jira
                    </Button>
                  </Tooltip>
                ) : (
                  <Tooltip
                    title={'Project synced To Jira'}
                    key="syncedToJiraIssueTooltip"
                  >
                    <Button
                      type="text"
                      icon={<CheckOutlined />}
                      size={'middle'}
                    >
                      Synced
                    </Button>
                  </Tooltip>
                )}
              </>
            )}
          </div>
        );
      },
      handler: () => {
        createProject(project);
      },
    },
  ];

  return (
    <>
      <Flex
        style={{
          marginBottom: '16px',
          columnGap: '10px',
          rowGap: '6px',
        }}
      >
        <SecondaryMenu items={MenuItems} activeKey={activeKey} />
        <ActionGroup items={actionItems} />
      </Flex>
      <Outlet context={{ project, filterMode }} />
    </>
  );
}
