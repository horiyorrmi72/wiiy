import { useCallback, useEffect, useState } from 'react';
import { FileAddFilled } from '@ant-design/icons';
import { Project } from '@prisma/client';
import { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router';
import { Link } from 'react-router-dom';

import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { ReactComponent as ChatIcon } from '../../../common/icons/chat-icon.svg';
import { ReactComponent as DocumentIcon } from '../../../common/icons/document-icon.svg';
import { ReactComponent as HomeIcon } from '../../../common/icons/home-icon.svg';
import { ReactComponent as ProjectIcon } from '../../../common/icons/project-icon.svg';
import { ReactComponent as TaskIcon } from '../../../common/icons/task-icon.svg';
import { ReactComponent as TeamsIcon } from '../../../common/icons/teams-icon.svg';
import { COLORS } from '../../../lib/constants';
import {
  DashboardPath,
  DocumentsPath,
  HomePath,
  IdeasPath,
  OrganizationPath,
  ProjectsPath,
  TeamPath,
  TemplateDocumentPath,
} from '../../nav/paths';
import { useOrganizationHierarchy } from '../../organization/hooks/useOrganizationHierarchy';
import {
  OrganizationHierarchy,
  TeamHierarchy,
} from '../../organization/types/organizationTypes';
import { ProjectDropdownOperMenu } from '../components/ProjectDropdownOperMenu';

type MenuItem = Readonly<Required<MenuProps>['items'][number]>;

type MenuItemAndSelectionInfo = Readonly<{
  menuItem: MenuItem;
  openKeys: string[]; // The keys of every open item from this menu item down
  selectedKeys: string[]; // The keys of every selected item from this menu item down
}>;

type WithKey = Readonly<{ key: string }>;

type NavigationMenuItems = Readonly<{
  normalMenuItems: MenuItem[];
  openItemKeys: string[];
  selectedItemKeys: string[];
  organization: OrganizationHierarchy;
}>;

const iconStyle: React.CSSProperties = {
  width: '18px',
  height: '18px',
  color: COLORS.ICON_GRAY,
};

const subMenuIconStyle = { ...iconStyle, height: '16px', width: '16px' };

// The key for a menu item should always be the URL to that menu item from root (i.e. /projects/xyz)
export function useNormalNavigationMenuItems(): NavigationMenuItems {
  const { hasProfile } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: organization, isError, error } = useOrganizationHierarchy();

  const [selectedKey, setSelectedKey] = useState(location.pathname?.slice(1));
  useEffect(() => {
    setSelectedKey(location.pathname?.slice(1));
  }, [location.pathname]);

  // When a menuItem is clicked, we check if we are already navigated to its key, and if not we navigate
  // We cannot just render Links for the menu items because the grouping menu items need to be able to expand or collapse if we don't navigate here.
  const onMenuItemClicked = useCallback(
    ({ key }: WithKey) => {
      console.log('onMenuItemClicked:', key, location.pathname);
      if (location.pathname !== key) {
        navigate(key);
      }
    },
    [location.pathname, navigate]
  );

  // Helper function to return a menu item for a project.
  // Returns information about whether the project should be marked as currently selected as well
  const menuItemForProject = useCallback(
    (project: Project): MenuItemAndSelectionInfo => {
      const key = `/${ProjectsPath}/${project.id}`;
      return {
        menuItem: {
          key,
          label: (
            <ProjectDropdownOperMenu
              project={project}
              menuItemKey={key}
              onMenuItemClicked={() => {
                onMenuItemClicked({ key });
              }}
            />
          ),
          icon: <ProjectIcon style={subMenuIconStyle} />,
        },
        openKeys: [], // Projects cannot be expanded in the menu
        selectedKeys: location.pathname.startsWith(key) ? [key] : [],
      };
    },
    [location.pathname, onMenuItemClicked]
  );

  // Helper function to return a menu item for a team.
  // Returns the team menu item and recursively all teams below it, along with their projects
  // For each team, it includes a list of all the selected menu items and open menu items at that team or below in the hierarchy
  const menuItemForTeam = useCallback(
    (team: TeamHierarchy): MenuItemAndSelectionInfo => {
      const key = `/${TeamPath}/${team.id}`;
      const childInfo = [
        ...team.projects.map(menuItemForProject),
        ...team.teams.map(menuItemForTeam),
      ];

      // Combine the openKeys and selectedKeys and menuItems from all our children
      const openKeys = childInfo.map((child) => child.openKeys).flat();
      const selectedKeys = childInfo.map((child) => child.selectedKeys).flat();

      if (location.pathname.startsWith(key)) {
        selectedKeys.unshift(key); // If we are directly selected, add ourselves at the beginning of the selected list
      }
      if (openKeys.length || selectedKeys.length) {
        openKeys.unshift(key); // If any of our children are open, or are selected, we are open.
      }

      return {
        menuItem: {
          key,
          label: <Link to={`/${TeamPath}/${team.id}`}>{team.name}</Link>,
          icon: <TeamsIcon style={subMenuIconStyle} />,
          // children: children?.length ? children : undefined,
        },
        openKeys,
        selectedKeys,
      };
    },
    [location.pathname, menuItemForProject]
  );

  if (isError) {
    throw error;
  }

  const normalMenuItems: MenuItem[] = [];
  const openItemKeys: string[] = [];
  const selectedItemKeys: string[] = [];

  if (hasProfile) {
    const key = `/${HomePath}`;
    normalMenuItems.push({
      key,
      label: 'Home',
      icon: <HomeIcon style={iconStyle} />,
      onClick: onMenuItemClicked,
    });
    if (location.pathname.startsWith(key)) {
      selectedItemKeys.push(key);
    }
  }

  if (organization) {
    const key = `/${OrganizationPath}`;
    openItemKeys.push(key); // Always keep the organization item open
    if (location.pathname.startsWith(key)) {
      selectedItemKeys.push(key);
    }

    const projectsInfo = [...organization.projects.map(menuItemForProject)];

    const teamsInfo = [...organization.teams.map(menuItemForTeam)];

    selectedItemKeys.push(
      ...projectsInfo.map((child) => child.selectedKeys).flat(),
      ...teamsInfo.map((child) => child.selectedKeys).flat()
    );
    openItemKeys.push(...projectsInfo.map((child) => child.openKeys).flat());
    openItemKeys.push(...teamsInfo.map((child) => child.openKeys).flat());

    normalMenuItems.push(
      {
        key: `/${DashboardPath}`,
        label: 'Dashboard',
        icon: <TaskIcon style={iconStyle} />,
        className:
          selectedKey === DashboardPath ? 'root-menu-selected' : undefined,
        onClick: onMenuItemClicked,
      },
      {
        key: `/${TemplateDocumentPath}`,
        label: 'Templates',
        icon: <FileAddFilled style={{ fontSize: '16px' }} />,
        className:
          selectedKey === TemplateDocumentPath
            ? 'root-menu-selected'
            : undefined,
        onClick: onMenuItemClicked,
      },
      {
        type: 'divider',
      },
      {
        key: `/${IdeasPath}`,
        label: 'Ideas',
        className: selectedKey === IdeasPath ? 'root-menu-selected' : undefined,
        icon: <ChatIcon style={iconStyle} />,
        onClick: onMenuItemClicked,
      },
      {
        key: `/${DocumentsPath}`,
        label: 'Documents',
        icon: <DocumentIcon style={iconStyle} />,
        className: 'documents',
        onClick: onMenuItemClicked,
      },
      {
        key: OrganizationPath,
        label: 'Projects',
        icon: <ProjectIcon style={iconStyle} />,
        className:
          selectedKey === OrganizationPath ? 'root-menu-selected' : undefined,
        onTitleClick: onMenuItemClicked,
        // onClick: onMenuItemClicked,
        children: projectsInfo.map((c) => c.menuItem),
      },
      // {
      //   type: 'divider',
      // },
      // {
      //   key: `TeamsPath`,
      //   label: 'Teams',
      //   icon: <TeamsIcon style={iconStyle} />,
      //   onClick: onMenuItemClicked,
      //   children: teamsInfo.map((c) => c.menuItem),
      // }
    );
    if (location.pathname.startsWith(`/${DocumentsPath}`)) {
      selectedItemKeys.push(`/${DocumentsPath}`);
    }
  }

  return {
    normalMenuItems,
    openItemKeys,
    selectedItemKeys,
    organization: organization as OrganizationHierarchy,
  };
}
