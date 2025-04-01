import { Empty } from 'antd';

import { useProject } from '../Project';
import { MilestoneTable } from './MilestoneTable';

export function ProjectExecution() {
  const { project, filterMode } = useProject();

  console.log('in containers.project.components.building.ProjectExecution');

  if (!project.milestones.length) {
    return (
      <Empty description="Please first publish the PRD and Development Plan from Planner" />
    );
  }

  return (
    <MilestoneTable
      className="milestone-table"
      project={project}
      milestones={project.milestones}
      filterMode={filterMode}
    />
  );
}
