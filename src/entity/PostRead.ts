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
import Post from './Post';
import User from './User';

@Entity('post_reads', {
  synchronize: false
})
export default class PostRead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', {
    nullable: true
  })
  fk_user_id!: string | null;

  @Column('uuid')
  fk_post_id!: string;

  @Index()
  @Column({ length: 255 })
  ip_hash!: string;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(type => Post, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_post_id' })
  post!: Post;

  @ManyToOne(type => User, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_user_id' })
  user!: User;
}
