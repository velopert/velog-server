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
    });

    return posts.map(post => ({
      id: post.id,
      url: `https://velog.io/@${user.username}/${encodeURI(post.url_slug ?? '')}`,
      title: post.title,
      thumbnail: post.thumbnail,
      released_at: post.released_at,
      updated_at: post.updated_at,
      short_description:
        post.short_description ??
        removeMd(
          (post.body ?? '')
            .replace(/```([\s\S]*?)```/g, '')
            .replace(/~~~([\s\S]*?)~~~/g, '')
            .slice(0, 500)
        ),
      body: post.body,
    }));
  },
};

export default postService;

type FindPostParams = {
  userId: string;
  size: number;
  cursor?: string;
};
