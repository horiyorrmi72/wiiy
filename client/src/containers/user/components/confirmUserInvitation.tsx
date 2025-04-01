import { useCallback, useState } from 'react';
import { Alert, Button, Flex, Form, Input, Typography } from 'antd';

import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import trackEvent from '../../../trackingClient';
import useUserMutation from '../hooks/useUserMutation';

type ConfirmUserInvitationProps = Readonly<{
  onSuccess: () => void;
}>;

type FormValues = Readonly<{
  inviterEmail?: string;
}>;

export function ConfirmUserInvitation({
  onSuccess,
}: ConfirmUserInvitationProps) {
  const [form] = Form.useForm();
  const { user } = useCurrentUser();
  const [errorMsg, setErrorMsg] = useState<string>();

  const { confirmUserInvitationMutation } = useUserMutation({
    onSuccess: () => {
      setErrorMsg('');
      onSuccess();
      // track event for user confirmation
      trackEvent('confirmUserInvitationSuccess', {
        distinct_id: user.email,
        payload: JSON.stringify({
          inviteeEmail: user.email,
        }),
      });
    },
    onError: (error) => setErrorMsg(error.toString()),
  });

  const onFinish = useCallback(
    ({ inviterEmail }: Required<FormValues>) => {
      confirmUserInvitationMutation.mutate({
        inviterEmail,
      });
      // track event for user confirmation
      trackEvent('confirmUserInvitation', {
        distinct_id: user.email,
        payload: JSON.stringify({
          inviterEmail,
        }),
      });
    },
    [confirmUserInvitationMutation, user.email]
  );

  return (
    <Flex justify="center" vertical>
      {errorMsg && (
        <Alert
          message={errorMsg}
          type="warning"
          showIcon={true}
          style={{ marginBottom: '20px' }}
        />
      )}
      {!errorMsg && (
        <Alert
          message="Omniflow is currently by invitation only. Please enter your inviter email."
          type="info"
          showIcon={true}
          style={{ marginBottom: '20px' }}
        />
      )}
      <Form
        form={form}
        name="confirmInvitation"
        size="large"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 40 }}
        onFinish={onFinish}
        style={{ width: '100%', textAlign: 'center' }}
      >
        <Form.Item
          name="inviterEmail"
          label="Inviter Email"
          rules={[
            { required: true, message: 'Please enter your inviter email' },
          ]}
        >
          <Input placeholder="please enter your inviter email" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" style={{ marginRight: 20 }}>
            Confirm invitation
          </Button>
        </Form.Item>

        <Typography.Paragraph style={{ fontSize: 14 }}>
          If you don't have an inviter email, please
          <Button
            type="link"
            htmlType="submit"
            style={{ fontSize: '14px', padding: '7px 5px' }}
            href="https://www.omniflow.team/contact"
          >
            request access
          </Button>
        </Typography.Paragraph>
      </Form>
    </Flex>
  );
}
