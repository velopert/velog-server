import axios from 'axios';
import Octokit from '@octokit/rest';
import { SocialProfile } from '.';

type GetGithubAccessTokenParams = {
  code: string;
  clientId: string;
  clientSecret: string;
};
type GithubOAuthResult = {
  access_token: string;
  token_type: string;
  scope: string;
};

export async function getGithubAccessToken({
  code,
  clientId,
  clientSecret
}: GetGithubAccessTokenParams) {
  const response = await axios.post<GithubOAuthResult>(
    'https://github.com/login/oauth/access_token',
    {
      code,
      client_id: clientId,
      client_secret: clientSecret
    },
    {
      headers: {
        accept: 'application/json'
      }
    }
  );
  return response.data.access_token;
}

export async function getGithubProfile(accessToken: string): Promise<SocialProfile> {
  const octokit = new Octokit({
    auth: `Bearer ${accessToken}`
  });
  const { data } = await octokit.users.getAuthenticated();
  const profile: SocialProfile = {
    uid: data.id,
    email: data.email,
    name: data.name,
    thumbnail: data.avatar_url,
    username: data.login
  };
  return profile;
}
