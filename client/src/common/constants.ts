// Copying this from /shared for now - we need to set up a proper import
// Webpack will not let me import items from outside of /client/src
export const ErrorMessage = {
  NOT_ENOUGH_CAPACITY_BACKEND: 'NOT_ENOUGH_CAPACITY_BACKEND',
  NOT_ENOUGH_CAPACITY_FRONTEND: 'NOT_ENOUGH_CAPACITY_FRONTEND',
  NOT_ENOUGH_CAPACITY_ANDROID: 'NOT_ENOUGH_CAPACITY_ANDROID',
  NOT_ENOUGH_CAPACITY_IOS: 'NOT_ENOUGH_CAPACITY_IOS',
};

export const SampleTask = `Implement a feature to allow users to update their profile, like the page you are seeing. 

Description: 1) Add a UI form to display user's current profile with firstname, lastname, username. 2) Build backend logic to save the updated info. 3) Redirect the page to home page when done.
Acceptance Criteria: 1) Users can see their current profile information. 2) Users can successfully update their name, and username. 3) Changes are saved to the database.`;

export const DefaultSampleTaskStoryPoint = 2;
export const DefaultDocumentGenerateLang = 'en';

export const FREE_PROJECT_LIMIT = 3;

export const STARTER_PLAN_PROJECT_LIMIT_PER_WEEK = 3;

export const SubscriptionTierIndex: Record<string, number> = {
  FREE: -1,
  STARTER: 0,
  PRO: 1,
  BUSINESS: 2,
  ENTERPRISE: 3,
};

// COPIED FROM SERVER llmService/llmUtil.ts
export const GenerationMinimumCredit = 500;

export const DEFAULT_DOCUMENT_PERMISSION = 'VIEW';

// AI Agent sample inputs
export const AIAgentIntroMessage: Record<string, string> = {
  PRD: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or create documents of your need.`,
  UI_DESIGN: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or create documents of your need.`,
  TECH_DESIGN: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or create documents of your need.`,
  DEVELOPMENT_PLAN: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or create documents of your need.`,
  QA_PLAN: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or create documents of your need.`,
  RELEASE_PLAN: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or create documents of your need.`,
  BUSINESS: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or create documents of your need.`,
  PRODUCT: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or create documents of your need.`,
  ENGINEERING: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or create documents of your need.`,
  MARKETING: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or create documents of your need.`,
  SALES: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or create documents of your need.`,
  SUPPORT: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or create documents of your need.`,
  CHAT: `👋 I'm Joy, your AI assistant. I can help you brainstorm ideas, answer questions or discuss anything of your interest.`,
};

// AI Agent sample inputs
export const AIAgentSampleInputs: Record<string, string[]> = {
  PRD: [
    'We want to build omniflow as a new app that automates the entire product development lifecycle for teams. With a few sentences of description, it auto generates the PRD, UIUX Design, technical design, development plan etc. Can you help me write a PRD for it?',
    // 'We want to add a feature to integrate Google OAuth into our Omniflow product. How can I go about doing that?',
  ],
  UI_DESIGN: [
    'We want to support all key feature requirements defined in the selected Omniflow PRD document. Please create a UI design wireframe for it.',
  ],
  TECH_DESIGN: [
    'We want to support all key feature requirements defined in the selected Omniflow PRD document. Please use microservices architecture, and modern stack such as ReactJS, NodeJS, and LLM models. Please help us write a technical design.',
    // 'We want to build slack integration to the Omniflow app. Can you create an architecture how to do it?',
  ],
  DEVELOPMENT_PLAN: [],
  QA_PLAN: [
    'Please create a QA test plan for the selected product requirement document.',
  ],
  RELEASE_PLAN: [
    'Please create a release plan based on the selected product requirement document.',
  ],
  BUSINESS: [],
  PRODUCT: [],
  ENGINEERING: [],
  MARKETING: [],
  SALES: [],
  SUPPORT: [],
  CHAT: [
    'I would like to build a new AI app to automate my product development life cycle. Can you share some tips on it?',
    'I want to start a project to achieve SOC 2 Compliance for our product. How can I go about doing that?',
  ],
};
