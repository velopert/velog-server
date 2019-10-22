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

type RawTagData = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  created_at: string;
  posts_count: string;
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
    const repo = getRepository(PostsTags);

    // get current post tags
    const prevPostTags = await repo.find({
      where: {
        fk_post_id: postId
      }
    });

    const normalized = {
      prev: normalize(prevPostTags, postTag => postTag.fk_tag_id),
      current: normalize(tags)
    };

    // removes tags that are missing
    const missing = prevPostTags.filter(postTag => !normalized.current[postTag.fk_tag_id]);
    missing.forEach(tag => repo.remove(tag));

    // adds tags that are new
    const tagsToAdd = tags.filter(tag => !normalized.prev[tag.id]);
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
      `select COUNT(fk_post_id) as posts_count from posts_tags
    inner join posts on posts.id = fk_post_id
    where posts.is_private = false
    and posts.is_temp = false
    and fk_tag_id = $1`,
      [tagId]
    );
    if (rawData.length === 0) return 0;
    return rawData[0].posts_count;
  }

  static async getTags(cursor?: string): Promise<RawTagData> {
    const cursorTag = cursor ? await getRepository(Tag).findOne(cursor) : null;

    const manager = getManager();
    if (!cursor) {
      const tags = await manager.query(`
      select tags.id, tags.name, tags.created_at, tags.description, tags.thumbnail, posts_count from (
        select fk_tag_id,  COUNT(fk_post_id) as posts_count from posts_tags
        inner join tags on tags.id = fk_tag_id
        inner join posts on posts.id = fk_post_id
        where posts.is_private = false
        and posts.is_temp = false
        and tags.is_alias = false
        group by fk_tag_id
      ) as q1
      inner join tags on q1.fk_tag_id = tags.id
      order by tags.name
      LIMIT 50`);
      return tags;
    }

    if (!cursorTag) {
      throw new Error('Invalid tag');
    }

    const tags = await manager.query(
      `
      select tags.id, tags.name, tags.created_at, tags.description, tags.thumbnail, posts_count from (
        select fk_tag_id,  COUNT(fk_post_id) as posts_count from posts_tags
        inner join tags on tags.id = fk_tag_id
        inner join posts on posts.id = fk_post_id
        where posts.is_private = false
        and posts.is_temp = false
        and tags.is_alias = false
        group by fk_tag_id
      ) as q1
      inner join tags on q1.fk_tag_id = tags.id
      where tags.name > $1
      order by tags.name
      LIMIT 50`,
      [cursorTag.name]
    );
    return tags;
  }

  static async getTrendingTags(cursor?: string): Promise<RawTagData> {
    const cursorPostsCount = cursor ? await this.getPostsCount(cursor) : 0;
    const manager = getManager();
    if (!cursor) {
      const tags = await manager.query(`select tags.id, tags.name, tags.created_at, tags.description, tags.thumbnail, posts_count from (
                  select fk_tag_id, COUNT(fk_post_id) as posts_count from posts_tags
                  inner join tags on tags.id = fk_tag_id
                  inner join posts on posts.id = fk_post_id
                  where posts.is_private = false
                  and posts.is_temp = false
                  and tags.is_alias = false
                  group by fk_tag_id
                ) as q1
                inner join tags on q1.fk_tag_id = tags.id
                order by posts_count desc, tags.id
                LIMIT 50`);
      return tags;
    }

    const tags = await manager.query(
      `
      select tags.id, tags.name, tags.created_at, tags.description, tags.thumbnail, posts_count from (
        select fk_tag_id,  COUNT(fk_post_id) as posts_count from posts_tags
        inner join tags on tags.id = fk_tag_id
        inner join posts on posts.id = fk_post_id
        where posts.is_private = false
        and posts.is_temp = false
        and tags.is_alias = false
        group by fk_tag_id
      ) as q1
      inner join tags on q1.fk_tag_id = tags.id
      where posts_count <= $2
      and id != $1
      and not (id < $1 and posts_count = $2)
      order by posts_count desc, tags.id
      LIMIT 50`,
      [cursor, cursorPostsCount]
    );
    return tags;
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
