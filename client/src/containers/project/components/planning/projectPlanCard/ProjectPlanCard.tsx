import { FC, useCallback, useEffect, useState } from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { DOCTYPE, Document } from '@prisma/client';
import { DatePicker, Flex, Form, Spin, Tooltip, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router';

import { useAppModal } from '../../../../../common/components/AppModal';
import { SelectTeamUser } from '../../../../../common/components/SelectTeamUser';
import { useCurrentUser } from '../../../../../common/contexts/currentUserContext';
import { ProjectPlanStatus } from '../../../../../common/types/project.types';
import { isFeatureLocked } from '../../../../../common/util/app';
import { DocumentTypeNameMapping } from '../../../../documents/types/documentTypes';
import { useIssue } from '../../../../issues/hooks/useIssue';
import { DevPlansPath, DocumentsPath } from '../../../../nav/paths';
import { useOrganizationUsers } from '../../../../organization/hooks/useOrganizationUsers';
import { useUpdateIssueMutation } from '../../../hooks/useIssueMutation';
import { ProjectPlanStatusBadge } from './ProjectPlanStatusBadge';
import { IssueStatus } from '.prisma/client';

import './ProjectPlanCard.scss';

const statusMap: Record<string, ProjectPlanStatus> = {
  [IssueStatus.CREATED]: ProjectPlanStatus.NOT_STARTED,
  [IssueStatus.STARTED]: ProjectPlanStatus.IN_PROGRESS,
  [IssueStatus.COMPLETED]: ProjectPlanStatus.PUBLISHED,
};

export interface ProjectPlanCardProps {
  issue: any; // TODO what is the type for issues?
  project: any;
  onClick: (e: React.MouseEvent<HTMLLIElement>) => void;
  elementId: string;
}

export const ProjectPlanCard: FC<ProjectPlanCardProps> = (props) => {
  const { issue, project, onClick } = props;

  const { data: orgUsers, isLoading, isError, error } = useOrganizationUsers();
  const { user, subscriptionStatus, subscriptionTier } = useCurrentUser();
  const { showAppModal } = useAppModal();

  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { id, shortName, name, ownerUserId } = issue;

  const { data: fullIssue } = useIssue(issue?.shortName);
  const [isSubmiting, setIsSubmiting] = useState(false);

  const updateIssueMutation = useUpdateIssueMutation({
    onSuccess: () => {
      setIsSubmiting(false);
    },
    onError: (error) => {
      setIsSubmiting(false);
      throw error;
    },
  });

  const onChangeOwner = useCallback(
    (owner: string) => {
      if (fullIssue) {
        setIsSubmiting(true);
        updateIssueMutation.mutate({
          id: fullIssue.id,
          ownerUserId: owner || fullIssue.ownerUserId,
        });
      }
    },
    [fullIssue, updateIssueMutation]
  );

  const onChangeDueDate = useCallback(
    (value: Dayjs | null, dueDate: string | string[]) => {
      if (fullIssue) {
        setIsSubmiting(true);
        updateIssueMutation.mutate({
          id: fullIssue.id,
          plannedEndDate:
            new Date(dueDate as string) || fullIssue.actualEndDate,
        });
      }
    },
    [fullIssue, updateIssueMutation]
  );

  const owner = (orgUsers || []).find((user) => user.id === ownerUserId);
  const status = fullIssue?.status
    ? statusMap[fullIssue.status]
    : ProjectPlanStatus.NOT_STARTED;

  let isCardLocked = isFeatureLocked(
    subscriptionStatus as string,
    subscriptionTier as string
  );
  if (isCardLocked) {
    isCardLocked = [''].includes(issue.name);
  }

  const openDocument = useCallback(
    (e: React.MouseEvent<HTMLLIElement>) => {
      const target = e.target as HTMLElement;
      const closestSelector =
        target.closest('.ant-select') || target.closest('.ant-select-dropdown');
      const closestDatePicker =
        target.closest('.ant-picker') || target.closest('.ant-picker-dropdown');
      if (closestSelector || closestDatePicker || !fullIssue) {
        return;
      }
      console.log('Issue documents: ', fullIssue.documents);
      const document = fullIssue.documents?.[0] as Document;
      if (isCardLocked) {
        // show modal paywall
        showAppModal({
          type: 'updateSubscription',
          payload: {
            email: user.email,
            source: 'createBuildableDocument',
            destination: `openDocument:${document.name}`,
          },
        });
        return;
      }
      if (!document) {
        onClick(e);
        return;
      }
      console.log('Go to document: ', document);
      if (document.type === DOCTYPE.DEVELOPMENT_PLAN) {
        navigate(`/${DevPlansPath}/${document.id}`);
      } else {
        navigate(`/${DocumentsPath}/${document.id}`);
      }
    },
    [onClick, navigate, fullIssue, isCardLocked, showAppModal, user.email]
  );

  useEffect(() => form.resetFields(), [orgUsers, form]);

  if (isError) {
    throw error;
  }

  return (
    <Spin spinning={isLoading || isSubmiting} style={{ height: '100%' }}>
      <Flex
        id={props.elementId}
        vertical
        className="project-plan-card"
        onClick={openDocument}
      >
        <Flex
          flex={1}
          align="flex-start"
          justify="flex-start"
          className="project-plan-card-header"
          data-name={name}
          data-id={id}
          data-shortname={shortName}
        >
          <Typography.Title level={5}>
            {isCardLocked && (
              <Tooltip title="Upgrade to Performance plan for access">
                <InfoCircleOutlined style={{ color: 'orange' }} />
              </Tooltip>
            )}
            &nbsp;&nbsp;{DocumentTypeNameMapping[name]?.name || name}
          </Typography.Title>
          <ProjectPlanStatusBadge status={status} />
        </Flex>
        <Form
          form={form}
          name="editBuildable"
          size="large"
          disabled={isLoading}
          labelCol={{ span: 6 }}
          variant="borderless"
          initialValues={{
            owner: owner?.id,
            dueDate: issue.plannedEndDate && dayjs(issue.plannedEndDate),
          }}
        >
          <Flex flex={1} vertical className="project-plan-card-owner">
            <Typography.Text className="field-label" type="secondary">
              Owner
            </Typography.Text>
            <Form.Item
              name="owner"
              rules={[{ required: true, message: 'Owner must be set' }]}
              style={{ flex: 1 }}
            >
              <SelectTeamUser
                variant="borderless"
                teamId={project.teamId}
                secondaryInformation={[]}
                onChange={onChangeOwner}
              />
            </Form.Item>
          </Flex>
          <Flex flex={1} vertical className="project-plan-card-due-date">
            <Typography.Text className="field-label" type="secondary">
              Due Date
            </Typography.Text>
            <Form.Item
              name="dueDate"
              rules={[{ required: true, message: 'Due date must be set' }]}
            >
              <DatePicker
                format="MM/DD/YYYY"
                allowClear={false}
                onChange={onChangeDueDate}
                disabledDate={(current) =>
                  current && current < dayjs().endOf('day')
                }
              />
            </Form.Item>
          </Flex>
        </Form>
      </Flex>
    </Spin>
  );
};
