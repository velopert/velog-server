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
  OneToMany,
  ManyToMany,
  JoinTable
} from 'typeorm';
import User from './User';
import Comment from './Comment';
import Tag from './Tag';

@Entity('posts', {
  synchronize: false
})
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

  @Column('uuid')
  fk_user_id!: string;

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

  @Index()
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

  @OneToMany(type => Comment, comment => comment.post)
  comments!: Comment[];

  @ManyToMany(type => Tag)
  @JoinTable({
    name: 'post_tags',
    joinColumn: {
      name: 'fk_post_id'
    },
    inverseJoinColumn: {
      name: 'fk_tag_id'
    }
  })
  tags!: Tag[];
}
