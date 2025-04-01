import React from 'react';
import {
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';

import { ProjectOutput } from '../../../../../shared/types';
import { useAppModal } from '../../../common/components/AppModal';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';

enum DropdownOption {
  EDIT_PROJECT = 'EDIT_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',
}

type ProjectDropdownMenuProps = Readonly<{
  project: ProjectOutput;
}>;

export default function ProjectDropdownMenu({
  project,
}: ProjectDropdownMenuProps) {
  const { showAppModal } = useAppModal();
  const { user } = useCurrentUser();

  const { id, owner } = project;
  const ownerId = owner?.id;
  if (user?.id !== ownerId) {
    return null;
  }

  function clickEditProject(e: React.MouseEvent) {
    console.log(
      `containers.project.components.projectdropdownmenu.clickEditProject, projectId: ${id}`
    );
    showAppModal({ type: 'editProject', project: project });
  }

  function clickDeleteProject(e?: React.MouseEvent<Element, MouseEvent>) {
    console.log(
      `containers.project.components.projectdropdownmenu.clickDeleteProject, projectId: ${id}`
    );
    showAppModal({ type: 'deleteProject', projectId: id });
  }

  const items = [
    {
      label: 'Edit Project',
      key: DropdownOption.EDIT_PROJECT,
      icon: <EditOutlined />,
    },
    {
      label: 'Delete Project',
      key: DropdownOption.DELETE_PROJECT,
      icon: <DeleteOutlined />,
    },
  ];

  const itemClickHandlers = new Map<string, any>();
  itemClickHandlers.set('EDIT_PROJECT', clickEditProject);
  itemClickHandlers.set('DELETE_PROJECT', clickDeleteProject);

  function handleMenuClick(e: {
    item: any;
    key: string;
    keyPath: any;
    domEvent: any;
  }) {
    itemClickHandlers.get(e.key)();
  }

  const menuProps = {
    items,
    onClick: handleMenuClick,
  };

  return (
    <Dropdown menu={menuProps} trigger={['click']}>
      <EllipsisOutlined
        style={{
          display: 'inline',
          fontSize: '28px',
          color: '#6d8383',
          paddingTop: '0.2em',
          verticalAlign: 'bottom',
        }}
      />
    </Dropdown>
  );
}
