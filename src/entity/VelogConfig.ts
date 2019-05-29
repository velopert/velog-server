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
import { normalize } from '../lib/utils';

/** Created with TypeORM  **/
@Entity('velog_configs', {
  synchronize: true
})
export default class VelogConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ length: 255, nullable: true })
  title!: string;

  @Column({ length: 255, nullable: true })
  logo_image!: string;

  @OneToOne(type => User, { cascade: true })
  @JoinColumn({ name: 'fk_user_id' })
  user!: User;

  @Column('uuid')
  fk_user_id!: string;
}

export const createVelogConfigLoader = () =>
  new DataLoader<string, VelogConfig>(async userIds => {
    const repo = getRepository(VelogConfig);
    const configs = await repo
      .createQueryBuilder('velog_configs')
      .where('fk_user_id IN (:...userIds)', { userIds })
      .getMany();
    const normalized = normalize(configs, config => config.fk_user_id);
    return userIds.map(id => normalized[id]);
  });
