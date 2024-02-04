import Joi from 'joi';
import Cookies from 'cookies';
import { getEndpoint } from '../lib/getEndpoint';
import Axios, { AxiosResponse } from 'axios';
import { ApolloError } from 'apollo-server-koa';
import db from '../lib/db';

export const notificationService = {
  async findByUniqueKey({ fkUserId, actorId, type, actionId }: findByActionArgs) {
    const notification = await db.notification.findFirst({
      where: {
        fk_user_id: fkUserId,
        actor_id: actorId,
        action_id: actionId,
        type,
      },
    });
    return notification;
  },
  async notificationCount(cookies: Cookies) {
    const NOTIFICATION_COUNT_QUERY = `
    query NotificationCount {
      notificationCount
    }
    `;

    const endpoint = getEndpoint();
    const accessToken = cookies.get('access_token') ?? '';

    const res = await Axios.post<AxiosResponse<NotificationCountResponse>>(
      endpoint,
      {
        operationName: 'NotificationCount',
        query: NOTIFICATION_COUNT_QUERY,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return res.data.data.notificationCount;
  },
  async createNotification({
    type,
    fk_user_id,
    actor_id,
    action,
    action_id,
    cookies,
  }: CreateNotificationArgs) {
    const validate = this.notificationActionValidate(type, action);

    if (!validate) {
      throw new ApolloError('Invalid action format', 'BAD_REQUEST');
    }

    const CREATE_NOTIFICATION_MUTATION = `
      mutation CreateNotification($input: CreateNotificationInput!) {
        createNotification(input: $input) {
          id
        }
      }
    `;

    const variables = {
      input: {
        type,
        fk_user_id,
        actor_id,
        action_id,
        action,
      },
    };

    const endpoint = getEndpoint();
    const accessToken = cookies.get('access_token') ?? '';

    const res = await Axios.post(
      endpoint,
      {
        operationName: 'CreateNotification',
        query: CREATE_NOTIFICATION_MUTATION,
        variables,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return res.data;
  },
  notificationActionValidate(type: NotificationType, action: any): boolean {
    const schema = {
      comment: Joi.object().keys({
        comment_id: Joi.string().uuid().required(),
        post_id: Joi.string().uuid().required(),
        post_title: Joi.string().required(),
        post_url_slug: Joi.string().required(),
        post_writer_username: Joi.string().required(),
        comment_text: Joi.string().required(),
        actor_display_name: Joi.string().required(),
        actor_username: Joi.string().required(),
        actor_thumbnail: Joi.string().allow('').required(),
        type: Joi.string().valid('comment').required(),
      }),
      commentReply: Joi.object().keys({
        comment_id: Joi.string().uuid().required(),
        parent_comment_text: Joi.string().required(),
        post_id: Joi.string().uuid().required(),
        post_url_slug: Joi.string().required(),
        post_writer_username: Joi.string().required(),
        reply_comment_text: Joi.string().required(),
        actor_display_name: Joi.string().required(),
        actor_username: Joi.string().required(),
        actor_thumbnail: Joi.string().allow('').required(),
        type: Joi.string().valid('commentReply').required(),
      }),
    };

    const validation = Joi.validate(action[type], schema[type]);

    if (validation.error) {
      console.log('notification validation error', validation.error);
      return false;
    }
    return true;
  },
};

type findByActionArgs = {
  fkUserId: string;
  actorId: string;
  actionId: string;
  type: NotificationType;
};

type NotificationCountResponse = {
  notificationCount: number;
};

type NotificationActionInput = {
  comment?: CommentNotificationActionInput;
  commentReply?: CommentReplyNotificationActionInput;
};

export type NotificationType = 'comment' | 'commentReply';

export type CreateNotificationArgs = {
  type: NotificationType;
  fk_user_id: string;
  actor_id?: string;
  action_id?: string;
  cookies: Cookies;
  action: NotificationActionInput;
};

export type CommentNotificationActionInput = {
  actor_display_name: string;
  actor_thumbnail: string;
  actor_username: string;
  comment_id: string;
  comment_text: string;
  post_id: string;
  post_title: string;
  post_url_slug: string;
  post_writer_username: string;
  type: 'comment';
};

export type CommentReplyNotificationActionInput = {
  comment_id: string;
  parent_comment_text: string;
  post_id: string;
  post_url_slug: string;
  post_writer_username: string;
  reply_comment_text: string;
  actor_display_name: string;
  actor_username: string;
  actor_thumbnail: string;
  type: 'commentReply';
};

export type FollowNotificationActionInput = {
  actor_display_name: string;
  actor_thumbnail: string;
  actor_user_id: string;
  actor_username: string;
  follower_id: string;
  type: 'follower';
};

export type PostLikeNotificationActionInput = {
  actor_display_name: string;
  actor_thumbnail: string;
  actor_username: string;
  post_like_id: string;
  post_title: string;
  post_url_slug: string;
  post_writer_username: string;
  type: 'postLike';
};
