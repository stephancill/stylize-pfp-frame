import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "varchar", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("fid", "integer", (col) => col.notNull().unique())
    .addColumn("created_at", "timestamp", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("notification_url", "varchar")
    .addColumn("notification_token", "varchar")
    .execute();

  await db.schema
    .createTable("user_session")
    .addColumn("id", "varchar", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_users_fid")
    .on("users")
    .column("fid")
    .execute();

  await db.schema
    .createIndex("idx_users_notification")
    .on("users")
    .columns(["notification_url", "notification_token"])
    .where("notification_url", "is not", null)
    .where("notification_token", "is not", null)
    .execute();

  await db.schema
    .createIndex("idx_user_session_user")
    .on("user_session")
    .column("user_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("idx_users_fid").execute();
  await db.schema.dropIndex("idx_users_notification").execute();
  await db.schema.dropIndex("idx_user_session_user").execute();

  await db.schema.dropTable("user_session").execute();
  await db.schema.dropTable("users").execute();
}
