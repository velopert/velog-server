import { AuthenticationError, IResolvers, gql } from 'apollo-server-koa';
import { ApolloContext } from '../app';
import { notificationService } from '../services/notificationService';

export const typeDef = gql`
  type Notification {
    id: ID!
    type: NotificationType!
    fk_user_id: String!
    actor_id: ID
    action: JSON!
    action_target_id: ID
    is_read: Boolean!
    is_deleted: Boolean!
    created_at: Date!
  }

  enum NotificationType {
    follower
    comment
    postLike
  }

  extend type Query {
    notificationCount: Int!
  }
`;

export const resovlers: IResolvers<any, ApolloContext> = {
  Query: {
    notificationCount: async (_, __, ctx) => {
      if (!ctx.user_id) throw new AuthenticationError('Not Logged In');
      return await notificationService.notificationCount(ctx.cookies);
    },
  },
};
