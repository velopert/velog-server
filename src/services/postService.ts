import { GetPostsByTagParams } from './../entity/PostsTags';
import { Post, PostTag, Tag, User } from '@prisma/client';
import db from '../lib/db';
import removeMd from 'remove-markdown';
import { escapeForUrl } from '../lib/utils';
import Axios, { AxiosResponse } from 'axios';
import Cookies from 'cookies';
import { getEndpoint } from '../lib/getEndpoint';

const { API_V3_HOST } = process.env;

if (!API_V3_HOST) {
  throw new Error('API_V3_HOST ENV is required');
}

const postService = {
  async findTempPosts(userId: string, limit: number, cursor?: string) {
    const cursorPost = cursor
      ? await db.post.findUnique({
          where: {
            id: cursor,
          },
        })
      : null;

    const posts = await db.post.findMany({
      where: {
        fk_user_id: userId,
        is_temp: true,
        released_at: cursorPost?.released_at ? { lt: cursorPost.released_at } : undefined,
      },
      include: {
        postTags: {
          include: {
            tag: true,
          },
        },
        user: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });

    return posts.map(this.serialize);
  },
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

    console.log(`findPostsByTag: ${tagName} ${cursorPost ? cursorPost.released_at : ''}`);

    if (cursorPost) {
      const result = await db.$queryRaw<
        { fk_post_id: string }[]
      >`select pt.fk_post_id from posts_tags pt 
    inner join posts on posts.id = pt.fk_post_id 
    where pt.fk_tag_id = uuid(${originTag.id})
    and posts.is_temp = false and posts.is_private = false
    and posts.released_at < ${cursorPost.released_at}
    order by posts.released_at desc
    limit 20`;
      const ids = result.map(r => r.fk_post_id);
      const posts = await db.post.findMany({
        where: {
          id: {
            in: ids,
          },
        },
        include: {
          user: true,
        },
        orderBy: {
          released_at: 'desc',
        },
      });
      const serialized = posts.map(p => this.serialize(p));
      return serialized;
    } else {
      // const result = await db.$queryRaw<
      //   { fk_post_id: string }[]
      // >`select pt.fk_post_id from posts_tags pt
      // inner join posts on posts.id = pt.fk_post_id
      // where pt.fk_tag_id = uuid(${originTag.id})
      // and posts.is_temp = false and posts.is_private = false
      // order by posts.released_at desc
      // limit 20`;
      const result = [] as { fk_post_id: string }[];
      const ids = result.map(r => r.fk_post_id);
      const posts = await db.post.findMany({
        where: {
          id: {
            in: ids,
          },
        },
        include: {
          user: true,
        },
        orderBy: {
          released_at: 'desc',
        },
      });
      const serialized = posts.map(p => this.serialize(p));
      return serialized;
    }

    /**

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

     */
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
      postTags?: (PostTag & {
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
      created_at: post.created_at,
      released_at: post.released_at!,
      updated_at: post.updated_at!,
      short_description: shortDescription,
      body: post.body!,
      tags: post.postTags?.map(pt => pt.tag!.name!) ?? [],
      fk_user_id: post.fk_user_id,
      url_slug: post.url_slug,
      likes: post.likes,
      is_private: post.is_private,
      is_temp: post.is_temp,
    };
  },
  async likePost(postId: string, cookies: Cookies) {
    const LIKE_POST_MUTATION = `
        mutation LikePost($input: LikePostInput!) {
          likePost(input: $input) {
            id
            is_liked
            likes
          }
        }
      `;

    const endpoint = getEndpoint();

    const accessToken = cookies.get('access_token') ?? '';
    try {
      const res = await Axios.post<AxiosResponse<LikePostResponse>>(
        endpoint,
        {
          operationName: 'LikePost',
          query: LIKE_POST_MUTATION,
          variables: {
            input: {
              postId,
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return res.data.data.likePost;
    } catch (error) {
      console.log(error);
    }
  },
  async unlikePost(postId: string, cookies: Cookies) {
    const UNLIKE_POST_MUTATION = `
        mutation UnLikePost($input: UnlikePostInput!) {
          unlikePost(input: $input) {
            id
            is_liked
            likes
          }
        }
      `;

    const endpoint = getEndpoint();

    const accessToken = cookies.get('access_token') ?? '';

    try {
      const res = await Axios.post<AxiosResponse<UnlikePostResponse>>(
        endpoint,
        {
          operationName: 'UnLikePost',
          query: UNLIKE_POST_MUTATION,
          variables: {
            input: {
              postId,
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return res.data.data.unlikePost;
    } catch (error) {
      console.log('error', error);
    }
  },

  async write(args: WritePostArgs, cookies: Cookies, ip: string) {
    const WRITE_POST_MUTATION = `
      mutation WritePost($input: WritePostInput!) {
        writePost(input: $input) {
          id
          user {
            id
            username
          }
          url_slug
        }
      }
    `;

    const endpoint = getEndpoint();
    const accessToken = cookies.get('access_token') ?? '';

    try {
      const res = await Axios.post<AxiosResponse<WritePostResponse>>(
        endpoint,
        {
          operationName: 'WritePost',
          query: WRITE_POST_MUTATION,
          variables: {
            input: {
              ...args,
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${accessToken}`,
            'X-Forwarded-For': ip,
          },
        }
      );

      return res.data.data.writePost;
    } catch (error) {
      console.log('write post error', error);
    }
  },
  async edit(args: EditPostArgs, cookies: Cookies, ip: string) {
    const EDIT_POST_MUTATION = `
      mutation EditPost($input: EditPostInput!) {
        editPost(input: $input) {
          id
          user {
            id
            username
          }
          url_slug
        }
      }
    `;

    const endpoint = getEndpoint();
    const accessToken = cookies.get('access_token') ?? '';
    try {
      if (args.is_private === null) {
        console.log('nullable edit post input', args);
      }
      const res = await Axios.post<AxiosResponse<EditPostResponse>>(
        endpoint,
        {
          operationName: 'EditPost',
          query: EDIT_POST_MUTATION,
          variables: {
            input: {
              ...args,
              is_private: args.is_private || false,
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${accessToken}`,
            'X-Forwarded-For': ip,
          },
        }
      );

      return res.data.data.editPost;
    } catch (error) {
      console.log('edit post error', error);
    }
  },

  async getLinkedPosts(postId: string, callerUserId: string | null) {
    const seriesPost = await db.seriesPost.findFirst({ where: { fk_post_id: postId } });

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { released_at: true, fk_user_id: true },
    });
    const isOwner = callerUserId === post?.fk_user_id;

    if (!post || !post.released_at) {
      return {
        previous: null,
        next: null,
      };
    }
    if (seriesPost) {
      const index = seriesPost.index ?? 0;
      const linkedPosts = await db.seriesPost.findMany({
        where: {
          fk_series_id: seriesPost.fk_series_id,
          index: {
            in: [index - 1, index + 1],
          },
        },
        include: {
          Post: {
            include: {
              user: true,
            },
          },
        },
      });
      const result = {
        previous: linkedPosts.find(p => p.index === index - 1)?.Post ?? null,
        next: linkedPosts.find(p => p.index === index + 1)?.Post ?? null,
      };
      if (!isOwner) {
        if (result.previous?.is_private) {
          result.previous = null;
        }
        if (result.next?.is_private) {
          result.next = null;
        }
      }
      return {
        previous: result.previous ? this.serialize(result.previous) : null,
        next: result.next ? this.serialize(result.next) : null,
      };
    }

    const prevPostPromise = db.post.findFirst({
      where: {
        ...(isOwner ? {} : { is_private: false }),
        is_temp: false,
        fk_user_id: post.fk_user_id,
        released_at: { lt: post.released_at },
      },
      take: 1,
      orderBy: {
        released_at: 'desc',
      },
      include: {
        user: true,
      },
    });

    const nextPostPromise = db.post.findFirst({
      where: {
        ...(isOwner ? {} : { is_private: false }),
        is_temp: false,
        fk_user_id: post.fk_user_id,
        released_at: { gt: post.released_at },
      },
      take: 1,
      orderBy: {
        released_at: 'asc',
      },
      include: {
        user: true,
      },
    });

    const [prevPost, nextPost] = await Promise.all([prevPostPromise, nextPostPromise]);

    return {
      previous: prevPost ? this.serialize(prevPost) : null,
      next: nextPost ? this.serialize(nextPost) : null,
    };
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

type EditPostArgs = WritePostArgs & {
  id: string;
};

type WritePostResponse = {
  writePost: {
    id: string;
    user: {
      id: string;
      username: string;
    };
    url_slug: string;
  };
};

type EditPostResponse = {
  editPost: {
    id: string;
    user: {
      id: string;
      username: string;
    };
    url_slug: string;
  };
};
