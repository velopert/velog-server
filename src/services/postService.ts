import { Post, PostTag, Tag, User } from '@prisma/client';
import db from '../lib/db';
import userService from './userService';
import removeMd from 'remove-markdown';

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
