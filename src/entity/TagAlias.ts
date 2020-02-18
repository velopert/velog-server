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
import Tag from './Tag';
import { escapeForUrl } from '../lib/utils';

/** Created with TypeORM  **/
@Entity('tag_alias', {
  synchronize: true
})
export default class TagAlias {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  fk_tag_id!: string;

  @Index()
  @Column('uuid')
  fk_alias_tag_id!: string;

  @ManyToOne(type => Tag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fk_tag_id' })
  tag!: Tag;

  @ManyToOne(type => Tag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fk_alias_tag_id' })
  aliasTag!: Tag;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  static async getOriginTag(name: string) {
    const tagRepo = getRepository(Tag);
    const nameFiltered = escapeForUrl(name).toLowerCase();
    const tag = await tagRepo.findOne({
      where: {
        name_filtered: nameFiltered
      }
    });
    if (!tag) return undefined;
    if (tag.is_alias) {
      const tagAliasRepo = getRepository(TagAlias);
      const alias = await tagAliasRepo.findOne({
        where: {
          fk_tag_id: tag.id
        }
      });
      if (!alias) return undefined;
      return tagRepo.findOne(alias.fk_alias_tag_id);
    }
    return tag;
  }
}
