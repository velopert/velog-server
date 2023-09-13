import { Post, PostTag, Tag, User } from '@prisma/client';
import db from '../lib/db';
import userService from './userService';
import removeMd from 'remove-markdown';
import Axios, { AxiosResponse } from 'axios';
import Cookies from 'cookies';

const postService = {
  async findPublicPostsByUserId({ userId, size, cursor }: FindPostParams) {
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
        is_private: false,
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
    return {
      id: post.id,
      url: `https://velog.io/@${post.user.username}/${encodeURI(post.url_slug ?? '')}`,
      title: post.title!,
      thumbnail: post.thumbnail,
      released_at: post.released_at!,
      updated_at: post.updated_at!,
      short_description:
        post.short_description ??
        removeMd(
          (post.body ?? '')
            .replace(/```([\s\S]*?)```/g, '')
            .replace(/~~~([\s\S]*?)~~~/g, '')
            .slice(0, 500)
        ),
      body: post.body!,
      tags: post.postTags.map(pt => pt.tag!.name!),
    };
  },
  async likePost(postId: string, cookies: Cookies) {
    const LIKE_POST_MUTATION = `
        mutation likePost {
          likePost(input: { postId: "${postId}"}) {
            id
            liked
            likes
          }
        }
      `;

    const endpoint =
      process.env.NODE_ENV === 'development'
        ? `http://${process.env.API_V3_HOST}/graphql`
        : `https://${process.env.API_V3_HOST}/graphql`;

    const accessToken = cookies.get('access_token') ?? '';

    const res = await Axios.post<AxiosResponse<LikePostResponse>>(
      endpoint,
      {
        operationName: 'likePost',
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
        mutation unlikePost {
          unlikePost(input: { postId: "${postId}"}) {
            id
            liked
            likes
          }
        }
      `;

    const endpoint =
      process.env.NODE_ENV === 'development'
        ? `http://${process.env.API_V3_HOST}/graphql`
        : `https://${process.env.API_V3_HOST}/graphql`;

    const accessToken = cookies.get('access_token') ?? '';

    const res = await Axios.post<AxiosResponse<UnlikePostResponse>>(
      endpoint,
      {
        operationName: 'unlikePost',
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
