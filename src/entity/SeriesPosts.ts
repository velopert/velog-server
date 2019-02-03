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
import Series from './Series';
import DataLoader from 'dataloader';

@Entity('series_posts', {
  synchronize: false
})
@Index(['fk_series_id', 'fk_post_id'])
export default class SeriesPosts {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  fk_series_id!: string;

  @Index()
  @Column('uuid')
  fk_post_id!: string;

  @Column('int4')
  index!: number;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(type => Post, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_post_id' })
  post!: Post;

  @ManyToOne(type => Series, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_series_id' })
  series!: Series;
}

export const seriesPostsLoader: DataLoader<string, SeriesPosts[]> = new DataLoader(
  async seriesIds => {
    const repo = getRepository(SeriesPosts);
    const seriesPosts = await repo
      .createQueryBuilder('series_posts')
      .where('fk_series_id IN (:...seriesIds)', { seriesIds })
      .leftJoinAndSelect('series_posts.post', 'post')
      .orderBy('seriesIds', 'ASC')
      .orderBy('index', 'ASC')
      .getMany();

    const postsMap: {
      [key: string]: SeriesPosts[];
    } = {};
    seriesIds.forEach(seriesId => (postsMap[seriesId] = []));
    seriesPosts.forEach(sp => {
      postsMap[sp.fk_series_id].push(sp);
    });
    const ordered = seriesIds.map(seriesId => postsMap[seriesId]);
    return ordered;
  }
);
