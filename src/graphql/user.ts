import { ApolloContext } from './../app';
import { gql, IResolvers, AuthenticationError, ApolloError } from 'apollo-server-koa';
import User from '../entity/User';
import { getRepository, getManager } from 'typeorm';
import VelogConfig from '../entity/VelogConfig';
import Series from '../entity/Series';
import UserProfile from '../entity/UserProfile';
import { checkEmpty } from '../lib/utils';
import UserMeta from '../entity/UserMeta';
import { generateToken, decodeToken } from '../lib/token';

export const typeDef = gql`
  type User {
    id: ID!
    username: String
    email: String
    created_at: Date
    updated_at: Date
    is_certified: Boolean
    profile: UserProfile
    velog_config: VelogConfig
    series_list: [Series]
    user_meta: UserMeta
  }
  type UserProfile {
    id: ID!
    display_name: String
    short_bio: String
    thumbnail: String
    created_at: Date
    updated_at: Date
    about: String
    profile_links: JSON
  }
  type VelogConfig {
    id: ID!
    title: String
    logo_image: String
  }
  type UserMeta {
    id: ID!
    email_notification: Boolean
    email_promotion: Boolean
  }
  extend type Query {
    user(id: ID, username: String): User
    velog_config(username: String): VelogConfig
    auth: User
    unregister_token: String
  }
  extend type Mutation {
    update_about(about: String!): UserProfile
    update_thumbnail(url: String): UserProfile
    update_profile(display_name: String!, short_bio: String!): UserProfile
    update_velog_title(title: String!): VelogConfig
    update_social_info(profile_links: JSON!): UserProfile
    update_email_rules(notification: Boolean!, promotion: Boolean!): UserMeta
    unregister(token: String!): Boolean
  }
`;

async function updateUserProfile(userId: string, patch: Partial<UserProfile>) {
  const userProfileRepo = getRepository(UserProfile);
  const profile = await userProfileRepo.findOne({
    where: {
      fk_user_id: userId
    }
  });
  if (!profile) {
    throw new ApolloError('Failed to retrieve user profile');
  }
  Object.assign(profile, patch);
  await userProfileRepo.save(profile);
  return profile;
}

export const resolvers: IResolvers<any, ApolloContext> = {
  User: {
    profile: async (parent: User, _: any, { loaders }: ApolloContext) => {
      return loaders.userProfile.load(parent.id);
    },
    velog_config: async (parent: User, _: any, context: ApolloContext) => {
      const { loaders }: ApolloContext = context;
      return loaders.velogConfig.load(parent.id);
    },
    email: (parent: User, _: any, context: any) => {
      if (context.user_id !== parent.id) {
        throw new AuthenticationError('No permission to read email address');
      }
      return parent.email;
    },
    series_list: async (parent: User, _: any, { loaders }) => {
      const seriesRepo = getRepository(Series);
      const seriesList = await seriesRepo.find({
        where: {
          fk_user_id: parent.id
        },
        order: {
          updated_at: 'DESC'
        }
      });
      return seriesList;
    },
    user_meta: async (parent: User, _, { user_id }) => {
      if (user_id !== parent.id) {
        throw new AuthenticationError('No permission to read user_meta');
      }
      const userMetaRepo = getRepository(UserMeta);
      return userMetaRepo.findOne({ fk_user_id: user_id });
    }
  },
  Query: {
    user: async (parent: any, { id, username }: any) => {
      const repo = getRepository(User);
      try {
        if (username) {
          const user = await repo.findOne({
            where: {
              username
            }
          });
          return user;
        }
        const user = await repo.findOne({
          id
        });
        return user;
      } catch (e) {
        console.log(e);
      }
    },
    velog_config: async (parent: any, { username }: any) => {
      const repo = getRepository(VelogConfig);
      const velogConfig = repo
        .createQueryBuilder('velog_config')
        .leftJoinAndSelect('velog_config.user', 'user')
        .where('user.username = :username', { username })
        .getOne();
      return velogConfig;
    },
    auth: async (parent: any, params: any, ctx) => {
      if (!ctx.user_id) return null;
      return ctx.loaders.user.load(ctx.user_id);
    },
    unregister_token: async (parent: any, parmas: any, ctx) => {
      if (!ctx.user_id) throw new AuthenticationError('Not Logged In');
      return generateToken(
        {
          user_id: ctx.user_id
        },
        {
          subject: 'unregister_token',
          expiresIn: '5m'
        }
      );
    }
  },
  Mutation: {
    update_about: async (parent: any, args: { about: string }, ctx) => {
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }

      return updateUserProfile(ctx.user_id, {
        about: args.about
      });
    },
    update_thumbnail: async (parent: any, args: { url: string | null }, ctx) => {
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }

      return updateUserProfile(ctx.user_id, {
        thumbnail: args.url
      });
    },
    update_profile: async (
      paranet: any,
      args: { display_name: string; short_bio: string },
      ctx
    ) => {
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }

      if (checkEmpty(args.display_name)) {
        throw new ApolloError('Display name should not be empty', 'BAD_REQUEST');
      }

      return updateUserProfile(ctx.user_id, {
        display_name: args.display_name,
        short_bio: args.short_bio
      });
    },
    update_velog_title: async (parent: any, args: { title: string }, ctx) => {
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }
      if (args.title === '' || checkEmpty(args.title)) {
        throw new ApolloError('Title must not be empty', 'BAD_REQUEST');
      }
      if (args.title.length > 24) {
        throw new ApolloError('Title is too long', 'BAD_REQUEST');
      }
      const velogConfigRepo = getRepository(VelogConfig);
      const velogConfig = await velogConfigRepo.findOne({
        where: {
          fk_user_id: ctx.user_id
        }
      });
      if (!velogConfig) throw new ApolloError('Failed to retrieve velog config');
      velogConfig.title = args.title;
      await velogConfigRepo.save(velogConfig);
      return velogConfig;
    },
    update_social_info: async (
      parent: any,
      args: { profile_links: Record<string, null | string> },
      ctx
    ) => {
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }
      const allowedKeys = ['url', 'email', 'facebook', 'github', 'twitter'];
      const valid = Object.keys(args.profile_links).every(key => allowedKeys.includes(key));
      if (!valid) throw new ApolloError('profile_links contains invalid key', 'BAD_REQUEST');
      return updateUserProfile(ctx.user_id, {
        profile_links: args.profile_links
      });
    },
    update_email_rules: async (
      parent: any,
      args: { notification: boolean; promotion: boolean },
      ctx
    ) => {
      if (!ctx.user_id) throw new AuthenticationError('Not Logged In');
      const userMetaRepo = getRepository(UserMeta);
      const userMeta = await userMetaRepo.findOne({
        where: {
          fk_user_id: ctx.user_id
        }
      });
      if (!userMeta) {
        throw new ApolloError('Could not find user_meta');
      }
      userMeta.email_notification = args.notification;
      userMeta.email_promotion = args.promotion;
      await userMetaRepo.save(userMeta);
      return userMeta;
    },
    unregister: async (parent: any, args: { token: string }, ctx) => {
      if (!ctx.user_id) throw new AuthenticationError('Not Logged In');
      const decoded = await decodeToken<{ user_id: string; sub: string }>(args.token);
      console.log(decoded);
      if (decoded.sub !== 'unregister_token') {
        throw new ApolloError('invalid unregister_token', 'BAD_REQUEST');
      }
      if (ctx.user_id !== decoded.user_id) {
        throw new ApolloError('user_id mismatch', 'BAD_REQUEST');
      }
      const userRepo = getRepository(User);
      const user = await userRepo.findOne(ctx.user_id);
      if (!user) throw new ApolloError('Could not find user account');
      ctx.unsetCookie();
      await userRepo.remove(user);
      return true;
    }
  }
};
