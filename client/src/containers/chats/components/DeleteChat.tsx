import { useState } from 'react';
import { ChatSession, RecordStatus } from '@prisma/client';
import { Button, Form, Typography } from 'antd';

import { useChatMutation } from '../hooks/useChatMutation';

type DeleteChatProps = Readonly<{
  chat: ChatSession;
  onSuccess: () => void;
}>;

export function DeleteChat({ chat, onSuccess }: DeleteChatProps) {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);

  const { upsertChatSessionMutation } = useChatMutation({
    onSuccess: (createdChatSession: ChatSession) => {
      console.log('Successfully deleted chat', createdChatSession);
      onSuccess();
      setIsLoading(false);
    },
    onError: () => {
      console.error('error');
      setIsLoading(false);
    },
  });

  const onSubmit = () => {
    setIsLoading(true);
    upsertChatSessionMutation.mutate({
      id: chat.id,
      name: chat.name as string,
      access: chat.access,
      status: RecordStatus.DEACTIVATED,
    });
  };

  return (
    <>
      <Form
        form={form}
        name="deleteChat"
        size="large"
        wrapperCol={{ span: 24 }}
        onFinish={onSubmit}
      >
        <Typography.Paragraph style={{ paddingBottom: '20px' }}>
          Are you sure you want to delete this chat?
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
