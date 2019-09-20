import Router from 'koa-router';
import { callbackify } from 'util';

const social = new Router();

const { GITHUB_ID, GITHUB_SECRET } = process.env;

if (!GITHUB_ID || !GITHUB_SECRET) {
  throw new Error('GITHUB_ID, GITHUB_SECRET ENVVAR IS MISSING');
}
type SocialProvider = 'facebook' | 'github' | 'google';

function generateSocialLoginLink(provider: SocialProvider) {
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

/* LOGIN & REGISTER */
social.post('/verify-social/:provider', async ctx => {});
social.post('/register/:provider', async ctx => {});
social.post('/login/:provider', async ctx => {});

/* Callback */
social.get('/callback/github', async () => {});
social.get('/callback/google', async () => {});
social.get('/callback/facebook', async () => {});

/* Login Token */
social.get('/token', async () => {});

/**
 * Redirect to Social Login Link
 *
 * GET /api/v2/auth/social/redirect/:provider(facebook|google|github)
 */
social.get('/redirect/:provider', async ctx => {
  const { provider } = ctx.params;
  const validated = ['facebook', 'google', 'github'].includes(provider);
  if (!validated) {
    ctx.status = 400;
    return;
  }

  const loginUrl = generateSocialLoginLink(provider);
  ctx.redirect(encodeURI(loginUrl));
});

export default social;
