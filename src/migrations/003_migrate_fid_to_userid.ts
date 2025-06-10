import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Rename fid column to user_id in generated_images table
  await db.schema
    .alterTable("generated_images")
    .renameColumn("fid", "user_id")
    .execute();

  // Change user_id column type from integer to text to support both FIDs and wallet addresses
  await db.schema
    .alterTable("generated_images")
    .alterColumn("user_id", (col) => col.setDataType("text"))
    .execute();

  // Update the index name accordingly
  await db.schema.dropIndex("idx_generated_images_fid").ifExists().execute();

  await db.schema
    .createIndex("idx_generated_images_user_id")
    .on("generated_images")
    .column("user_id")
    .execute();

  // Add wallet_address column to users table
  await db.schema
    .alterTable("users")
    .addColumn("wallet_address", "text")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Revert generated_images table changes
  await db.schema
    .dropIndex("idx_generated_images_user_id")
    .ifExists()
    .execute();

  // Change user_id column type back to integer
  await db.schema
    .alterTable("generated_images")
    .alterColumn("user_id", (col) => col.setDataType("integer"))
    .execute();

  await db.schema
    .alterTable("generated_images")
    .renameColumn("user_id", "fid")
    .execute();

  await db.schema
    .createIndex("idx_generated_images_fid")
    .on("generated_images")
    .column("fid")
    .execute();

  // Revert users table changes
  await db.schema.alterTable("users").dropColumn("wallet_address").execute();
}
