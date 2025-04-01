import { useEffect, useMemo, useState } from 'react';
import { IssueStatus } from '@prisma/client';
import { Table } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router';

import { ProjectOutput, ProjectTask } from '../../../../../../shared/types';
import { issueStatus } from '../../../../lib/constants';
import { DashboardPath } from '../../../nav/paths';
import { useUpdateIssueMutation } from '../../hooks/useIssueMutation';
import { useOwnerAndNameColumn } from './columns/useOwnerAndNameColumn';
import usePointsColumn from './columns/usePointsColumn';
import { useScheduleColumn } from './columns/useScheduleColumn';
import { useStatusColumn } from './columns/useStatusColumn';

type TaskTableProps = Readonly<{
  className?: string;
  project?: ProjectOutput;
  issues: ReadonlyArray<ProjectTask>;
  setIsLoading: (isLoading: boolean) => void;
}>;

export function TaskTable({
  className,
  project,
  issues,
  setIsLoading,
}: TaskTableProps) {
  const updateIssueMutation = useUpdateIssueMutation({
    onSuccess: () => {
      console.log('updateIssueMutation.success');
      setIsLoading(false);
    },
    onError: (e) => {
      console.error('updateIssueMutation.error:', e);
      setIsLoading(false);
    },
  });
  const navigate = useNavigate();
  const [screenSize, setScreenSize] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop'
  );

  const ownerAndNameColumn = useOwnerAndNameColumn({
    title: 'Task',
    teamId: project?.teamId,
    editableName: false,
    onChange: updateIssueMutation.mutate,
    onIssueNameClicked: (id) =>
      navigate(
        `/${DashboardPath}/${
          issues.find((issue) => issue.id === id)!.shortName
        }`
      ),
  });
  const scheduleColumn = useScheduleColumn();
  const pointsColumn = usePointsColumn({
    onChange: (item: { id: string; storyPoint: number }) => {
      setIsLoading(true);
      updateIssueMutation.mutate(item);
    },
  });
  const statusColumn = useStatusColumn({
    options: issueStatus,
    onChange: (item: { id: string; status: IssueStatus | undefined }) => {
      setIsLoading(true);
      updateIssueMutation.mutate(item);
    },
  });

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

  const taskColumns = useMemo(() => {
    if (screenSize === 'mobile') {
      return [ownerAndNameColumn, statusColumn];
    }
    if (screenSize === 'tablet') {
      return [ownerAndNameColumn, scheduleColumn, statusColumn];
    }
    return [ownerAndNameColumn, scheduleColumn, pointsColumn, statusColumn];
  }, [
    screenSize,
    ownerAndNameColumn,
    scheduleColumn,
    pointsColumn,
    statusColumn,
  ]);

  const sortedIssues = issues.toSorted((a, b) =>
    a.plannedStartDate === b.plannedStartDate
      ? dayjs(a.plannedEndDate).unix() - dayjs(b.plannedEndDate).unix()
      : dayjs(a.plannedStartDate).unix() - dayjs(b.plannedStartDate).unix()
  );

  return (
    <Table
      className={className}
      columns={taskColumns}
      rowKey="id"
      dataSource={sortedIssues}
      pagination={false}
      // onRow={(record, rowIndex) => {
      //   return {
      //     onClick: (event) => {
      //       let issue = issues.find((issue) => issue.id === record.id);
      //       let shortName = issue?.shortName || '';
      //       if (shortName) {
      //         navigate(`/${DashboardPath}/${shortName}`);
      //       }
      //     }, // click row
      //     onDoubleClick: (event) => {}, // double click row
      //     onContextMenu: (event) => {
      //       event.preventDefault();
      //       console.log(
      //         'in containers.project.components.ProjectExecution.onContextMenu:',
      //         event
      //       );
      //     },
      //   };
      // }}
    />
  );
}
