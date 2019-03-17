import { gql, IResolvers, AuthenticationError } from 'apollo-server-koa';
import User, { userLoader } from '../entity/User';
import { getManager, getRepository } from 'typeorm';
import UserProfile, { userProfileLoader } from '../entity/UserProfile';
import { seriesListLoader } from '../entity/Series';

export const typeDef = gql`
  type User {
    id: ID!
    username: String
    email: String
    created_at: Date
    updated_at: Date
    is_certified: Boolean
    profile: UserProfile
    series_list: [Series]
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
  extend type Query {
    user(id: ID, username: String): User
    auth: User
  }
`;

export const resolvers: IResolvers = {
  User: {
    profile: async (parent: User) => {
      return userProfileLoader.load(parent.id);
    },
    email: (parent: User, _: any, context: any) => {
      if (context.user_id !== parent.id) {
        throw new AuthenticationError('No permission to read email address');
      }
      return parent.email;
    },
    series_list: (parent: User) => {
      return seriesListLoader.load(parent.id);
    }
  },
  Query: {
    user: async (parent: any, { id, username }: any) => {
      const repo = getRepository(User);
      try {
        if (username) {
          const user = repo.findOne({
            where: {
              username
            }
          });
          return user;
        }
        const user = repo.findOne({
          id
        });
        return user;
      } catch (e) {
        console.log(e);
      }
    },
    auth: async (parent: any, params: any, ctx: any) => {
      if (!ctx.user_id) return null;
      return userLoader.load(ctx.user_id);
    }
  }
};
