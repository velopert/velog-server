import { Post, PostTag, Tag, User } from '@prisma/client';
import db from '../lib/db';
import userService from './userService';
import removeMd from 'remove-markdown';
import { escapeForUrl } from '../lib/utils';

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
      fk_user_id: post.fk_user_id,
      url_slug: post.url_slug,
      likes: post.likes,
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

type GetPostsByTagParams = {
  tagName: string;
  cursor?: string;
  limit?: number;
  userId?: string;
  userself: boolean;
};
