import { ApolloContext } from './../app';
import { gql, IResolvers, AuthenticationError, ApolloError } from 'apollo-server-koa';
import Comment from '../entity/Comment';
import { getRepository } from 'typeorm';
import Post from '../entity/Post';
import PostScore from '../entity/PostScore';

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
          deleted: false
        },
        order: {
          created_at: 'ASC'
        }
      });
      return comments;
    },
    replies_count: async (parent: Comment) => {
      if (!parent.has_replies) return 0;
      const count = await getRepository(Comment).count({
        where: {
          reply_to: parent.id,
          deleted: false
        }
      });
      return count;
    }
  },
  Query: {
    comment: async (parent: any, { comment_id }) => {
      const comment = await getRepository(Comment).findOne(comment_id);
      return comment;
    },
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
  },
  Mutation: {
    writeComment: async (parent: any, args, ctx) => {
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }
      const { post_id, comment_id, text } = args as WriteCommentArgs;
      const post = await getRepository(Post).findOne(post_id);
      if (!post) {
        throw new ApolloError('Post not found', 'NOT_FOUND');
      }
      const commentRepo = getRepository(Comment);
      const comment = new Comment();

      if (comment_id) {
        const commentTarget = await commentRepo.findOne(comment_id);
        if (!commentTarget) {
          throw new ApolloError('Target comment is not found', 'NOT_FOUND');
        }
        comment.level = commentTarget.level + 1;
        comment.reply_to = comment_id;

        if (comment.level >= 4) {
          throw new ApolloError('Maximum comment level is 3', 'BAD_REQUEST');
        }

        commentTarget.has_replies = true;
        await commentRepo.save(commentTarget);
      }

      comment.fk_user_id = ctx.user_id;
      comment.text = text;
      comment.fk_post_id = post_id;

      await commentRepo.save(comment);

      const postScoreRepo = getRepository(PostScore);
      const score = new PostScore();
      score.fk_post_id = post_id;
      score.fk_user_id = ctx.user_id;
      score.score = 1;
      score.type = 'COMMENT';
      postScoreRepo.save(score);

      return comment;
    },
    removeComment: async (parent: any, { id }: any, ctx) => {
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
        postScoreRepo.delete(score.id);
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
      return comment;
    }
  }
};
