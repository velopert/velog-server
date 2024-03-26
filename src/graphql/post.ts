import { ApolloContext } from './../app';
import { gql, IResolvers, ApolloError, AuthenticationError } from 'apollo-server-koa';
import Post from '../entity/Post';
import { getRepository, getManager, LessThan, Not, MoreThan } from 'typeorm';
import { normalize } from '../lib/utils';
import removeMd from 'remove-markdown';
import UrlSlugHistory from '../entity/UrlSlugHistory';
import Comment from '../entity/Comment';
import Series from '../entity/Series';
import SeriesPosts, { subtractIndexAfter, appendToSeries } from '../entity/SeriesPosts';
import PostLike from '../entity/PostLike';
import keywordSearch from '../search/keywordSearch';
import searchSync from '../search/searchSync';
import PostHistory from '../entity/PostHistory';
import User from '../entity/User';
import PostRead from '../entity/PostRead';
import hash from '../lib/hash';
import cache from '../cache';
import PostReadLog from '../entity/PostReadLog';
import Axios from 'axios';
import { createReadLog } from '../lib/bigQuery';
import esClient from '../search/esClient';
import { buildFallbackRecommendedPosts, buildRecommendedPostsQuery } from '../search/buildQuery';
import { pickRandomItems } from '../etc/pickRandomItems';
import { purgeRecentPosts, purgeUser, purgePost } from '../lib/graphcdn';
import imageService from '../services/imageService';
import externalInterationService from '../services/externalIntegrationService';
import postService from '../services/postService';
import postHistoryService, { CreatePostHistoryArgs } from '../services/postHistoryService';
import userService from '../services/userService';

type ReadingListQueryParams = {
  type: 'LIKED' | 'READ';
  limit?: number;
  cursor?: string;
};

export const typeDef = gql`
  enum ReadingListOption {
    LIKED
    READ
  }
  type ReadCountByDay {
    count: Int
    day: Date
  }
  type Stats {
    total: Int
    count_by_day: [ReadCountByDay]
  }

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
    last_read_at: Date
    recommended_posts: [Post]
  }
  type SearchResult {
    count: Int
    posts: [Post]
  }
  type PostHistory {
    id: ID
    fk_post_id: ID
    title: String
    body: String
    is_markdown: Boolean
    created_at: Date
  }
  extend type Query {
    post(id: ID, username: String, url_slug: String): Post
    posts(cursor: ID, limit: Int, username: String, temp_only: Boolean, tag: String): [Post]
    recentPosts(cursor: ID, limit: Int): [Post]
    trendingPosts(offset: Int, limit: Int, timeframe: String): [Post]
    searchPosts(keyword: String!, offset: Int, limit: Int, username: String): SearchResult
    postHistories(post_id: ID): [PostHistory]
    lastPostHistory(post_id: ID!): PostHistory
    readingList(type: ReadingListOption, cursor: ID, limit: Int): [Post]
    getStats(post_id: ID!): Stats
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
      token: String
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
      token: String
    ): Post
    createPostHistory(
      post_id: ID!
      title: String!
      body: String!
      is_markdown: Boolean!
    ): PostHistory

    removePost(id: ID!): Boolean
    likePost(id: ID!): Post
    unlikePost(id: ID!): Post
    postView(id: ID!): Boolean
  }
`;

// cursor: ID, limit: Int, username: String, temp_only: Boolean
type PostsArgs = {
  cursor?: string;
  limit?: number;
  username?: string;
  temp_only?: boolean;
  tag?: string;
};

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
  token: string | null;
};

const slackUrl = `https://hooks.slack.com/services/${process.env.SLACK_TOKEN}`;

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
      if ((parent as any).short_description) return (parent as any).short_description;

      if (parent.meta?.short_description) {
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
          deleted: false,
        },
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
        fk_user_id: user_id,
      });
      return !!liked;
    },
    recommended_posts: async (parent: Post, args: any, ctx) => {
      parent.tags = await ctx.loaders.tags.load(parent.id);
      const cacheKey = `${parent.id}:recommend`;
      let postIds: string[];
      try {
        const cachedPostIds = await cache.client!.get(cacheKey);
        if (cachedPostIds) {
          postIds = cachedPostIds.split(',');
        } else {
          let recommendedPosts = await esClient.search({
            index: 'posts',
            body: {
              query: buildRecommendedPostsQuery(parent),
              size: 12,
            },
          });
          postIds = recommendedPosts.body.hits.hits.map((hit: any) => hit._id as string);
          const diff = 12 - postIds.length;
          if (diff > 0) {
            const fallbackPosts = await esClient.search({
              index: 'posts',
              body: {
                query: buildFallbackRecommendedPosts(),
                size: 100,
              },
            });
            const fallbackPostIds: string[] = fallbackPosts.body.hits.hits.map(
              (hit: any) => hit._id as string
            );
            const randomPostIds = pickRandomItems(fallbackPostIds, diff);
            postIds = [...postIds, ...randomPostIds];
          }

          cache.client!.set(`${parent.id}:recommend`, postIds.join(','), 'EX', 60 * 60 * 24);
        }

        const posts = await getRepository(Post).findByIds(postIds);
        const normalized = normalize(posts);
        const ordered = postIds.map(id => normalized[id]);
        return ordered.filter(post => post); // filter out nulls
      } catch (e) {
        return [];
      }
    },
    linked_posts: async (parent: Post, args: any, ctx) => {
      const seriesPostsRepo = getRepository(SeriesPosts);

      const seriesPost = await seriesPostsRepo.findOne({
        where: {
          fk_post_id: parent.id,
        },
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
            nextIndex: index + 1,
          })
          .orderBy('index', 'ASC')
          .getMany();

        // only one post is found
        if (seriesPosts.length === 1) {
          return seriesPosts[0].index > index // compare series index
            ? {
                next:
                  seriesPosts[0].post.is_private && ctx.user_id !== seriesPosts[0].post.fk_user_id
                    ? null
                    : seriesPosts[0].post,
                // is next post
              }
            : {
                previous: seriesPosts[0].post, // is prev post
              };
        }

        const result: Record<'previous' | 'next', Post | null> = {
          previous: seriesPosts[0] && seriesPosts[0].post,
          next: seriesPosts[1] && seriesPosts[1].post,
        };

        if (result.next?.is_private && result.next?.fk_user_id !== ctx.user_id) {
          result.next = null;
        }

        return result;
      }

      // is not in series: show prev & next in time order
      const postRepo = getRepository(Post);

      // TODO: handle private & temp posts

      const [previous, next] = await Promise.all([
        postRepo
          .createQueryBuilder('posts')
          .where('fk_user_id = :userId', { userId: parent.fk_user_id })
          .andWhere('released_at < :releasedAt', { releasedAt: parent.released_at })
          .andWhere('is_temp = false')
          .andWhere('(is_private = false OR fk_user_id = :current_user_id)', {
            current_user_id: ctx.user_id,
          })
          .orderBy('released_at', 'DESC')
          .limit(1)
          .getOne(),
        postRepo
          .createQueryBuilder('posts')
          .where('fk_user_id = :userId', { userId: parent.fk_user_id })
          .andWhere('released_at > :releasedAt', { releasedAt: parent.released_at })
          .andWhere('id != :postId', { postId: parent.id })
          .andWhere('is_temp = false')
          .andWhere('(is_private = false OR fk_user_id = :current_user_id)', {
            current_user_id: ctx.user_id,
          })
          .orderBy('released_at', 'ASC')
          .limit(1)
          .getOne(),
      ]);

      return {
        previous,
        next,
      };
    },
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

          if (!post || ((post.is_temp || post.is_private) && post.fk_user_id !== ctx.user_id)) {
            return null;
          }

          return post;
        }
        let post = await getManager()
          .createQueryBuilder(Post, 'post')
          .leftJoinAndSelect('post.user', 'user')
          .where('user.username = :username AND url_slug = :url_slug', { username, url_slug })
          .getOne();
        if (!post) {
          const fallbackPost = await getManager()
            .createQueryBuilder(UrlSlugHistory, 'urlSlugHistory')
            .leftJoinAndSelect('urlSlugHistory.post', 'post')
            .leftJoinAndSelect('urlSlugHistory.user', 'user')
            .where('user.username = :username AND urlSlugHistory.url_slug = :url_slug', {
              username,
              url_slug,
            })
            .getOne();
          if (fallbackPost) {
            post = fallbackPost.post;
          }
        }
        if (!post) return null;
        if ((post.is_temp || post.is_private) && post.fk_user_id !== ctx.user_id) {
          return null;
        }

        setTimeout(async () => {
          if (post?.fk_user_id === ctx.user_id || !ctx.user_id) return;
          if (!post) return;
          PostReadLog.log({
            userId: ctx.user_id,
            postId: post.id,
            resumeTitleId: null,
            percentage: 0,
          });
        }, 0);

        return post;
      } catch (e) {
        console.log(e);
      }
    },
    posts: async (
      parent: any,
      { cursor, limit = 20, username, temp_only, tag }: PostsArgs,
      context
    ) => {
      if (limit > 100) {
        throw new ApolloError('Max limit is 100', 'BAD_REQUEST');
      }

      if (temp_only) {
        if (!username) {
          throw new ApolloError('username is missing', 'BAD_REQUEST');
        }
        if (!context.user_id) {
          throw new ApolloError('Not logged in', 'NO_PERMISSION');
        }
        const user = await userService.findUserByUsername(username);
        if (!user) {
          throw new ApolloError('Invalid username', 'NOT_FOUND');
        }
        if (user.id !== context.user_id) {
          throw new ApolloError('You have no permission to load temp posts', 'NO_PERMISSION');
        }
        return postService.findTempPosts(context.user_id, limit, cursor);
      }

      console.log('posts query', { cursor, limit, username, temp_only, tag });

      const userRepo = getRepository(User);
      const user = username
        ? await userRepo.findOne({
            where: {
              username,
            },
          })
        : null;

      if (tag) {
        return postService.findPostsByTag({
          limit,
          cursor,
          tagName: tag,
          userId: user?.id,
          userself: !!(user && user.id === context.user_id),
        });
      }

      if (user && !temp_only) {
        return postService.findPostsByUserId({
          userId: user.id,
          size: limit,
          cursor: cursor,
          isUserSelf: user.id === context.user_id,
        });
      }

      const query = getManager()
        .createQueryBuilder(Post, 'post')
        .limit(limit)
        .orderBy('post.released_at', 'DESC')
        .addOrderBy('post.id', 'DESC')
        .leftJoinAndSelect('post.user', 'user');

      if (!context.user_id) {
        query.where('is_private = false');
      } else {
        query.where('(is_private = false OR post.fk_user_id = :user_id)', {
          user_id: context.user_id,
        });
      }
      // .where('is_private = false');

      if (temp_only) {
        if (!username) throw new ApolloError('username is missing', 'BAD_REQUEST');
        if (!user) throw new ApolloError('Invalid username', 'NOT_FOUND');
        if (user.id !== context.user_id) {
          throw new ApolloError('You have no permission to load temp posts', 'NO_PERMISSION');
        }
        query.andWhere('is_temp = true');
      } else {
        query.andWhere('is_temp = false');
      }

      if (username) {
        query.andWhere('user.username = :username', { username });
      }

      // pagination
      if (cursor) {
        const post = await getRepository(Post).findOne({
          id: cursor,
        });
        if (!post) {
          throw new ApolloError('invalid cursor');
        }
        query.andWhere('post.released_at < :date', {
          date: post.released_at,
          id: post.id,
        });
        query.orWhere('post.released_at = :date AND post.id < :id', {
          date: post.released_at,
          id: post.id,
        });
      }

      const posts = await query.getMany();
      return posts;
    },
    recentPosts: async (parent: any, { cursor, limit = 20 }: PostsArgs, context) => {
      return [];
    },
    trendingPosts: async (parent: any, { offset = 0, limit = 20, timeframe = 'month' }, ctx) => {
      return [];
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
        signedUserId: ctx.user_id,
      });

      return searchResult;
    },
    postHistories: async (parent: any, { post_id }: { post_id: string }, ctx) => {
      const postHistoryRepo = getRepository(PostHistory);
      const postHistories = await postHistoryRepo.find({
        where: {
          fk_post_id: post_id,
        },
        order: {
          created_at: 'DESC',
        },
      });
      return postHistories;
    },
    lastPostHistory: async (parent: any, { post_id }: { post_id: string }, ctx) => {
      const postHistoryRepo = getRepository(PostHistory);
      const postHistory = await postHistoryRepo.findOne({
        where: {
          fk_post_id: post_id,
        },
        order: {
          created_at: 'DESC',
        },
      });
      return postHistory;
    },
    readingList: async (parent: any, { type, cursor, limit = 20 }: ReadingListQueryParams, ctx) => {
      if (limit > 100) {
        throw new ApolloError('Max limit is 100', 'BAD_REQUEST');
      }
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }

      if (type === 'LIKED') {
        const likesRepo = getRepository(PostLike);
        const cursorData = cursor
          ? await likesRepo.findOne({
              where: {
                fk_user_id: ctx.user_id,
                fk_post_id: cursor,
              },
            })
          : null;
        const cursorQueryOption = cursorData
          ? { updated_at: LessThan(cursorData.created_at), id: Not(cursorData.id) }
          : {};

        const likes = await likesRepo.find({
          where: {
            fk_user_id: ctx.user_id,
            ...cursorQueryOption,
          },
          order: {
            updated_at: 'DESC',
            id: 'ASC',
          },
          take: limit,
        });
        return likes.map(like => like.post);
      }

      const logRepo = getRepository(PostReadLog);
      const cursorData = cursor
        ? await logRepo.findOne({
            where: {
              fk_user_id: ctx.user_id,
              fk_post_id: cursor,
            },
          })
        : null;

      const cursorQueryOption = cursorData
        ? { updated_at: LessThan(cursorData.updated_at), id: Not(cursorData.id) }
        : {};

      const logs = await logRepo.find({
        where: {
          fk_user_id: ctx.user_id,
          ...cursorQueryOption,
        },
        order: {
          updated_at: 'DESC',
          id: 'ASC',
        },
        take: limit,
      });

      return logs.map(log => log.post);
    },
    getStats: async (parent: any, { post_id }: { post_id: string }, ctx) => {
      const post = await getRepository(Post).findOne(post_id);
      if (!post) {
        throw new ApolloError('Post not found', 'NOT_FOUND');
      }
      if (post.fk_user_id !== ctx.user_id) {
        throw new ApolloError('This post is not yours', 'NO_PERMISSION');
      }

      const total = await postService.findPostViewCountById(post_id);
      return {
        total,
        count_by_day: [],
      };
      // const stats = await PostRead.getStats(post_id);
      // return stats;
    },
  },
  Mutation: {
    writePost: async (parent: any, args, ctx) => {
      return await postService.write(args, ctx.cookies, ctx.ip);
    },
    editPost: async (parent: any, args, ctx) => {
      return await postService.edit(args, ctx.cookies, ctx.ip);
    },
    createPostHistory: async (parent: any, args, ctx) => {
      return await postHistoryService.createPostHistory(args, ctx);
    },
    removePost: async (parent: any, args, ctx) => {
      const { id } = args as { id: string };
      const postRepo = getRepository(Post);
      const post = await postRepo.findOne(id, {
        relations: ['user'],
      });
      if (!post) {
        throw new ApolloError('Post not found', 'NOT_FOUND');
      }
      if (post.fk_user_id !== ctx.user_id) {
        throw new ApolloError('This post is not yours', 'NO_PERMISSION');
      }

      // check series
      const seriesPostsRepo = getRepository(SeriesPosts);
      const seriesPost = await seriesPostsRepo.findOne({
        fk_post_id: post.id,
      });

      const { username } = post.user;
      const postCacheKey = `ssr:/@${username}/${post.url_slug}`;
      const userVelogCacheKey = `ssr:/@${username}`;
      const cacheKeys = [postCacheKey, userVelogCacheKey];

      await postRepo.remove(post);
      if (seriesPost) {
        subtractIndexAfter(seriesPost.fk_series_id, seriesPost.index);
        const series = await getRepository(Series).findOne(seriesPost.fk_series_id);
        if (series) {
          cacheKeys.push(`ssr:/@${username}/series/${series.url_slug}`);
        }
      }

      try {
        await Promise.all([searchSync.remove(id), cache.remove(...cacheKeys)]);
      } catch (e) {
        console.log('Failed to remove post from cache or elasticsearch');
        console.log(e);
      }

      try {
        await Promise.all([purgeRecentPosts(), purgeUser(ctx.user_id), purgePost(id)]);
      } catch (e) {}

      setImmediate(async () => {
        if (post.is_temp || post.is_private) return;
        if (!ctx.user_id) return;
        const isIntegrated = await externalInterationService.checkIntegrated(ctx.user_id);
        if (!isIntegrated) return;
        const serializedPost = await postService.findPostById(post.id);
        if (!serializedPost) return;
        externalInterationService.notifyWebhook({
          type: 'deleted',
          post_id: post.id,
        });
      });

      setTimeout(() => {
        imageService.untrackImagesOfDeletedPost(id).catch(console.error);
      }, 0);

      return true;
    },
    likePost: async (parent: any, args, ctx) => {
      if (!ctx.user_id) throw new AuthenticationError('Not Logged In');
      return await postService.likePost(args.id, ctx.cookies);
    },
    unlikePost: async (parent: any, args, ctx) => {
      if (!ctx.user_id) throw new AuthenticationError('Not Logged In');
      return await postService.unlikePost(args.id, ctx.cookies);
    },
    postView: async (parent: any, { id }: { id: string }, ctx) => {
      const postReadRepo = getRepository(PostRead);
      const ipHash = hash(ctx.ip);

      createReadLog({
        ip: ctx.ip,
        postId: id,
        userId: ctx.user_id,
      });

      const viewed = await postReadRepo
        .createQueryBuilder('post_read')
        .where('ip_hash = :ipHash', { ipHash })
        .andWhere('fk_post_id = :postId', { postId: id })
        .andWhere("created_at > (NOW() - INTERVAL '24 HOURS')")
        .getOne();

      if (viewed) return false;
      const postRead = new PostRead();
      postRead.fk_post_id = id;
      postRead.fk_user_id = ctx.user_id;
      postRead.ip_hash = ipHash;
      await postReadRepo.save(postRead);

      const postRepo = getRepository(Post);
      await postRepo
        .createQueryBuilder()
        .update()
        .set({
          views: () => 'views + 1',
        })
        .where('id = :id', { id })
        .execute();

      const post = await postRepo.findOne(id);
      if (!post) return false;

      if (post.views % 10 === 0) {
        const endpoint =
          process.env.NODE_ENV === 'development'
            ? `http://${process.env.API_V3_HOST}`
            : `https://${process.env.API_V3_HOST}`;

        await Axios.patch(`${endpoint}/api/posts/v3/score/${post.id}`);
      }

      return true;
    },
  },
};
