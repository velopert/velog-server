import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostScoreAddIndexCreatedAt1571150701449 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('CREATE INDEX post_scores_created_at ON post_scores(created_at)');
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX post_scores_created_at');
  }
}
