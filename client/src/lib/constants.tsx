import { Access, IssueStatus, TemplateAccess } from '@prisma/client';

const api_base_url: Record<string, string> = {
  local: 'http://localhost:9000',
  prod: '',
};

export const api_url =
  process.env.NODE_ENV === 'development'
    ? api_base_url.local
    : api_base_url.prod;

export const workplanStatus = [
  {
    value: 'CREATED',
    label: 'Created',
  },
  {
    value: 'STARTED',
    label: 'Started',
  },
  {
    value: 'COMPLETED',
    label: 'Completed',
  },
];
export const issueStatus = [
  {
    value: 'CREATED',
    label: 'Created',
  },
  {
    value: 'STARTED',
    label: 'Started',
  },
  {
    value: 'INREVIEW',
    label: 'Code Review',
  },
  {
    value: 'APPROVED',
    label: 'QA',
  },
  {
    value: 'COMPLETED',
    label: 'Completed',
  },
  {
    value: 'CANCELED',
    label: 'Canceled',
  },
];

export const issueStatusToEnum: { [key: string]: IssueStatus } = {
  CREATED: IssueStatus.CREATED,
  STARTED: IssueStatus.STARTED,
  INREVIEW: IssueStatus.INREVIEW,
  APPROVED: IssueStatus.APPROVED,
  COMPLETED: IssueStatus.COMPLETED,
  CANCELED: IssueStatus.CANCELED,
};

export const DEFAULT_QUERY_STALE_TIME = 60000;

export const COLORS = {
  PRIMARY: '#5345F3',
  GRAY: '#8B8D97',
  ICON_GRAY: '#000000e0',
  LIGHT_GRAY: '#F3F3F3',
  PURPLE: '#5428BD',
  LIGHT_PINK: '#F5EBFF',
  WHITE: '#FFF',
  COLOR_ANTD_BORDER: '#D9D9D9',
};

export const SUBSCRIPTIONTIERS = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  PROFESSIONAL: 'PRO',
  BUSINESS: 'BUSINESS',
  ENTERPRISE: 'ENTERPRISE',
};

export const SUBSCRIPTIONTIERSDISPLAYNAME: Record<string, string> = {
  FREE: 'Free',
  STARTER: 'Essential',
  PRO: 'Performance',
  BUSINESS: 'Scale',
  ENTERPRISE: 'ENTERPRISE',
};

export const SUBSCRIPTIONSTATUS = {
  ACTIVE: 'ACTIVE',
  CANCELED: 'CANCELED',
  PAST_DUE: 'PAST_DUE',
  UNPAID: 'UNPAID',
};

export const documentPermissionTypes = [
  {
    value: 'VIEW',
    label: 'View',
  },
  {
    value: 'EDIT',
    label: 'Edit',
  },
];

export const documentPermissionOptions = [
  {
    value: 'VIEW',
    label: 'View',
  },
  {
    value: 'EDIT',
    label: 'Edit',
  },
];

export const generalAccessOptions = Object.values(Access).map((value) => {
  return {
    value,
    label: value.toLocaleLowerCase(),
  };
});

export const templateAccessOptions = Object.values(Access).map((value) => {
  return {
    value,
    label: value.toLocaleLowerCase(),
  };
});

export const DEFAULT_DOCUMENT_ACCESS = TemplateAccess.SELF;

export const DEFAULT_PAGE_LIMIT = 20;
