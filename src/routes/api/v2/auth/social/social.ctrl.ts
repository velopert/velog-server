import { getRepository } from 'typeorm';
import SocialAccount from '../../../../../entity/SocialAccount';
import { Middleware } from '@koa/router';
import { generateToken, decodeToken, setTokenCookie } from '../../../../../lib/token';
import { getGithubAccessToken, getGithubProfile } from '../../../../../lib/social/github';
import User from '../../../../../entity/User';
import {
  SocialProvider,
  generateSocialLoginLink,
  SocialProfile,
  redirectUri
} from '../../../../../lib/social';
import Joi from 'joi';
import { validateBody } from '../../../../../lib/utils';
import UserProfile from '../../../../../entity/UserProfile';
import VelogConfig from '../../../../../entity/VelogConfig';
import downloadFile from '../../../../../lib/downloadFile';
import UserImage from '../../../../../entity/UserImage';
import { generateUploadPath } from '../../files';
import AWS from 'aws-sdk';
import { getFacebookAccessToken, getFacebookProfile } from '../../../../../lib/social/facebook';
import { getGoogleAccessToken, getGoogleProfile } from '../../../../../lib/social/google';
import UserMeta from '../../../../../entity/UserMeta';

const s3 = new AWS.S3({
  region: 'ap-northeast-2',
  signatureVersion: 'v4'
});

const {
  GITHUB_ID,
  GITHUB_SECRET,
  FACEBOOK_ID,
  FACEBOOK_SECRET,
  GOOGLE_ID,
  GOOGLE_SECRET,
  CLIENT_HOST
} = process.env;

if (!GITHUB_ID || !GITHUB_SECRET) {
  throw new Error('GITHUB ENVVAR IS MISSING');
}

if (!FACEBOOK_ID || !FACEBOOK_SECRET) {
  throw new Error('FACEBOOK ENVVAR is missing');
}

if (!GOOGLE_ID || !GOOGLE_SECRET) {
  throw new Error('GOOGLE ENVVAR is missing');
}

type SocialRegisterToken = {
  profile: SocialProfile;
  provider: SocialProvider;
  accessToken: string;
};

async function getSocialAccount(params: { uid: number | string; provider: SocialProvider }) {
  const socialAccountRepo = getRepository(SocialAccount);
  const socialAccount = await socialAccountRepo.findOne({
    where: {
      social_id: params.uid.toString(),
      provider: params.provider
    }
  });
  return socialAccount;
}

async function syncProfileImage(url: string, user: User) {
  const result = await downloadFile(url);
  // create userImage
  const userImageRepo = getRepository(UserImage);
  const userImage = new UserImage();
  userImage.fk_user_id = user.id;
  userImage.type = 'profile';
  await userImageRepo.save(userImage);

  // generate s3 path
  const uploadPath = generateUploadPath({
    id: userImage.id,
    username: user.username,
    type: 'profile'
  });
  const key = `${uploadPath}/social.${result.extension}`;

  // upload
  await s3
    .upload({
      Bucket: 's3.images.velog.io',
      Key: key,
      Body: result.stream,
      ContentType: result.contentType
    })
    .promise();

  result.cleanup();

  return `https://images.velog.io/${key}`;
}

/**
 * Social Register
 * POST /api/v2/auth/social/register
 * {
 *   form: {
 *     display_name,
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
      .where('username = :username', { username })
      .orWhere('email = :email AND email != null', { email })
      .getOne();

    if (exists) {
      ctx.status = 409;
      ctx.body = {
        name: 'ALREADY_EXISTS',
        payload: email === exists.email ? 'email' : 'username'
      };
      return;
    }

    const userProfileRepo = getRepository(UserProfile);
    const velogConfigRepo = getRepository(VelogConfig);
    const userMetaRepo = getRepository(UserMeta);

    // create user
    const user = new User();
    user.email = email;
    user.is_certified = true;
    user.username = username;
    await userRepo.save(user);

    // create social account
    const socialAccount = new SocialAccount();
    socialAccount.access_token = decoded.accessToken;
    socialAccount.provider = decoded.provider;
    socialAccount.fk_user_id = user.id;
    socialAccount.social_id = decoded.profile.uid.toString();

    const socialAccountRepo = getRepository(SocialAccount);
    await socialAccountRepo.save(socialAccount);

    // create profile
    const profile = new UserProfile();
    profile.fk_user_id = user.id;
    profile.display_name = display_name;
    profile.short_bio = short_bio;

    if (decoded.profile.thumbnail) {
      try {
        const imageUrl = await syncProfileImage(decoded.profile.thumbnail, user);
        profile.thumbnail = imageUrl;
      } catch (e) {}
    }

    await userProfileRepo.save(profile);

    // create velog config and meta
    const velogConfig = new VelogConfig();
    velogConfig.fk_user_id = user.id;

    const userMeta = new UserMeta();
    userMeta.fk_user_id = user.id;

    await Promise.all([velogConfigRepo.save(velogConfig), userMetaRepo.save(userMeta)]);

    const tokens = await user.generateUserToken();
    setTokenCookie(ctx, tokens);
    ctx.body = {
      ...user,
      profile,
      tokens: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      }
    };
    // create token
    // set token
    // return data
  } catch (e) {}
};

/**
 * /api/v2/auth/social/callback/github
 */
export const githubCallback: Middleware = async (ctx, next) => {
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

    ctx.state.profile = profile;
    ctx.state.socialAccount = socialAccount;
    ctx.state.accessToken = accessToken;
    ctx.state.provider = 'github';
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * /api/v2/auth/social/callback/google
 */
export const googleCallback: Middleware = async (ctx, next) => {
  const { code }: { code?: string } = ctx.query;
  if (!code) {
    ctx.status = 400;
    return;
  }
  try {
    const accessToken = await getGoogleAccessToken({
      code,
      clientId: GOOGLE_ID,
      clientSecret: GOOGLE_SECRET,
      redirectUri: `${redirectUri}google`
    });
    const profile = await getGoogleProfile(accessToken);
    const socialAccount = await getSocialAccount({
      uid: profile.uid,
      provider: 'google'
    });

    ctx.state.profile = profile;
    ctx.state.socialAccount = socialAccount;
    ctx.state.accessToken = accessToken;
    ctx.state.provider = 'google';
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * /api/v2/auth/social/callback/facebook
 */
export const facebookCallback: Middleware = async (ctx, next) => {
  const { code } = ctx.query;
  if (!code) {
    ctx.status = 401;
    return;
  }

  // get token
  try {
    const accessToken = await getFacebookAccessToken({
      code,
      clientId: FACEBOOK_ID,
      clientSecret: FACEBOOK_SECRET,
      redirectUri: `${redirectUri}facebook`
    });
    const profile = await getFacebookProfile(accessToken);
    const socialAccount = await getSocialAccount({
      uid: profile.uid,
      provider: 'facebook'
    });

    ctx.state.profile = profile;
    ctx.state.socialAccount = socialAccount;
    ctx.state.accessToken = accessToken;
    ctx.state.provider = 'facebook';
    return next();
  } catch (e) {
    ctx.throw(500, e);
  }
};

export const socialCallback: Middleware = async ctx => {
  try {
    const { profile, socialAccount, accessToken, provider } = ctx.state as {
      profile: SocialProfile;
      socialAccount: SocialAccount | undefined;
      accessToken: string;
      provider: SocialProvider;
    };

    if (!profile || !accessToken) return;
    // SocialAccount already exists in db
    const userRepo = getRepository(User);
    if (socialAccount) {
      // login process
      const user = await userRepo.findOne(socialAccount.fk_user_id);
      if (!user) {
        throw new Error('User is missing');
      }
      const tokens = await user.generateUserToken();
      setTokenCookie(ctx, tokens);
      const redirectUrl =
        process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : `https://${CLIENT_HOST}`;

      const state = ctx.query.state ? (JSON.parse(ctx.query.state) as { next: string }) : null;
      const next = ctx.query.next || state?.next || '/';

      ctx.redirect(encodeURI(redirectUrl.concat(next)));
      return;
    }

    // Find by email ONLY when email exists
    let user: User | undefined = undefined;
    if (profile.email) {
      user = await userRepo.findOne({
        email: profile.email
      });
    }

    // Email exists -> Login
    if (user) {
      const tokens = await user.generateUserToken();
      setTokenCookie(ctx, tokens);
      const redirectUrl =
        process.env.NODE_ENV === 'development' ? 'https://localhost:3000/' : 'https://velog.io/';
      ctx.redirect(encodeURI(redirectUrl));
      console.log('user');
      console.log(encodeURI(redirectUrl));
      return;
    }

    // Register new social account
    const registerTokenInfo = {
      profile,
      accessToken,
      provider
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
        ? 'http://localhost:3000/register?social=1'
        : 'https://velog.io/register?social=1';
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
  const { next } = ctx.query;
  const validated = ['facebook', 'google', 'github'].includes(provider);
  if (!validated) {
    ctx.status = 400;
    return;
  }

  const loginUrl = generateSocialLoginLink(provider, next);
  ctx.redirect(loginUrl);
};
