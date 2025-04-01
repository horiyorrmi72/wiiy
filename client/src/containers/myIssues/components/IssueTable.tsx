import { CalendarFilled, PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router';

import { useAppModal } from '../../../common/components/AppModal';
import { ReactComponent as LayerIcon } from '../../../common/icons/layer-icon.svg';
import { ReactComponent as WelcomeGraphic } from '../../../common/icons/welcome_graphic.svg';
import { calculateHealthScore } from '../../../common/util/app';
import { COLORS } from '../../../lib/constants';
import { IssueOutput } from '../../issues/types/issueTypes';
import { DashboardPath, DevPlansPath, DocumentsPath } from '../../nav/paths';

export function IssuesTable({
  issues,
}: {
  issues: ReadonlyArray<IssueOutput>;
}) {
  let data: Array<any> = [];
  issues.forEach((issue, index) => {
    data.push({
      id: issue.id,
      key: index,
      createdAt: issue.createdAt,
      name: issue.name,
      shortName: issue.shortName,
      projectInfo:
        issue.project?.name +
        (issue.workPlan ? `:${issue.workPlan?.name}` : ''),
      projectId: issue.projectId,
      parentIssue: issue.parentIssue,
      ownerUserId: issue.ownerUserId,
      storyPoint: issue.storyPoint,
      progress: issue.progress,
      pointInfo: (issue.completedStoryPoint || 0) + '/' + issue.storyPoint,
      plannedStartDate: issue.plannedStartDate,
      plannedEndDate: issue.plannedEndDate,
      description: issue.description,
      schedule: [
        issue.plannedStartDate
          ? dayjs(issue.plannedStartDate).format('MM/DD/YYYY')
          : dayjs(issue.createdAt).format('MM/DD/YYYY'),
        issue.plannedEndDate
          ? dayjs(issue.plannedEndDate).format('MM/DD/YYYY')
          : '',
      ]
        .filter((date) => date)
        .join(' - '),
      health: calculateHealthScore(issue),
      status: issue.status,
      type: issue.type,
      updatedAt: issue.updatedAt,
      documents: issue.documents,
    });
  });

  const navigate = useNavigate();
  const handleIssueClick = (record: any) => {
    if (record.type === 'BUILDABLE') {
      let doc = record.documents.length ? record.documents[0] : null;
      if (doc && doc.type === 'DEVELOPMENT_PLAN') {
        navigate(`/${DevPlansPath}/${doc.id}`);
      } else {
        navigate(`/${DocumentsPath}/${doc.id}`);
      }
    } else {
      navigate(`/${DashboardPath}/${record.shortName}`);
    }
  };

  return data
    .sort((a, b) => {
      return dayjs(b.updatedAt).unix() - dayjs(a.updatedAt).unix();
    })
    .map((issue, index) => (
      <Flex
        className="issue-item"
        vertical
        key={index}
        onClick={() => handleIssueClick(issue)}
      >
        <Flex style={{ color: COLORS.GRAY, fontSize: '11px' }}>
          {issue.name}
        </Flex>
        <Flex
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '5px 0',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginRight: '40px',
            }}
          >
            {issue.description}
          </div>
          <Flex
            style={{
              alignItems: 'center',
              fontSize: '14px',
              textTransform: 'capitalize',
            }}
          >
            <div
              style={{
                height: '10px',
                width: '10px',
                borderRadius: '50%',
                backgroundColor: COLORS.PRIMARY,
                marginRight: '10px',
              }}
            ></div>
            {issue.status?.toLowerCase()}
          </Flex>
        </Flex>
        <Flex
          style={{ fontSize: '12px', gap: 8, justifyContent: 'space-between' }}
        >
          <Flex align="center">
            <CalendarFilled
              style={{
                marginRight: '6px',
                fontSize: '13px',
                color: COLORS.GRAY,
              }}
            />
            <Tooltip title="Planned Schedule">{issue.schedule}</Tooltip>
          </Flex>
          <Flex
            style={{ marginLeft: 'auto' }}
            align="center"
            className="project-name"
          >
            <LayerIcon style={{ marginRight: '6px' }} />
            <Tooltip title="Project or work plan name" style={{}}>
              {issue.projectInfo}
            </Tooltip>
          </Flex>
        </Flex>
      </Flex>
    ));
}

export function EmptyProject() {
  const { showAppModal } = useAppModal();
  return (
    <Flex
      vertical
      style={{
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        border: `solid 1px ${COLORS.LIGHT_GRAY}`,
        borderRadius: '10px',
        marginBottom: '10px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          color: COLORS.GRAY,
          marginBottom: '20px',
          marginTop: '-50px',
        }}
      >
        <Flex
          flex={1}
          align="center"
          justify="center"
          style={{ marginTop: '48px' }}
        >
          <WelcomeGraphic />
        </Flex>
        <Flex vertical align="center" justify="center">
          <Typography.Title level={4}>Welcome to Omniflow!</Typography.Title>
          <Typography.Text style={{ textAlign: 'center' }}>
            Please{' '}
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                showAppModal({ type: 'addProject' });
              }}
            >
              Add Your First Project
            </a>
            , to start experiencing the magic of Omniflow!
          </Typography.Text>
        </Flex>
      </div>
      <Button
        id="add-project-btn"
        type="primary"
        icon={<PlusOutlined />}
        size={'middle'}
        onClick={() => showAppModal({ type: 'addProject' })}
      >
        New project
      </Button>
    </Flex>
  );
}
