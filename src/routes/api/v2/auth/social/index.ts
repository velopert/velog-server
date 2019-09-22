import Router from '@koa/router';
import { generateSocialLoginLink, SocialProvider } from '../../../../../lib/social';
import { getGithubAccessToken, getGithubProfile } from '../../../../../lib/social/github';
import { getRepository } from 'typeorm';
import SocialAccount from '../../../../../entity/SocialAccount';
import User from '../../../../../entity/User';
import { generateToken } from '../../../../../lib/token';

const social = new Router();

const { GITHUB_ID, GITHUB_SECRET } = process.env;

if (!GITHUB_ID || !GITHUB_SECRET) {
  throw new Error('GITHUB_ID, GITHUB_SECRET ENVVAR IS MISSING');
}

async function getSocialAccount(params: { uid: number; provider: SocialProvider }) {
  const socialAccountRepo = getRepository(SocialAccount);
  const socialAccount = await socialAccountRepo.findOne({
    where: {
      social_id: params.uid.toString(),
      provider: params.provider
    }
  });
  return socialAccount;
}

/* LOGIN & REGISTER */
social.post('/verify-social/:provider', async ctx => {});
social.post('/register/:provider', async ctx => {});
social.post('/login/:provider', async ctx => {});

/* Callback */

/**
 * /api/v2/auth/social/callback/github
 */
social.get('/callback/github', async ctx => {
  const { code }: { code?: string } = ctx.query;
  if (!code) {
    ctx.status = 400;
    return;
  }
  try {
    const accessToken = await getGithubAccessToken({
      code,
      clientId: GITHUB_ID,
      clientSecret: GITHUB_SECRET
    });
    const profile = await getGithubProfile(accessToken);
    const socialAccount = await getSocialAccount({
      uid: profile.uid,
      provider: 'github'
    });

    console.log({ socialAccount, profile });

    // SocialAccount already exists in db
    if (socialAccount) {
      // login process
      return;
    }

    // SocialAccount has no email -> Register
    if (!profile.email) {
      return;
    }

    // Checking Email
    const userRepo = getRepository(User);
    const user = await userRepo.findOne({
      email: profile.email
    });

    // Email exists -> Login
    if (user) {
      return;
    }

    // Register new social account
    const registerTokenInfo = {
      profile,
      accessToken,
      provider: 'github'
    };

    const registerToken = await generateToken(registerTokenInfo, {
      expiresIn: '1h'
    });

    // set register token to cookie
    ctx.cookies.set('register_token', registerToken, {
      maxAge: 1000 * 60 * 60
    });

    const redirectUrl =
      process.env.NODE_ENV === 'development'
        ? 'https://localhost:3000/register?social=1'
        : 'https://velog.io/register?social =1';
    ctx.redirect(encodeURI(redirectUrl));
  } catch (e) {
    ctx.throw(500, e);
  }
});

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
