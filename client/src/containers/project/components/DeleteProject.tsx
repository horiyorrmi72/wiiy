import { useState } from 'react';
import { Button, Form, Typography } from 'antd';
import { useNavigate } from 'react-router';

import { OrganizationPath } from '../../nav/paths';
import { useDeleteProjectMutation } from '../hooks/useProjectMutation';

type DeleteProjectProps = Readonly<{
  projectId: string;
  onSuccess: () => void;
}>;

export function DeleteProject({ projectId, onSuccess }: DeleteProjectProps) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  function onMutationSuccess() {
    console.log('container.project.components.DeleteProject.onMutationSuccess');
    onSuccess();
    setIsLoading(false);
    navigate(OrganizationPath);
  }

  function onMutationError(err: string) {
    console.error(
      'containers.project.components.DeleteProject.onMutationError',
      err
    );
    setIsLoading(false);
  }
  const { deleteProjectMutation } = useDeleteProjectMutation({
    onSuccess: onMutationSuccess,
    onError: onMutationError,
  });

  const onSubmit = () => {
    setIsLoading(true);
    deleteProjectMutation.mutate(projectId);
  };

  return (
    <>
      <Form
        form={form}
        name="deleteProject"
        size="large"
        wrapperCol={{ span: 24 }}
        onFinish={onSubmit}
      >
        <Typography.Paragraph style={{ paddingBottom: '20px' }}>
          Are you sure you want to delete this project?
        </Typography.Paragraph>
        <Form.Item style={{ textAlign: 'end' }}>
          <Button type="primary" htmlType="submit" loading={isLoading}>
            Delete
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
