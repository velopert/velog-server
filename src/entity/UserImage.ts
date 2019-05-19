import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  Index
} from 'typeorm';
import User from './User';

@Entity('user_images', {
  synchronize: false
})
export default class UserImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(type => User, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_user_id' })
  user!: User;

  @Index()
  @Column('uuid')
  fk_user_id!: string;

  @Column({ length: 255 })
  path!: string;

  @Column()
  filesize!: number;

  @Column({ length: 255 })
  type!: string;

  @Column('uuid')
  ref_id!: string;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;
}
