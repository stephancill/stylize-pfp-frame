import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Change user_id column type from integer to text to support both FIDs and wallet addresses
  await db.schema
    .alterTable("generated_images")
    .alterColumn("user_id", (col) => col.setDataType("text"))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Change user_id column type back to integer
  await db.schema
    .alterTable("generated_images")
    .alterColumn("user_id", (col) => col.setDataType("integer"))
    .execute();
}
