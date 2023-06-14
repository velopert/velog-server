import type { Prisma, PrismaClient, User } from '@prisma/client';
import { injectable } from 'tsyringe';
import { validateArgs } from '../lib/utils';
import { ApolloError, AuthenticationError } from 'apollo-server-koa';
import Joi from 'joi';
import shortid from 'shortid';
import cache from '../cache';
import { createChangeEmail } from '../etc/emailTemplates';
import sendMail from '../lib/sendMail';
import db from '../lib/db';

@injectable()
export default class UserService {
  public async getPublicProfileById(userId: string) {
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
  }
  async findUserById(id: string): Promise<User | null> {
    const user = await db.user.findUnique({
      where: {
        id,
      },
    });
    return user;
  }
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
  }
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
  }
  async initiateChangeEmail(userId: string, email: string): Promise<boolean> {
    const schema = Joi.object().keys({
      email: Joi.string().email().required(),
    });

    if (!validateArgs({ email }, schema)) {
      throw new ApolloError('Invalid email format', 'BAD_REQUEST');
    }

    const user = await this.findUserById(userId);

    if (!user) throw new ApolloError('Could not find user account');

    const emailExists = await this.findUserByEmail(email);

    if (emailExists) {
      throw new ApolloError('Email already exists', 'ALEADY_EXISTS');
    }

    const id = shortid.generate();
    const code = cache.generateKey.changeEmailKey(id);
    const data = JSON.stringify({ userId: user.id, email: email.toLowerCase() });

    const template = createChangeEmail(user.username, email, code);

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Login URL: http://${process.env.CLIENT_HOST}/email-change?code=${code}`);
      } else {
        await sendMail({
          to: email,
          from: 'verify@velog.io',
          ...template,
        });
      }
    } catch (e) {
      throw e;
    }

    cache.client?.set(code, data, 'EX', 60 * 30); // 30 minute

    return true;
  }
  async confirmChangeEmail(loggedUserId: string, code: string): Promise<boolean> {
    const metadata = await cache.client?.get(code);

    if (!metadata) {
      throw new ApolloError('Data not found', 'BAD_REQUEST');
    }

    const { userId, email } = JSON.parse(metadata) as { userId: string; email: string };

    if (userId !== loggedUserId) {
      throw new AuthenticationError('No permission to change the email');
    }

    const user = await this.findUserById(userId);

    if (!user) {
      throw new ApolloError('User not found', 'NOT_FOUND');
    }

    // Needs Sync time
    await this.updateUser(loggedUserId, { email });
    cache.client?.del(code);

    return true;
  }
}
