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

@Entity('post_histories', {
  synchronize: false
})
export default class PostHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  fk_post_id!: string;

  @ManyToOne(type => Post, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_post_id' })
  post!: Post;

  @Column({ length: 255 })
  title!: string;

  @Column('text')
  body!: string;

  @Column()
  is_markdown!: boolean;

  @Index()
  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;
}
