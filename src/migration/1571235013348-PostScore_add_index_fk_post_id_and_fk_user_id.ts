import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostScoreAddIndexFkPostIdAndFkUserId1571235013348 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('CREATE INDEX post_scores_fk_user_id ON post_scores(fk_user_id)');
    await queryRunner.query('CREATE INDEX post_scores_fk_post_id ON post_scores(fk_post_id)');
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX post_scores_fk_user_id');
    await queryRunner.query('DROP INDEX post_scores_fk_post_id');
  }
}
