import { useCallback } from 'react';
import { Button, Flex, Form, Input, Typography } from 'antd';

import useDocumentMutation from '../../project/hooks/useDocumentMutation';

type RequestDocumentAccessProps = Readonly<{
  documentId: string;
  message?: string;
  onSuccess: () => void;
}>;

type FormValues = Readonly<{
  message?: string;
}>;

export function RequestDocumentAccess({
  documentId,
  onSuccess,
}: RequestDocumentAccessProps) {
  const [form] = Form.useForm();

  const onError = useCallback((error: unknown) => {
    throw error;
  }, []);

  const { requestDocumentAccessMutation } = useDocumentMutation({
    onSuccess,
    onError,
  });

  const onFinish = useCallback(
    ({ message }: Required<FormValues>) => {
      requestDocumentAccessMutation.mutate({
        documentId,
        message,
      });
    },
    [documentId, requestDocumentAccessMutation]
  );

  return (
    <Flex justify="center" align="center" vertical>
      <h3>Access Denied</h3>
      <Typography.Paragraph>
        You don't have access to this document. Please request access below.
      </Typography.Paragraph>
      <Form
        form={form}
        name="requestAccess"
        size="large"
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 24 }}
        onFinish={onFinish}
        style={{ width: '80%' }}
      >
        <Form.Item name="message" label="Message">
          <Input.TextArea placeholder="message (optional)" rows={3} />
        </Form.Item>

        <Form.Item wrapperCol={{ span: 29 }} style={{ textAlign: 'center' }}>
          <Button type="primary" htmlType="submit">
            Request Access
          </Button>
        </Form.Item>
      </Form>
    </Flex>
  );
}
