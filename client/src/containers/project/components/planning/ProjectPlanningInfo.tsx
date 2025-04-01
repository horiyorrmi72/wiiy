import { Descriptions, DescriptionsProps } from 'antd';
import dayjs from 'dayjs';

import { useProject } from '../Project';

export function ProjectInfo() {
  const { project } = useProject();
  const { name, description, createdAt, dueDate, team } = project;
  const teamName = team?.name;

  const items: DescriptionsProps['items'] = [
    {
      key: 'name',
      label: 'Project name',
      span: { xxl: 1 },
      children: <span>{name}</span>,
    },
    {
      key: 'description',
      label: 'Description',
      span: { xxl: 2 },
      children: <span>{description}</span>,
    },
    {
      key: 'owner',
      label: 'Owner',
      span: { xxl: 1 },
      children: (
        <span>
          {project.owner?.username}
          {teamName && ', '}
          {teamName}
        </span>
      ),
    },
    {
      key: 'stakeholders',
      label: 'Stakeholders',
      span: { xxl: 2 },
      children: <span></span>,
    },
    {
      key: 'createDate',
      label: 'Create Date',
      span: { xxl: 1 },
      children: <span>{dayjs(createdAt).format('MM/DD/YYYY')}</span>,
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      span: { xxl: 2 },
      children: (
        <span>{dueDate ? dayjs(dueDate).format('MM/DD/YYYY') : ''}</span>
      ),
    },
  ];
  return (
    <>
      <Descriptions
        className="project-overvew"
        title="Project Info"
        column={{ xxl: 3, xl: 2, lg: 2, md: 2, sm: 2, xs: 1 }}
        items={items}
        style={{ paddingTop: '16px' }}
      />
      {/* <section className="project-progress">
        <Title level={5}>Progress </Title>
        <Text disabled>timeline showing deliverables towards milestones</Text>
        <Empty />
      </section>
      <br />
      <section className="project-insight">
        <Title level={5}>Insight</Title>
        <Text disabled>risks, mitigations, actions needed to take</Text>

        <Empty />
      </section> */}
    </>
  );
}
