import Joi from 'joi';
import Cookies from 'cookies';
import { getEndpoint } from '../lib/getEndpoint';
import Axios, { AxiosResponse } from 'axios';
import { ApolloError } from 'apollo-server-koa';

export const notificationService = {
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
  async createNotification<T extends NotificationType>({
    type,
    fk_user_id,
    actor_id,
    action,
    action_id,
    cookies,
  }: CreateNotificationArgs<T>) {
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
        // graphql union type
        action: {
          [type]: action,
        },
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
      follower: Joi.object().keys({
        follower_id: Joi.string().uuid().required(),
        follower_user_id: Joi.string().uuid().required(),
        actor_display_name: Joi.string().required(),
        actor_username: Joi.string().required(),
        actor_thumbnail: Joi.string().required().allow(''),
        type: Joi.string().valid('follower').required(),
      }),
      comment: Joi.object().keys({
        comment_id: Joi.string().uuid().required(),
        post_id: Joi.string().uuid().required(),
        post_title: Joi.string().required(),
        post_url_slug: Joi.string().required(),
        post_writer_username: Joi.string().required(),
        comment_text: Joi.string().required(),
        actor_display_name: Joi.string().required(),
        actor_username: Joi.string().required(),
        actor_thumbnail: Joi.string().required(),
        type: Joi.string().valid('comment').required(),
      }),
      postLike: Joi.object().keys({
        post_like_id: Joi.string().uuid().required(),
        post_id: Joi.string().uuid().required(),
        post_title: Joi.string().required(),
        post_url_slug: Joi.string().required(),
        post_writer_username: Joi.string().required(),
        actor_display_name: Joi.string().required(),
        actor_username: Joi.string().required(),
        actor_thumbnail: Joi.string().required(),
        type: Joi.string().valid('postLike').required(),
      }),
    };

    const validation = Joi.validate(action, schema[type]);

    if (validation.error) return false;
    return true;
  },
};

type NotificationCountResponse = {
  notificationCount: number;
};

export type NotificationType = 'comment' | 'postLike' | 'follower';

export type CreateNotificationArgs<T = NotificationType> = {
  type: NotificationType;
  fk_user_id: string;
  actor_id?: string;
  action_id?: string;
  cookies: Cookies;
  action: T extends 'comment'
    ? CommentNotificationAction
    : NotificationType extends 'follower'
    ? FollowerNotificationAction
    : NotificationType extends 'postLike'
    ? PostLikeNotificationAction
    : unknown;
};

export type CommentNotificationAction = {
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

export type FollowerNotificationAction = {
  actor_display_name: string;
  actor_thumbnail: string;
  actor_user_id: string;
  actor_username: string;
  follower_id: string;
  type: 'follower';
};

export type PostLikeNotificationAction = {
  actor_display_name: string;
  actor_thumbnail: string;
  actor_username: string;
  post_like_id: string;
  post_title: string;
  post_url_slug: string;
  post_writer_username: string;
  type: 'postLike';
};
