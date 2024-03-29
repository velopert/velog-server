import esClient from './esClient';
import Post from '../entity/Post';
import { serializePost } from './serializePost';
import { getRepository } from 'typeorm';
import { createTagsLoader } from '../entity/PostsTags';

const tagsLoader = createTagsLoader();

async function update(id: string) {
  if (process.env.NODE_ENV !== 'production') return;
  const postRepo = getRepository(Post);
  const post = await postRepo
    .createQueryBuilder('post')
    .leftJoinAndSelect('post.user', 'user')
    .leftJoinAndSelect('user.profile', 'profile')
    .leftJoinAndSelect('post.tags', 'tags')
    .where('post.id = :id', { id })
    .getOne();

  if (!post) return;
  const tags = await tagsLoader.load(post!.id);
  post.tags = tags;

  const serialized = serializePost(post);

  return esClient.index({
    id,
    index: 'posts',
    body: serialized,
  });
}

function remove(id: string) {
  if (process.env.NODE_ENV !== 'production') return;
  return esClient.delete({
    id,
    index: 'posts',
  });
}

const searchSync = {
  update,
  remove,
};

export default searchSync;
