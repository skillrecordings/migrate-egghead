#!/usr/bin/env bun
/**
 * Delete the 3 remaining duplicate lessons
 */
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  const lessonIds = [
    'lb1z8401u7vxc900upn3s8mx',
    'wa1pg2sl6f8lud3x835utr02', 
    'x5aqf70otckmry0dfixgb9a6'
  ];

  const dryRun = !process.argv.includes('--execute');

  if (dryRun) {
    console.log("=== DRY RUN (pass --execute to delete) ===\n");
    console.log("Would delete these lesson records:");
    for (const id of lessonIds) {
      console.log(`  - ${id}`);
    }
  } else {
    console.log("=== EXECUTING DELETION ===\n");
    for (const id of lessonIds) {
      await conn.query('DELETE FROM egghead_ContentResource WHERE id = ?', [id]);
      console.log(`Deleted: ${id}`);
    }
    console.log("\nDone! Deleted 3 duplicate lessons.");
  }

  // Verify
  const [remaining] = await conn.query(`
    SELECT COUNT(*) as count
    FROM egghead_ContentResource a
    JOIN egghead_ContentResource b 
      ON JSON_UNQUOTE(JSON_EXTRACT(a.fields, '$.slug')) = JSON_UNQUOTE(JSON_EXTRACT(b.fields, '$.slug'))
    WHERE a.type = 'lesson' AND b.type = 'post'
  `) as any;

  console.log(`\nRemaining duplicates: ${remaining[0].count}`);

  await conn.end();
}

main().catch(console.error);
