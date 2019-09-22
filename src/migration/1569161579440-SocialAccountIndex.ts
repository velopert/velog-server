import { MigrationInterface, QueryRunner } from 'typeorm';

export class SocialAccountIndex1569161579440 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      'CREATE INDEX social_accounts_provider_social_id ON social_accounts (provider, social_id)'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX social_accounts_provider_social_id');
  }
}
