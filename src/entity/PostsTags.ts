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
  getRepository
} from 'typeorm';
import Tag from './Tag';
import Post from './Post';
import DataLoader from 'dataloader';
import { groupById } from '../lib/utils';

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
}

export const tagsLoader: DataLoader<string, Tag[]> = new DataLoader(async postIds => {
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
