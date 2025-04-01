import { Droppable } from '@hello-pangea/dnd';
import { Button, Divider, Typography } from 'antd';

import {
  IssueOutput,
  ProjectOutput,
  ProjectTask,
} from '../../../../../../shared/types';
import { useAppModal } from '../../../../common/components/AppModal';
import { useTeamOrOrganizationUsers } from '../../../team/hooks/useTeamOrOrganizationUsers';
import { MemoSprintViewCard } from '../board/SprintViewCard';

type IssueTableProps = Readonly<{
  project: ProjectOutput;
  issues: ReadonlyArray<ProjectTask & { rowindex?: number }>;
  title?: string;
  tableId: string;
  issueMap: Map<string, IssueOutput>;
}>;

export function IssueTable({
  project,
  issues,
  title,
  tableId,
  issueMap,
}: IssueTableProps) {
  const { data: availableOwners } = useTeamOrOrganizationUsers({
    source: 'team',
    teamId: project?.team?.id,
  });

  const { showAppModal } = useAppModal();

  return (
    <div>
      <Typography.Paragraph
        style={{
          fontWeight: 'bold',
          paddingTop: '10px',
          marginBottom: '10px',
        }}
      >
        {title}
        <Button
          size="small"
          style={{
            float: 'right',
            fontSize: '12px',
          }}
          onClick={() => {
            showAppModal({
              type: 'addIssue',
              workPlanId: tableId,
            });
          }}
        >
          {' '}
          + Add Issue
        </Button>
        <div
          style={{
            clear: 'both',
          }}
        ></div>
      </Typography.Paragraph>
      <Divider
        style={{
          margin: 0,
          border: '0.5px solid grey',
        }}
      />
      <Droppable droppableId={tableId}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            style={{
              minHeight: '100px',
              paddingBottom: '25px',
              paddingTop: '10px',
            }}
          >
            {issues.map((issue, i) => {
              return (
                <MemoSprintViewCard
                  availableOwners={availableOwners}
                  task={issue}
                  idMap={issueMap}
                  index={i}
                  showStatus={true}
                  key={issue.id}
                ></MemoSprintViewCard>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
