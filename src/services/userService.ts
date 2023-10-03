import Joi from 'joi';
import type { User, Prisma } from '@prisma/client';
import db from '../lib/db';
import { validateArgs } from '../lib/utils';
import { ApolloError, AuthenticationError } from 'apollo-server-koa';
import shortid from 'shortid';
import cache from '../cache';
import { createChangeEmail } from '../etc/emailTemplates';
import sendMail from '../lib/sendMail';
import Cookies from 'cookies';
import Axios, { AxiosError, AxiosResponse } from 'axios';

const { API_V3_HOST, CLIENT_V2_HOST } = process.env;

if (!CLIENT_V2_HOST) {
  throw new Error('CLIENT_V2_HOST is required');
}

if (!API_V3_HOST) {
  throw new Error('CLIENT_V3_HOST is required');
}

const userService = {
  async getPublicProfileById(userId: string) {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        userProfile: true,
      },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      username: user.username,
      display_name: user.userProfile!.display_name,
      thumbnail: user.userProfile!.thumbnail,
    };
  },
  async findUserById(id: string): Promise<User | null> {
    const user = await db.user.findUnique({
      where: {
        id,
      },
    });
    return user;
  },
  async findUserByEmail(email: string): Promise<User | null> {
    const schema = Joi.object().keys({
      email: Joi.string().email().required(),
    });

    if (!validateArgs({ email }, schema)) {
      throw new ApolloError('Invalid email format', 'BAD_REQUEST');
    }

    const user = await db.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
    return user;
  },
  async updateUser(userId: string, input: Prisma.UserUpdateInput): Promise<User> {
    const user = await db.user.update({
      where: {
        id: userId,
      },
      data: {
        ...input,
      },
    });
    return user;
  },
  async initiateChangeEmail(userId: string, email: string): Promise<boolean> {
    const schema = Joi.object().keys({
      email: Joi.string().email().required(),
    });

    if (!validateArgs({ email }, schema)) {
      throw new ApolloError('Invalid email format', 'BAD_REQUEST');
    }

    const user = await userService.findUserById(userId);

    if (!user) throw new ApolloError('Could not find user account');

    const emailExists = await userService.findUserByEmail(email);

    if (emailExists) {
      throw new ApolloError('Email already exists', 'ALEADY_EXISTS');
    }

    const code = shortid.generate();
    const key = cache.generateKey.changeEmailKey(code);
    const data = JSON.stringify({ userId: user.id, email: email.toLowerCase() });
    const template = createChangeEmail(user.username, email, code);

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Login URL: http://${CLIENT_V2_HOST}/email-change?code=${code}`);
      }
      await sendMail({
        to: email,
        from: 'verify@velog.io',
        ...template,
      });
    } catch (e) {
      throw e;
    }

    cache.client?.set(key, data, 'EX', 60 * 30); // 30 minute

    return true;
  },
  async confirmChangeEmail(loggedUserId: string, code: string): Promise<boolean> {
    const key = cache.generateKey.changeEmailKey(code);
    const metadata = await cache.client?.get(key);

    if (!metadata) {
      throw new ApolloError('Data not found', 'BAD_REQUEST');
    }

    const { userId, email } = JSON.parse(metadata) as { userId: string; email: string };

    if (userId !== loggedUserId) {
      throw new AuthenticationError('No permission to change the email');
    }

    const user = await userService.findUserById(userId);

    if (!user) {
      throw new ApolloError('User not found', 'NOT_FOUND');
    }

    await userService.updateUser(loggedUserId, { email });
    cache.client?.del(key);
    return true;
  },
  async followUser(followUserId: string, cookies: Cookies) {
    try {
      const query = 'mutation Follow ($input: FollowInput!) {\n\tfollow(input: $input) \n}';

      const accessToken = cookies.get('access_token') ?? '';

      const endpoint =
        process.env.NODE_ENV === 'development'
          ? `http://${API_V3_HOST}/graphql`
          : `https://${API_V3_HOST}/graphql`;

      const res = await Axios.post<AxiosResponse<{ follow: boolean }>>(
        endpoint,
        {
          operationName: 'Follow',
          query: query,
          variables: { input: { followUserId: followUserId } },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return res.data.data.follow;
    } catch (error: any) {
      console.log('follow error:', error.response.data.errors);
      return false;
    }
  },
  async unfollowUser(followUserId: string, cookies: Cookies) {
    try {
      const query = 'mutation Unfollow ($input: UnfollowInput!) {\n\tunfollow(input: $input) \n}';

      const accessToken = cookies.get('access_token') ?? '';

      const endpoint =
        process.env.NODE_ENV === 'development'
          ? `http://${API_V3_HOST}/graphql`
          : `https://${API_V3_HOST}/graphql`;

      const res = await Axios.post<AxiosResponse<{ unfollow: boolean }>>(
        endpoint,
        {
          operationName: 'Unfollow',
          query: query,
          variables: { input: { followUserId: followUserId } },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return res.data.data.unfollow;
    } catch (error: any) {
      console.log('unfollow error:', error.response.data.errors);
      return false;
    }
  },
};

export default userService;
