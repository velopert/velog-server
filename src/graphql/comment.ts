import { gql, IResolvers } from 'apollo-server-koa';
import Comment from '../entity/Comment';
import { getRepository } from 'typeorm';
import User from '../entity/User';

export const typeDef = gql`
  type Comment {
    id: ID!
    text: String
    likes: Int
    level: Int
    has_replies: Boolean
    deleted: Boolean
    user: User
    replies: [Comment]
  }
`;
export const resolvers: IResolvers = {
  Comment: {
    user: async (parent: Comment, { id }) => {
      if (parent.user) return parent.user;
      const user = await getRepository(User).findOne(id);
      return user;
    }
  },
  Query: {}
};
