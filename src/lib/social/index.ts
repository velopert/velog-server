export type SocialProvider = 'facebook' | 'github' | 'google';

const { GITHUB_ID } = process.env;

const redirectPath = `/api/v2/auth/social/callback/`;
const redirectUri =
  process.env.NODE_ENV === 'development'
    ? `http://localhost:5000${redirectPath}`
    : `https://velog.io${redirectPath}`;

export function generateSocialLoginLink(provider: SocialProvider, next: string = '/') {
  const generators = {
    github(next: string) {
      const redirectUriWithNext = `${redirectUri}github?next=${next}`;
      return `https://github.com/login/oauth/authorize?scope=user:email&client_id=${GITHUB_ID}&redirect_uri=${redirectUriWithNext}`;
    },
    facebook(next: string) {
      return '';
    },
    google(next: string) {
      return '';
    }
  };

  const generator = generators[provider];
  return generator(next);
}

export type SocialProfile = {
  uid: number;
  thumbnail: string | null;
  email: string | null;
  name: string;
  username?: string;
};
