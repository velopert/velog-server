import { ApolloContext } from './../app';
import { gql, IResolvers, ApolloError, AuthenticationError } from 'apollo-server-koa';
import Post from '../entity/Post';
import {
  getRepository,
  getManager,
  LessThan,
  Not,
  MoreThan,
  UsingJoinColumnIsNotAllowedError,
} from 'typeorm';
import PostScore from '../entity/PostScore';
import { normalize, escapeForUrl, checkEmpty } from '../lib/utils';
import removeMd from 'remove-markdown';
import PostsTags from '../entity/PostsTags';
import Tag from '../entity/Tag';
import UrlSlugHistory from '../entity/UrlSlugHistory';
import Comment from '../entity/Comment';
import Series from '../entity/Series';
import SeriesPosts, { subtractIndexAfter, appendToSeries } from '../entity/SeriesPosts';
import generate from 'nanoid/generate';
import PostLike from '../entity/PostLike';
import keywordSearch from '../search/keywordSearch';
import searchSync from '../search/searchSync';
import PostHistory from '../entity/PostHistory';
import User from '../entity/User';
import PostRead from '../entity/PostRead';
import hash from '../lib/hash';
import cache from '../cache';
import PostReadLog from '../entity/PostReadLog';
import { nextSpamFilter } from '../etc/spamFilter';
import Axios from 'axios';
import LRU from 'lru-cache';
import { createLikeLog, createReadLog } from '../lib/bigQuery';
import esClient from '../search/esClient';
import { buildFallbackRecommendedPosts, buildRecommendedPostsQuery } from '../search/buildQuery';
import { pickRandomItems } from '../etc/pickRandomItems';
import { shuffleArray } from '../etc/shuffleArray';
import checkUnscore from '../etc/checkUnscore';
import geoipCountry from 'geoip-country';
import { purgeRecentPosts, purgeUser, purgePost } from '../lib/graphcdn';
import imageService from '../services/imageService';
import { sendSlackMessage } from '../lib/sendSlackMessage';
import externalInterationService from '../services/externalIntegrationService';
import postService from '../services/postService';

const lruCache = new LRU<string, string[]>({
  max: 150,
  maxAge: 1000 * 60 * 60,
});

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
};

type CreatePostHistoryArgs = {
  post_id: string;
  title: string;
  body: string;
  is_markdown: boolean;
};
type EditPostArgs = WritePostArgs & {
  id: string;
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

      const userRepo = getRepository(User);
      const user = username
        ? await userRepo.findOne({
            where: {
              username,
            },
          })
        : null;

      if (tag) {
        return PostsTags.getPostsByTag({
          limit,
          cursor,
          tagName: tag,
          userId: user?.id,
          userself: !!(user && user.id === context.user_id),
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
      console.log({ cursor, limit, ip: context.ip });
      if (limit > 100) {
        throw new ApolloError('Max limit is 100', 'BAD_REQUEST');
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

      query.andWhere('is_temp = false');

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
    trendingPosts: async (parent: any, { offset = 0, limit = 20, timeframe = 'month' }, ctx) => {
      console.log({ offset, limit, timeframe, ip: ctx.ip });
      const timeframes: [string, number][] = [
        ['day', 1],
        ['week', 7],
        ['month', 30],
        ['year', 365],
      ];
      const selectedTimeframe = timeframes.find(([text]) => text === timeframe);
      if (!selectedTimeframe) {
        throw new ApolloError('Invalid timeframe', 'BAD_REQUEST');
      }

      if (timeframe === 'year') {
        console.log('trendingPosts - year', { offset, limit, ip: ctx.ip });
      }
      if (timeframe === 'year' && offset > 1000) {
        console.log('Detected GraphQL Abuse', ctx.ip);
        return [];
      }

      if (limit > 100) {
        throw new ApolloError('Limit is too high', 'BAD_REQUEST');
      }

      let ids: string[] = [];
      const cacheKey = `trending-${selectedTimeframe[0]}-${offset}-${limit}`;

      const cachedIds = lruCache.get(cacheKey);
      if (cachedIds) {
        ids = cachedIds;
      } else {
        const rows = (await getManager().query(
          `
          select posts.id, posts.title, SUM(score) as score  from post_scores
          inner join posts on post_scores.fk_post_id = posts.id
          where post_scores.created_at > now() - interval '${selectedTimeframe[1]} days'
          and posts.released_at > now() - interval '${selectedTimeframe[1] * 1.5} days'
          group by posts.id
          order by score desc, posts.id desc
          offset $1
          limit $2
        `,
          [offset, limit]
        )) as { id: string; score: number }[];

        ids = rows.map(row => row.id);
        lruCache.set(cacheKey, ids);
      }

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
      const stats = await PostRead.getStats(post_id);
      return stats;
    },
  },
  Mutation: {
    writePost: async (parent: any, args, ctx) => {
      const postRepo = getRepository(Post);
      const seriesRepo = getRepository(Series);

      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }

      const post = new Post();
      const data = args as WritePostArgs;

      if (checkEmpty(data.title)) {
        throw new ApolloError('Title is empty', 'BAD_REQUEST');
      }

      post.fk_user_id = ctx.user_id;
      post.title = data.title;
      post.body = data.body;
      post.is_temp = data.is_temp;
      post.is_markdown = data.is_markdown;
      post.meta = data.meta;
      post.thumbnail = data.thumbnail;
      post.is_private = data.is_private;

      const allowList = ['KR', 'GB', ''];
      const country = geoipCountry.lookup(ctx.ip)?.country ?? '';
      const isForeign = !allowList.includes(country);
      const blockList = ['IN', 'PK', 'CN', 'VN', 'TH', 'PH'];

      const user = await getRepository(User).findOne(ctx.user_id, {
        relations: ['profile'],
      });

      const extraText = data.tags
        .join('')
        .concat(user?.profile.short_bio ?? '', user?.profile.display_name ?? '');

      if (
        blockList.includes(country) ||
        nextSpamFilter(data.body.concat(extraText), isForeign) ||
        nextSpamFilter(data.title, isForeign, true)
      ) {
        post.is_private = true;
        await Axios.post(slackUrl, {
          text: `스팸 의심!\n *userId*: ${ctx.user_id}\ntitle: ${post.title}, ip: ${ctx.ip}, country: ${country}`,
        });
      }

      const recentPostCount = await postRepo.count({
        where: {
          fk_user_id: ctx.user_id,
          released_at: MoreThan(new Date(Date.now() - 1000 * 60 * 5)),
          is_private: false,
        },
      });

      if (recentPostCount >= 10) {
        post.is_private = true;
        const user = await getRepository(User).findOne(ctx.user_id);
        try {
          await postRepo.update(
            {
              fk_user_id: ctx.user_id,
              released_at: MoreThan(new Date(Date.now() - 1000 * 60 * 5)),
            },
            {
              is_private: true,
            }
          );
          await Axios.post(slackUrl, {
            text: `스팸 의심!\n *User*: ${user?.username}\n*Count*: ${recentPostCount}\n*Title*:${post.title}\nip: ${ctx.ip}`,
          });
        } catch (e) {
          console.log(e);
        }
      }

      let processedUrlSlug = escapeForUrl(data.url_slug);
      const urlSlugDuplicate = await postRepo.findOne({
        where: {
          fk_user_id: ctx.user_id,
          url_slug: processedUrlSlug,
        },
      });
      if (urlSlugDuplicate) {
        const randomString = generate('abcdefghijklmnopqrstuvwxyz1234567890', 8);
        processedUrlSlug += `-${randomString}`;
      }
      if (processedUrlSlug === '') {
        processedUrlSlug = generate('abcdefghijklmnopqrstuvwxyz1234567890', 8);
      }

      post.url_slug = processedUrlSlug;

      // Check series
      let series: Series | undefined;
      if (data.series_id && !data.is_temp) {
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

      await PostsTags.syncPostTags(post.id, tagsData);

      // Link to series
      if (data.series_id && !data.is_temp) {
        await appendToSeries(data.series_id, post.id);
      }

      post.tags = tagsData;

      if (!data.is_temp) {
        await searchSync.update(post.id);
      }

      if (!data.is_temp && !data.is_private) {
        setImmediate(async () => {
          if (!ctx.user_id) return;
          const isIntegrated = await externalInterationService.checkIntegrated(ctx.user_id);
          if (!isIntegrated) return;
          const serializedPost = await postService.findPostById(post.id);
          if (!serializedPost) return;
          externalInterationService.notifyWebhook({
            type: 'created',
            post: serializedPost,
          });
        });
      }

      purgeRecentPosts();
      purgeUser(ctx.user_id);

      setTimeout(async () => {
        const images = await imageService.getImagesOf(post.id);
        await imageService.trackImages(images, data.body);
      }, 0);

      return post;
    },
    createPostHistory: async (parent: any, args: CreatePostHistoryArgs, ctx) => {
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }

      // check ownPost
      const { post_id, title, body, is_markdown } = args;

      const postRepo = getRepository(Post);
      const post = await postRepo.findOne(post_id);

      if (!post) {
        throw new ApolloError('Post not found', 'NOT_FOUND');
      }
      if (post.fk_user_id !== ctx.user_id) {
        throw new ApolloError('This post is not yours', 'NO_PERMISSION');
      }

      // create postHistory
      const postHistoryRepo = getRepository(PostHistory);
      const postHistory = new PostHistory();
      Object.assign(postHistory, { title, body, is_markdown, fk_post_id: post_id });

      await postHistoryRepo.save(postHistory);

      const [data, count] = await postHistoryRepo.findAndCount({
        where: {
          fk_post_id: post_id,
        },
        order: {
          created_at: 'DESC',
        },
      });

      if (count > 10) {
        await postHistoryRepo
          .createQueryBuilder('post_history')
          .delete()
          .where('fk_post_id = :postId', {
            postId: post_id,
          })
          .andWhere('created_at < :createdAt', { createdAt: data[9].created_at })
          .execute();

        setTimeout(() => {
          searchSync.update(post.id).catch(console.error);
        }, 0);
      }

      return postHistory;
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
        is_private,
      } = args as EditPostArgs;
      const postRepo = getRepository(Post);
      const seriesRepo = getRepository(Series);
      const seriesPostsRepo = getRepository(SeriesPosts);

      const post = await postRepo.findOne(id, {
        relations: ['user'],
      });
      if (!post) {
        throw new ApolloError('Post not found', 'NOT_FOUND');
      }
      if (post.fk_user_id !== ctx.user_id) {
        throw new ApolloError('This post is not yours', 'NO_PERMISSION');
      }

      const { username } = post.user;
      const postCacheKey = `ssr:/@${username}/${post.url_slug}`;
      const userVelogCacheKey = `ssr:/@${username}`;
      const cacheKeys = [postCacheKey, userVelogCacheKey];

      const prevSeriesPost = await seriesPostsRepo.findOne({
        fk_post_id: post.id,
      });

      if (!prevSeriesPost && series_id) {
        await appendToSeries(series_id, post.id);
      }

      if (prevSeriesPost && prevSeriesPost.fk_series_id !== series_id) {
        if (series_id) {
          // append series
          const series = await seriesRepo.findOne({
            id: series_id,
          });
          if (!series) {
            throw new ApolloError('Series not found', 'NOT_FOUND');
          }
          if (series.fk_user_id !== ctx.user_id) {
            throw new ApolloError('This series is not yours', 'NO_PERMISSION');
          }
          cacheKeys.push(`ssr:/@${username}/series/${series.url_slug}`);
          await appendToSeries(series_id, post.id);
        }
        // remove series
        await Promise.all([
          subtractIndexAfter(prevSeriesPost.fk_series_id, prevSeriesPost.index),
          seriesPostsRepo.remove(prevSeriesPost),
        ]);
      }

      post.title = title;
      post.body = body;
      post.is_private = is_private;

      if (!post.is_temp) {
        const recentPostCount = await postRepo.count({
          where: {
            fk_user_id: ctx.user_id,
            released_at: MoreThan(new Date(Date.now() - 1000 * 60 * 5)),
            is_private: false,
          },
        });

        if (recentPostCount >= 10) {
          post.is_private = true;
          const user = await getRepository(User).findOne(ctx.user_id);
          try {
            await postRepo.update(
              {
                fk_user_id: ctx.user_id,
                released_at: MoreThan(new Date(Date.now() - 1000 * 60 * 5)),
              },
              {
                is_private: true,
              }
            );
            await Axios.post(slackUrl, {
              text: `스팸 의심!\n *User*: ${user?.username}\n*Count*: ${recentPostCount}\n*Title*:${post.title}`,
            });
          } catch (e) {
            console.log(e);
          }
        }
      }

      if (post.is_temp && !is_temp) {
        post.released_at = new Date();
      }
      post.is_temp = is_temp;
      post.is_markdown = is_markdown;
      post.meta = meta;
      post.thumbnail = thumbnail;

      const allowList = ['KR', 'GB', ''];
      const country = geoipCountry.lookup(ctx.ip)?.country ?? '';
      const isForeign = !allowList.includes(country);
      const blockList = ['IN', 'PK', 'CN', 'VN', 'TH', 'PH'];

      const user = await getRepository(User).findOne(ctx.user_id, {
        relations: ['profile'],
      });

      const extraText = tags
        .join('')
        .concat(user?.profile.short_bio ?? '', user?.profile.display_name ?? '');

      if (
        blockList.includes(country) ||
        nextSpamFilter(body.concat(extraText), isForeign) ||
        nextSpamFilter(title, isForeign, true)
      ) {
        post.is_private = true;
        await Axios.post(slackUrl, {
          text: `스팸 의심 (수정) !\n *userId*: ${ctx.user_id}\ntitle: ${post.title}, ip: ${ctx.ip}, country: ${country}`,
        });
      }

      // TODO: if url_slug changes, create url_slug_alias
      let processedUrlSlug = escapeForUrl(url_slug);
      const urlSlugDuplicate = await postRepo.findOne({
        where: {
          fk_user_id: ctx.user_id,
          url_slug: processedUrlSlug,
        },
      });
      if (urlSlugDuplicate && urlSlugDuplicate.id !== post.id) {
        const randomString = generate('abcdefghijklmnopqrstuvwxyz1234567890', 8);
        processedUrlSlug += `-${randomString}`;
      }
      if (processedUrlSlug === '') {
        processedUrlSlug = generate('abcdefghijklmnopqrstuvwxyz1234567890', 8);
      }

      if (post.url_slug !== processedUrlSlug) {
        // url_slug
        const urlSlugHistory = new UrlSlugHistory();
        urlSlugHistory.fk_post_id = post.id;
        urlSlugHistory.fk_user_id = ctx.user_id;
        urlSlugHistory.url_slug = post.url_slug;
        const urlSlugHistoryRepo = getRepository(UrlSlugHistory);
        await urlSlugHistoryRepo.save(urlSlugHistory);
      }
      post.url_slug = processedUrlSlug;

      const tagsData = await Promise.all(tags.map(Tag.findOrCreate));
      await Promise.all([PostsTags.syncPostTags(post.id, tagsData), postRepo.save(post)]);

      try {
        await Promise.all([
          is_temp ? null : searchSync.update(post.id),
          cache.remove(...cacheKeys),
          purgePost(post.id),
        ]);
      } catch (e) {
        console.log(e);
      }

      if (!is_temp && !is_private) {
        setImmediate(async () => {
          if (!ctx.user_id) return;
          const isIntegrated = await externalInterationService.checkIntegrated(ctx.user_id);
          if (!isIntegrated) return;
          const serializedPost = await postService.findPostById(post.id);
          if (!serializedPost) return;
          externalInterationService.notifyWebhook({
            type: 'updated',
            post: serializedPost,
          });
        });
      }

      if (!post.is_private && is_private) {
        setImmediate(async () => {
          if (!ctx.user_id) return;
          const isIntegrated = await externalInterationService.checkIntegrated(ctx.user_id);
          if (!isIntegrated) return;
          externalInterationService.notifyWebhook({
            type: 'deleted',
            post_id: post.id,
          });
        });
      }

      setTimeout(async () => {
        const images = await imageService.getImagesOf(post.id);
        await imageService.trackImages(images, body);
      }, 0);

      return post;
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
      if (!ctx.user_id) {
        throw new AuthenticationError('Not Logged In');
      }

      createLikeLog({
        ip: ctx.ip,
        postId: args.id,
        userId: ctx.user_id,
      });

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
          fk_user_id: ctx.user_id,
        },
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
          fk_post_id: args.id,
        },
      });

      post.likes = count;

      await postRepo.save(post);

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

      setTimeout(() => {
        searchSync.update(post.id);
      }, 0);

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
          fk_user_id: ctx.user_id,
        },
      });

      // not exists
      if (!postLike) {
        return post;
      }

      await postLikeRepo.remove(postLike);

      const count = await postLikeRepo.count({
        where: {
          fk_post_id: args.id,
        },
      });

      post.likes = count;

      await postRepo.save(post);

      const postScoreRepo = getRepository(PostScore);
      await postScoreRepo
        .createQueryBuilder()
        .delete()
        .where('fk_post_id = :postId', { postId: args.id })
        .andWhere('fk_user_id = :userId', { userId: ctx.user_id })
        .andWhere("type = 'LIKE'")
        .execute();

      setTimeout(() => {
        searchSync.update(post.id).catch(console.error);
      }, 0);

      return post;
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

      const postScoreRepo = getRepository(PostScore);
      if (post.views % 10 === 0) {
        const score = new PostScore();
        score.fk_post_id = id;
        score.type = 'READ';
        score.score = 0.25;
        await postScoreRepo.save(score);
      }

      return true;
    },
  },
};
