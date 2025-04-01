import { useCallback, useEffect, useRef, useState } from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Flex, Menu, MenuProps, Typography } from 'antd';
import { ItemType } from 'antd/es/menu/interface';
import { Outlet, redirect, useLocation, useNavigate } from 'react-router';

import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { SUBSCRIPTIONTIERS } from '../../../lib/constants';
import {
  DevVelocityPath,
  JiraAdminPath,
  ProfilePath,
  UsersAdminPath,
} from '../../nav/paths';

export function SettingIndex() {
  return redirect(DevVelocityPath);
}

export function Setting() {
  const { isAdmin, subscriptionTier } = useCurrentUser();

  const items: ItemType[] = [];

  items.push({
    label: 'Generation Settings',
    key: DevVelocityPath,
  });
  items.push({
    label: 'User Management',
    key: UsersAdminPath,
    disabled: !isAdmin,
  });
  items.push({
    label: 'Integration',
    key: JiraAdminPath,
    disabled:
      !isAdmin ||
      subscriptionTier === SUBSCRIPTIONTIERS.STARTER ||
      !subscriptionTier,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showArrows, setShowArrows] = useState(false);
  const [current, setCurrent] = useState(ProfilePath);
  const navigate = useNavigate();
  const location = useLocation();
  const activeKey = location.pathname.split('/').pop();

  useEffect(() => {
    setCurrent(activeKey || 'profile');
  }, [location.pathname, activeKey]);

  const onClick: MenuProps['onClick'] = useCallback(
    (e: any) => {
      setCurrent(e.key);
      navigate(e.key, { replace: true });
    },
    [navigate]
  );

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -150, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 150, behavior: 'smooth' });
    }
  };

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowArrows(scrollWidth > clientWidth);
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => {
      window.removeEventListener('resize', checkScrollability);
    };
  }, []);

  return (
    <div>
      <Typography.Title
        level={4}
        className="main-heading"
        style={{ marginBottom: '0' }}
      >
        Admin
      </Typography.Title>
      <div
        style={{ display: 'flex', alignItems: 'center', position: 'relative' }}
      >
        {showArrows && (
          <LeftOutlined
            onClick={handleScrollLeft}
            style={{
              cursor: 'pointer',
              marginRight: 8,
            }}
          />
        )}
        <div
          ref={scrollContainerRef}
          style={{
            display: 'flex',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            width: '100%',
            borderBottom: '1px solid rgba(5, 5, 5, 0.06)',
          }}
        >
          <Menu
            onClick={onClick}
            selectedKeys={[current]}
            mode="horizontal"
            items={items}
            style={{ flexWrap: 'nowrap', borderColor: 'transparent' }}
          />
        </div>
        {showArrows && (
          <RightOutlined
            onClick={handleScrollRight}
            style={{
              cursor: 'pointer',
              marginLeft: 8,
            }}
          />
        )}
      </div>
      <Flex style={{ marginTop: 16 }} justify="center">
        <Outlet />
      </Flex>
    </div>
  );
}
