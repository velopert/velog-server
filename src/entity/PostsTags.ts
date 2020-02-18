import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  UpdateDateColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
  getRepository,
  getManager
} from 'typeorm';
import Tag from './Tag';
import Post from './Post';
import DataLoader from 'dataloader';
import { groupById, normalize } from '../lib/utils';
import TagAlias from './TagAlias';

type RawTagData = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  created_at: string;
  posts_count: string;
};

type GetPostsByTagParams = {
  tagName: string;
  cursor?: string;
  limit?: number;
  userId?: string;
  userself: boolean;
};

@Entity('posts_tags', {
  synchronize: false
})
export default class PostsTags {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  fk_post_id!: string;

  @Index()
  @Column('uuid')
  fk_tag_id!: string;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(type => Tag, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_tag_id' })
  tag!: Tag;

  @ManyToOne(type => Post, { cascade: true })
  @JoinColumn({ name: 'fk_post_id' })
  post!: Post;

  static async syncPostTags(postId: string, tags: Tag[]) {
    const uniqueTags = tags.reduce<Tag[]>((acc, current) => {
      if (!acc.find(tag => tag.id === current.id)) {
        acc.push(current);
        return acc;
      }
      return acc;
    }, []);

    console.log(uniqueTags);

    const repo = getRepository(PostsTags);

    // get current post tags
    const prevPostTags = await repo.find({
      where: {
        fk_post_id: postId
      }
    });

    const normalized = {
      prev: normalize(prevPostTags, postTag => postTag.fk_tag_id),
      current: normalize(uniqueTags)
    };

    // removes tags that are missing
    const missing = prevPostTags.filter(postTag => !normalized.current[postTag.fk_tag_id]);
    missing.forEach(tag => repo.remove(tag));

    // adds tags that are new
    const tagsToAdd = uniqueTags.filter(tag => !normalized.prev[tag.id]);
    const postTags = tagsToAdd.map(tag => {
      const postTag = new PostsTags();
      postTag.fk_post_id = postId;
      postTag.fk_tag_id = tag.id;
      return postTag;
    });
    return repo.save(postTags);
  }

  static async getPostsCount(tagId: string): Promise<number> {
    const rawData = await getManager().query(
      `select posts_count from (
        select count(fk_post_id) as posts_count, coalesce(tag_alias.fk_alias_tag_id, posts_tags.fk_tag_id) as tag_id from posts_tags
        left join tag_alias on posts_tags.fk_tag_id = tag_alias.fk_tag_id
        inner join posts on posts.id = fk_post_id
        where posts.is_private = false
        and posts.is_temp = false
        group by tag_id
      ) as q1
      where tag_id = $1`,
      [tagId]
    );
    if (rawData.length === 0) return 0;
    return rawData[0].posts_count;
  }

  static async getUserTags(
    userId: string,
    showPrivate: boolean
  ): Promise<Tag & { posts_count: number }> {
    const rawData = await getManager().query(
      `
      select tags.id, tags.name, tags.created_at, tags.description, tags.thumbnail, posts_count from (
        select count(fk_post_id) as posts_count, fk_tag_id from posts_tags
        inner join posts on posts.id = fk_post_id
          and posts.is_temp = false
          and posts.fk_user_id = $1
          ${showPrivate ? '' : 'and posts.is_private = false'}
        group by fk_tag_id
      ) as q inner join tags on q.fk_tag_id = tags.id
      order by posts_count desc
    `,
      [userId]
    );
    return rawData;
  }

  static async getTags(cursor?: string, limit = 60): Promise<RawTagData> {
    const cursorTag = cursor ? await getRepository(Tag).findOne(cursor) : null;

    const manager = getManager();
    if (!cursor) {
      const tags = await manager.query(
        `
      select tags.id, tags.name, tags.created_at, tags.description, tags.thumbnail, posts_count from (
        select count(fk_post_id) as posts_count, coalesce(tag_alias.fk_alias_tag_id, posts_tags.fk_tag_id) as tag_id from posts_tags 
        left join tag_alias on posts_tags.fk_tag_id = tag_alias.fk_tag_id
        inner join posts on posts.id = fk_post_id
        where posts.is_private = false
        and posts.is_temp = false
        group by tag_id
      ) as q1
      inner join tags on q1.tag_id = tags.id
      order by tags.name
      limit $1
      `,
        [limit]
      );
      return tags;
    }

    if (!cursorTag) {
      throw new Error('Invalid tag');
    }

    const tags = await manager.query(
      `
      select tags.id, tags.name, tags.created_at, tags.description, tags.thumbnail, posts_count from (
        select count(fk_post_id) as posts_count, coalesce(tag_alias.fk_alias_tag_id, posts_tags.fk_tag_id) as tag_id from posts_tags 
        left join tag_alias on posts_tags.fk_tag_id = tag_alias.fk_tag_id
        inner join posts on posts.id = fk_post_id
        where posts.is_private = false
        and posts.is_temp = false
        group by tag_id
      ) as q1
      inner join tags on q1.tag_id = tags.id
      where tags.name > $1
      order by tags.name
      limit $2`,
      [cursorTag.name, limit]
    );
    return tags;
  }

  static async getTrendingTags(cursor?: string, limit: number = 60): Promise<RawTagData> {
    const cursorPostsCount = cursor ? await this.getPostsCount(cursor) : 0;
    const manager = getManager();
    if (!cursor) {
      const tags = await manager.query(
        `
      select tags.id, tags.name, tags.created_at, tags.description, tags.thumbnail, posts_count from (
        select count(fk_post_id) as posts_count, coalesce(tag_alias.fk_alias_tag_id, posts_tags.fk_tag_id) as tag_id from posts_tags 
        left join tag_alias on posts_tags.fk_tag_id = tag_alias.fk_tag_id
        inner join posts on posts.id = fk_post_id
        where posts.is_private = false
        and posts.is_temp = false
        group by tag_id
      ) as q1
      inner join tags on q1.tag_id = tags.id
      order by posts_count desc, tags.id
      limit $1
      `,
        [limit]
      );
      return tags;
    }

    const tags = await manager.query(
      `
      select tags.id, tags.name, tags.created_at, tags.description, tags.thumbnail, posts_count from (
        select count(fk_post_id) as posts_count, coalesce(tag_alias.fk_alias_tag_id, posts_tags.fk_tag_id) as tag_id from posts_tags 
        left join tag_alias on posts_tags.fk_tag_id = tag_alias.fk_tag_id
        inner join posts on posts.id = fk_post_id
        where posts.is_private = false
        and posts.is_temp = false
        group by tag_id
      ) as q1
      inner join tags on q1.tag_id = tags.id
      where posts_count <= $2
      and id != $1
      and not (id < $1 and posts_count = $2)
      order by posts_count desc, tags.id
      limit $3`,
      [cursor, cursorPostsCount, limit]
    );
    return tags;
  }

  static async getPostsByTag({
    tagName,
    cursor,
    limit = 20,
    userId,
    userself
  }: GetPostsByTagParams) {
    const tag = await TagAlias.getOriginTag(tagName);
    if (!tag) throw new Error('Invalid tag');
    const manager = getManager();
    const postRepo = getRepository(Post);
    const cursorPost = cursor ? await postRepo.findOne(cursor) : null;

    const rawData: { id: string }[] = await (cursorPost
      ? manager.query(
          `
    select id from (
      select distinct on (posts.id) posts.id, posts.released_at from posts
      inner join posts_tags on posts.id = posts_tags.fk_post_id
      inner join tags on posts_tags.fk_tag_id = tags.id
      left join tag_alias on tag_alias.fk_tag_id = tags.id
      where (
        posts_tags.fk_tag_id = $1
        or tag_alias.fk_alias_tag_id = $1
      )
      ${userself ? '' : 'and posts.is_private = false'}
      and posts.is_temp = false
      and posts.id != $2
      and (posts.released_at <= $3
        or (
          posts.released_at = $3
          and posts.id < $2
        )
      )
      ${userId ? `and fk_user_id = '${userId}'` : ''}
      order by posts.id
    ) as q1
    order by released_at desc
    limit 20
  `,
          [tag.id, cursorPost.id, cursorPost.released_at]
        )
      : manager.query(
          `
      select id from (
        select distinct on (posts.id) posts.id, posts.released_at from posts
        inner join posts_tags on posts.id = posts_tags.fk_post_id
        inner join tags on posts_tags.fk_tag_id = tags.id
        left join tag_alias on tag_alias.fk_tag_id = tags.id
        where (
          posts_tags.fk_tag_id = $1
          or tag_alias.fk_alias_tag_id = $1
        )
        ${userself ? '' : 'and posts.is_private = false'}
        ${userId ? `and fk_user_id = '${userId}'` : ''}
        and posts.is_temp = false
        order by posts.id
      ) as q1
      order by released_at desc
      limit 20
    `,
          [tag.id]
        ));

    const idList = rawData.map(row => row.id);

    const posts = await postRepo.findByIds(idList);
    const normalized = normalize(posts);
    const ordered = idList.map(id => normalized[id]);

    return ordered;
  }
}

export const createTagsLoader = () =>
  new DataLoader<string, Tag[]>(async postIds => {
    const repo = getRepository(PostsTags);
    const postsTags = await repo
      .createQueryBuilder('posts_tags')
      .where('fk_post_id IN (:...postIds)', { postIds })
      .leftJoinAndSelect('posts_tags.tag', 'tag')
      .orderBy('fk_post_id', 'ASC')
      .orderBy('tag.name', 'ASC')
      .getMany();

    return groupById<PostsTags>(postIds, postsTags, pt => pt.fk_post_id).map(array =>
      array.map(pt => pt.tag)
    );
  });
