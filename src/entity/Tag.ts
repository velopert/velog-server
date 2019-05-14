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

  static findByName(name: string) {
    const repo = getRepository(Tag);
    return repo
      .createQueryBuilder('tag')
      .where(
        `lower(tag.name) = lower(:name)
      OR lower(replace(tag.name, ' ', '-')) = lower(replace(:name, ' ', '-'))`,
        { name }
      )
      .getOne();
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
    await repo.save(freshTag);
    return freshTag;
  }
}

/*
 */
