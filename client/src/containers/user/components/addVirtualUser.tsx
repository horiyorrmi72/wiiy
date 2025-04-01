import { useCallback } from 'react';
import { Button, Flex, Form, Input, Select } from 'antd';

import { useSpecialties } from '../../organization/hooks/useSpecialties';
import useUserMutation from '../hooks/useUserMutation';

type AddTeamProps = Readonly<{
  parentTeamId?: string;
  onSuccess: () => void;
}>;

type FormValues = Readonly<{
  firstname?: string;
  lastname?: string;
  specialty: string;
  velocity?: number;
  email: string;
}>;

export function AddVirtualUser({ parentTeamId, onSuccess }: AddTeamProps) {
  const [form] = Form.useForm();
  const { data: specialties } = useSpecialties();

  const onError = useCallback((error: unknown) => {
    throw error;
  }, []);
  const { createVirtualUserMutation } = useUserMutation({ onSuccess, onError });

  const onFinish = useCallback(
    ({ firstname, lastname, specialty, velocity }: Required<FormValues>) => {
      createVirtualUserMutation.mutate({
        email: ' ',
        firstname,
        lastname,
        specialty,
        velocity,
      });
    },
    [createVirtualUserMutation]
  );

  return (
    <Flex justify="center">
      <Form
        form={form}
        name="addVirtualUser"
        size="large"
        labelCol={{ span: 8 }}
        wrapperCol={{ flex: 1 }}
        onFinish={onFinish}
      >
        <Form.Item
          name="firstname"
          label="First Name"
          rules={[{ required: true, message: 'Please add first name' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="lastname"
          label="Last Name"
          rules={[{ required: true, message: 'Please add last name' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Specialty"
          name="specialty"
          tooltip="Main job function for the user"
          rules={[{ required: true, message: 'Please specify a specialty' }]}
        >
          <Select>
            {specialties?.map((sp) => (
              <Select.Option key={sp.name} value={sp.name}>
                {sp.displayName}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Velocity"
          name="velocity"
          tooltip="Story points a user can complete every 2 weeks, usually between 5-10"
        >
          <Input type="number" />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Flex>
  );
}
