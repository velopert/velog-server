import { MigrationInterface, QueryRunner } from 'typeorm';

export class TagBulkUpdateNameFiltered1571582514190 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `UPDATE tags SET name_filtered = lower(replace(name, ' ', '-')) WHERE true`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {}
}
