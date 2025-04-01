import { useState } from 'react';
import { Button, Form, Input } from 'antd';

import { useUpdateTeamMutation } from '../hooks/useTeamMutation';
import { TeamOutput } from '../types/teamTypes';

type EditTeamProps = Readonly<{
  team: TeamOutput;
  teamId?: string;
  onSuccess: () => void;
}>;

export default function EditTeam({ team, onSuccess }: EditTeamProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const teamId = team.id;

  function onMutationSuccess() {
    console.log('container.project.components.EditTeam.onMutationSuccess');
    onSuccess();
    setIsLoading(false);
  }

  function onMutationError(err: string | Error) {
    console.error(
      'containers.project.components.EditTeam.onMutationError',
      err
    );
    setIsLoading(false);
  }

  const { updateTeamMutation } = useUpdateTeamMutation({
    onSuccess: onMutationSuccess,
    onError: onMutationError,
  });

  function onSubmit(values: any) {
    let { name, description } = values;
    updateTeamMutation.mutate({
      teamId,
      name,
      description,
    });
    setIsLoading(true);
  }

  return (
    <Form
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 16 }}
      onFinish={onSubmit}
      autoComplete="off"
      size="large"
      disabled={isLoading}
      initialValues={{
        name: team.name,
        description: team.description,
      }}
    >
      <Form.Item
        label="Name"
        name="name"
        rules={[{ required: true, message: 'Please specify a team name' }]}
      >
        <Input placeholder="Enter team name" />
      </Form.Item>

      <Form.Item label="Description" name="description">
        <Input placeholder="Enter team description" />
      </Form.Item>

      <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
        <Button type="primary" htmlType="submit" loading={isLoading}>
          Update Team
        </Button>
      </Form.Item>
    </Form>
  );
}
