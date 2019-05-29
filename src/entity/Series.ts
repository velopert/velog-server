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
import User from './User';
import DataLoader from 'dataloader';

@Entity('series', {
  synchronize: false
})
export default class Series {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  fk_user_id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column('text')
  description!: string;

  @Column({ length: 255, nullable: true })
  thumbnail!: string;

  @Column({ length: 255 })
  url_slug!: string;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(type => User, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_user_id' })
  user!: User;
}

export const createSeriesListLoader = () =>
  new DataLoader<string, Series[]>(async userIds => {
    const repo = getRepository(Series);
    const seriesList = await repo
      .createQueryBuilder('series')
      .where('fk_user_id IN (:...userIds)', { userIds })
      .getMany();
    const seriesListMap: {
      [key: string]: Series[];
    } = {};
    userIds.forEach(userId => (seriesListMap[userId] = []));
    seriesList.forEach(series => {
      seriesListMap[series.fk_user_id].push(series);
    });
    const ordered = userIds.map(userId => seriesListMap[userId]);
    return ordered;
  });
