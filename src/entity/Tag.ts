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
import { escapeForUrl } from '../lib/utils';

@Entity('tags', {
  synchronize: false
})
export default class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 255 })
  name!: string;

  @Column('timestampz')
  @CreateDateColumn()
  created_at!: Date;

  @Column('timestamptz')
  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ length: 255, nullable: true, type: 'varchar' })
  description!: string | null;

  @Column({ length: 255, nullable: true, type: 'varchar' })
  thumbnail!: string | null;

  @Index()
  @Column({ length: 255 })
  name_filtered!: string;

  @Index()
  @Column({ default: false })
  is_alias!: boolean;

  static findByName(name: string) {
    const repo = getRepository(Tag);
    return repo.findOne({
      name_filtered: escapeForUrl(name)
    });
  }

  /**
   * Retrieves tag information
   * Creates new one if it does not exist
   * @param name tag name
   */
  static async findOrCreate(name: string) {
    const tag = await Tag.findByName(name);
    if (tag) {
      return tag;
    }
    const repo = getRepository(Tag);
    const freshTag = new Tag();
    freshTag.name = name;
    freshTag.name_filtered = escapeForUrl(name);
    await repo.save(freshTag);
    return freshTag;
  }
}
