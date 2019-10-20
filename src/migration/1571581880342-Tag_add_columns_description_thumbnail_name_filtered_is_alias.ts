import { MigrationInterface, QueryRunner } from 'typeorm';

export class TagAddColumnsDescriptionThumbnailNameFilteredIsAlias1571581880342
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
       ALTER TABLE public.tags ADD description varchar(255) NULL;
       ALTER TABLE public.tags ADD thumbnail varchar(255) NULL;
       ALTER TABLE public.tags ADD name_filtered varchar(255) NULL;
       ALTER TABLE public.tags ADD is_alias bool NOT NULL DEFAULT false;`);

    await queryRunner.query('CREATE INDEX tags_name_filtered ON tags(name_filtered)');
    await queryRunner.query('CREATE INDEX tags_is_alias ON tags(is_alias)');
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`
    ALTER TABLE public.tags DROP description;
    ALTER TABLE public.tags DROP thumbnail;
    ALTER TABLE public.tags DROP name_filtered;
    ALTER TABLE public.tags DROP is_alias bool;`);

    await queryRunner.query('DROP INDEX tags_name_filtered');
    await queryRunner.query('DROP INDEX tags_is_alias');
  }
}
