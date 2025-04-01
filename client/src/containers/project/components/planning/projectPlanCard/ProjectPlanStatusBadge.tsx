import { FC } from 'react';

import { StatusBadge } from '../../../../../common/components/StatusBadge/StatusBadge';
import { ProjectPlanStatus } from '../../../../../common/types/project.types';

const statusColorMap = {
  [ProjectPlanStatus.NOT_STARTED]: ['#FFF2E2', '#1C1D22'],
  [ProjectPlanStatus.IN_PROGRESS]: ['#5570F129', '#5570F1'],
  [ProjectPlanStatus.PUBLISHED]: ['#32936F29', '#519C66'],
};

export interface ProjectPlanStatusBadgeProps {
  status: ProjectPlanStatus;
}

export const ProjectPlanStatusBadge: FC<ProjectPlanStatusBadgeProps> = (
  props
) => {
  const { status } = props;
  if (!status) {
    return null;
  }
  const [backgroundColor, color] = statusColorMap[status];
  return (
    <StatusBadge
      backgroundColor={backgroundColor}
      color={color}
      text={status}
    />
  );
};
