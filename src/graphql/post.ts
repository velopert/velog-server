import { gql, IResolvers, ApolloError } from 'apollo-server-koa';
import Post from '../entity/Post';
import { getRepository, getManager } from 'typeorm';
import User from '../entity/User';
import PostScore from '../entity/PostScore';
import { normalize } from '../lib/utils';
import removeMd from 'remove-markdown';

export const typeDef = gql`
  type Post {
    id: ID!
    title: String
    body: String
    thumbnail: String
    is_markdown: Boolean
    is_temp: Boolean
    user: User
    url_slug: String
    likes: Int
    meta: JSON
    views: Int
    is_private: Boolean
    released_at: Date
    created_at: Date
    updated_at: Date
    short_description: String
  }
  extend type Query {
    post(id: ID, username: String, url_slug: String): Post
    posts(cursor: ID, limit: Int, username: String): [Post]
    trendingPosts(offset: Int, limit: Int): [Post]
  }
`;

export const resolvers: IResolvers = {
  Post: {
    user: (parent: Post) => {
      // TODO: fetch user if null
      return parent.user;
    },
    short_description: (parent: Post) => {
      if (parent.meta.short_description) {
        return parent.meta.short_description;
      }
      const removed = removeMd(parent.body);
      return removed.slice(0, 200) + (removed.length > 200 ? '...' : '');
    }
  },
  Query: {
    post: async (parent: any, { id, username, url_slug }: any, ctx: any) => {
      try {
        if (id) {
          const post = await getRepository(Post).findOne({
            loadEagerRelations: true,
            where: {
              id
            }
          });
          return post;
        }
        const post = await getManager()
          .createQueryBuilder(Post, 'post')
          .leftJoinAndSelect('post.user', 'user')
          .where('user.username = :username AND url_slug = :url_slug', { username, url_slug })
          .getOne();
        if (!post) return null;
        if ((post.is_temp || post.is_private === true) && post.fk_user_id !== ctx.user_id) {
          return null;
        }
        return post;
      } catch (e) {}
    },
    posts: async (parent: any, { cursor, limit = 20, username }: any, context: any) => {
      const query = getManager()
        .createQueryBuilder(Post, 'post')
        .limit(limit)
        .orderBy('post.released_at', 'DESC')
        .addOrderBy('post.id', 'DESC')
        .leftJoinAndSelect('post.user', 'user')
        .where('post.is_temp = false AND is_private = false');

      if (username) {
        query.andWhere('user.username = :username', { username });
      }

      if (cursor) {
        const post = await getRepository(Post).findOne({
          id: cursor
        });
        if (!post) {
          throw new ApolloError('invalid cursor');
        }
        query.andWhere('post.released_at < :date', {
          date: post.released_at,
          id: post.id
        });
        query.orWhere('post.released_at = :date AND post.id < :id', {
          date: post.released_at,
          id: post.id
        });
      }

      if (context.user_id) {
        query.orWhere('post.is_private = true and post.fk_user_id = :id', {
          id: context.user_id
        });
      }
      const posts = await query.getMany();
      return posts;
    },
    trendingPosts: async (parent: any, { offset = 0, limit = 20 }) => {
      const query = getRepository(PostScore)
        .createQueryBuilder()
        .select('fk_post_id')
        .addSelect('SUM(score)', 'score')
        .where('created_at > now()::DATE - 14 AND fk_post_id IS NOT NULL')
        .groupBy('fk_post_id')
        .orderBy('score', 'DESC')
        .addOrderBy('fk_post_id', 'DESC')
        .limit(limit);

      if (offset) {
        query.offset(offset);
      }

      const rows = (await query.getRawMany()) as { fk_post_id: string; score: number }[];
      const ids = rows.map(row => row.fk_post_id);
      console.log(ids);
      const posts = await getRepository(Post).findByIds(ids);
      const normalized = normalize(posts);
      const ordered = ids.map(id => normalized[id]);

      return ordered;
      return [];
    }
  }
};
