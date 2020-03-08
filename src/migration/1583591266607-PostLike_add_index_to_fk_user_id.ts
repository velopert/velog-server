import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostLikeAddIndexToFkUserId1583591266607 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('CREATE INDEX post_likes_created_at ON post_likes(created_at)');
    await queryRunner.query('CREATE INDEX post_likes_fk_user_id ON post_likes(fk_user_id)');
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX post_likes_created_at');
    await queryRunner.query('DROP INDEX post_likes_fk_user_id');
  }
}
