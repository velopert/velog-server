import { Post, PostTag, Tag } from '@prisma/client';
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

    const user = await userService.getPublicProfileById(userId);
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
    }
  ) {
    return {
      id: post.id,
      url: `https://velog.io/@${post.fk_user_id}/${encodeURI(post.url_slug ?? '')}`,
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
