import { useState } from 'react';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { Alert, Button, Card, Flex, Popconfirm, Typography } from 'antd';
import Paragraph from 'antd/es/typography/Paragraph';
import Title from 'antd/es/typography/Title';
import dayjs from 'dayjs';

import { useAppModal } from '../../../common/components/AppModal';
import { useCurrentUser } from '../../../common/contexts/currentUserContext';
import { SUBSCRIPTIONTIERSDISPLAYNAME } from '../../../lib/constants';
import trackEvent from '../../../trackingClient';
import { useCancelSubscriptionMutation } from '../hooks/useCancelSubscriptionMutation';
import { SubscriptionStatusType } from '../types/subscriptionTypes';
import CreditList from './CreditList';

import './Billing.scss';

export function Billing() {
  const [errorMsg, setErrorMsg] = useState<string>();
  const [successMsg, setSuccessMsg] = useState<string>();
  const { showAppModal } = useAppModal();
  const { user, isAdmin, organization } = useCurrentUser();
  const subscriptionEnd = organization.subscriptionEnd;
  console.log('subscriptionEnd: ', subscriptionEnd);
  const {
    subscriptionTier,
    subscriptionStatus, //
  } = useCurrentUser();

  const isSubscriptionActive = subscriptionStatus === 'ACTIVE';
  const isFreeSubscription = subscriptionTier === SubscriptionTier.FREE;

  const cancleSubscriptionMuatation = useCancelSubscriptionMutation({
    onSuccess: (data) => {
      setSuccessMsg('The subscription has been cancelled.');
      window.location.reload();
    },
    onError(error) {
      console.error(error.toString());
      setErrorMsg('Subscription cancellation failed:' + error.toString());
    },
  });

  const updatePlan = (credits: boolean = false) => {
    showAppModal({
      type: credits ? 'purchaseCredits' : 'updateSubscription',
      payload: {
        email: user.email,
        source: 'billing',
        destination: credits ? 'buyCredits' : 'upgradePlan',
      },
    });
    // track event
    // trackEvent(credits ? 'buyCredits' : 'upgradePlan', {
    //   distinct_id: user.email,
    //   payload: {
    //     currentPlan: subscriptionTier,
    //     currentStatus: subscriptionStatus,
    //   },
    // });
  };

  return (
    <div style={{ width: '100%' }} className="billing-page">
      <Typography.Title level={4} className="main-heading">
        Billing
      </Typography.Title>
      <div>
        {errorMsg && (
          <Alert type="error" message={errorMsg} style={{ marginBottom: 16 }} />
        )}
        {successMsg && (
          <Alert
            type="success"
            message={successMsg}
            style={{ marginBottom: 16 }}
          />
        )}
      </div>
      <Card>
        {!isFreeSubscription ? (
          <>
            <Typography>
              <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
                Subscription Plan
              </Title>
              <Paragraph>
                Current Plan: {SUBSCRIPTIONTIERSDISPLAYNAME[subscriptionTier]} (
                {SubscriptionStatusType[subscriptionStatus!]})
              </Paragraph>
              {subscriptionStatus ===
                SubscriptionStatus.CANCELED_YET_ACTIVE && (
                <Paragraph>
                  Your current plan will stop on{' '}
                  {dayjs(subscriptionEnd).format('MM/DD/YYYY')}
                </Paragraph>
              )}
              <Paragraph>
                Total available seats: {organization.totalSeats || 0}
              </Paragraph>
              <Paragraph>
                Remaining available seats: {organization.availableSeats || 0}
              </Paragraph>
            </Typography>

            <Flex gap="small" wrap>
              <Button type="primary" onClick={() => updatePlan()}>
                {isSubscriptionActive ? 'Upgrade Now' : 'Choose a Plan'}
              </Button>
              {!isFreeSubscription && isAdmin && (
                <Popconfirm
                  title="Cancel Plan"
                  description="Do you want to cancel the current subscription?"
                  onConfirm={(e) => {
                    cancleSubscriptionMuatation.mutate();
                    // track event
                    trackEvent('cancelPlan', {
                      distinct_id: user.email,
                      payload: JSON.stringify({
                        currentPlan: subscriptionTier,
                        currentStatus: subscriptionStatus,
                      }),
                    });
                  }}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button>Cancel Plan</Button>
                </Popconfirm>
              )}
            </Flex>
          </>
        ) : (
          <>
            <Typography>
              <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
                Choose a plan
              </Title>
              <Paragraph>You are currently on Free plan.</Paragraph>
            </Typography>
            <Button type="primary" onClick={() => updatePlan()}>
              Upgrade Plan
            </Button>
          </>
        )}
      </Card>
      <Card>
        <Typography>
          <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
            Credits
          </Title>
          <Paragraph>
            Current credit balance: {organization.credits || 0}
          </Paragraph>
          <Button
            type="primary"
            onClick={() => {
              updatePlan(true);
            }}
          >
            Purchase Credits
          </Button>
        </Typography>
        <br />
        <Paragraph>Credit History</Paragraph>
        <CreditList />
      </Card>
    </div>
  );
}
