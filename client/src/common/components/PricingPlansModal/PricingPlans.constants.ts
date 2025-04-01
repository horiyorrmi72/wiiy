import { SUBSCRIPTIONTIERS } from '../../../lib/constants';

type Section = {
  previousTier?: string;
  title?: string;
  features: string[];
};

export type Plan = {
  title: string;
  key: string;
  target: string;
  monthlyUrl?: string;
  yearlyUrl?: string;
  price?: string;
  annualPrice?: string;
  subtitleMonthlyPlan: string;
  subtitleAnnualPlan: string;
  isCurrentPlan: boolean;
  sections: Section[];
};

export const PLANS: Plan[] = [
  {
    title: 'Essential',
    key: SUBSCRIPTIONTIERS.STARTER,
    target:
      'for individuals and small teams to quickly ideate and start new projects',
    monthlyUrl: process.env.REACT_APP_STRIPE_STARTER_MONTHLY_URL,
    yearlyUrl: process.env.REACT_APP_STRIPE_STARTER_YEARLY_URL,
    price: '$19.99/mo',
    annualPrice: '$15.99/mo',
    subtitleMonthlyPlan: ' $19.99/mo + $4.99/mo per seat',
    subtitleAnnualPlan: ' $15.95/mo + $3.99/mo per seat',
    isCurrentPlan: false,
    sections: [
      {
        previousTier: undefined,
        title: undefined,
        features: ['20,000 credits/mo', 'Unlimited Chats/Docs/Projects'],
      },
      {
        previousTier: undefined,
        title: 'Planner',
        features: [
          'AI generation: Chats / Docs / Dev Plans',
          'Document import/export/sharing',
          'Custom project workflow',
        ],
      },
      {
        previousTier: undefined,
        title: 'Builder',
        features: [],
      },
    ],
  },
  {
    title: 'Performance',
    key: SUBSCRIPTIONTIERS.PROFESSIONAL,
    target: 'for mid-sized teams to boost efficiency and productivity',
    monthlyUrl: process.env.REACT_APP_STRIPE_PROFESSIONAL_MONTHLY_URL,
    yearlyUrl: process.env.REACT_APP_STRIPE_PROFESSIONAL_YEARLY_URL,
    price: '$39.99/mo',
    annualPrice: '$31.99/mo',
    subtitleMonthlyPlan: ' $39.99/mo + $9.99/mo per seat',
    subtitleAnnualPlan: ' $31.99/mo + $7.99/mo per seat',
    isCurrentPlan: false,
    sections: [
      {
        previousTier: 'Essential',
        title: undefined,
        features: [
          '50,000 credits/mo',
          'Custom team roles',
          'Virtual Teammates',
        ],
      },
      {
        previousTier: undefined,
        title: 'Planner',
        features: ['Custom Document Template'],
      },
      {
        previousTier: undefined,
        title: 'Builder',
        features: ['JIRA integration'],
      },
    ],
  },
  {
    title: 'Scale',
    key: SUBSCRIPTIONTIERS.BUSINESS,
    target: 'for large teams to transform business and product delivery',
    monthlyUrl: process.env.REACT_APP_STRIPE_BUSINESS_MONTHLY_URL,
    yearlyUrl: process.env.REACT_APP_STRIPE_BUSINESS_YEARLY_URL,
    price: '$99.99/mo',
    annualPrice: '$79.99/mo',
    subtitleMonthlyPlan: ' $99.99/mo + $14.99/mo per seat',
    subtitleAnnualPlan: ' $79.99/mo + $11.99/mo per seat',
    isCurrentPlan: false,
    sections: [
      {
        previousTier: 'Performance',
        title: undefined,
        features: ['150,000 credits/mo', 'Sub-teams', 'Priority support'],
      },
      {
        previousTier: undefined,
        title: 'Planner',
        features: ['Custom LLM'],
      },
      {
        previousTier: undefined,
        title: 'Builder',
        features: ['On-demand 3rd party integration'],
      },
      {
        previousTier: undefined,
        title: 'Reporter',
        features: ['Project insights'],
      },
    ],
  },
];

export type CREDIT = {
  label: string;
  value: number;
  url?: string;
};

export const CREDITS: CREDIT[] = [
  {
    label: '10,000 - $10',
    value: 0,
    url: process.env.REACT_APP_STRIPE_OMNIFLOW_CREDITS_10K,
  },
  {
    label: '40,000 - $30',
    value: 1,
    url: process.env.REACT_APP_STRIPE_OMNIFLOW_CREDITS_40K,
  },
  {
    label: '100,000 - $60',
    value: 2,
    url: process.env.REACT_APP_STRIPE_OMNIFLOW_CREDITS_100K,
  },
];
