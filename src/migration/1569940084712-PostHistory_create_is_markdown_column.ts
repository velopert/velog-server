import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostHistoryCreateIsMarkdownColumn1569940084712 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      'ALTER TABLE post_histories ADD is_markdown BOOLEAN NOT NULL DEFAULT false'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE post_histories DROP COLUMN is_markdown');
  }
}
