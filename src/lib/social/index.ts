import { google } from 'googleapis';

export type SocialProvider = 'facebook' | 'github' | 'google';

const { GITHUB_ID, FACEBOOK_ID, GOOGLE_ID, GOOGLE_SECRET, API_HOST } = process.env;

const redirectPath = `/api/v2/auth/social/callback/`;
export const redirectUri =
  process.env.NODE_ENV === 'development'
    ? `http://localhost:5000${redirectPath}`
    : `https://${API_HOST}${redirectPath}`;

type Options = {
  next: string;
  isIntegrate?: boolean;
  integrateState?: string;
};

const generators = {
  github({ next, isIntegrate, integrateState }: Options) {
    const redirectUriWithOptions = `${redirectUri}github?next=${next}&isIntegrate=${
      isIntegrate ? 1 : 0
    }&integrateState=${integrateState ?? ''}`;
    return `https://github.com/login/oauth/authorize?scope=user:email&client_id=${GITHUB_ID}&redirect_uri=${redirectUriWithOptions}`;
  },
  facebook({ next, isIntegrate, integrateState }: Options) {
    const state = JSON.stringify({ next, isIntegrate: isIntegrate ? 1 : 0, integrateState });
    const callbackUri = `${redirectUri}facebook`;
    return `https://www.facebook.com/v4.0/dialog/oauth?client_id=${FACEBOOK_ID}&redirect_uri=${callbackUri}&state=${state}&scope=email,public_profile`;
  },
  google({ next, isIntegrate, integrateState }: Options) {
    const callback = `${redirectUri}google`;
    const oauth2Client = new google.auth.OAuth2(GOOGLE_ID, GOOGLE_SECRET, callback);
    const url = oauth2Client.generateAuthUrl({
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state: JSON.stringify({ next, isIntegrate: isIntegrate ? 1 : 0, integrateState }),
    });
    return url;
  },
};

export function generateSocialLoginLink(
  provider: SocialProvider,
  { next = '/', isIntegrate = false, integrateState }: Options
) {
  const generator = generators[provider];
  return generator({
    next: encodeURI(next),
    isIntegrate,
    integrateState,
  });
}

export type SocialProfile = {
  uid: number | string;
  thumbnail: string | null;
  email: string | null;
  name: string;
  username?: string;
};
