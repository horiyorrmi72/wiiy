import {
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';
import { Project } from '@prisma/client';
import { Dropdown, Flex, Space, Typography } from 'antd';

import { ProjectOutput } from '../../../../../shared/types';
import { useAppModal } from '../../../common/components/AppModal';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';

import './DropdownOperMenu.scss';

type WithKey = Readonly<{ key: string }>;

interface ProjectDropdownMenuProps {
  isShowDots?: boolean;
  menuItemKey: string;
  project: Project;
  onMenuItemClicked: ({ key }: WithKey) => void;
}

enum DropdownOption {
  EDIT_PROJECT = 'EDIT_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',
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

export function ProjectDropdownOperMenu({
  isShowDots,
  menuItemKey,
  project,
  onMenuItemClicked,
}: ProjectDropdownMenuProps) {
  const { showAppModal } = useAppModal();
  const { user, isAdmin } = useCurrentUser();

  function clickEditProject(e: React.MouseEvent) {
    console.log(
      `containers.project.components.projectdropdownmenu.clickEditProject, projectId: ${project.id}`
    );
    showAppModal({
      type: 'editProject',
      project: {
        ...project,
      } as ProjectOutput,
    });
  }

  function clickDeleteProject(e?: React.MouseEvent<Element, MouseEvent>) {
    console.log(
      `containers.project.components.projectdropdownmenu.clickDeleteProject, projectId: ${project.id}`
    );
    showAppModal({ type: 'deleteProject', projectId: project.id });
  }

  const itemClickHandlers = new Map<string, any>();
  itemClickHandlers.set('EDIT_PROJECT', clickEditProject);
  itemClickHandlers.set('DELETE_PROJECT', clickDeleteProject);

  function handleMenuClick(e: { key: string }) {
    itemClickHandlers.get(e.key)();
  }

  const menuProps = {
    items,
    onClick: handleMenuClick,
  };

  if (isShowDots) {
    return project.ownerUserId === user?.id || isAdmin ? (
      <Dropdown
        menu={menuProps}
        trigger={['click']}
        className="project-dropdown-operation"
      >
        <div
          style={{
            fontSize: '20px',
            textAlign: 'center',
            position: 'relative',
            top: '-5px',
          }}
        >
          ...
        </div>
      </Dropdown>
    ) : (
      <></>
    );
  }

  return (
    <Flex justify="space-between" align="center" className="dropdown-container">
      <Typography.Text
        onClick={() => onMenuItemClicked({ key: menuItemKey })}
        ellipsis
        style={{ maxWidth: '125px' }}
      >
        {project.name}
      </Typography.Text>

      {(project.ownerUserId === user?.id || isAdmin) && (
        <Space className="dropdown-operation">
          <Dropdown
            menu={menuProps}
            trigger={['click']}
            className="dropdown-operation"
          >
            <EllipsisOutlined
              style={{
                display: 'inline',
                fontSize: '16px',
                color: '#6d8383',
                paddingTop: '0.1em',
                verticalAlign: 'middle',
              }}
            />
          </Dropdown>
        </Space>
      )}
    </Flex>
  );
}
