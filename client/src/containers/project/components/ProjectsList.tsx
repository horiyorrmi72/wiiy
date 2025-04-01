import { useEffect, useState } from 'react';
import { IssueStatus, IssueType } from '@prisma/client';
import { Empty, Flex, Progress, Space, Table, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import _ from 'lodash';
import { useNavigate } from 'react-router';

import { UserAvatar } from '../../../common/components/UserAvatar';
import { ReactComponent as ProjectIcon } from '../../../common/icons/project-icon.svg';
import { COLORS } from '../../../lib/constants';
import { ProjectDropdownOperMenu } from '../../layout/components/ProjectDropdownOperMenu';
import { ProjectsPath } from '../../nav/paths';
import { OrganizationWithContentsProjects } from '../../organization/types/organizationTypes';
import { computeSnapshotData } from '../hooks/snapshotData';

import './Project.scss';

function getRiskColor(percent: number) {
  if (percent <= 20) {
    return 'green';
  } else if (percent <= 50) {
    return 'orange';
  } else {
    return 'red';
  }
}

type ProjectsListProps = Readonly<{
  projects: OrganizationWithContentsProjects;
}>;

export default function ProjectsList({ projects }: ProjectsListProps) {
  const navigate = useNavigate();
  const [screenSize, setScreenSize] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop'
  );

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width <= 575) {
        setScreenSize('mobile');
      } else if (width <= 1023) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    window.addEventListener('resize', updateScreenSize);
    updateScreenSize();
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  if (!projects?.length) {
    return <Empty description="No Project found" />;
  } else {
    let cols = getProjectsListTableColumns(navigate);
    let data = getProjectsListData(projects);

    if (screenSize === 'tablet') {
      cols = cols.filter((col) =>
        ['name', 'owner', 'createdAt', 'dueDate', 'action'].includes(col.key)
      );
    } else if (screenSize === 'mobile') {
      cols = cols.filter((col) => ['name', 'action'].includes(col.key));
    }

    return <Table className="project-list" columns={cols} dataSource={data} />;
  }
}

function getProjectsListTableColumns(navigate: (id: string) => void) {
  const projectColumns = [
    {
      title: 'Name',
      key: 'name',
      ellipsis: {
        showTitle: false,
      },
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (record: any) => {
        return (
          <Flex
            style={{ alignItems: 'center', padding: '15px 0', width: '100%' }}
            onClick={() => {
              navigate(`/${ProjectsPath}/${record.id}`);
            }}
          >
            <div>
              <ProjectIcon
                style={{ width: '20px', height: '20px', color: COLORS.PRIMARY }}
              />
            </div>
            <Tooltip placement="topLeft" title={record.name}>
              <div
                className="link-button"
                style={{
                  marginLeft: '6px',
                  marginTop: '-6px',
                  width: 'calc(100% - 28px)',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {record.name}
              </div>
            </Tooltip>
          </Flex>
        );
      },
    },
    {
      title: 'Owner',
      key: 'owner',
      ellipsis: true,
      render: (rec: any) => {
        return (
          <Flex
            style={{ alignItems: 'center', padding: '15px 0', width: '100%' }}
            onClick={() => {
              navigate(`/${ProjectsPath}/${rec.id}`);
            }}
          >
            <div>
              <UserAvatar user={rec.owner} />
            </div>
            <div
              className="link-button"
              style={{
                marginLeft: '6px',
                marginTop: '-6px',
                width: 'calc(100% - 28px)',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {rec.owner?.username}
            </div>
          </Flex>
        );
      },
    },
    {
      title: 'Start Date',
      key: 'createdAt',
      ellipsis: true,
      sorter: (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (rec: any) => {
        return (
          <Space
            onClick={() => {
              navigate(`/${ProjectsPath}/${rec.id}`);
            }}
          >
            <Typography.Text>
              {dayjs(rec.createdAt).format('MM/DD/YYYY')}
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: 'Due Date',
      key: 'dueDate',
      ellipsis: true,
      sorter: (a: any, b: any) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      render: (rec: any) => {
        return (
          <Space
            onClick={() => {
              navigate(`/${ProjectsPath}/${rec.id}`);
            }}
          >
            <Typography.Text>
              {dayjs(rec.dueDate).format('MM/DD/YYYY')}
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: 'Access',
      key: 'access',
      ellipsis: true,
      sorter: (a: any, b: any) => a.access.localeCompare(b.access),
      render: (rec: any) => {
        return <Typography.Text>{_.capitalize(rec.access)}</Typography.Text>;
      },
    },
    {
      title: 'Risk Score',
      key: 'riskScore',
      width: 100,
      ellipsis: true,
      sorter: (a: any, b: any) => a.metrics.riskScore - b.metrics.riskScore,
      render: (rec: any) => {
        const percent = rec.metrics.riskScore * 100;
        return (
          <Space
            style={{ marginBottom: '5px' }}
            onClick={() => {
              navigate(`/${ProjectsPath}/${rec.id}/reporting/snapshot`);
            }}
          >
            <Progress
              size={40}
              strokeColor={getRiskColor(percent)}
              status="active"
              type="circle"
              trailColor={percent === 0 ? 'green' : undefined}
              percent={percent}
            />
          </Space>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (rec: any) => {
        return (
          <ProjectDropdownOperMenu
            isShowDots={true}
            project={rec}
            menuItemKey={`/${ProjectsPath}/${rec.id}`}
            onMenuItemClicked={() => {}}
          />
        );
      },
    },
  ];

  return projectColumns;
}

function getProjectsListData(projects: OrganizationWithContentsProjects) {
  let data: Array<any> = [];
  projects.forEach((project, index) => {
    let snapShotComputed = computeSnapshotData(
      project,
      project.issues.filter(
        (issue) =>
          issue.type === IssueType.BUILDABLE &&
          issue.status !== IssueStatus.CANCELED &&
          issue.status !== IssueStatus.OVERWRITTEN
      ),
      project.workPlans
    );
    data.push({
      ...project,
      id: project.id,
      key: index,
      name: project.name,
      owner: project.owner,
      createdAt: project.createdAt,
      dueDate: project.dueDate,
      progress: project.progress,
      metrics: snapShotComputed.overall.metrics,
      insights: snapShotComputed.overall.insights?.slice(1),
    });
  });
  data.sort((a, b) => {
    return dayjs(b.updatedAt).unix() - dayjs(a.updatedAt).unix();
  });
  return data;
}
