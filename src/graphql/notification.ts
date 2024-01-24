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

  union NotificationAction =
      FollowerNotificationAction
    | CommentNotificationAction
    | PostLikeNotificationAction

  type FollowerNotificationAction {
    follower_id: ID!
    actor_user_id: String!
    actor_display_name: String!
    actor_username: String!
    actor_thumbnail: String!
  }

  type CommentNotificationAction {
    comment_id: ID!
    post_title: String!
    post_url_slug: String!
    post_writer_username: String!
    comment_text: String!
    actor_display_name: String!
    actor_username: String!
    actor_thumbnail: String!
  }

  type PostLikeNotificationAction {
    post_like_id: ID!
    post_title: String!
    post_url_slug: String!
    post_writer_username: String!
    actor_display_name: String!
    actor_username: String!
    actor_thumbnail: String!
  }

  extend type Query {
    notificationCount: Int!
  }

  extend type Mutation {
    createNofication(input: CreateNotificationInput!): Notification!
  }

  input CreateNotificationInput {
    type: NotificationType!
    link: String
    fk_user_id: String!
    action: NotificationActionInput!
    action_id: String!
  }

  input NotificationActionInput {
    follower: FollowerNotificationActionInput
    comment: CommentNotificationActionInput
    postLike: PostLikeNotificationActionInput
  }

  input FollowerNotificationActionInput {
    follower_id: ID!
    follower_user_id: ID!
    actor_display_name: String!
    actor_username: String!
    actor_thumbnail: String!
    type: NotificationType!
  }

  input CommentNotificationActionInput {
    comment_id: ID!
    post_id: String!
    post_title: String!
    post_url_slug: String!
    post_writer_username: String!
    comment_text: String!
    actor_display_name: String!
    actor_username: String!
    actor_thumbnail: String!
    type: NotificationType!
  }

  input PostLikeNotificationActionInput {
    post_id: ID!
    post_like_id: ID!
    post_title: String!
    post_url_slug: String!
    post_writer_username: String!
    actor_display_name: String!
    actor_username: String!
    actor_thumbnail: String!
    type: NotificationType!
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
