import { Progress, Space, Typography } from "antd";

type Record = {
  progress: number;
  completedStoryPoint?: number | null;
  storyPoint?: number | null;
}

export const PROGRESS_COLUMN_WIDTH = 130;

export function useProgressColumn() {
  return {
    title: 'Progress',
    key: 'progress',
    width: PROGRESS_COLUMN_WIDTH,
    render: (record: Record) => (
      <Space>
        <Progress type="circle" percent={record.progress} size={40} />
        <Typography.Text>{(record.completedStoryPoint || 0) + '/' + record.storyPoint}</Typography.Text>
      </Space>
    ),
  };
}