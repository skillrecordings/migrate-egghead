#!/usr/bin/env bun
/**
 * Migrate tags from Rails PostgreSQL to Coursebuilder MySQL
 *
 * Steps:
 * 1. Query all tags from Rails (627 records)
 * 2. Map to Coursebuilder schema
 * 3. Insert into MySQL Tag table with idempotency
 * 4. Create _migration_tag_map entries for legacy lookups
 *
 * Idempotency:
 * - Tags are identified by fields.legacyId in the JSON
 * - Use INSERT ... ON DUPLICATE KEY UPDATE for upserts
 *
 * Usage:
 *   bun scripts/migrate-tags.ts              # Dry run
 *   bun scripts/migrate-tags.ts --execute    # Execute migration
 *   bun scripts/migrate-tags.ts --org=org_xyz --execute  # With org ID
 *   bun scripts/migrate-tags.ts --stream --execute  # With event emission
 */

import { closeAll, getMysqlDb, railsDb } from "../src/lib/db";
import { createTagMapping, mapTag, type RailsTag } from "../src/lib/tag-mapper";
import { MigrationStreamWriter } from "../src/lib/migration-stream";
import { createEvent } from "../src/lib/event-types";

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const ORG_ID = args.find((a) => a.startsWith("--org="))?.split("=")[1];
const ENABLE_STREAM = args.includes("--stream");
const STREAM_ID = process.env.MIGRATION_RUN_ID || `tags-${Date.now()}`;

// Initialize stream writer if --stream flag is present
const writer = ENABLE_STREAM ? new MigrationStreamWriter() : null;

async function main() {
  console.log("🏷️  Tag Migration: Rails → Coursebuilder\n");

  const mysqlDb = await getMysqlDb();

  // Step 1: Query all tags from Rails
  console.log("📋 Step 1: Query tags from Rails PostgreSQL...");

  // Check if image_url column exists (production) or image_file_name (Docker/test)
  const [colCheck] = await railsDb`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'tags' AND column_name = 'image_url'
  `;
  const hasImageUrl = !!colCheck;

  // Query with appropriate image column
  const railsTags = hasImageUrl
    ? await railsDb<RailsTag[]>`
        SELECT
          id,
          name,
          slug,
          label,
          description,
          image_url as "imageUrl",
          context,
          popularity_order as "popularityOrder",
          taggings_count as "taggingsCount",
          updated_at as "updatedAt"
        FROM tags
        ORDER BY id
      `
    : await railsDb<RailsTag[]>`
        SELECT
          id,
          name,
          slug,
          label,
          description,
          image_file_name as "imageUrl",
          context,
          popularity_order as "popularityOrder",
          taggings_count as "taggingsCount",
          updated_at as "updatedAt"
        FROM tags
        ORDER BY id
      `;
  console.log(
    `   Found: ${railsTags.length} tags (image column: ${hasImageUrl ? "image_url" : "image_file_name"})\n`,
  );

  // Emit start event
  if (writer) {
    try {
      await writer.createStream({ streamId: STREAM_ID });
      await writer.appendEvent(
        STREAM_ID,
        createEvent("start", { entity: "tags", total: railsTags.length }),
      );
    } catch (err) {
      console.warn("⚠️  Failed to emit start event:", err);
    }
  }

  if (railsTags.length === 0) {
    console.log("   ℹ️  No tags to migrate");
    await closeAll();
    return;
  }

  // Step 2: Map to Coursebuilder format
  console.log("📋 Step 2: Map to Coursebuilder schema...");
  const mappedTags = railsTags.map((tag) =>
    mapTag(tag, { organizationId: ORG_ID }),
  );
  const tagMappings = railsTags.map((railsTag, i) => {
    const mapped = mappedTags[i];
    if (!mapped) throw new Error(`Missing mapped tag at index ${i}`);
    return createTagMapping(railsTag, mapped);
  });
  console.log(`   Mapped: ${mappedTags.length} tags\n`);

  // Step 3: Show preview
  console.log("📋 Step 3: Preview (first 3 tags)...");
  for (const tag of mappedTags.slice(0, 3)) {
    console.log(`   ${tag.fields.name} (${tag.fields.slug})`);
    console.log(`     Legacy ID: ${tag.fields.legacyId} → New ID: ${tag.id}`);
    console.log(`     Type: ${tag.type}`);
    if (tag.fields.description) {
      const preview =
        tag.fields.description.length > 60
          ? `${tag.fields.description.slice(0, 60)}...`
          : tag.fields.description;
      console.log(`     Description: ${preview}`);
    }
  }
  console.log("");

  if (DRY_RUN) {
    console.log("🔍 DRY RUN - No changes made");
    console.log("   Run with --execute to perform migration");
    await closeAll();
    return;
  }

  // Step 4: Create Tag table if not exists
  console.log("📋 Step 4: Ensure Tag table exists...");
  await mysqlDb.execute(`
    CREATE TABLE IF NOT EXISTS Tag (
      id VARCHAR(255) PRIMARY KEY,
      type VARCHAR(255) NOT NULL,
      organizationId VARCHAR(191),
      fields JSON,
      createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
      deletedAt TIMESTAMP(3),
      INDEX type_idx (type),
      INDEX organizationId_idx (organizationId)
    )
  `);
  console.log("   ✅ Table ready\n");

  // Step 5: Create migration_tag_map table if not exists
  console.log("📋 Step 5: Ensure _migration_tag_map table exists...");
  await mysqlDb.execute(`
    CREATE TABLE IF NOT EXISTS _migration_tag_map (
      legacy_id INT PRIMARY KEY,
      new_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_new_id (new_id)
    )
  `);
  console.log("   ✅ Table ready\n");

  // Step 6: Insert tags
  console.log("📋 Step 6: Insert tags into Coursebuilder MySQL...");
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < mappedTags.length; i++) {
    const tag = mappedTags[i];
    const railsTag = railsTags[i];
    if (!railsTag) continue;

    try {
      // Check if tag already exists (by legacy ID in fields)
      const [existingRows] = await mysqlDb.execute(
        "SELECT id FROM Tag WHERE JSON_EXTRACT(fields, '$.legacyId') = ?",
        [tag.fields.legacyId],
      );

      const existing = Array.isArray(existingRows) ? existingRows : [];

      if (existing.length > 0) {
        // Update existing tag
        const existingTag = existing[0] as { id: string };
        await mysqlDb.execute(
          `UPDATE Tag SET
            type = ?,
            organizationId = ?,
            fields = ?,
            updatedAt = ?
          WHERE id = ?`,
          [
            tag.type,
            tag.organizationId,
            JSON.stringify(tag.fields),
            tag.updatedAt,
            existingTag.id,
          ],
        );
        updated++;

        // Emit success event
        if (writer && (i + 1) % 10 === 0) {
          try {
            await writer.appendEvent(
              STREAM_ID,
              createEvent("success", {
                entity: "tags",
                legacyId: railsTag.id,
                newId: existingTag.id,
              }),
            );
          } catch (err) {
            console.warn("⚠️  Failed to emit success event:", err);
          }
        }
      } else {
        // Insert new tag
        await mysqlDb.execute(
          `INSERT INTO Tag (id, type, organizationId, fields, createdAt, updatedAt, deletedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            tag.id,
            tag.type,
            tag.organizationId,
            JSON.stringify(tag.fields),
            tag.createdAt,
            tag.updatedAt,
            tag.deletedAt,
          ],
        );
        inserted++;

        // Emit success event
        if (writer && (i + 1) % 10 === 0) {
          try {
            await writer.appendEvent(
              STREAM_ID,
              createEvent("success", {
                entity: "tags",
                legacyId: railsTag.id,
                newId: tag.id,
              }),
            );
          } catch (err) {
            console.warn("⚠️  Failed to emit success event:", err);
          }
        }
      }

      // Emit progress event every 10 records
      if (writer && (i + 1) % 10 === 0) {
        try {
          await writer.appendEvent(
            STREAM_ID,
            createEvent("progress", {
              entity: "tags",
              current: i + 1,
              total: mappedTags.length,
            }),
          );
        } catch (err) {
          console.warn("⚠️  Failed to emit progress event:", err);
        }
      }
    } catch (err) {
      errors++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ Error migrating tag ${railsTag.id}:`, errorMsg);

      // Emit error event
      if (writer) {
        try {
          await writer.appendEvent(
            STREAM_ID,
            createEvent("error", {
              entity: "tags",
              legacyId: railsTag.id,
              error: errorMsg,
            }),
          );
        } catch (streamErr) {
          console.warn("⚠️  Failed to emit error event:", streamErr);
        }
      }
    }
  }

  console.log(`   Inserted: ${inserted} new tags`);
  console.log(`   Updated: ${updated} existing tags\n`);

  // Step 7: Insert tag mappings
  console.log("📋 Step 7: Insert tag ID mappings...");
  let mappingsInserted = 0;

  for (const mapping of tagMappings) {
    const railsTag = railsTags.find((t) => t.id === mapping.legacyId);
    // Use INSERT ... ON DUPLICATE KEY UPDATE for idempotency
    // Column names: rails_id, cb_id, rails_name, rails_slug (from create-mapping-tables.ts)
    await mysqlDb.execute(
      `INSERT INTO _migration_tag_map (rails_id, cb_id, rails_name, rails_slug)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE cb_id = VALUES(cb_id), rails_name = VALUES(rails_name), rails_slug = VALUES(rails_slug)`,
      [mapping.legacyId, mapping.newId, railsTag?.name, railsTag?.slug],
    );
    mappingsInserted++;
  }

  console.log(`   Mappings: ${mappingsInserted} entries\n`);

  // Step 8: Verify
  console.log("📋 Step 8: Verify migration...");
  const [tagCountResult] = await mysqlDb.execute(
    "SELECT COUNT(*) as count FROM Tag",
  );
  const [mapCountResult] = await mysqlDb.execute(
    "SELECT COUNT(*) as count FROM _migration_tag_map",
  );

  const tagCount = Array.isArray(tagCountResult) ? tagCountResult[0] : null;
  const mapCount = Array.isArray(mapCountResult) ? mapCountResult[0] : null;

  if (tagCount && "count" in tagCount) {
    console.log(`   Tags in Coursebuilder: ${tagCount.count}`);
  }
  if (mapCount && "count" in mapCount) {
    console.log(`   Mappings in map table: ${mapCount.count}`);
  }

  // Sample check - verify legacy IDs are preserved
  const [sampleRows] = await mysqlDb.execute(
    `SELECT id, type, fields
    FROM Tag
    WHERE JSON_EXTRACT(fields, '$.legacyId') IS NOT NULL
    LIMIT 3`,
  );

  const sample = Array.isArray(sampleRows) ? sampleRows : [];
  console.log(`   Sample tags with legacy IDs: ${sample.length}`);
  for (const s of sample) {
    const row = s as { id: string; type: string; fields: string | object };
    const fields =
      typeof row.fields === "string" ? JSON.parse(row.fields) : row.fields;
    console.log(
      `     ${fields.name} (legacy: ${fields.legacyId}, new: ${row.id})`,
    );
  }

  // Emit complete event
  if (writer) {
    try {
      const duration = Date.now() - startTime;
      await writer.appendEvent(
        STREAM_ID,
        createEvent("complete", {
          entity: "tags",
          migrated: inserted + updated,
          failed: errors,
          duration,
        }),
      );
    } catch (err) {
      console.warn("⚠️  Failed to emit complete event:", err);
    }
  }

  await closeAll();

  console.log("\n✨ Tag migration complete!");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
