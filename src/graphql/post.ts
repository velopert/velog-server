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
    released_at: String
    created_at: String
  }
  extend type Query {
    post(id: ID, username: String, url_slug: String): Post
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
    post: async (parent: any, { id, username, url_slug }) => {
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
        return post;
      } catch (e) {}
    }
  }
};
