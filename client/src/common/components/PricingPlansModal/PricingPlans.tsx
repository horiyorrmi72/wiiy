import { useEffect, useState } from 'react';
import { CheckCircleTwoTone, FireOutlined } from '@ant-design/icons';
import {
  Button,
  Divider,
  Flex,
  Segmented,
  Select,
  Tag,
  Typography,
} from 'antd';

import trackEvent from '../../../trackingClient';
import { useCurrentUser } from '../../contexts/currentUserContext';
import { CREDITS, Plan, PLANS } from './PricingPlans.constants';

import './PricingPlans.scss';

const PlanCard = (props: { plan: Plan; selectedPlanTerm: string }) => {
  const { plan, selectedPlanTerm } = props;
  const { user, subscriptionTier } = useCurrentUser();
  const isPlanActive = plan.key === subscriptionTier;
  const isAnnuallySelected = selectedPlanTerm === 'Annually(20% off)';
  console.log('isAnnuallySelected', isAnnuallySelected);

  return (
    <Flex vertical className={isPlanActive ? 'activePlan' : ''}>
      <Flex justify="space-between">
        <div>
          <Typography.Text className="heading">
            {plan.title}&nbsp;
          </Typography.Text>
          {plan.title === 'Pro' && !isPlanActive && (
            <Tag color="#5570F1">
              <FireOutlined /> Popular
            </Tag>
          )}
        </div>
        <div>
          <Typography.Text
            className={isAnnuallySelected ? 'strike-price' : 'price'}
            style={{
              color: isAnnuallySelected ? '#8B8D97' : '#5570F1',
              textDecoration: isAnnuallySelected ? 'line-through' : 'none',
            }}
          >
            {plan.price}
          </Typography.Text>
          {isAnnuallySelected && (
            <Typography.Text className="price">
              {plan.annualPrice}
            </Typography.Text>
          )}
        </div>
      </Flex>
      <Flex vertical>
        <Typography.Text
          style={{ fontSize: 12, color: '#8B8D97', margin: '5px 0' }}
        >
          Billed{' '}
          {isAnnuallySelected
            ? plan.subtitleAnnualPlan
            : plan.subtitleMonthlyPlan}
        </Typography.Text>
        <Typography.Text style={{ margin: '5px 0 10px' }}>
          {plan.target}
        </Typography.Text>
      </Flex>
      <Flex vertical>
        {plan.monthlyUrl && (
          <div style={{ marginTop: 10 }}>
            <a
              href={isAnnuallySelected ? plan.yearlyUrl : plan.monthlyUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Button
                type={'primary'}
                style={{ width: '100%' }}
                disabled={isPlanActive}
                onClick={() => {
                  console.log('selectPlan', plan.title);
                  trackEvent('selectPlan', {
                    distinct_id: user.email,
                    payload: JSON.stringify({
                      planType: plan.title,
                    }),
                  });
                }}
              >
                {isPlanActive ? 'Currently Selected' : `Choose ${plan.title}`}
              </Button>
            </a>
          </div>
        )}
        {plan.sections.map((section: any, index: number) => (
          <div key={section.title + index} style={{ marginTop: 0 }}>
            {section.previousTier && (
              <Flex>
                <Typography.Text
                  style={{ fontSize: 12, fontWeight: 700, marginTop: 10 }}
                >
                  Everything in {section.previousTier}, plus:
                </Typography.Text>
              </Flex>
            )}
            {section.title && (
              <Typography.Text
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 0,
                  display: 'none',
                }}
              >
                {section.title}
              </Typography.Text>
            )}
            <Flex vertical style={{ marginTop: 0 }}>
              {section.features.map((feature: any, index: number) => (
                <Flex
                  key={feature + index}
                  style={{ marginTop: 8 }}
                  align={'flex-start'}
                >
                  <CheckCircleTwoTone twoToneColor={'#5570F1'} />
                  <Typography.Text style={{ fontSize: 12, marginLeft: 5 }}>
                    {feature}
                  </Typography.Text>
                </Flex>
              ))}
            </Flex>
          </div>
        ))}
      </Flex>
    </Flex>
  );
};
export interface UpdateSubscriptionProps {
  email: string;
  source: string;
  destination: string;
}
export function UpdateSubscription({
  payload,
}: {
  payload: UpdateSubscriptionProps;
}) {
  const [selectedPlanTerm, setSelectedPlanTerm] = useState('Annually(20% off)');
  const [selectCredit, setSelectCredit] = useState(0);

  const { email, source, destination } = payload;
  useEffect(() => {
    trackEvent('viewPaywall', {
      distinct_id: email,
      payload: JSON.stringify({
        source,
        destination,
      }),
    });
  });

  return (
    <>
      <Flex justify={'center'} style={{ marginTop: 10 }}>
        <Segmented<string>
          block
          style={{ width: '300px' }}
          options={['Monthly', 'Annually(20% off)']}
          onChange={(value) => {
            setSelectedPlanTerm(value);
            // track event
            trackEvent('selectPlanTerm', {
              distinct_id: email,
              payload: JSON.stringify({ planTerm: value }),
            });
          }}
          defaultValue="Annually(20% off)"
        />
      </Flex>
      <Flex justify="center">
        <Typography.Text style={{ fontSize: 16, marginTop: '15px' }}>
          {/* Use Promo code <b>OMNIFLOWAI</b> for 20% off by 8/31/2024 */}
        </Typography.Text>
      </Flex>
      <div className={'plans-container'}>
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.title}
            plan={plan}
            selectedPlanTerm={selectedPlanTerm}
          />
        ))}
      </div>
      <Divider />
      <Flex
        align="center"
        justify="space-between"
        gap="middle"
        className="pricing-plans-footer"
      >
        <Flex
          align="center"
          justify="flex-start"
          gap="middle"
          className="buy-credit-main"
        >
          Buy More Credits:
          <Flex align="center" justify="flex-start" gap="middle">
            <Select
              defaultValue={{ label: '10,000 - $10', value: 0 }}
              labelInValue
              options={CREDITS}
              onChange={(val) => {
                setSelectCredit(val.value);
                // track event
                trackEvent('selectCredit', {
                  distinct_id: email,
                  payload: JSON.stringify({ credits: val.label }),
                });
              }}
            />
            <a
              target="_blank"
              href={CREDITS[selectCredit].url}
              title={`Buy ${CREDITS[selectCredit].label} credits`}
              rel="noreferrer"
            >
              <Button
                type="primary"
                onClick={() => {
                  trackEvent('buyCredit', {
                    distinct_id: email,
                    payload: JSON.stringify({
                      credits: CREDITS[selectCredit].label,
                    }),
                  });
                }}
              >
                Buy
              </Button>
            </a>
          </Flex>
        </Flex>
        <p style={{ margin: 0, textAlign: 'center' }}>
          For Enterprise customers,
          <span style={{ marginLeft: 5 }}>
            please contact us at{' '}
            <a href={'mailto:sales@omniflow.team'}>sales@omniflow.team</a>
          </span>
        </p>
      </Flex>
    </>
  );
}
