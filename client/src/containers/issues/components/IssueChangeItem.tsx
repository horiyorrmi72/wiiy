import { User } from '@prisma/client';
import { Flex, List, Typography } from 'antd';

import { IssueChangeHistoryOutput } from '../types/issueTypes';
import { UserAvatar } from '../../../common/components/UserAvatar';
import { omit } from 'lodash';

function renderChanges(change: string) {
  const parsedHistory = omit(JSON.parse(change), [
    'id',
    'projectId',
    'workPlanId',
    'meta',
    'jiraId',
    'parentIssueId',
    'templateIssueId',
    'creatorUserId',
    'ownerUserId',
    'createdAt',
    'updatedAt',
    'shortName',
  ]);
  delete parsedHistory.id;

  const lines = [];

  for (const key in parsedHistory) {
    const value = parsedHistory[key];

    lines.push(
      <Flex justify="space-between" style={{ width: '100%' }}>
        <strong style={{ flex: 1, textAlign: 'left' }}>{key}</strong>
        <div style={{ flex: 1, textAlign: 'center' }}>to</div>
        <Typography.Text
          code
          style={{ flex: 1, textAlign: 'right' }}
          ellipsis={{ tooltip: value }}
        >
          {`${value}`}
        </Typography.Text>
      </Flex>
    );
  }

  return lines;
}

interface ChangeItemProps {
  item: IssueChangeHistoryOutput;
  users: ReadonlyArray<User>;
}

export function IssueChangeItem({ item, users }: ChangeItemProps) {
  const user = users?.find((user) => user.id === item.userId);

  return (
    <List.Item key={item.id}>
      <Flex vertical gap={8} style={{ width: '100%' }}>
        <UserAvatar user={user} size="16" />
        <strong>{user?.firstname + ' ' + user?.lastname}</strong>
        modified
        <Flex vertical align="center" gap={2}>
          {renderChanges(item.modifiedAttribute)}
        </Flex>
        <span>at {`${new Date(item.createdAt).toLocaleString()}`}</span>
      </Flex>
    </List.Item>
  );
}
