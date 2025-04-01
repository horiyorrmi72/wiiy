import { useCallback, useEffect, useRef, useState } from 'react';
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Specialty } from '@prisma/client';
import {
  Button,
  Divider,
  Flex,
  Input,
  InputRef,
  Popover,
  Space,
  Tag,
  Tooltip,
  Tree,
  TreeDataNode,
} from 'antd';

import { useAppModal } from '../../../common/components/AppModal';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { isFeatureLocked } from '../../../common/util/app';
import trackEvent from '../../../trackingClient';
import { useSpecialties } from '../../organization/hooks/useSpecialties';
import useSpecialtyMutation from '../../organization/hooks/useSpecialtyMutation';

type DevPlanSpecialtyInputProps = Readonly<{
  value: ReadonlyArray<string>;
  onChange?: (value: ReadonlyArray<string>) => void;
}>;

export function DevPlanSpecialtyInput({
  value,
  onChange,
}: DevPlanSpecialtyInputProps) {
  const { data: specialties, isError, error } = useSpecialties();
  const { user, subscriptionStatus, subscriptionTier } = useCurrentUser();
  const { showAppModal } = useAppModal();
  const [isOpen, setIsOpen] = useState(false);
  const [docTreeData, setDocTreeData] = useState<TreeDataNode[]>([]);
  const [defaultValues, setDefaultValues] = useState<string[]>([]);

  const [name, setName] = useState('');
  const inputRef = useRef<InputRef>(null);

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const isNewRoleLocked = isFeatureLocked(
    subscriptionStatus as string,
    subscriptionTier as string
  );

  useEffect(() => {
    const treeData: TreeDataNode[] = [];
    specialties?.forEach((item) => {
      treeData.push({
        key: String(item.name),
        title: item.displayName,
      });
    });
    setDocTreeData(treeData);
  }, [specialties, onChange, value]);

  useEffect(() => {
    const clickBody = () => {
      setIsOpen(false);
    };

    window.document.body.addEventListener('click', clickBody);
    return () => {
      window.document.body.removeEventListener('click', clickBody);
    };
  }, []);

  const onAddSpecialtySuccess = useCallback(
    (output: Partial<Specialty>) => {
      console.log('output: =>', output);
      // now auto select newly added specialty and recalc dev plan
      if (output.name && onChange) {
        onChange([...value, output.name]);
        setName('');
      }
    },
    [value, onChange]
  );

  const { upsertSpecialtyMutation } = useSpecialtyMutation({
    onSuccess: onAddSpecialtySuccess,
  });

  const addSkill = (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => {
    e.preventDefault();
    if (isNewRoleLocked) {
      showAppModal({
        type: 'updateSubscription',
        payload: {
          email: user.email,
          source: 'devPlanSelectRole',
          destination: 'addNewRole',
        },
      });
    } else {
      if (!name) {
        return;
      }
      setIsOpen(false);
      showAppModal({ type: 'addVirtualUser' });
    }
    upsertSpecialtyMutation.mutate({
      displayName: name,
    });
    // track event
    trackEvent('addNewSpecialty', {
      distinct_id: user.email,
      payload: JSON.stringify({
        specialtyName: name,
      }),
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const onSpecialtyChange = useCallback(
    (selectedSpecialtyNames: ReadonlyArray<string>) => {
      console.log('selectedSpecialtyNames: =>', selectedSpecialtyNames);
      if (selectedSpecialtyNames && onChange) {
        onChange(selectedSpecialtyNames);
      }
    },
    [onChange]
  );

  if (isError) {
    throw error;
  }

  const selectedNames = specialties
    ?.filter((item) => value?.includes(item.name))
    ?.map((item) => item.displayName);

  return (
    <Popover
      open={isOpen}
      content={
        <Flex vertical>
          <Flex
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Tree
              style={{ maxHeight: '500px', overflow: 'auto' }}
              checkable
              defaultCheckedKeys={(value || defaultValues) as string[]}
              checkedKeys={value as string[]}
              treeData={docTreeData}
              onCheck={(checkedKeys) => {
                onSpecialtyChange(checkedKeys as string[]);
              }}
            />
          </Flex>
          <Divider style={{ margin: '8px 0' }} />
          <Space
            style={{ padding: '0 8px 4px' }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Input
              placeholder="Please enter new role name"
              style={{ maxWidth: 248, width: '100%' }}
              ref={inputRef}
              value={name}
              onChange={onNameChange}
              onKeyDown={(e) => e.stopPropagation()}
              required={true}
            />
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={addSkill}
            >
              Add New Role
              {isNewRoleLocked && (
                <Tooltip title="Upgrade to Performance plan for access">
                  <InfoCircleOutlined style={{ color: 'orange' }} />
                </Tooltip>
              )}
            </Button>
          </Space>
        </Flex>
      }
      title="Roles"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="custom-input"
      >
        {selectedNames?.length ? (
          <>
            <div className="input-content">{selectedNames?.slice(0, 1)}</div>
            {selectedNames?.length > 1 ? (
              <Tag
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  marginRight: 0,
                }}
              >
                +{selectedNames.length - 1}
              </Tag>
            ) : (
              ''
            )}
          </>
        ) : (
          <div className="text-ellipsis placeholder">
            Add the roles needed for the work
          </div>
        )}
      </div>
    </Popover>
  );
}
