import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import User from './User';

@Entity('user_images_cloudflare', {
  synchronize: true,
})
export default class UserImageCloudflare {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(type => User, user => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fk_user_id' })
  user!: User;

  @Index()
  @Column('uuid')
  fk_user_id!: string;

  @Column({ length: 255 })
  filename!: string;

  @Column()
  filesize!: number;

  @Column({ length: 255 })
  type!: string;

  @Index()
  @Column('uuid', { nullable: true })
  ref_id!: string | null;

  @Index()
  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  @Index()
  @Column({ length: 64 })
  result_id!: string;

  @Index()
  @Column()
  tracked!: boolean;
}
