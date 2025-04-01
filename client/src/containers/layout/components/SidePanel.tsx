import { useCallback, useEffect, useState } from 'react';
import {
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { SubscriptionTier } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Drawer,
  Dropdown,
  Flex,
  Menu,
  MenuProps,
  Space,
  Typography,
} from 'antd';
import Sider from 'antd/es/layout/Sider';
import { signOut } from 'aws-amplify/auth';
import { useNavigate } from 'react-router';

import { useAppModal } from '../../../common/components/AppModal';
import { FreeProjectsCounter } from '../../../common/components/FreeProjectsCounter';
import { UserAvatar } from '../../../common/components/UserAvatar';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { ReactComponent as ChatIcon } from '../../../common/icons/chat-icon.svg';
import { ReactComponent as DocumentIcon } from '../../../common/icons/document-icon.svg';
import { ReactComponent as LogoIcon } from '../../../common/icons/logo.svg';
import { ReactComponent as ProjectIcon } from '../../../common/icons/project-icon.svg';
import { COLORS } from '../../../lib/constants';
import trackEvent from '../../../trackingClient';
import {
  BillingPath,
  HomePath,
  JiraAdminPath,
  ProfilePath,
  SettingsPath,
  UsersAdminPath,
  UserTemplateDocumentsPath,
} from '../../nav/paths';
import { useCollapsedNavigationMenuItems } from '../hooks/useCollapsedNavigationMenuItems';
import { useNormalNavigationMenuItems } from '../hooks/useNormalNavigationMenuItems';

enum AddNewOptions {
  NEW_PROJECT = 'NEW_PROJECT',
  NEW_DOCUMENT = 'DELETE_DOCUMENT',
  NEW_TEAM = 'NEW_TEAM',
  NEW_CHAT = 'NEW_CHAT',
}

const iconStyle = { width: '20px', height: '20px', color: COLORS.PRIMARY };

export default function SidePanel() {
  const [collapsed, setCollapsed] = useState(() => {
    const storedCollapsed = localStorage.getItem('sidebarCollapsed');
    return storedCollapsed ? JSON.parse(storedCollapsed) : false;
  });
  const [openKeys, setOpenKeys] = useState<ReadonlyArray<string>>([]);

  const { showAppModal } = useAppModal();

  const {
    normalMenuItems,
    openItemKeys: forcedOpenItemKeys,
    selectedItemKeys,
    organization,
  } = useNormalNavigationMenuItems();

  const { collapsedMenuItems } = useCollapsedNavigationMenuItems();

  const { user, subscriptionTier, isAdmin } = useCurrentUser();
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const onMenuItemOpened = useCallback((newOpenKeys: ReadonlyArray<string>) => {
    setOpenKeys(newOpenKeys);
  }, []);
  const onClickNew = (e: { key: string }) => {
    if (e.key === AddNewOptions.NEW_PROJECT) {
      showAppModal({ type: 'addProject' });
    } else if (e.key === AddNewOptions.NEW_DOCUMENT) {
      showAppModal({ type: 'addDocument' });
    } else if (e.key === AddNewOptions.NEW_TEAM) {
      showAppModal({ type: 'addTeam' });
    } else if (e.key === AddNewOptions.NEW_CHAT) {
      showAppModal({ type: 'addChat' });
    }
  };

  const onClick = useCallback(
    async ({ key }: { key: string }) => {
      // track event
      trackEvent('User Dropdown Click', {
        distinct_id: user.email,
        payload: JSON.stringify({
          key: key,
        }),
      });
      if (key === 'settings') {
        navigate(SettingsPath);
      } else if (key === 'profile') {
        navigate(ProfilePath);
      } else if (key === 'billing') {
        navigate(BillingPath);
      } else if (key === 'jiraAdmin') {
        navigate(JiraAdminPath);
      } else if (key === 'usersAdmin') {
        navigate(UsersAdminPath);
      } else if (key === UserTemplateDocumentsPath) {
        navigate(UserTemplateDocumentsPath);
      } else if (key === 'logout') {
        await signOut();
        queryClient.clear();
      } else if (key === 'invite') {
        // show add teammate popup
        showAppModal({ type: 'addTeamMember', teamId: '' });
      }
      setIsSidebarVisible(false);
    },
    [navigate, queryClient, user.email, showAppModal]
  );
  const items: MenuProps['items'] = isAdmin
    ? [
        {
          key: ProfilePath,
          label: 'My Profile',
        },
        {
          key: BillingPath,
          label: 'Billing',
        },
        {
          key: SettingsPath,
          label: 'Admin',
        },
      ]
    : [
        {
          key: ProfilePath,
          label: 'My Profile',
        },
      ];
  items.push(
    {
      type: 'divider',
    },
    {
      key: 'invite',
      label: 'Invite Team',
    },
    {
      key: 'logout',
      label: 'Logout',
    }
  );

  const addNewItems: MenuProps['items'] = [
    {
      key: AddNewOptions.NEW_CHAT,
      label: 'New Idea',
      icon: <ChatIcon style={iconStyle} />,
    },
    {
      key: AddNewOptions.NEW_DOCUMENT,
      label: 'New Document',
      icon: <DocumentIcon style={iconStyle} />,
    },
    {
      key: AddNewOptions.NEW_PROJECT,
      label: 'New Project',
      icon: <ProjectIcon style={iconStyle} />,
    },
    // {
    //   key: AddNewOptions.NEW_TEAM,
    //   label: 'New Team',
    //   icon: <TeamIcon style={iconStyle} />,
    // },
  ];

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const sidebarContent = (
    <Sider
      className="app-sider"
      width={isMobile ? 250 : 225}
      collapsed={!isMobile && collapsed}
      theme="light"
      style={{
        position: isMobile ? 'fixed' : 'relative',
        zIndex: isMobile ? 1000 : 'auto',
        overflow: 'hidden',
      }}
    >
      <Flex vertical>
        <Flex
          style={{
            backgroundColor: '#fff',
            padding: '15px',
            alignItems: 'center',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            justifyContent: !isMobile && collapsed ? 'center' : 'flex-start',
            cursor: 'pointer',
          }}
          onClick={() => {
            navigate(HomePath);
          }}
        >
          <LogoIcon style={{ width: '30px', height: '30px' }} />
          {(isMobile || !collapsed) && (
            <Typography.Text
              style={{
                fontSize: '1.8em',
                fontWeight: 'bold',
                marginLeft: '10px',
              }}
            >
              {organization?.name || 'Omniflow'}
            </Typography.Text>
          )}
        </Flex>
        <Flex
          style={{
            paddingLeft: !isMobile && collapsed ? '23px' : '18px',
            borderTop: `solid 1px ${COLORS.LIGHT_GRAY}`,
            borderBottom: `solid 1px ${COLORS.LIGHT_GRAY}`,
          }}
        >
          <Dropdown
            menu={{ items, onClick }}
            trigger={['click']}
            arrow
            placement="bottom"
          >
            <Space
              style={{
                marginTop: '8px',
                marginBottom: '8px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <UserAvatar user={user} />
              {!isMobile && collapsed ? (
                ''
              ) : (
                <span style={{ cursor: 'pointer' }}>{user.username}</span>
              )}
            </Space>
          </Dropdown>
        </Flex>
        <Flex
          style={{
            marginLeft: !isMobile && collapsed ? '27px' : '18px',
            marginTop: '15px',
            marginBottom: '5px',
          }}
        >
          <Dropdown
            menu={{ items: addNewItems, onClick: onClickNew }}
            trigger={['click']}
          >
            <Button
              id="add-project-btn"
              type="primary"
              icon={<PlusOutlined />}
              size={!isMobile && collapsed ? 'small' : 'middle'}
              style={{
                marginRight: '10px',
                borderRadius: !isMobile && collapsed ? '50%' : undefined,
                width:
                  !isMobile && collapsed
                    ? undefined
                    : isMobile
                      ? '222px'
                      : '192px',
                fontSize: '15px',
              }}
            >
              {!isMobile && collapsed ? '' : 'Add New'}
            </Button>
          </Dropdown>
        </Flex>
        <Flex
          vertical
          style={{
            flexGrow: 1,
            height: isMobile ? 'calc(100vh - 175px)' : 'calc(100vh - 230px)',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              overflow: 'auto',
              height:
                subscriptionTier !== SubscriptionTier.FREE
                  ? '100%'
                  : 'calc(100% - 150px)',
            }}
          >
            <Menu
              selectedKeys={selectedItemKeys}
              openKeys={[...openKeys, ...(collapsed ? [] : forcedOpenItemKeys)]}
              mode="inline"
              inlineIndent={12}
              theme="light"
              items={collapsed ? collapsedMenuItems : normalMenuItems}
              onOpenChange={onMenuItemOpened}
              onClick={() => setIsSidebarVisible(false)}
              style={{
                flex: 1,
                overflowY: 'auto',
                borderInlineEnd: 'none',
                marginLeft: collapsed ? '-4px' : '0',
                paddingLeft: collapsed ? '0' : '2px',
              }}
            />
          </div>
          {subscriptionTier === SubscriptionTier.FREE && (
            <div
              style={{
                position: 'absolute',
                bottom: 48,
                backgroundColor: 'white',
              }}
            >
              <FreeProjectsCounter />
              <Button
                color="primary"
                variant="filled"
                style={{ margin: '0 7px' }}
                href="https://bit.ly/3B88K2g"
                target="_blank"
              >
                Join our slack community
              </Button>
            </div>
          )}
        </Flex>
      </Flex>
      {!isMobile && (
        <Flex style={{ position: 'relative' }}>
          <div
            className="toggle-button-container"
            onClick={() => {
              const newVal = !collapsed;
              setCollapsed(newVal);
              localStorage.setItem('sidebarCollapsed', JSON.stringify(newVal));
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
        </Flex>
      )}
    </Sider>
  );

  return (
    <>
      {isMobile ? (
        <>
          <Button
            icon={<MenuOutlined />}
            onClick={() => setIsSidebarVisible(true)}
            style={{
              position: 'absolute',
              top: '14px',
              left: '16px',
              zIndex: 105,
            }}
          />
          <Drawer
            open={isSidebarVisible}
            placement="left"
            onClose={() => setIsSidebarVisible(!isSidebarVisible)}
            width={250}
            styles={{
              body: { padding: 0 },
              header: {
                position: 'absolute',
                top: '25px',
                right: 0,
                border: 'none',
                padding: '0',
                zIndex: 9999,
              },
            }}
          >
            {sidebarContent}
          </Drawer>
        </>
      ) : (
        sidebarContent
      )}
    </>
  );
}
