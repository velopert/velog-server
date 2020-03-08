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
import Post from './Post';
import User from './User';

type LogParams = {
  userId: string;
  postId: string;
  percentage: number;
  resumeTitleId: string | null;
};

@Entity('post_read_logs', {
  synchronize: true
})
export default class PostReadLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  fk_post_id!: string;

  @ManyToOne(type => Post, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'fk_post_id' })
  post!: Post;

  @Index()
  @Column('uuid')
  fk_user_id!: string;

  @ManyToOne(type => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fk_user_id' })
  user!: User;

  @Column('real')
  percentage!: number;

  @Column({ length: 255, nullable: true, type: 'varchar' })
  resume_title_id!: string | null;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Index()
  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  static async log(params: LogParams) {
    const repo = getRepository(PostReadLog);
    const exists = await repo.findOne({
      fk_user_id: params.userId,
      fk_post_id: params.postId
    });
    if (exists) {
      exists.percentage = params.percentage;
      return repo.save(exists);
    }
    const readLog = new PostReadLog();
    readLog.fk_post_id = params.postId;
    readLog.fk_user_id = params.userId;
    readLog.percentage = params.percentage;
    return repo.save(readLog);
  }
}
