import { useState } from 'react';
import { Button, DatePicker, Form, Input, Select } from 'antd';
import dayjs from 'dayjs';

import { ProjectOutput } from '../../../../../shared/types';
import { SelectTeamUser } from '../../../common/components/SelectTeamUser';
import { generalAccessOptions } from '../../../lib/constants';
import { useUpdateProjectMutation } from '../hooks/useProjectMutation';

import './EditProject.scss';

type EditProjectProps = Readonly<{
  project: ProjectOutput;
  teamId?: string;
  onSuccess: () => void;
}>;

export default function EditProject({
  project,
  teamId,
  onSuccess,
}: EditProjectProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const projectId = project.id;

  function onMutationSuccess() {
    console.log('container.project.components.EditProject.onMutationSuccess');
    onSuccess();
    setIsLoading(false);
  }

  function onMutationError(err: string) {
    console.error(
      'containers.project.components.EditProject.onMutationError',
      err
    );
    setIsLoading(false);
  }

  const { updateProjectMutation } = useUpdateProjectMutation({
    onSuccess: onMutationSuccess,
    onError: onMutationError,
  });

  function onSubmit(values: any) {
    let { name, description, dueDate, ownerUserId, access } = values;
    updateProjectMutation.mutate({
      projectId,
      name,
      description,
      ownerUserId,
      access,
      dueDate: dueDate.format('MM-DD-YYYY'),
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
        ownerUserId: project.ownerUserId,
        name: project.name,
        description: project.description,
        dueDate: dayjs(project.dueDate),
        access: project.access,
      }}
      className="edit-project-form"
    >
      <Form.Item
        label="Name"
        name="name"
        rules={[{ required: true, message: 'Please specify a project name' }]}
      >
        <Input placeholder="Enter project name" />
      </Form.Item>

      <Form.Item
        label="Access"
        name="access"
        rules={[
          {
            required: true,
            message: 'Please select who can access the project',
          },
        ]}
      >
        <Select options={generalAccessOptions} />
      </Form.Item>

      <Form.Item
        label="Owner"
        name="ownerUserId"
        rules={[{ required: true, message: 'Please select a project owner' }]}
      >
        <SelectTeamUser
          teamId={teamId}
          placeholder="Select an owner"
          secondaryInformation={[]}
        />
      </Form.Item>

      <Form.Item label="Target Date" name="dueDate">
        <DatePicker
          mode="month"
          picker="month"
          style={{ width: '100%' }}
          disabledDate={(current) => current && current < dayjs().endOf('day')}
        />
      </Form.Item>

      <Form.Item label="Description" name="description">
        <Input.TextArea placeholder="Enter project description" />
      </Form.Item>

      <Form.Item wrapperCol={{ span: 24 }} style={{ textAlign: 'center' }}>
        <Button type="primary" htmlType="submit" loading={isLoading}>
          Update Project
        </Button>
      </Form.Item>
    </Form>
  );
}
