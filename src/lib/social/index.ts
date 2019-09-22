export type SocialProvider = 'facebook' | 'github' | 'google';

const { GITHUB_ID } = process.env;

export function generateSocialLoginLink(provider: SocialProvider) {
  const generators = {
    github() {
      return `https://github.com/login/oauth/authorize?scope=user:email&client_id=${GITHUB_ID}`;
    },
    facebook() {
      return '';
    },
    google() {
      return '';
    }
  };

  const generator = generators[provider];
  return generator();
}

export type SocialProfile = {
  uid: number;
  thumbnail: string | null;
  email: string | null;
  name: string;
  username?: string;
};
