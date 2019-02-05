import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  UpdateDateColumn,
  CreateDateColumn
} from 'typeorm';

@Entity('email_auth', {
  synchronize: false
})
export default class EmailAuth {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 255 })
  code!: string;

  @Column({ length: 255 })
  email!: string;

  @Column({ default: false })
  logged!: boolean;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;
}
