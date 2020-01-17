import { google } from 'googleapis';

export type SocialProvider = 'facebook' | 'github' | 'google';

const { GITHUB_ID, FACEBOOK_ID, GOOGLE_ID, GOOGLE_SECRET, API_HOST } = process.env;

const redirectPath = `/api/v2/auth/social/callback/`;
export const redirectUri =
  process.env.NODE_ENV === 'development'
    ? `http://localhost:5000${redirectPath}`
    : `https://${API_HOST}${redirectPath}`;

export function generateSocialLoginLink(provider: SocialProvider, next: string = '/') {
  const generators = {
    github(next: string) {
      const redirectUriWithNext = `${redirectUri}github?next=${next}`;
      return `https://github.com/login/oauth/authorize?scope=user:email&client_id=${GITHUB_ID}&redirect_uri=${redirectUriWithNext}`;
    },
    facebook(next: string) {
      const state = JSON.stringify({ next });
      const callbackUri = `${redirectUri}facebook`;
      return `https://www.facebook.com/v4.0/dialog/oauth?client_id=${FACEBOOK_ID}&redirect_uri=${callbackUri}&state=${state}&scope=email,public_profile`;
    },
    google(next: string) {
      const callback = `${redirectUri}google`;
      const oauth2Client = new google.auth.OAuth2(GOOGLE_ID, GOOGLE_SECRET, callback);
      const url = oauth2Client.generateAuthUrl({
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        state: JSON.stringify({ next })
      });
      return url;
    }
  };

  const generator = generators[provider];
  return generator(encodeURI(next));
}

export type SocialProfile = {
  uid: number | string;
  thumbnail: string | null;
  email: string | null;
  name: string;
  username?: string;
};
