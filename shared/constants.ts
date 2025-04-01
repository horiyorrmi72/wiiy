export const ErrorMessage = {
  NOT_ENOUGH_CAPACITY_BACKEND: 'NOT_ENOUGH_CAPACITY_BACKEND',
  NOT_ENOUGH_CAPACITY_FRONTEND: 'NOT_ENOUGH_CAPACITY_FRONTEND',
  NOT_ENOUGH_CAPACITY_ANDROID: 'NOT_ENOUGH_CAPACITY_ANDROID',
  NOT_ENOUGH_CAPACITY_IOS: 'NOT_ENOUGH_CAPACITY_IOS',
  NOT_ENOUGH_CAPACITY_QA: 'NOT_ENOUGH_CAPACITY_QA',
  NOT_ENOUGH_CAPACITY_INFRA: 'NOT_ENOUGH_CAPACITY_INFRA',
  NOT_ENOUGH_CAPACITY_ML: 'NOT_ENOUGH_CAPACITY_ML',
  NOT_ENOUGH_CAPACITY_DATA: 'NOT_ENOUGH_CAPACITY_DATA',
};

export const SampleTask = `Implement a feature to allow users to update their profile, like the page you are seeing. 

Description: 1) Add a UI form to display user's current profile with firstname, lastname, username. 2) Build backend logic to save the updated info. 3) Redirect the page to home page when done.
Acceptance Criteria: 1) Users can see their current profile information. 2) Users can successfully update their name, and username. 3) Changes are saved to the database.`;

interface Map {
  [key: string]: string | undefined;
}

export const SpecialtyToIssueType: Map = {
  PRODUCT_MANAGEMENT: 'Product',
  UI_DESIGN: 'UI/UX',
  FULLSTACK_ENGINEER: 'Fullstack',
  FRONTEND_ENGINEER: 'Frontend',
  BACKEND_ENGINEER: 'Backend',
  MOBILE_ENGINEER_IOS: 'iOS',
  MOBILE_ENGINEER_ANDROID: 'Android',
  MOBILE_ENGINEER_WINDOWS: 'Windows',
  INFRA_ENGINEER: 'Infra',
  QA_ENGINEER: 'QA',
  ML_ENGINEER: 'ML',
  DATA_ENGINEER: 'DE',
  RELEASE_ENGINEER: 'Release',
  DATA_SCIENTIST: 'DS',
};

export const CLIENT_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://app.omniflow.team';

export const SERVER_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:9000'
    : 'https://app.omniflow.team';

export const DefaultSampleTaskStoryPoint = 2;
export const DefaultStoryPointsPerSprint = 10;
export const DefaultWeeksPerSprint = 2;

export const MessageLimit = 10;
