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
import User from './User';
import Post from './Post';
import DataLoader from 'dataloader';
import { normalize } from '../lib/utils';

@Entity('comments', {
  synchronize: false
})
export default class Comment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  text!: string;

  @Column({ default: 0 })
  likes!: number;

  @Column('uuid', {
    nullable: true
  })
  reply_to!: string;

  @Column({ default: 0 })
  level!: number;

  @Column({ default: false })
  has_replies!: boolean;

  @Column({ default: false })
  deleted!: boolean;

  @Column('uuid')
  fk_user_id!: string;

  @Column('uuid')
  fk_post_id!: string;

  @Index()
  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(type => User)
  @JoinColumn({ name: 'fk_user_id' })
  user!: User;

  @ManyToOne(
    type => Post,
    post => post.comments
  )
  @JoinColumn({ name: 'fk_post_id' })
  post!: Post;

  subcomments!: Comment[];
}

export const createCommentsLoader = () =>
  new DataLoader<string, Comment[]>(async postIds => {
    const posts = await getManager()
      .createQueryBuilder(Post, 'post')
      .leftJoinAndSelect('post.comments', 'comment')
      .whereInIds(postIds)
      .andWhere('level = 0')
      .andWhere('(deleted = false or has_replies = true)')
      .orderBy({
        'comment.created_at': 'ASC'
      })
      .getMany();

    const normalized = normalize<Post>(posts);

    const commentsGroups = postIds.map(id => (normalized[id] ? normalized[id].comments : []));
    return commentsGroups;
  });
