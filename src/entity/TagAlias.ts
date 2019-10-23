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
import Tag from './Tag';

/** Created with TypeORM  **/
@Entity('tag_alias', {
  synchronize: true
})
export default class TagAlias {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 255 })
  name!: string;

  @Index()
  @Column({ length: 255 })
  name_filtered!: string;

  @Index()
  @Column('uuid')
  fk_tag_id!: string;

  @Index()
  @Column('uuid')
  fk_alias_tag_id!: string;

  @ManyToOne(type => Tag, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_tag_id' })
  tag!: Tag;

  @ManyToOne(type => Tag, { cascade: true, eager: true })
  @JoinColumn({ name: 'fk_tag_id' })
  aliasTag!: Tag;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;
}
