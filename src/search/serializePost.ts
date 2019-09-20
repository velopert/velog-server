import Post from '../entity/Post';
import { pick } from 'ramda';

export type SerializedPost = ReturnType<typeof serializePost>;
export function serializePost(post: Post) {
  const picked = pick(
    [
      'id',
      'title',
      'body',
      'thumbnail',
      'user',
      'is_private',
      'released_at',
      'likes',
      'views',
      'meta',
      'user',
      'tags',
      'url_slug'
    ],
    post
  );
  return {
    ...picked,
    // _id: picked.id,
    // objectID: picked.id,
    body: picked.body.slice(0, 3500),
    user: {
      id: picked.user.id,
      username: picked.user.username,
      profile: {
        id: picked.user.profile.id,
        display_name: picked.user.profile.display_name,
        thumbnail: picked.user.profile.thumbnail
      }
    },
    tags: picked.tags.map(t => t.name)
  };
}
