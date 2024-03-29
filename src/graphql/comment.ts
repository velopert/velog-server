import { ApolloContext } from './../app';
import { gql, IResolvers, AuthenticationError, ApolloError } from 'apollo-server-koa';
import Comment from '../entity/Comment';
import { getRepository, MoreThan } from 'typeorm';
import Post from '../entity/Post';
import PostScore from '../entity/PostScore';
import cache from '../cache';
import UserMeta from '../entity/UserMeta';
import User from '../entity/User';
import { generateUnsubscribeToken, sleep } from '../lib/common';
import { createCommentEmail } from '../etc/emailTemplates';
import sendMail from '../lib/sendMail';
import { commentSpamFilter } from '../etc/spamFilter';
import Axios from 'axios';
import checkUnscore from '../etc/checkUnscore';
import { purgePost } from '../lib/graphcdn';
import {
  CommentNotificationActionInput,
  CommentReplyNotificationActionInput,
  notificationService,
} from '../services/notificationService';
import db from '../lib/db';

const slackUrl = `https://hooks.slack.com/services/${process.env.SLACK_TOKEN}`;

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
    replies_count: Int
  }

  extend type Query {
    comment(comment_id: ID): Comment
    subcomments(comment_id: ID): [Comment]
  }

  extend type Mutation {
    writeComment(post_id: ID!, text: String!, comment_id: ID): Comment
    removeComment(id: ID!): Boolean
    editComment(id: ID!, text: String!): Comment
  }
`;

type WriteCommentArgs = {
  post_id: string;
  text: string;
  comment_id?: string;
};

export const resolvers: IResolvers<any, ApolloContext> = {
  Comment: {
    text: (parent: Comment) => {
      if (parent.deleted) {
        return null;
      }
      return parent.text;
    },
    user: (parent: Comment, _: any, { loaders }) => {
      if (parent.deleted) {
        return null;
      }
      if (parent.user) return parent.user;
      const user = loaders.user.load(parent.fk_user_id);
      return user;
    },
    replies: async (parent: Comment, args: any) => {
      console.log(args);
      // TODO: Optimize
      if (!parent.has_replies) return [];
      const comments = await getRepository(Comment).find({
        where: {
          reply_to: parent.id,
          deleted: false,
        },
        order: {
          created_at: 'ASC',
        },
      });
      return comments;
    },
    replies_count: async (parent: Comment) => {
      if (!parent.has_replies) return 0;
      const count = await getRepository(Comment).count({
        where: {
          reply_to: parent.id,
          deleted: false,
        },
      });
      return count;
    },
  },
  Query: {
    comment: async (parent: any, { comment_id }) => {
      const comment = await getRepository(Comment).findOne(comment_id);
      return comment;
    },
    subcomments: async (parent: any, { comment_id }) => {
      const comments = await getRepository(Comment).find({
        where: {
          reply_to: comment_id,
        },
        order: {
          created_at: 'ASC',
        },
      });
      return comments;
    },
  },
  Mutation: {
    writeComment: async (parent: any, args, ctx) => {
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }
      const user = await getRepository(User).findOne(ctx.user_id, { relations: ['profile'] });

      if (!user) {
        throw new ApolloError('User not found', 'NOT_FOUND');
      }

      const { post_id, comment_id, text } = args as WriteCommentArgs;
      const post = await getRepository(Post).findOne(post_id, { relations: ['user'] });
      if (!post) {
        throw new ApolloError('Post not found', 'NOT_FOUND');
      }
      const { username } = post.user;
      const commentRepo = getRepository(Comment);
      const comment = new Comment();

      if (
        commentSpamFilter(text) &&
        Date.now() - post.user.created_at.getTime() < 1000 * 60 * 60 * 24 * 7
      ) {
        await Axios.post(slackUrl, {
          text: `스팸 의심!\n *userId*: ${ctx.user_id}\n*text*: ${text}`,
        });
        throw new ApolloError('Bad Request');
      }

      if (text.includes('<a href=')) {
        await Axios.post(slackUrl, {
          text: `스팸 의심!\n *userId*: ${ctx.user_id}\n*text*: ${text}`,
        });
        throw new ApolloError('Bad Request');
      }

      const recentCommentsCount = await commentRepo.count({
        where: {
          fk_user_id: ctx.user_id,
          created_at: MoreThan(new Date(Date.now() - 1000 * 60)),
        },
      });
      if (recentCommentsCount >= 10) {
        await Axios.post(slackUrl, {
          text: `스팸 의심!\n *userId*: ${ctx.user_id}\n*text*: ${text}`,
        });
        throw new ApolloError('Bad Request');
      }

      if (comment_id) {
        const commentTarget = await commentRepo.findOne(comment_id, {
          relations: ['user'],
        });
        if (!commentTarget) {
          throw new ApolloError('Target comment is not found', 'NOT_FOUND');
        }
        comment.level = commentTarget.level + 1;
        comment.reply_to = comment_id;

        if (comment.level >= 3) {
          throw new ApolloError('Maximum comment level is 2', 'BAD_REQUEST');
        }

        commentTarget.has_replies = true;
        await commentRepo.save(commentTarget);
      }

      comment.fk_user_id = ctx.user_id;
      comment.text = text;
      comment.fk_post_id = post_id;

      await commentRepo.save(comment);

      const unscored = checkUnscore(post.body.concat(post.title));
      if (!unscored) {
        const postScoreRepo = getRepository(PostScore);
        const score = new PostScore();
        score.type = 'LIKE';
        score.fk_post_id = args.id;
        score.score = 5;
        score.fk_user_id = ctx.user_id;
        await postScoreRepo.save(score);
      }

      const postScoreRepo = getRepository(PostScore);
      const score = new PostScore();
      score.fk_post_id = post_id;
      score.fk_user_id = ctx.user_id;
      score.score = 1;
      score.type = 'COMMENT';
      await postScoreRepo.save(score);

      const commenter = await getRepository(User).findOne(ctx.user_id, {
        relations: ['profile'],
      });

      try {
        // send email to commenter
        const p1 = (async () => {
          if (process.env.NODE_ENV !== 'production') return;
          if (!post.user.email) return;
          const userMeta = await getRepository(UserMeta).findOne({ fk_user_id: post.user.id });
          if (!userMeta?.email_notification) return;
          if (!commenter) return;
          if (commenter.id === post.user.id) return;
          const unsubscribeToken = await generateUnsubscribeToken(
            post.user.id,
            'email_notification'
          );
          const body = createCommentEmail({
            unsubscribeToken,
            postWriter: post.user.username,
            username: commenter.username,
            userThumbnail: commenter.profile.thumbnail,
            urlSlug: post.url_slug,
            postTitle: post.title,
            comment: text,
            commentId: comment.id,
          });
          sendMail({
            body,
            to: post.user.email,
            subject: `Re: ${post.title} | 댓글 알림`,
            from: 'Velog <notify@velog.io>',
          });
        })();

        // send email to parent comment user
        const p2 = (async () => {
          if (process.env.NODE_ENV !== 'production') return;
          if (!comment_id || !commenter) return;
          const parentComment = await getRepository(Comment).findOne(comment_id, {
            relations: ['user'],
          });
          if (
            !parentComment ||
            ctx.user_id === parentComment?.user.id ||
            !parentComment.user.email
          ) {
            return;
          }
          const userMeta = await getRepository(UserMeta).findOne({
            fk_user_id: parentComment.user.id,
          });
          if (!userMeta?.email_notification) return;
          const unsubscribeToken = await generateUnsubscribeToken(
            post.user.id,
            'email_notification'
          );
          const body = createCommentEmail({
            unsubscribeToken,
            postWriter: post.user.username,
            username: commenter.username,
            userThumbnail: commenter.profile.thumbnail,
            urlSlug: post.url_slug,
            postTitle: post.title,
            comment: text,
            commentId: comment.id,
          });
          sendMail({
            body,
            to: parentComment.user.email,
            subject: `Re: ${post.title} | 답글 알림`,
            from: 'Velog <notify@velog.io>',
          });
        })();

        await Promise.all([p1, p2]);
        await cache.remove(`ssr:/@${username}/${post.url_slug}`);
      } catch (e) {
        console.log(e);
      }

      try {
        await purgePost(post.id);
      } catch (e) {}

      let isNotificationCreated = false;
      // create comment reply notification
      if (comment_id) {
        const commentTarget = await commentRepo.findOne(comment_id, {
          relations: ['user'],
        });

        if (commentTarget && commentTarget?.user.id !== ctx.user_id) {
          try {
            await notificationService.createNotification({
              type: 'commentReply',
              fk_user_id: commentTarget.user.id,
              action_id: comment.id,
              actor_id: ctx.user_id,
              action: {
                commentReply: {
                  type: 'commentReply',
                  parent_comment_text: commentTarget.text,
                  reply_comment_text: comment.text,
                  actor_display_name: user.profile.display_name,
                  actor_thumbnail: user.profile.thumbnail || '',
                  actor_username: user.username,
                  comment_id: comment.id,
                  post_id: post.id,
                  post_url_slug: post.url_slug,
                  post_writer_username: post.user.username,
                },
              },
              cookies: ctx.cookies,
            });
            isNotificationCreated = true;
          } catch (_) {}
        }
      }

      // create comment notification
      if (!isNotificationCreated && post.user.id !== ctx.user_id) {
        try {
          await notificationService.createNotification({
            type: 'comment',
            fk_user_id: post.user.id,
            action_id: comment.id,
            actor_id: ctx.user_id,
            action: {
              comment: {
                actor_display_name: user.profile.display_name,
                actor_thumbnail: user.profile.thumbnail || '',
                actor_username: user.username,
                comment_id: comment.id,
                comment_text: comment.text,
                post_id: post.id,
                post_title: post.title,
                post_url_slug: post.url_slug,
                post_writer_username: post.user.username,
                type: 'comment',
              },
            },
            cookies: ctx.cookies,
          });
        } catch (error) {
          console.log('err', error);
        }
      }

      return comment;
    },
    removeComment: async (parent: any, { id }: any, ctx) => {
      const commentRepo = getRepository(Comment);
      const comment = await commentRepo.findOne(id, { relations: ['post'] });

      if (!comment) {
        throw new ApolloError('Comment not found');
      }
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }
      if (ctx.user_id !== comment.fk_user_id && comment?.post.fk_user_id !== ctx.user_id) {
        throw new ApolloError('No permission');
      }

      const post = await getRepository(Post).findOne(comment.fk_post_id, {
        relations: ['user'],
      });

      if (!post) {
        throw new ApolloError('Post not found');
      }

      const { username } = post.user;

      comment.deleted = true;
      await commentRepo.save(comment);

      const postScoreRepo = getRepository(PostScore);
      const score = await postScoreRepo
        .createQueryBuilder()
        .where('fk_post_id = :postId', { postId: comment.fk_post_id })
        .andWhere('fk_user_id = :userId', { userId: ctx.user_id })
        .andWhere("type = 'COMMENT'")
        .orderBy('created_at', 'DESC')
        .getOne();

      if (score) {
        await postScoreRepo.delete(score.id);
      }

      await cache.remove(`ssr:/@${username}/${post.url_slug}`);

      try {
        await purgePost(post.id);
      } catch (e) {}

      // remove notification
      const comemntNotification = await notificationService.findByUniqueKey({
        fkUserId: post.user.id,
        actionId: comment.id,
        actorId: ctx.user_id,
        type: 'comment',
      });

      if (comemntNotification) {
        await db.notification.update({
          where: {
            id: comemntNotification.id,
          },
          data: {
            is_deleted: true,
          },
        });
      }

      // remove notification
      const commentReplyNotificaiton = await notificationService.findByUniqueKey({
        fkUserId: post.user.id,
        actionId: comment.id,
        actorId: ctx.user_id,
        type: 'commentReply',
      });

      if (commentReplyNotificaiton) {
        await db.notification.update({
          where: {
            id: commentReplyNotificaiton.id,
          },
          data: {
            is_deleted: true,
          },
        });
      }

      return true;
    },
    editComment: async (parent: any, { id, text }: any, ctx) => {
      const commentRepo = getRepository(Comment);
      const comment = await commentRepo.findOne(id);
      if (!comment) {
        throw new ApolloError('Comment not found');
      }
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }
      if (ctx.user_id !== comment.fk_user_id) {
        throw new ApolloError('No permission');
      }

      comment.text = text;
      await commentRepo.save(comment);

      const postRepo = getRepository(Post);
      const post = await postRepo.findOne({
        relations: ['user'],
      });

      // update notification
      if (post) {
        const commentNotification = await notificationService.findByUniqueKey({
          fkUserId: post.user.id,
          actionId: comment.id,
          actorId: ctx.user_id,
          type: 'comment',
        });

        if (commentNotification && !commentNotification.is_deleted) {
          const action: CommentNotificationActionInput = {
            ...(commentNotification.action as CommentNotificationActionInput),
            comment_text: text,
          };

          await db.notification.update({
            where: {
              id: commentNotification.id,
            },
            data: {
              action,
            },
          });
        }

        const commentReplyNotification = await notificationService.findByUniqueKey({
          fkUserId: post.user.id,
          actionId: comment.id,
          actorId: ctx.user_id,
          type: 'commentReply',
        });

        if (commentReplyNotification && !commentReplyNotification.is_deleted) {
          const action: CommentReplyNotificationActionInput = {
            ...(commentReplyNotification.action as CommentReplyNotificationActionInput),
            reply_comment_text: text,
          };

          await db.notification.update({
            where: {
              id: commentReplyNotification.id,
            },
            data: {
              action,
            },
          });
        }
      }

      return comment;
    },
  },
};
