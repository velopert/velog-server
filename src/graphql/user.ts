import { gql, IResolvers } from 'apollo-server-koa';
import User from '../entity/User';
import { getManager, getRepository } from 'typeorm';
import UserProfile from '../entity/UserProfile';

export const typeDef = gql`
  type User {
    id: ID!
    username: String
    email: String
    created_at: String
    updated_at: String
    is_certified: Boolean
    profile: UserProfile
  }
  type UserProfile {
    id: ID!
    display_name: String
    short_bio: String
    thumbnail: String
    created_at: String
    updated_at: String
    about: String
    profile_links: JSON
  }
  extend type Query {
    user(id: ID, username: String): User
  }
`;

export const resolvers: IResolvers = {
  User: {
    profile: async (parent: User) => {
      const profile = await getManager()
        .createQueryBuilder(UserProfile, 'user_profile')
        .where('fk_user_id = :id', { id: parent.id })
        .getOne();
      return profile;
    }
  },
  Query: {
    user: async (parent: any, { id, username }) => {
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
    }
  }
};
