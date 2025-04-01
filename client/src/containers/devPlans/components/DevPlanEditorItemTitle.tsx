import { useCallback, useState } from 'react';
import { DeleteFilled, EditFilled, SaveFilled } from '@ant-design/icons';
import {
  Button,
  Collapse,
  Flex,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Typography,
} from 'antd';

import { UserIdCard } from '../../../common/components/UserCard';

type DevPlanEditorItemTitleProps = Readonly<{
  type: 'Epic' | 'Story' | 'Task';
  index: number;
  onDelete: (index: number) => void;
  onSave?: () => void;
}>;

export function DevPlanEditorItemTitle(props: DevPlanEditorItemTitleProps) {
  return (
    <Form.Item name={props.index} style={{ flex: 1 }}>
      <DevPlanEditorItemTitleContents {...props} />
    </Form.Item>
  );
}

type DevPlanEditorItemTitleContentsProps = DevPlanEditorItemTitleProps &
  Readonly<{
    value?: Readonly<{
      name: string;
      storyPoint: number;
      ownerUserId?: string;
      description?: string;
    }>;
  }>;
function DevPlanEditorItemTitleContents({
  type,
  index,
  value,
  onDelete,
  onSave,
}: DevPlanEditorItemTitleContentsProps) {
  const form = Form.useFormInstance();
  const [isEditing, setIsEditing] = useState(
    !Boolean(value?.name && value?.storyPoint)
  );

  const [taskActiveKeys, setTaskActiveKeys] = useState<string[]>(['0']);

  const startEditing = useCallback(
    (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      event.stopPropagation();
      setIsEditing((isEditing) => true);
    },
    []
  );
  const saveEdits = useCallback(
    (event: any) => {
      event.stopPropagation();
      form.validateFields(); // TODO: Is there a way to cleanly just validate this one item?

      const isValid =
        Boolean(value?.name) &&
        Boolean(value?.storyPoint) &&
        (type !== 'Task' || Boolean(value?.description)); // Only Task has description?

      if (isValid) {
        setIsEditing(false);
        onSave && onSave();
      }
    },
    [form, type, value?.name, value?.storyPoint, onSave, value?.description]
  );

  const title = `${type} ${index + 1}:`;

  if (type === 'Task') {
    return isEditing ? (
      <Flex gap={2} vertical>
        <Flex gap={10} align="center" className="accordion-header">
          <Flex gap={10} align="center" className="task-form-field">
            <Form.Item
              name={[index, 'name']}
              style={{ flex: 1 }}
              rules={[
                { required: true, message: `${type} Name is required` },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const regex =
                      /frontend|backend|fullstack|ios|android|data|qa|ml/g;
                    const matches = value.toLowerCase().match(regex);
                    if (!matches) {
                      return Promise.reject(
                        'please prefix the name with task type, for example "[Frontend]"'
                      );
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Input addonBefore={title} onClick={stopPropagation} />
            </Form.Item>
            {/* <Form.Item name={[index, 'ownerUserId']} style={{ width: '120px' }}>
            <EditableUserAvatarForTeam
              userId={value?.ownerUserId as string}
              size="16"
              onChange={(newUserId: string) => {
                return;
              }}
            />
          </Form.Item> */}
          </Flex>
          <Flex align="center" gap={10} style={{ marginLeft: 'auto' }}>
            <Form.Item
              name={[index, 'storyPoint']}
              style={{ width: '120px' }}
              rules={[{ required: true, message: 'Points are required' }]}
            >
              <InputNumber addonBefore="Points:" onClick={stopPropagation} />
            </Form.Item>
            <Button icon={<SaveFilled />} size="middle" onClick={saveEdits} />
            <DeleteButton type={type} index={index} onDelete={onDelete} />
          </Flex>
        </Flex>
        <Form.Item
          name={[index, 'description']}
          style={{ width: '100%' }}
          rules={[{ required: true, message: 'descriptions are required' }]}
        >
          <Input.TextArea
            autoSize={{ maxRows: 10 }}
            // defaultValue={value?.description}
            className="editable-text"
            style={{
              fontSize: '13px',
              background: 'inherit',
              cursor: 'pointer',
            }}
            placeholder="Task description"
            onBlur={saveEdits}
          />
        </Form.Item>
      </Flex>
    ) : (
      <Collapse
        size="small"
        bordered={false}
        style={{
          background: 'transparent',
          marginTop: '2px',
          marginBottom: '-10px',
        }}
        className="task-container"
        activeKey={taskActiveKeys}
        onChange={(e) => setTaskActiveKeys(e as string[])}
        items={[
          {
            key: index,
            label: (
              <Flex className="accordion-header">
                <Flex align="center" gap={6} style={{ flexWrap: 'wrap' }}>
                  <Flex align="start" gap={6}>
                    <Typography.Text style={{ whiteSpace: 'nowrap' }}>
                      {title}
                    </Typography.Text>
                    <Typography.Text>
                      {value?.name} ({value?.storyPoint || 0} Points)
                    </Typography.Text>
                  </Flex>
                  {value?.ownerUserId && (
                    <UserIdCard userId={value.ownerUserId} />
                  )}
                </Flex>
                <div style={{ flex: 1 }} />
                <Flex align="start" gap={10} style={{ marginLeft: 'auto' }}>
                  <Button
                    icon={<EditFilled />}
                    size="middle"
                    onClick={startEditing}
                  />
                  <DeleteButton type={type} index={index} onDelete={onDelete} />
                </Flex>
              </Flex>
            ),
            children: (
              <Form.Item
                name={[index, 'description']}
                rules={[
                  { required: true, message: 'descriptions are required' },
                ]}
              >
                <Input.TextArea
                  autoSize={{ maxRows: 10 }}
                  // defaultValue={value?.description}
                  className="editable-text"
                  style={{
                    fontSize: '13px',
                    background: 'inherit',
                    cursor: 'pointer',
                  }}
                  placeholder="Task description"
                  onBlur={saveEdits}
                />
              </Form.Item>
            ),
          },
        ]}
      />
    );
  }

  return isEditing ? (
    <Flex gap={10} align="center" className="accordion-header">
      <Form.Item
        name={[index, 'name']}
        style={{ flex: 1 }}
        rules={[
          { required: true, message: `${type} Name is required` },
          ({ getFieldValue }) => ({
            validator(_, value) {
              let name = getFieldValue('name').toLowerCase();
              const regex = /frontend|backend|fullstack|ios|android/g;
              const matches = name.match(regex);
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input addonBefore={title} onClick={stopPropagation} />
      </Form.Item>
      <Flex align="start" gap={10} style={{ marginLeft: 'auto' }}>
        <Button icon={<SaveFilled />} size="middle" onClick={saveEdits} />
        <DeleteButton type={type} index={index} onDelete={onDelete} />
      </Flex>
    </Flex>
  ) : (
    <Flex className="accordion-header">
      <Flex align="start" gap={6} style={{ flexWrap: 'wrap' }}>
        <Flex align="start" gap={6}>
          <Typography.Text style={{ whiteSpace: 'nowrap' }}>
            {title}
          </Typography.Text>
          <Typography.Text>
            {value?.name} ({value?.storyPoint || 0} Points)
          </Typography.Text>
        </Flex>
        {value?.ownerUserId && <UserIdCard userId={value.ownerUserId} />}
      </Flex>
      <div style={{ flex: 1 }} />
      <Flex align="start" gap={10} style={{ marginLeft: 'auto' }}>
        <Button icon={<EditFilled />} size="middle" onClick={startEditing} />
        <DeleteButton type={type} index={index} onDelete={onDelete} />
      </Flex>
    </Flex>
  );
}

type DeleteButtonProps = Pick<
  DevPlanEditorItemTitleContentsProps,
  'type' | 'index' | 'onDelete'
>;
function DeleteButton({ type, index, onDelete }: DeleteButtonProps) {
  const deleteItem = useCallback(() => {
    onDelete(index);
  }, [index, onDelete]);

  return (
    <Popconfirm
      title={`Delete ${type}`}
      description={`Are you sure you want to delete this ${type.toLowerCase()}?`}
      onConfirm={deleteItem}
    >
      <Button icon={<DeleteFilled />} size="middle" onClick={stopPropagation} />
    </Popconfirm>
  );
}

function stopPropagation(event: React.MouseEvent<HTMLElement, MouseEvent>) {
  event.stopPropagation();
}
