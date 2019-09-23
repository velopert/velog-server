import { getRepository } from 'typeorm';
import SocialAccount from '../../../../../entity/SocialAccount';
import { Middleware } from '@koa/router';
import { generateToken, decodeToken } from '../../../../../lib/token';
import { getGithubAccessToken, getGithubProfile } from '../../../../../lib/social/github';
import User from '../../../../../entity/User';
import { SocialProvider, generateSocialLoginLink, SocialProfile } from '../../../../../lib/social';
import Joi from 'joi';
import { validateBody } from '../../../../../lib/utils';

const { GITHUB_ID, GITHUB_SECRET } = process.env;

if (!GITHUB_ID || !GITHUB_SECRET) {
  throw new Error('GITHUB_ID, GITHUB_SECRET ENVVAR IS MISSING');
}

type SocialRegisterToken = {
  profile: SocialProfile;
  provider: SocialProvider;
  accessToken: string;
};

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

/**
 * Social Register
 * POST /api/v2/auth/social/register
 * {
 *   form: {
 *     displayName,
 *     username,
 *     short_bio
 *   }
 * }
 */
export const socialRegister: Middleware = async ctx => {
  // check token existancy
  const registerToken = ctx.cookies.get('register_token');
  if (!registerToken) {
    ctx.status = 401;
    return;
  }

  // check postbody schema
  const schema = Joi.object().keys({
    display_name: Joi.string()
      .min(1)
      .max(45)
      .required(),
    username: Joi.string()
      .regex(/^[a-z0-9-_]+$/)
      .min(3)
      .max(16)
      .required(),
    short_bio: Joi.string()
      .allow('')
      .max(140)
  });

  if (!validateBody(ctx, schema)) return;
  type RequestBody = {
    display_name: string;
    username: string;
    short_bio: string;
  };
  const { display_name, username, short_bio }: RequestBody = ctx.request.body;

  let decoded: SocialRegisterToken | null = null;
  try {
    decoded = await decodeToken<SocialRegisterToken>(registerToken);
  } catch (e) {
    // failed to decode token
    ctx.status = 401;
    return;
  }
  const email = decoded.profile.email;

  try {
    const userRepo = getRepository(User);
    // check duplicates
    const exists = await userRepo
      .createQueryBuilder()
      .where('(email = :email OR username = :username)', { email, username })
      .andWhere('email != null')
      .getOne();

    if (exists) {
      ctx.status = 409;
      ctx.body = {
        name: 'ALREADY_EXISTS',
        payload: email === exists.email ? 'email' : 'username'
      };
      return;
    }

    // create user
    // create token
    // set token
    // return data
  } catch (e) {}
};

/**
 * /api/v2/auth/social/callback/github
 */
export const githubCallback: Middleware = async ctx => {
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
};

export const getSocialProfile: Middleware = async ctx => {
  const registerToken = ctx.cookies.get('register_token');
  if (!registerToken) {
    ctx.status = 401;
    return;
  }
  try {
    const decoded = await decodeToken(registerToken);
    ctx.body = decoded.profile;
  } catch (e) {
    ctx.status = 400;
    return;
  }
};

/**
 * Redirect to Social Login Link
 *
 * GET /api/v2/auth/social/redirect/:provider(facebook|google|github)
 */
export const socialRedirect: Middleware = async ctx => {
  const { provider } = ctx.params;
  const validated = ['facebook', 'google', 'github'].includes(provider);
  if (!validated) {
    ctx.status = 400;
    return;
  }

  const loginUrl = generateSocialLoginLink(provider);
  ctx.redirect(encodeURI(loginUrl));
};
