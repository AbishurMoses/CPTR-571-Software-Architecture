import { Migration } from '@mikro-orm/migrations';

export class Migration20260429144044 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "users" add column "highscore" int not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "users" drop column "highscore";`);
  }

}
