// create a react component that display a line of text "Project Dashboard - {projectId}"
import { Descriptions, DescriptionsProps, Empty, Spin, Typography } from 'antd';
import dayjs from 'dayjs';

import { ProjectOutput } from '../../../../../shared/types';
import { useProjectQuery } from '../../../common/hooks/useProjectsQuery';

export default function ProjectOverview({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, error } = useProjectQuery(projectId);

  // todo - add spinner for loading and error msg display for errors
  if (isLoading) {
    console.log('in containers.project.components.ProjectDashboard.loading');
    return <Spin />;
  }
  if (isError) {
    return <>Error: {error}</>;
  }
  console.log('in containers.project.components.ProjectDashboard:', data);

  let items = data ? getProjectDataItems(data) : [];
  const { Text, Title } = Typography;
  return (
    <>
      <Descriptions
        className="project-overvew"
        title="Project Info"
        items={items}
      />
      <section className="project-progress">
        <Title level={5}>Progress </Title>
        <Text disabled>timeline showing deliverables towards milestones</Text>
        <Empty />
      </section>
      <br />
      <section className="project-insight">
        <Title level={5}>Insight</Title>
        <Text disabled>risks, mitigations, actions needed to take</Text>

        <Empty />
      </section>
    </>
  );
}

function getProjectDataItems(project: ProjectOutput) {
  let { name, description, createdAt, dueDate, ownerUserId, teamId } = project;
  const items: DescriptionsProps['items'] = [
    {
      key: 'name',
      label: 'Project name',
      span: 1,
      children: <span>{name}</span>,
    },
    {
      key: 'description',
      label: 'Description',
      span: 2,
      children: <span>{description}</span>,
    },
    {
      key: 'owner',
      label: 'Owner',
      children: (
        <span>
          {ownerUserId}, {teamId}
        </span>
      ),
    },
    {
      key: 'stakeholders',
      label: 'Stakeholders',
      span: 2,
      children: <span></span>,
    },
    {
      key: 'createDate',
      label: 'Create Date',
      children: <span>{dayjs(createdAt).format('MM/DD/YYYY')}</span>,
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      children: (
        <span>{dueDate ? dayjs(dueDate).format('MM/DD/YYYY') : ''}</span>
      ),
    },
  ];
  return items;
}
