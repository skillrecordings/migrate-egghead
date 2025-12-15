#!/usr/bin/env bun
/**
 * Delete courses that have the same slug as existing posts
 * (Posts are CB-published content, courses are migration-created duplicates)
 */
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  const dryRun = !process.argv.includes('--execute');

  // Find courses that duplicate post slugs
  const [toDelete] = await conn.query(`
    SELECT 
      c.id as course_id,
      p.id as post_id,
      JSON_UNQUOTE(JSON_EXTRACT(c.fields, '$.slug')) as slug,
      JSON_UNQUOTE(JSON_EXTRACT(c.fields, '$.title')) as title
    FROM egghead_ContentResource c
    JOIN egghead_ContentResource p 
      ON JSON_UNQUOTE(JSON_EXTRACT(c.fields, '$.slug')) = JSON_UNQUOTE(JSON_EXTRACT(p.fields, '$.slug'))
    WHERE c.type = 'course' AND p.type = 'post'
  `) as any;

  console.log(`=== ${dryRun ? 'DRY RUN' : 'EXECUTING'} ===\n`);
  console.log(`Found ${toDelete.length} courses that duplicate posts\n`);

  if (toDelete.length === 0) {
    console.log("Nothing to delete!");
    await conn.end();
    return;
  }

  if (dryRun) {
    console.log("Courses to delete (keeping posts):");
    for (const row of toDelete) {
      console.log(`  Course: ${row.course_id}`);
      console.log(`  Post:   ${row.post_id}`);
      console.log(`  Slug:   ${row.slug}`);
      console.log(`  Title:  ${row.title}`);
      console.log();
    }
    console.log(`Run with --execute to delete`);
  } else {
    const ids = toDelete.map((r: any) => r.course_id);
    const placeholders = ids.map(() => '?').join(',');
    await conn.query(
      `DELETE FROM egghead_ContentResource WHERE id IN (${placeholders})`,
      ids
    );
    console.log(`Deleted ${ids.length} duplicate courses`);
  }

  // Also check remaining lesson/post duplicates
  const [lessonDupes] = await conn.query(`
    SELECT COUNT(*) as count
    FROM egghead_ContentResource a
    JOIN egghead_ContentResource b 
      ON JSON_UNQUOTE(JSON_EXTRACT(a.fields, '$.slug')) = JSON_UNQUOTE(JSON_EXTRACT(b.fields, '$.slug'))
    WHERE a.type = 'lesson' AND b.type = 'post'
  `) as any;

  console.log(`\nRemaining lesson/post duplicates: ${lessonDupes[0].count}`);

  await conn.end();
}

main().catch(console.error);
