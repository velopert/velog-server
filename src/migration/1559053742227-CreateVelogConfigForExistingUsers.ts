import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVelogConfigForExistingUsers1559053742227 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
INSERT INTO velog_configs (fk_user_id)
    SELECT id FROM users
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
DELETE FROM velog_configs
WHERE true`);
  }
}
