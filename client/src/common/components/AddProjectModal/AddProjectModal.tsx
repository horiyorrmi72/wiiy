import { FC } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Typography } from 'antd';

import { ReactComponent as WelcomeGraphic } from '../../icons/welcome_graphic.svg';

export interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onAddProject: () => void;
}

export const AddProjectModal: FC<WelcomeModalProps> = (props) => {
  const { open, onClose, onAddProject } = props;

  return (
    <Modal title="" open={open} onCancel={onClose} footer={() => null}>
      <Flex
        flex={1}
        align="center"
        justify="center"
        style={{ marginTop: '48px' }}
      >
        <WelcomeGraphic />
      </Flex>
      <Flex
        justify="center"
        style={{
          textAlign: 'center',
        }}
      >
        <Typography.Title level={4}>Welcome to Omniflow!</Typography.Title>
        <Typography.Text style={{ textAlign: 'center' }}>
          Please add a project below, and start experiencing the magic of
          Omniflow!
        </Typography.Text>
      </Flex>
      <Flex align="center" justify="center" style={{ marginTop: '48px' }}>
        <Button
          onClick={() => {
            onClose();
            onAddProject();
          }}
          block
          type="primary"
          icon={<PlusOutlined />}
        >
          Add Project
        </Button>
      </Flex>
    </Modal>
  );
};
