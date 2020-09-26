import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostReadMigration1601134715255 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('CREATE INDEX post_reads_fk_post_id ON post_reads(fk_post_id)');
    await queryRunner.query('CREATE INDEX post_reads_fk_user_id ON post_reads(fk_user_id)');
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX post_reads_fk_post_id');
    await queryRunner.query('DROP INDEX post_reads_fk_user_id');
  }
}
