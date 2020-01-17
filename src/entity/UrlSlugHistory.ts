import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  UpdateDateColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne
} from 'typeorm';
import User from './User';
import Post from './Post';

@Entity('url_slug_histories', {
  synchronize: false
})
export default class UrlSlugHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(type => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fk_user_id' })
  user!: User;

  @ManyToOne(type => Post, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_post_id' })
  post!: Post;

  @Column('uuid')
  fk_user_id!: string;

  @Column('uuid')
  fk_post_id!: string;

  @Index()
  @Column({ length: 255 })
  url_slug!: string;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;
}
