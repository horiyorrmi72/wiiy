export const handleGitHubLogin = (documentId: string) => {
  if (!documentId) return;
  try {
    const GITHUB_REDIRECT_URI = `${process.env.REACT_APP_COGNITO_REDIRECT_SIGNOUT}/docs/${documentId}`;
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${process.env.REACT_APP_GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=repo`;
    window.location.href = redirectUri;
  } catch (error) {
    console.error('Error connecting to GitHub:', error);
  }
};
