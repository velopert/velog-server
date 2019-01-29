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

@Entity('post_scores', {
  synchronize: false
})
export default class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  type!: string;

  @Column('uuid')
  fk_user_id!: string;

  @Column('uuid')
  fk_post_id!: string;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  @Column('float8', {
    default: 0
  })
  score!: number;

  @ManyToOne(type => User)
  @JoinColumn({ name: 'fk_user_id' })
  user!: User;

  @ManyToOne(type => Post)
  @JoinColumn({ name: 'fk_post_id' })
  post!: User;
}
