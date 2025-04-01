import { Col, DatePicker, Flex, Input, Row, Select } from 'antd';
import dayjs from 'dayjs';
import _ from 'lodash';

import { EditableUserAvatar } from '../../../common/components/UserAvatar';
import { issueStatus } from '../../../lib/constants';
import trackEvent from '../../../trackingClient';
import { useUpdateIssueMutation } from '../../project/hooks/useIssueMutation';
import { useTeamOrOrganizationUsers } from '../../team/hooks/useTeamOrOrganizationUsers';
import { IssueOutput } from '../types/issueTypes';

interface IssueDetailEditorSideArguments {
  issue: IssueOutput;
}
export function IssueDetailEditorSide({
  issue,
}: IssueDetailEditorSideArguments) {
  const updateIssueMutation = useUpdateIssueMutation({
    onSuccess: () => {
      console.log('updateIssueMutation.success');
    },
    onError: (e) => {
      console.error('updateIssueMutation.error:', e);
    },
  });

  const {
    data: availableOwners,
    isError,
    error,
  } = useTeamOrOrganizationUsers({
    source: 'team',
    teamId: issue.project.teamId,
  });
  if (isError) {
    throw error;
  }
  const user = availableOwners?.find((user) => user.id === issue.ownerUserId);

  console.log('issue:', issue);

  return (
    <div className="issueDetailSide">
      <Row>
        <Col span={8}>
          <strong>Type:</strong>
        </Col>
        <Col span={15}>
          <strong>{issue.type}</strong>
        </Col>
      </Row>
      <Row>
        <Col span={8}>
          <strong>Assignee:</strong>
        </Col>
        <Col span={15}>
          <Flex align="center" gap="middle" wrap="wrap" vertical={false}>
            <>
              <EditableUserAvatar
                user={user}
                size="20"
                validUsers={availableOwners || []}
                onChange={(newUserId) => {
                  updateIssueMutation.mutate({
                    id: issue.id,
                    shortName: issue.shortName,
                    ownerUserId: newUserId,
                  });
                  // track event
                  trackEvent('updateIssue', {
                    distinct_id: user?.email,
                    payload: JSON.stringify({
                      issueShortName: issue.shortName,
                      issueName: issue.name,
                      assignee:
                        'old: ' + issue.ownerUserId + ' new: ' + newUserId,
                      updateField: 'assignee',
                    }),
                  });
                }}
              />
              {user ? `${user.firstname} ${user.lastname}` : ''}
            </>
          </Flex>
        </Col>
      </Row>

      <Row>
        <Col span={8}>
          <strong>Story Point:</strong>
        </Col>
        <Col span={15}>
          <span>
            <Input
              disabled={issue.type !== 'TASK' && issue.type !== 'STORY'}
              defaultValue={issue.storyPoint || ''}
              onBlur={(e) => {
                _.debounce(() => {
                  const storyPoint = parseInt(e.target.value);
                  console.log('e:', e, e.target.value, storyPoint);
                  if (storyPoint) {
                    updateIssueMutation.mutate({
                      id: issue.id,
                      shortName: issue.shortName,
                      storyPoint,
                    });
                    // track event
                    trackEvent('updateIssue', {
                      distinct_id: user?.email,
                      payload: JSON.stringify({
                        issueShortName: issue.shortName,
                        issueName: issue.name,
                        storyPoint:
                          'old: ' + issue.storyPoint + ' new: ' + storyPoint,
                        updateField: 'storyPoint',
                      }),
                    });
                  }
                }, 1000)();
              }}
            />
          </span>
        </Col>
      </Row>

      <Row>
        <Col span={8}>
          <strong>Status:</strong>
        </Col>
        <Col span={15}>
          <span>
            <Select
              options={issueStatus}
              defaultValue={issue.status}
              onChange={(status) => {
                updateIssueMutation.mutate({
                  id: issue.id,
                  shortName: issue.shortName,
                  status,
                });
                // track event
                trackEvent('updateIssue', {
                  distinct_id: user?.email,
                  payload: JSON.stringify({
                    issueShortName: issue.shortName,
                    issueName: issue.name,
                    status: 'old: ' + issue.status + ' new: ' + status,
                    updateField: 'status',
                  }),
                });
              }}
            />
          </span>
        </Col>
      </Row>

      <Row>
        <Col span={8}>
          <strong>Planned Date:</strong>
        </Col>
        <Col span={15}>
          <span>
            <DatePicker.RangePicker
              disabled={issue.type !== 'TASK' && issue.type !== 'STORY'}
              defaultValue={
                issue.plannedStartDate && issue.plannedEndDate
                  ? [dayjs(issue.plannedStartDate), dayjs(issue.plannedEndDate)]
                  : undefined
              }
              format="MM/DD/YYYY"
              onChange={(dates, dateStrings) => {
                updateIssueMutation.mutate({
                  id: issue.id,

                  shortName: issue.shortName,
                  plannedStartDate: new Date(dateStrings[0] || ''),
                  plannedEndDate: new Date(dateStrings[1] || ''),
                });
                // track event
                trackEvent('updateIssue', {
                  distinct_id: user?.email,
                  payload: JSON.stringify({
                    issueShortName: issue.shortName,
                    issueName: issue.name,
                    status: `[plannedStart, plannedEnd, newStart, newEnd]:${issue.plannedStartDate},${issue.plannedEndDate}, new: ${dateStrings}`,
                    updateField: 'data',
                  }),
                });
              }}
            />
          </span>
        </Col>
      </Row>

      {issue.parentIssue ? (
        <Row>
          <Col span={8}>
            <strong>Parent:</strong>
          </Col>
          <Col span={15}>
            <a href={issue.parentIssue.shortName}> {issue.parentIssue.name} </a>
          </Col>
        </Row>
      ) : (
        <div></div>
      )}
    </div>
  );
}
