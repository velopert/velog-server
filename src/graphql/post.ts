import { ApolloContext } from './../app';
import { gql, IResolvers, ApolloError, AuthenticationError } from 'apollo-server-koa';
import Post from '../entity/Post';
import { getRepository, getManager, getConnectionManager } from 'typeorm';
import PostScore from '../entity/PostScore';
import { normalize, escapeForUrl } from '../lib/utils';
import removeMd from 'remove-markdown';
import PostsTags from '../entity/PostsTags';
import Tag from '../entity/Tag';
import Comment from '../entity/Comment';
import Series from '../entity/Series';
import SeriesPosts, { subtractIndexAfter, appendToSeries } from '../entity/SeriesPosts';
import generate from 'nanoid/generate';
import PostLike from '../entity/PostLike';
import esClient from '../search/esClient';
import keywordSearch from '../search/keywordSearch';
import searchSync from '../search/searchSync';

export const typeDef = gql`
  type LinkedPosts {
    previous: Post
    next: Post
  }
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
    comments: [Comment]
    tags: [String]
    comments_count: Int
    series: Series
    liked: Boolean
    linked_posts: LinkedPosts
  }
  type SearchResult {
    count: Int
    posts: [Post]
  }
  extend type Query {
    post(id: ID, username: String, url_slug: String): Post
    posts(cursor: ID, limit: Int, username: String): [Post]
    trendingPosts(offset: Int, limit: Int): [Post]
    searchPosts(keyword: String!, offset: Int, limit: Int, username: String): SearchResult
  }
  extend type Mutation {
    writePost(
      title: String
      body: String
      tags: [String]
      is_markdown: Boolean
      is_temp: Boolean
      is_private: Boolean
      url_slug: String
      thumbnail: String
      meta: JSON
      series_id: ID
    ): Post
    editPost(
      id: ID!
      title: String
      body: String
      tags: [String]
      is_markdown: Boolean
      is_temp: Boolean
      url_slug: String
      thumbnail: String
      meta: JSON
      is_private: Boolean
      series_id: ID
    ): Post

    removePost(id: ID!): Boolean
    likePost(id: ID!): Post
    unlikePost(id: ID!): Post
  }
`;

type WritePostArgs = {
  title: string;
  body: string;
  tags: string[];
  is_markdown: boolean;
  is_temp: boolean;
  url_slug: string;
  thumbnail: string | null;
  meta: any;
  series_id?: string;
  is_private: boolean;
};
type EditPostArgs = WritePostArgs & {
  id: string;
};

export const resolvers: IResolvers<any, ApolloContext> = {
  Post: {
    user: (parent: Post, _: any, { loaders }) => {
      if (!parent.user) {
        return loaders.user.load(parent.fk_user_id);
      }
      // TODO: fetch user if null
      return parent.user;
    },
    short_description: (parent: Post) => {
      if (parent.meta.short_description) {
        return parent.meta.short_description;
      }

      const removed = removeMd(
        parent.body
          .replace(/```([\s\S]*?)```/g, '')
          .replace(/~~~([\s\S]*?)~~~/g, '')
          .slice(0, 500)
      );
      return removed.slice(0, 200) + (removed.length > 200 ? '...' : '');
    },
    comments: (parent: Post, _: any, { loaders }) => {
      if (parent.comments) return parent.comments;
      return loaders.comments.load(parent.id);
    },
    comments_count: async (parent: Post, _: any, { loaders }) => {
      if (parent.comments) return parent.comments.length;
      const commentRepo = getRepository(Comment);
      const count = await commentRepo.count({
        where: {
          fk_post_id: parent.id,
          deleted: false
        }
      });
      return count;
      // const comments = await loaders.comments.load(parent.id);
      // return comments.length;
    },
    tags: async (parent: Post, _: any, { loaders }) => {
      const tags = await loaders.tags.load(parent.id);
      return tags.map(tag => tag.name);
    },
    series: async (parent: Post) => {
      const seriesPostsRepo = getRepository(SeriesPosts);
      const seriesPost = await seriesPostsRepo
        .createQueryBuilder('series_posts')
        .leftJoinAndSelect('series_posts.series', 'series')
        .where('series_posts.fk_post_id = :id', { id: parent.id })
        .getOne();
      if (!seriesPost) return null;
      return seriesPost.series;
    },
    liked: async (parent: Post, args: any, { user_id }) => {
      const postLikeRepo = getRepository(PostLike);
      if (!user_id) return false;
      const liked = await postLikeRepo.findOne({
        fk_post_id: parent.id,
        fk_user_id: user_id
      });
      return !!liked;
    },
    linked_posts: async (parent: Post, args: any) => {
      const seriesPostsRepo = getRepository(SeriesPosts);

      const seriesPost = await seriesPostsRepo.findOne({
        where: {
          fk_post_id: parent.id
        }
      });

      // is in series: show prev & next series post
      if (seriesPost) {
        const { index } = seriesPost;
        const seriesPosts = await seriesPostsRepo
          .createQueryBuilder('series_posts')
          .leftJoinAndSelect('series_posts.post', 'post')
          .where('fk_series_id = :seriesId', { seriesId: seriesPost.fk_series_id })
          .andWhere('(index = :prevIndex OR index = :nextIndex)', {
            prevIndex: index - 1,
            nextIndex: index + 1
          })
          .orderBy('index', 'ASC')
          .getMany();

        // only one post is found
        if (seriesPosts.length === 1) {
          return seriesPosts[0].index > index // compare series index
            ? {
                next: seriesPosts[0].post // is next post
              }
            : {
                previous: seriesPosts[0].post // is prev post
              };
        }

        return {
          previous: seriesPosts[0] && seriesPosts[0].post,
          next: seriesPosts[1] && seriesPosts[1].post
        };
      }

      // is not in series: show prev & next in time order
      const postRepo = getRepository(Post);

      // TODO: handle private & temp posts

      const [previous, next] = await Promise.all([
        postRepo
          .createQueryBuilder('posts')
          .where('fk_user_id = :userId', { userId: parent.fk_user_id })
          .andWhere('released_at < :releasedAt', { releasedAt: parent.released_at })
          .orderBy('released_at', 'DESC')
          .getOne(),
        postRepo
          .createQueryBuilder('posts')
          .where('fk_user_id = :userId', { userId: parent.fk_user_id })
          .andWhere('released_at > :releasedAt', { releasedAt: parent.released_at })
          .andWhere('id != :postId', { postId: parent.id })
          .orderBy('released_at', 'ASC')
          .getOne()
      ]);

      return {
        previous,
        next
      };
    }
  },
  Query: {
    post: async (parent: any, { id, username, url_slug }: any, ctx: any) => {
      try {
        if (id) {
          const post = await getManager()
            .createQueryBuilder(Post, 'post')
            .leftJoinAndSelect('post.user', 'user')
            .where('post.id = :id', { id })
            .getOne();

          return post;
        }
        const post = await getManager()
          .createQueryBuilder(Post, 'post')
          .leftJoinAndSelect('post.user', 'user')
          .where('user.username = :username AND url_slug = :url_slug', { username, url_slug })
          .getOne();
        if (!post) return null;
        if ((post.is_temp || post.is_private) && post.fk_user_id !== ctx.user_id) {
          return null;
        }

        return post;
      } catch (e) {
        console.log(e);
      }
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
        query.orWhere('post.is_private = true and post.fk_user_id = :user_id', {
          user_id: context.user_id
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
      const posts = await getRepository(Post).findByIds(ids);
      const normalized = normalize(posts);
      const ordered = ids.map(id => normalized[id]);

      return ordered;
    },
    searchPosts: async (parent: any, { keyword, offset, limit = 20, username }: any, ctx) => {
      if (limit > 100) {
        throw new ApolloError('Limit is too big', 'BAD_REQUEST');
      }

      const searchResult = await keywordSearch({
        keyword,
        username,
        from: offset,
        size: limit,
        signedUserId: ctx.user_id
      });

      return searchResult;
      // const searchResult = await postsIndex.search({
      //   offset,
      //   query: keyword,
      //   length: 20
      // });
      // return {
      //   count: searchResult.nbHits,
      //   posts: searchResult.hits
      // };
    }
  },
  Mutation: {
    writePost: async (parent: any, args, ctx) => {
      const postRepo = getRepository(Post);
      const seriesRepo = getRepository(Series);
      const seriesPostsRepo = getRepository(SeriesPosts);

      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }
      const post = new Post();
      const data = args as WritePostArgs;
      post.fk_user_id = ctx.user_id;
      post.title = data.title;
      post.body = data.body;
      post.is_temp = data.is_temp;
      post.is_markdown = data.is_markdown;
      post.meta = data.meta;
      post.thumbnail = data.thumbnail;
      post.is_private = data.is_private;

      let processedUrlSlug = escapeForUrl(data.url_slug);
      const urlSlugDuplicate = await postRepo.findOne({
        where: {
          fk_user_id: ctx.user_id,
          url_slug: processedUrlSlug
        }
      });
      if (urlSlugDuplicate) {
        const randomString = generate('abcdefghijklmnopqrstuvwxyz1234567890', 8);
        processedUrlSlug += `-${randomString}`;
      }

      post.url_slug = processedUrlSlug;

      // Check series
      let series: Series | undefined;
      if (data.series_id) {
        series = await seriesRepo.findOne(data.series_id);
        if (!series) {
          throw new ApolloError('Series not found', 'NOT_FOUND');
        }
        if (series.fk_user_id !== ctx.user_id) {
          throw new ApolloError('This series is not yours', 'NO_PERMISSION');
        }
      }

      const tagsData = await Promise.all(data.tags.map(Tag.findOrCreate));
      await postRepo.save(post);

      PostsTags.syncPostTags(post.id, tagsData);

      // Link to series
      if (data.series_id) {
        appendToSeries(data.series_id, post.id);
      }

      post.tags = tagsData;

      searchSync.update(post.id);
      return post;
    },
    editPost: async (parent: any, args, ctx) => {
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }

      const {
        id,
        title,
        body,
        is_temp,
        is_markdown,
        meta,
        thumbnail,
        series_id,
        url_slug,
        tags,
        is_private
      } = args as EditPostArgs;
      const postRepo = getRepository(Post);
      const seriesRepo = getRepository(Series);
      const seriesPostsRepo = getRepository(SeriesPosts);

      const post = await postRepo.findOne(id);
      if (!post) {
        throw new ApolloError('Post not found', 'NOT_FOUND');
      }
      if (post.fk_user_id !== ctx.user_id) {
        throw new ApolloError('This post is not yours', 'NO_PERMISSION');
      }

      const prevSeriesPost = await seriesPostsRepo.findOne({
        fk_post_id: post.id
      });

      if (prevSeriesPost && prevSeriesPost.fk_series_id !== series_id) {
        if (series_id) {
          // append series
          const series = await seriesRepo.findOne({
            id: series_id
          });
          if (!series) {
            throw new ApolloError('Series not found', 'NOT_FOUND');
          }
          if (series.fk_user_id !== ctx.user_id) {
            throw new ApolloError('This series is not yours', 'NO_PERMISSION');
          }
          await appendToSeries(series_id, post.id);
        }
        // remove series
        await Promise.all([
          subtractIndexAfter(prevSeriesPost.fk_series_id, prevSeriesPost.index),
          seriesPostsRepo.remove(prevSeriesPost)
        ]);
      }

      post.title = title;
      post.body = body;
      post.is_temp = is_temp;
      post.is_markdown = is_markdown;
      post.meta = meta;
      post.thumbnail = thumbnail;
      post.is_private = is_private;

      // TODO: if url_slug changes, create url_slug_alias
      let processedUrlSlug = escapeForUrl(url_slug);
      const urlSlugDuplicate = await postRepo.findOne({
        where: {
          fk_user_id: ctx.user_id,
          url_slug: processedUrlSlug
        }
      });
      if (urlSlugDuplicate) {
        const randomString = generate('abcdefghijklmnopqrstuvwxyz1234567890', 8);
        processedUrlSlug += `-${randomString}`;
      }

      post.url_slug = processedUrlSlug;

      const tagsData = await Promise.all(tags.map(Tag.findOrCreate));
      await Promise.all([PostsTags.syncPostTags(post.id, tagsData), postRepo.save(post)]);

      searchSync.update(post.id);

      return post;
    },
    removePost: async (parent: any, args, ctx) => {
      const { id } = args as { id: string };
      const postRepo = getRepository(Post);
      const post = await postRepo.findOne(id);
      if (!post) {
        throw new ApolloError('Post not found', 'NOT_FOUND');
      }
      if (post.fk_user_id !== ctx.user_id) {
        throw new ApolloError('This post is not yours', 'NO_PERMISSION');
      }
      // check series
      const seriesPostsRepo = getRepository(SeriesPosts);
      const seriesPost = await seriesPostsRepo.findOne({
        fk_post_id: post.id
      });

      await postRepo.remove(post);
      if (seriesPost) {
        subtractIndexAfter(seriesPost.fk_series_id, seriesPost.index);
      }

      searchSync.remove(id);
      return true;
    },
    likePost: async (parent: any, args, ctx) => {
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }

      // find post
      const postRepo = getRepository(Post);
      const post = await postRepo.findOne(args.id);

      if (!post) {
        throw new ApolloError('Post not found', 'NOT_FOUND');
      }

      // check already liked
      const postLikeRepo = getRepository(PostLike);
      const alreadyLiked = await postLikeRepo.findOne({
        where: {
          fk_post_id: args.id,
          fk_user_id: ctx.user_id
        }
      });

      // exists
      if (alreadyLiked) {
        return post;
      }

      const postLike = new PostLike();
      postLike.fk_post_id = args.id;
      postLike.fk_user_id = ctx.user_id;

      try {
        await postLikeRepo.save(postLike);
      } catch (e) {
        return post;
      }

      const count = await postLikeRepo.count({
        where: {
          fk_post_id: args.id
        }
      });

      post.likes = count;

      await postRepo.save(post);

      return post;
    },
    unlikePost: async (parent: any, args, ctx) => {
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }

      // find post
      const postRepo = getRepository(Post);
      const post = await postRepo.findOne(args.id);

      if (!post) {
        throw new ApolloError('Post not found', 'NOT_FOUND');
      }

      // check already liked
      const postLikeRepo = getRepository(PostLike);
      const postLike = await postLikeRepo.findOne({
        where: {
          fk_post_id: args.id,
          fk_user_id: ctx.user_id
        }
      });

      // not exists
      if (!postLike) {
        return post;
      }

      await postLikeRepo.remove(postLike);

      const count = await postLikeRepo.count({
        where: {
          fk_post_id: args.id
        }
      });

      post.likes = count;

      await postRepo.save(post);

      return post;
    }
  }
};
