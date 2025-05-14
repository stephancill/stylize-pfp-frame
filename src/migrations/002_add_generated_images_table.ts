import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("generated_images")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("fid", "integer", (col) => col.notNull()) // Using fid directly as the user identifier
    .addColumn("quote_id", "text", (col) => col.notNull().unique())
    .addColumn("status", "text", (col) =>
      col.notNull().defaultTo("pending_payment")
    )
    .addColumn("transaction_hash", "text") // Can be null until payment is submitted
    .addColumn("image_data_url", "text") // For base64 data URL, initially null
    .addColumn("prompt_text", "text") // Store the prompt used
    .addColumn("user_pfp_url", "text") // Added column for user PFP URL
    .addColumn("created_at", "timestamp", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  await db.schema
    .createIndex("idx_generated_images_fid") // Renamed index for fid
    .on("generated_images")
    .column("fid")
    .execute();

  await db.schema
    .createIndex("idx_generated_images_quote_id")
    .on("generated_images")
    .column("quote_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("idx_generated_images_fid").ifExists().execute(); // Adjusted to new fid index name
  await db.schema
    .dropIndex("idx_generated_images_quote_id")
    .ifExists()
    .execute();
  await db.schema.dropTable("generated_images").ifExists().execute();
}
