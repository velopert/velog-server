import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import User from './User';

@Entity('reports', {
  synchronize: false
})
export default class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 51 })
  type!: string;

  @Column('uuid')
  fk_user_id!: string;

  @ManyToOne(type => User, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_user_id' })
  user!: User;

  @Column('uuid')
  target_id!: string;

  @Column('text')
  body!: string;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;
}
