import { Select } from 'antd';

type UseStatusColumnArgs<StatusType> = {
  options: Array<{ value: string; label: string }>;
  onChange: (item: { id: string; status: StatusType }) => void;
};

const STATUS_COLUMN_WIDTH = 120;

export function useStatusColumn<StatusType>({
  options,
  onChange,
}: UseStatusColumnArgs<StatusType>) {
  return {
    title: 'Status',
    key: 'status',
    width: STATUS_COLUMN_WIDTH,
    render: (record: { id: string; status: StatusType }) => (
      <Select
        options={options}
        value={record.status}
        style={{ width: STATUS_COLUMN_WIDTH }}
        onChange={(status) => onChange({ id: record.id, status })}
      />
    ),
  };
}
