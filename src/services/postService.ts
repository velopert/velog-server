import { GetPostsByTagParams } from './../entity/PostsTags';
import { Post, PostTag, Tag, User } from '@prisma/client';
import db from '../lib/db';
import userService from './userService';
import removeMd from 'remove-markdown';
import { escapeForUrl } from '../lib/utils';
import Axios, { AxiosResponse } from 'axios';
import Cookies from 'cookies';

const { API_V3_HOST } = process.env;

if (!API_V3_HOST) {
  throw new Error('API_V3_HOST ENV is required');
}

const postService = {
  async findPostsByUserId({ userId, size, cursor, isUserSelf = false }: FindPostParams) {
    const cursorPost = cursor
      ? await db.post.findUnique({
          where: {
            id: cursor,
          },
        })
      : null;

    const limitedSize = Math.min(50, size);

    const posts = await db.post.findMany({
      where: {
        fk_user_id: userId,
        ...(isUserSelf ? {} : { is_private: false }),
        is_temp: false,
        released_at: cursorPost?.released_at ? { lt: cursorPost.released_at } : undefined,
      },
      orderBy: {
        released_at: 'desc',
      },
      take: limitedSize,
      include: {
        postTags: {
          include: {
            tag: true,
          },
        },
        user: true,
      },
    });

    return posts.map(this.serialize);
  },

  async findPostViewCountById(id: string) {
    const post = await db.post.findUnique({ where: { id } });
    if (!post) return 0;
    return post?.views;
  },

  // @todo: should be implemented on tag service
  async getOriginTag(name: string) {
    const filtered = escapeForUrl(name).toLowerCase();
    const tag = await db.tag.findFirst({
      where: {
        name_filtered: filtered,
      },
    });
    if (!tag) return null;
    if (tag.is_alias) {
      const alias = await db.tagAlias.findFirst({
        where: {
          fk_tag_id: tag.id,
        },
      });
      if (!alias) return;
      const originTag = await db.tag.findFirst({
        where: {
          id: alias.fk_alias_tag_id,
        },
      });
      return originTag;
    }
    return tag;
  },

  async findPostsByTag({ tagName, cursor, userId, userself }: GetPostsByTagParams) {
    const originTag = await this.getOriginTag(tagName);
    if (!originTag) throw new Error('Invalid Tag');
    const cursorPost = cursor
      ? await db.post.findUnique({
          where: { id: cursor },
        })
      : null;

    const posts = await db.postTag.findMany({
      where: {
        fk_tag_id: originTag.id,
        Post: {
          is_temp: false,
          ...(cursorPost
            ? {
                released_at: {
                  lt: cursorPost.released_at!,
                },
              }
            : {}),
          ...(userId
            ? { fk_user_id: userId, ...(userself ? {} : { is_private: false }) }
            : { is_private: false }),
        },
      },
      include: {
        Post: {
          include: {
            postTags: {
              include: {
                tag: true,
              },
            },
            user: true,
          },
        },
      },
      orderBy: {
        Post: {
          released_at: 'desc',
        },
      },
      take: 20,
    });

    const serialized = posts.map(p => this.serialize(p.Post!));

    return serialized;
  },

  async findPostById(id: string) {
    const post = await db.post.findUnique({
      where: {
        id,
      },
      include: {
        postTags: {
          include: {
            tag: true,
          },
        },
        user: true,
      },
    });

    if (!post) return null;

    return this.serialize(post);
  },

  serialize(
    post: Post & {
      postTags: (PostTag & {
        tag: Tag | null;
      })[];
      user: User;
    }
  ) {
    const shortDescription = (() => {
      if (post.short_description) return post.short_description;
      const sd = (post.meta as any)?.short_description;
      if (sd) return sd;
      const removed = removeMd(
        (post.body ?? '')
          .replace(/```([\s\S]*?)```/g, '')
          .replace(/~~~([\s\S]*?)~~~/g, '')
          .slice(0, 500)
      );
      return removed.slice(0, 200) + (removed.length > 200 ? '...' : '');
    })();

    return {
      id: post.id,
      url: `https://velog.io/@${post.user.username}/${encodeURI(post.url_slug ?? '')}`,
      title: post.title!,
      thumbnail: post.thumbnail,
      released_at: post.released_at!,
      updated_at: post.updated_at!,
      short_description: shortDescription,
      body: post.body!,
      tags: post.postTags.map(pt => pt.tag!.name!),
      fk_user_id: post.fk_user_id,
      url_slug: post.url_slug,
      likes: post.likes,
    };
  },
  async likePost(postId: string, cookies: Cookies) {
    const LIKE_POST_MUTATION = `
        mutation LikePost {
          likePost(input: { postId: "${postId}"}) {
            id
            liked
            likes
          }
        }
      `;

    const endpoint =
      process.env.NODE_ENV === 'development'
        ? `http://${API_V3_HOST}/graphql`
        : `https://${API_V3_HOST}/graphql`;

    const accessToken = cookies.get('access_token') ?? '';

    const res = await Axios.post<AxiosResponse<LikePostResponse>>(
      endpoint,
      {
        operationName: 'LikePost',
        query: LIKE_POST_MUTATION,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return res.data.data.likePost;
  },
  async unlikePost(postId: string, cookies: Cookies) {
    const UNLIKE_POST_MUTATION = `
        mutation UnLikePost {
          unlikePost(input: { postId: "${postId}"}) {
            id
            liked
            likes
          }
        }
      `;

    const endpoint =
      process.env.NODE_ENV === 'development'
        ? `http://${API_V3_HOST}/graphql`
        : `https://${API_V3_HOST}/graphql`;

    const accessToken = cookies.get('access_token') ?? '';

    const res = await Axios.post<AxiosResponse<UnlikePostResponse>>(
      endpoint,
      {
        operationName: 'UnLikePost',
        query: UNLIKE_POST_MUTATION,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return res.data.data.unlikePost;
  },
};

export default postService;

type FindPostParams = {
  userId: string;
  size: number;
  cursor?: string;
  isUserSelf?: boolean;
};

export type SerializedPost = {
  id: string;
  url: string;
  title: string | null;
  thumbnail: string | null;
  released_at: Date | null;
  updated_at: Date;
  short_description: string;
  body: string | null;
  tags: (string | null)[];
};

type LikePostResponse = {
  likePost: {
    id: string;
    liked: boolean;
    likes: number;
  };
};

type UnlikePostResponse = {
  unlikePost: {
    id: string;
    liked: boolean;
    likes: number;
  };
};
