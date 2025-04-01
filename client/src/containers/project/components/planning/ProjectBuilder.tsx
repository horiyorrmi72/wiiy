import { useCallback, useState } from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Issue, IssueStatus, IssueType, Prisma } from '@prisma/client';
import { Col, Row, Spin, Tooltip, Typography } from 'antd';

import { ProjectOutput } from '../../../../../../shared/types';
import { useAppModal } from '../../../../common/components/AppModal';
import { useCurrentUser } from '../../../../common/contexts/currentUserContext';
import { isFeatureLocked } from '../../../../common/util/app';
import { useUpdateIssueMutation } from '../../hooks/useIssueMutation';
import { IssueBuildableTypes } from '../../types/projectType';
import { useProject } from '../Project';
import { useProjectTutorial } from '../tutorials';
import { ProjectPlanCard } from './projectPlanCard/ProjectPlanCard';

import 'driver.js/dist/driver.css';

const BuildableDescription = {
  [IssueBuildableTypes.PRD as string]:
    'for product manager/owner to create requirements',
  [IssueBuildableTypes.UIDESIGN as string]:
    'for designers to create UI/UX Design',
  [IssueBuildableTypes.TECHDESIGN as string]:
    'for engineers to create technical design',
  [IssueBuildableTypes.DEVELOPMENT as string]:
    'for product owners to create dev plan',
  [IssueBuildableTypes.QA as string]: 'for QA Engineers to create QA Plan',
  [IssueBuildableTypes.RELEASE as string]:
    'for project owners to create Release checklist',
};

export function ProjectBuilder() {
  useProjectTutorial();
  const { showAppModal } = useAppModal();
  const { project } = useProject();
  const { user, subscriptionStatus, subscriptionTier } = useCurrentUser();

  const buildables = project.buildables.toSorted((a, b) => {
    let aObj = a.meta as Prisma.JsonObject;
    let bObj = b.meta as Prisma.JsonObject;
    return (aObj.sequence as number) - (bObj.sequence as number);
  });

  const isPRDGenerated =
    project.buildables.find(
      (b) => b.type === IssueType.BUILDABLE && b.name.includes('PRD')
    )?.status === IssueStatus.COMPLETED;

  const onIssueClick = useCallback(
    (e: React.MouseEvent<HTMLLIElement>) => {
      const { name, id, shortname: shortName } = e.currentTarget.dataset;
      console.log('Issue clicked:', id, shortName);
      showAppModal({
        type: name as IssueBuildableTypes,
        issueShortName: shortName as string,
      });
    },
    [showAppModal]
  );

  let isCustomizationWorkflowLocked = isFeatureLocked(
    subscriptionStatus as string,
    subscriptionTier as string
  );
  const onCustomizeWorkflowClick = useCallback(
    (e: React.MouseEvent<HTMLLIElement>) => {
      if (isCustomizationWorkflowLocked) {
        showAppModal({
          type: 'updateSubscription',
          payload: {
            email: user.email,
            source: 'projectBuilder',
            destination: 'CustomizeWorkflow',
          },
        });
        return;
      }
      showAppModal({
        type: 'editWorkflow',
        project,
      });
    },
    [showAppModal, isCustomizationWorkflowLocked, project, user.email]
  );

  const [isSubmiting, setIsSubmiting] = useState(false);

  return (
    <Spin spinning={isSubmiting}>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Typography.Link
            id="customize-view"
            onClick={onCustomizeWorkflowClick}
            style={{ padding: 2 }}
          >
            {isCustomizationWorkflowLocked && (
              <Tooltip title="Upgrade to Performance plan for access">
                <InfoCircleOutlined style={{ color: 'orange' }} />
              </Tooltip>
            )}
            &nbsp;Customize
          </Typography.Link>
        </div>
        <Row
          gutter={[{ xs: 0, sm: 20, md: 0, lg: 20 }, 0]}
          style={{
            width: '100%',
            minHeight: 300,
            paddingTop: '16px',
            rowGap: '20px',
          }}
        >
          {buildables
            .filter((b) => b.status && b.status !== IssueStatus.CANCELED)
            .map((buildable) => (
              <Col
                xs={24}
                sm={12}
                md={24}
                lg={12}
                xl={8}
                xxl={6}
                key={buildable.id}
              >
                <ProjectPlanCard
                  elementId={buildable.name}
                  project={project}
                  issue={buildable}
                  onClick={onIssueClick}
                />
              </Col>
            ))}
        </Row>
      </div>
    </Spin>
  );
}

export function EditProjectWorkflow({
  project,
  onSuccess,
}: {
  project: ProjectOutput;
  onSuccess: () => void;
}) {
  const updateIssueMutation = useUpdateIssueMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      throw error;
    },
  });

  const updateBuildableStatus = useCallback(
    (buildable: Issue) => {
      if (buildable) {
        let newStatus =
          buildable.status === IssueStatus.CANCELED
            ? IssueStatus.CREATED
            : IssueStatus.CANCELED;
        updateIssueMutation.mutate({
          id: buildable.id,
          status: newStatus,
        });
        //refresh client status for ui rendering
        buildable.status = newStatus;
      }
    },
    [updateIssueMutation]
  );

  const buildables = project.buildables.toSorted((a, b) => {
    let aObj = a.meta as Prisma.JsonObject;
    let bObj = b.meta as Prisma.JsonObject;
    return (aObj.sequence as number) - (bObj.sequence as number);
  });
  return (
    <>
      {buildables.map((buildable) => {
        return (
          <div key={buildable.id} style={{ margin: '10px' }}>
            <input
              type="checkbox"
              checked={buildable.status !== IssueStatus.CANCELED}
              onChange={(e) => {
                updateBuildableStatus(buildable);
              }}
            />
            <label>{buildable.name}</label>&nbsp;
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              {BuildableDescription[buildable.name as string]}
            </Typography.Text>
          </div>
        );
      })}
    </>
  );
}
