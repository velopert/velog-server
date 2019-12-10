import { MigrationInterface, QueryRunner } from 'typeorm';

export class TagDecreaseMaxLevel1575470948957 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `update comments as c 
            set reply_to = pc.reply_to,
                level = 2
            from comments as pc
            where c.level = 3
            and c.reply_to = pc.id`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {}
}
