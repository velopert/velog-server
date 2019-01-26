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

@Entity('posts')
export default class Post {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  title!: string;

  @Column('text')
  body!: string;

  @Column({ length: 255, nullable: true })
  thumbnail!: string;

  @Column()
  is_markdown!: boolean;

  @Column()
  is_temp!: boolean;

  @ManyToOne(type => User, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_user_id' })
  user!: User;

  @Index()
  @Column({ length: 255 })
  url_slug!: string;

  @Column({ default: 0 })
  likes!: number;

  @Column({
    default: {},
    type: 'jsonb'
  })
  meta!: any;

  @Column()
  views!: number;

  @Column({ default: true })
  is_private!: boolean;

  @Column({
    type: 'timestamptz',
    default: () => 'now()',
    nullable: false
  })
  released_at!: Date;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  @Column('tsvector')
  tsv!: any;
}
