import { ApolloContext } from './../app';
import { gql, IResolvers } from 'apollo-server-koa';
import Comment from '../entity/Comment';
import { getRepository } from 'typeorm';

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
    created_at: Date
  }

  extend type Query {
    subcomments(comment_id: ID): [Comment]
  }
`;

export const resolvers: IResolvers<any, ApolloContext> = {
  Comment: {
    text: (parent: Comment) => {
      if (parent.deleted) {
        return null;
      }
      return parent.text;
    },
    user: (parent: Comment, _: any, { loaders }) => {
      if (parent.deleted) return null;
      if (parent.user) return parent.user;
      const user = loaders.user.load(parent.fk_user_id);
      return user;
    }
  },
  Query: {
    subcomments: async (parent: any, { comment_id }) => {
      const comments = await getRepository(Comment).find({
        where: {
          reply_to: comment_id
        },
        order: {
          created_at: 'ASC'
        }
      });
      return comments;
    }
  }
};
