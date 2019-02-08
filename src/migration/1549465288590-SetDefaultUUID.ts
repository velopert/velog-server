import { MigrationInterface, QueryRunner } from 'typeorm';

const names = [
  'post_images',
  'email_cert',
  'email_auth',
  'post_likes',
  'post_scores',
  'feeds',
  'follow_tag',
  'follow_user',
  'post_reads',
  'tags',
  'categories',
  'social_accounts',
  'series',
  'url_slug_histories',
  'posts',
  'series_posts',
  'user_images',
  'posts_tags',
  'user_meta',
  'posts_categories',
  'post_histories',
  'user_thumbnails',
  'comments',
  'users',
  'user_profiles'
];

export class SetDefaultUUID1549465288590 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    for (let i = 0; i < names.length; i += 1) {
      await queryRunner.query(
        `ALTER TABLE public.${names[i]} ALTER COLUMN id SET DEFAULT uuid_generate_v4()`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    for (let i = 0; i < names.length; i += 1) {
      await queryRunner.query(`ALTER TABLE public.${names[i]} ALTER COLUMN id SET DEFAULT NULL`);
    }
  }
}
