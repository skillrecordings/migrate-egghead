#!/usr/bin/env bun
/**
 * Validate backup branch is pre-migration
 * Usage: DATABASE_URL='...' bun scripts/validate-backup.ts
 */

import mysql from "mysql2/promise";

async function main() {
  const dbUrl =
    process.env.MIGRATION_PRE_DATABASE_URL || process.env.DATABASE_URL;
  const conn = await mysql.createConnection({
    uri: dbUrl,
    ssl: { rejectUnauthorized: true },
  });

  // Get counts by type
  const [typeCounts] = await conn.query(`
    SELECT type, COUNT(*) as count 
    FROM egghead_ContentResource 
    GROUP BY type 
    ORDER BY count DESC
  `);

  // Get lesson breakdown
  const [lessonBreakdown] = await conn.query(`
    SELECT 
      type,
      CASE 
        WHEN id LIKE 'post_%' THEN 'post_* ID'
        ELSE 'random ID'
      END as id_pattern,
      COUNT(*) as count
    FROM egghead_ContentResource 
    WHERE type IN ('lesson', 'post')
    GROUP BY type, id_pattern
    ORDER BY type, id_pattern
  `);

  // Check for duplicates (same slug, different types)
  const [duplicates] = (await conn.query(`
    SELECT COUNT(*) as duplicate_count
    FROM egghead_ContentResource a
    JOIN egghead_ContentResource b 
      ON JSON_UNQUOTE(JSON_EXTRACT(a.fields, '$.slug')) = JSON_UNQUOTE(JSON_EXTRACT(b.fields, '$.slug'))
    WHERE a.type = 'lesson' AND b.type = 'post'
  `)) as any;

  // Total records
  const [total] = (await conn.query(
    "SELECT COUNT(*) as total FROM egghead_ContentResource",
  )) as any;

  // Check for specific migrated content (git course lessons from Dec 13)
  const [gitLessons] = (await conn.query(`
    SELECT COUNT(*) as count
    FROM egghead_ContentResource 
    WHERE type = 'lesson' 
    AND JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) LIKE '%git%'
  `)) as any;

  console.log("=== BACKUP BRANCH VALIDATION ===");
  console.log("\nTotal records:", total[0].total);
  console.log("\nBy type:");
  console.table(typeCounts);
  console.log("\nLesson/Post breakdown by ID pattern:");
  console.table(lessonBreakdown);
  console.log(
    "\nDuplicate slug count (lesson+post same slug):",
    duplicates[0].duplicate_count,
  );
  console.log("\nGit-related lessons:", gitLessons[0].count);

  // Verdict
  console.log("\n=== VERDICT ===");
  if (total[0].total < 1000) {
    console.log("✅ This looks like PRE-MIGRATION (small dataset)");
  } else if (duplicates[0].duplicate_count > 200) {
    console.log("⚠️  This has DUPLICATES - might be mid-migration state");
  } else {
    console.log("❓ Need more investigation");
  }

  await conn.end();
}

main().catch(console.error);
