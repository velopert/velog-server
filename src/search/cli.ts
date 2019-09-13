import { createConnection, getRepository } from 'typeorm';
import '../env';
import Post from '../entity/Post';
import { classToPlain } from 'class-transformer';
import inquirer from 'inquirer';
import User from '../entity/User';
import { pick } from 'ramda';
import esClient from './esClient';

async function initialize() {
  try {
    await createConnection();
    console.log('Postgres RDBMS connection is established');
  } catch (e) {
    console.log(e);
  }
}

function serializePost(post: Post) {
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
      'tags'
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

async function syncAll() {
  const postRepo = getRepository(Post);
  const postsCount = await postRepo.count({
    where: {
      is_temp: false
    }
  });
  const limit = 100;

  const queryCount = Math.ceil(postsCount / limit);
  console.log(`Found ${postsCount} posts`);

  for (let i = 0; i < queryCount; i += 1) {
    const postIds = await postRepo
      .createQueryBuilder('post')
      .select('post.id')
      .where('is_temp = false')
      .orderBy('released_at', 'ASC')
      .offset(i * limit)
      .limit(limit)
      .getMany();

    const idList = postIds.map(p => p.id);

    const posts = await postRepo
      .createQueryBuilder('post')
      .select('post.id')
      .addSelect('post.title')
      .addSelect('post.body')
      .addSelect('post.thumbnail')
      .addSelect('post.released_at')
      .addSelect('post.likes')
      .addSelect('post.views')
      .addSelect('post.meta')
      .addSelect('post.fk_user_id')
      .addSelect('post.is_private')
      .leftJoin('post.user', 'user')
      .addSelect('user.id')
      .addSelect('user.username')
      .leftJoin('user.profile', 'profile')
      .addSelect('profile.id')
      .addSelect('profile.display_name')
      .addSelect('profile.thumbnail')
      .leftJoinAndSelect('post.tags', 'tags')
      .addSelect('tags.name')
      .whereInIds(idList)
      .getMany();

    // const posts = await postRepo.find({
    //   select: [
    //     'id',
    //     'title',
    //     'body',
    //     'thumbnail',
    //     'fk_user_id',
    //     'user',
    //     'released_at',
    //     'likes',
    //     'views',
    //     'meta'
    //   ],
    //   skip: i * limit,
    //   take: limit,
    //   relations: ['user', 'user.profile', 'tags'],
    //   where: {
    //     is_temp: false
    //   },
    //   order: {
    //     released_at: 'ASC'
    //   }
    // });
    const serializedPosts = posts.map(serializePost);

    try {
      const body = serializedPosts.map(doc => [{ index: { _index: 'posts', _id: doc.id } }, doc]);
      const flat = ([] as any[]).concat(...body);
      const response = await esClient.bulk({ body: flat });
      if (response.body.errors) {
        throw response;
      }
    } catch (e) {
      console.log(e);
    }
  }
}

async function askPostId() {
  const { postId } = await inquirer.prompt([
    {
      type: 'input',
      name: 'postId',
      message: 'Please type the post id to process'
    }
  ]);
  return postId;
}

async function updatePost() {
  const postRepo = getRepository(Post);
  const post = await postRepo
    .createQueryBuilder('post')
    .leftJoinAndSelect('post.user', 'user')
    .leftJoinAndSelect('user.profile', 'profile')
    .leftJoinAndSelect('post.tags', 'tags')
    .where('post.id = :id', { id: '21fd6700-b354-11e8-ba07-9dd972ee6ad1' })
    .getOne();
}

async function deletePost() {
  const postId = askPostId();
  console.log('Delete', postId);
}

async function search() {
  const { keyword } = await inquirer.prompt([
    {
      type: 'input',
      name: 'keyword',
      message: 'Please type the keyword to search'
    }
  ]);
  // const result = await postsIndex.search({
  //   query: keyword,
  //   filters: 'user.username:velopert'
  // });
  // console.log(result);
}
const taskMap = {
  'Sync all posts': syncAll,
  'Update a post': updatePost,
  'Delete a post': deletePost,
  Search: search
};

type TaskKey = keyof typeof taskMap;

async function ask() {
  const { task }: { task: TaskKey } = await inquirer.prompt([
    {
      type: 'list',
      name: 'task',
      message: 'Select the task to process',
      choices: ['Sync all posts', 'Update a post', 'Delete a post', 'Search']
    }
  ]);
  const taskFn = taskMap[task];
  await taskFn();
  ask();
}

async function main() {
  await initialize();
  ask();
}

main();

// async function initialize() {
//   try {
//     await createConnection();
//     console.log('Postgres RDBMS connection is established');
//   } catch (e) {
//     console.log(e);
//   }
// }

// async function syncTest() {
//   const postRepo = getRepository(Post);
//   const posts = await postRepo.find({
//     select: ['id', 'title', 'body', 'thumbnail', 'fk_user_id', 'user', 'released_at', 'meta'],
//     take: 100,
//     relations: ['user']
//   });
//   const serialized = posts.map(post => {
//     const plain = classToPlain(post) as any;
//     plain['objectID'] = plain.id;
//     plain.body = plain.body.slice(0, 4000);
//     delete plain.id;
//     return plain;
//   });

//   await postsIndex.addObjects(serialized);
//   console.log('added objects successfully');
// }
// initialize().then(() => {
//   console.log('Server is initialized');
//   syncTest();
// });
