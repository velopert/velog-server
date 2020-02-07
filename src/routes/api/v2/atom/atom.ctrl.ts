import { Middleware } from '@koa/router';
import { getRepository } from 'typeorm';
import Post from '../../../../entity/Post';
import { Feed } from 'feed';
import { Item } from 'feed/lib/typings';
import marked from 'marked';
import VelogConfig from '../../../../entity/VelogConfig';

function convert(post: Post): Item {
  const { username } = post.user;
  const link = `https://velog.io/${username}/${encodeURI(post.url_slug)}}`;
  return {
    link,
    title: post.title,
    description: marked(post.body),
    id: link,
    image: post.thumbnail || undefined,
    date: post.released_at,
    author: [
      {
        name: post.user.profile.display_name,
        link: `https://velog.io/@${username}`
      }
    ]
  };
}

export const getEntireFeed: Middleware = async ctx => {
  const postRepo = getRepository(Post);

  const posts = await postRepo
    .createQueryBuilder('post')
    .where('is_temp = false AND is_private = false')
    .orderBy('released_at', 'DESC')
    .innerJoinAndSelect('post.user', 'user')
    .innerJoinAndSelect('user.profile', 'profile')
    .limit(20)
    .getMany();

  const feed = new Feed({
    title: 'velog',
    description:
      '개발자들을 위한 블로그 서비스. 어디서 글 쓸지 고민하지 말고 벨로그에서 시작하세요.',
    link: 'https://velog.io/',
    id: 'https://velog.io/',
    image: 'https://images.velog.io/velog.png',
    updated: posts[0]?.released_at,
    copyright: 'Copyright (C) 2019. Velog. All rights reserved.'
  });

  const postFeeds = posts.map(convert);
  postFeeds.forEach(feed.addItem);
  ctx.type = 'text/xml; charset=UTF-8';
  ctx.body = feed.atom1();
};

export const getUserFeed: Middleware = async ctx => {
  const postRepo = getRepository(Post);
  const velogConfigRepo = getRepository(VelogConfig);
  const { username } = ctx.params;
  const posts = await postRepo
    .createQueryBuilder('post')
    .where('is_temp = false AND is_private = false')
    .where('username = :username', { username })
    .orderBy('released_at', 'DESC')
    .innerJoinAndSelect('post.user', 'user')
    .innerJoinAndSelect('user.profile', 'profile')
    .limit(20)
    .getMany();

  const config = await velogConfigRepo
    .createQueryBuilder('velog_config')
    .innerJoinAndSelect('velog_config.user', 'user')
    .innerJoinAndSelect('user.profile', 'profile')
    .where('user.username = :username', { username })
    .getOne();

  if (!config) throw new Error('Config not found');

  const title = config.title || `${username}.log`;
  const { user } = config;

  const feed = new Feed({
    title,
    description: user.profile.short_bio,
    link: 'https://velog.io/',
    id: 'https://velog.io/',
    image: user.profile.thumbnail || undefined,
    updated: posts[0]?.released_at,
    copyright: `Copyright (C) 2019. ${title}. All rights reserved.`
  });

  const postFeeds = posts.map(convert);
  postFeeds.forEach(feed.addItem);
  ctx.type = 'text/xml; charset=UTF-8';
  ctx.body = feed.atom1();
};
