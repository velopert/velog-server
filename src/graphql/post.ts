import { gql, IResolvers } from 'apollo-server-koa';
import Post from '../entity/Post';
import { getRepository, getManager } from 'typeorm';
import User from '../entity/User';

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
  }
  extend type Query {
    post(id: ID, username: String, url_slug: String): Post
    posts(cursor: ID, limit: Int): [Post]
  }
`;

export const resolvers: IResolvers = {
  Post: {
    user: (parent: Post) => {
      // TODO: fetch user if null
      return parent.user;
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
    posts: async (parent: any, { cusor, limit = 20 }: any, context: any) => {
      const posts = await getManager()
        .createQueryBuilder(Post, 'post')
        .limit(limit)
        .orderBy('post.released_at', 'DESC')
        .leftJoinAndSelect('post.user', 'user')
        .getMany();
      return posts;
    }
  }
};
