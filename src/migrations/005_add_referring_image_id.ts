import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Add referring_image_id column to generated_images table
  await db.schema
    .alterTable("generated_images")
    .addColumn("referring_image_id", "uuid")
    .execute();

  // Add foreign key constraint to ensure referring_image_id references a valid image
  await db.schema
    .alterTable("generated_images")
    .addForeignKeyConstraint(
      "fk_generated_images_referring_image_id",
      ["referring_image_id"],
      "generated_images",
      ["id"]
    )
    .execute();

  // Add index for better query performance
  await db.schema
    .createIndex("idx_generated_images_referring_image_id")
    .on("generated_images")
    .column("referring_image_id")
    .execute();

  // Add index for prompt column for better search performance
  await db.schema
    .createIndex("idx_generated_images_prompt_text")
    .on("generated_images")
    .column("prompt_text")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the indexes
  await db.schema
    .dropIndex("idx_generated_images_prompt_text")
    .ifExists()
    .execute();

  await db.schema
    .dropIndex("idx_generated_images_referring_image_id")
    .ifExists()
    .execute();

  // Drop the foreign key constraint
  await db.schema
    .alterTable("generated_images")
    .dropConstraint("fk_generated_images_referring_image_id")
    .execute();

  // Drop the column
  await db.schema
    .alterTable("generated_images")
    .dropColumn("referring_image_id")
    .execute();
}
