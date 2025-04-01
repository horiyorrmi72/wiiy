import { useCallback } from 'react';
import { Button, Flex, Form, Input, Typography } from 'antd';

import { useAppModal } from '../../../common/components/AppModal';
import { SelectTeamUser } from '../../../common/components/SelectTeamUser';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { isFeatureLocked } from '../../../common/util/app';
import { SUBSCRIPTIONTIERS } from '../../../lib/constants';
import { useCreateTeamMutation } from '../hooks/useTeamMutation';

type AddTeamProps = Readonly<{
  parentTeamId?: string;
  onSuccess: () => void;
}>;

type FormValues = Readonly<{
  name?: string;
  description?: string;
  members?: string[];
}>;

export function AddTeam({ parentTeamId, onSuccess }: AddTeamProps) {
  const [form] = Form.useForm();
  const { showAppModal } = useAppModal();
  const { user, subscriptionStatus, subscriptionTier } = useCurrentUser();
  const isLocked = isFeatureLocked(
    subscriptionStatus as string,
    subscriptionTier as string,
    SUBSCRIPTIONTIERS.BUSINESS
  );

  const onError = useCallback((error: unknown) => {
    throw error;
  }, []);
  const createTeamMutation = useCreateTeamMutation({ onSuccess, onError });

  const onFinish = useCallback(
    ({ name, description, members }: Required<FormValues>) => {
      if (name) {
        createTeamMutation.mutate({ name, description, members, parentTeamId });
      }
    },
    [createTeamMutation, parentTeamId]
  );

  return (
    <Flex justify="center">
      <Form
        form={form}
        name="addTeam"
        size="large"
        labelCol={{ span: 10 }}
        wrapperCol={{ span: 24 }}
        onFinish={onFinish}
      >
        <Form.Item
          name="name"
          label="Team Name"
          rules={[{ required: true, message: 'Please specify a team name' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Team Description">
          <Input />
        </Form.Item>
        <Form.Item
          name="members"
          label="Members"
          rules={[
            { required: true, message: 'Please add at least one team member' },
          ]}
        >
          <SelectTeamUser
            teamId={parentTeamId}
            multiple
            placeholder="Select users"
            secondaryInformation={[]}
          />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
          <Button type="primary" htmlType="submit" disabled={isLocked}>
            Add Team
          </Button>
        </Form.Item>
        {isLocked && (
          <Flex
            justify="center"
            style={{
              textAlign: 'center',
            }}
          >
            <Typography.Text type="secondary">
              For access to this feature, please
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  showAppModal({
                    type: 'updateSubscription',
                    payload: {
                      email: user.email,
                      source: 'addTeam',
                      destination: 'ScalePlan',
                    },
                  });
                  return;
                }}
              >
                {' '}
                upgrade to Scale Plan
              </a>
            </Typography.Text>
          </Flex>
        )}
      </Form>
    </Flex>
  );
}
