import axios from 'axios';
import { Router } from 'express';
import {
  getUserGithubProfile,
  saveGithubUserInformation,
} from '../../services/userService';
const router = Router();

router.get('/callback/:code', async (request, response) => {
  const currentUser = response.locals.currentUser;
  console.log('currentUser:', currentUser);
  const { code } = request.params;
  const url = `https://github.com/login/oauth/access_token?client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${code}`;

  const githubResponse = await axios.get(url, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
  });

  let accessToken = '';
  let userName = '';
  if (githubResponse.status === 200) {
    const info = githubResponse.data;
    if (!info.includes('error')) {
      accessToken = info.split('access_token=')[1].split('&')[0];

      const response2 = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`, // 使用 Bearer 认证
          Accept: 'application/vnd.github.v3+json', // 确保接受 JSON 格式的响应
        },
      });

      userName = response2.data.login; // 获取用户名

      await saveGithubUserInformation(currentUser.userId, {
        accessToken,
        userName,
      });
    }

    return response.status(200).json({
      success: true,
      data: { accessToken, userName },
    });
  } else {
    return response.status(400).json({
      success: false,
      data: { info: 'github connected error', error: null },
    });
  }
});

router.get('/getUserGithubProfile', async (request, response) => {
  const currentUser = response.locals.currentUser;

  const githubProfile = await getUserGithubProfile(currentUser.userId);

  return response.status(200).json({
    success: true,
    data: githubProfile,
  });
});

router.post('/create-repo', async (request, response) => {
  try {
    const currentUser = response.locals.currentUser;
    const { name, description, files, accessToken } = request.body;

    if (!accessToken) {
      return response.status(400).json({
        success: false,
        errorMsg: 'GitHub access token is required',
      });
    }
    console.log('create-repo accessToken:', accessToken);

    // Get user info first to get the username
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const username = userResponse.data.login;

    // Check if repository exists
    try {
      await axios.get(`https://api.github.com/repos/${username}/${name}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      // If repository exists, return specific error
      return response.status(400).json({
        success: false,
        errorMsg: 'Repository already exists. Please choose a different name.',
        code: 'REPO_EXISTS',
      });
    } catch (error) {
      // If repository doesn't exist, continue with creation
      if (axios.isAxiosError(error) && error.response?.status !== 404) {
        throw error;
      }
    }

    // Create repository
    const createRepoResponse = await axios.post(
      `https://api.github.com/user/repos`,
      {
        name,
        description,
        private: true,
        auto_init: false,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const repoUrl = createRepoResponse.data.html_url;

    // Upload files
    for (const file of files) {
      const content = Buffer.from(file.content).toString('base64');

      try {
        await axios.put(
          `https://api.github.com/repos/${username}/${name}/contents/${file.path}`,
          {
            message: `Add ${file.path}`,
            content,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
      } catch (error) {
        console.error(`Error uploading file ${file.path}:`, error);
        // Continue with other files even if one fails
        continue;
      }
    }

    return response.status(200).json({
      success: true,
      data: { html_url: repoUrl },
    });
  } catch (error) {
    console.error('Error creating repository:', error);
    if (axios.isAxiosError(error)) {
      return response.status(error.response?.status || 500).json({
        success: false,
        errorMsg:
          error.response?.data?.message ||
          error.message ||
          'Failed to create repository',
      });
    }
    return response.status(500).json({
      success: false,
      errorMsg:
        error instanceof Error ? error.message : 'Failed to create repository',
    });
  }
});

module.exports = {
  className: 'githubSign',
  routes: router,
};
