import { useCallback } from 'react';
import { Progress, Typography } from 'antd';

import { useOrganizationHierarchy } from '../../containers/organization/hooks/useOrganizationHierarchy';
import { FREE_PROJECT_LIMIT } from '../constants';
import { useCurrentUser } from '../contexts/currentUserContext';
import { useAppModal } from './AppModal';

export function FreeProjectsCounter() {
  const { data: organization } = useOrganizationHierarchy();
  const { user } = useCurrentUser();

  const { showAppModal } = useAppModal();

  const numProjects = organization?.projects.length ?? 0;
  const isLimitReached = numProjects >= FREE_PROJECT_LIMIT;
  const percent = (numProjects / FREE_PROJECT_LIMIT) * 100;
  const color = isLimitReached ? '#FF2D55' : '#FDB034';
  const message = isLimitReached ? (
    `Your free projects have been used.`
  ) : (
    <>
      You have used{' '}
      <Typography.Text strong style={{ fontSize: 12 }}>
        {numProjects}/{FREE_PROJECT_LIMIT}
      </Typography.Text>{' '}
      free projects.
    </>
  );

  const updateSubscription = useCallback(() => {
    showAppModal({
      type: 'updateSubscription',
      payload: {
        email: user.email,
        source: 'freeProjectBanner',
        destination: 'newPlan',
      },
    });
  }, [showAppModal, user.email]);

  return (
    <div style={{ padding: 15 }}>
      <Progress
        percent={percent}
        strokeColor={color}
        showInfo={false}
        size={[200, 14]}
      />
      <div>
        <div style={{ margin: '5px 0' }}>
          <Typography.Text style={{ fontSize: 12 }}>{message}</Typography.Text>
        </div>
        {/* TODO: connect to payment plans popup */}
        <Typography.Link style={{ fontSize: 12 }} onClick={updateSubscription}>
          Get unlimited & more
        </Typography.Link>
      </div>
    </div>
  );
}
