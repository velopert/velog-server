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
  getManager,
  getRepository,
} from 'typeorm';
import Post from './Post';
import User from './User';

@Entity('post_reads', {
  synchronize: false,
})
export default class PostRead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid', {
    nullable: true,
  })
  fk_user_id!: string | null;

  @Index()
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

  static async getStats(postId: string) {
    const total = await getRepository(PostRead).count({
      where: {
        fk_post_id: postId,
      },
    });
    const countByDay: { count: string; day: string }[] = await getManager().query(
      `select count(id) as count, date_trunc('day'::text, timezone('KST'::text, created_at)) as day from (
        select * from post_reads 
        where fk_post_id = $1
      ) as t
  group by day
  order by day desc`,
      [postId]
    );
    return {
      total,
      count_by_day: countByDay.map(c => ({ day: new Date(c.day), count: parseInt(c.count) })),
    };
  }
}
