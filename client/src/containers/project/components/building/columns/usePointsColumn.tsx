import { Input } from 'antd';
import _ from 'lodash';

import { PROGRESS_COLUMN_WIDTH } from './useProgressColumn';

type UsePointsColumnArgs = {
  onChange: (item: { id: string; storyPoint: number }) => void;
};

export default function usePointsColumn({ onChange }: UsePointsColumnArgs) {
  return {
    title: 'Points',
    key: 'storyPoint',
    width: PROGRESS_COLUMN_WIDTH,
    render: (record: { id: string; storyPoint?: number | null }) => (
      <Input
        defaultValue={record.storyPoint || ''}
        onPressEnter={(e) => {
          const storyPoint = parseInt(e.currentTarget.value);
          console.log('value:', storyPoint);
          _.debounce(() => {
            console.log('e:', storyPoint);
            if (storyPoint) {
              onChange({ id: record.id, storyPoint });
            }
          }, 1000)();
        }}
      />
    ),
  };
}
