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

@Index(['provider', 'social_id'])
@Entity('social_accounts', {
  synchronize: false
})
export default class SocialAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  social_id!: string;

  @Column({ length: 255 })
  access_token!: string;

  @Column({ length: 255 })
  provider!: string;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne(type => User, { cascade: true })
  @JoinColumn({ name: 'fk_user_id' })
  user!: User;

  @Column('uuid')
  fk_user_id!: string;
}
