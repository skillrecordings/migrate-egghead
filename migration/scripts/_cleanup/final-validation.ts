#!/usr/bin/env bun
/**
 * Final validation - checks for all known collision types
 */
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  console.log("=== FINAL VALIDATION ===\n");

  // Total by type
  const [types] = await conn.query(`
    SELECT type, COUNT(*) as count 
    FROM egghead_ContentResource 
    GROUP BY type 
    ORDER BY count DESC
  `) as any;
  console.log("Records by type:");
  console.table(types);

  // Check for duplicate slugs within same type
  const [courseDupes] = await conn.query(`
    SELECT COUNT(*) as count FROM (
      SELECT JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug
      FROM egghead_ContentResource WHERE type = 'course'
      GROUP BY slug HAVING COUNT(*) > 1
    ) t
  `) as any;

  const [lessonDupes] = await conn.query(`
    SELECT COUNT(*) as count FROM (
      SELECT JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug
      FROM egghead_ContentResource WHERE type = 'lesson'
      GROUP BY slug HAVING COUNT(*) > 1
    ) t
  `) as any;

  // Check for exact slug collisions between types
  const [coursePostCollisions] = await conn.query(`
    SELECT COUNT(*) as count
    FROM egghead_ContentResource a
    JOIN egghead_ContentResource b 
      ON JSON_UNQUOTE(JSON_EXTRACT(a.fields, '$.slug')) = JSON_UNQUOTE(JSON_EXTRACT(b.fields, '$.slug'))
    WHERE a.type = 'course' AND b.type = 'post'
  `) as any;

  const [lessonPostCollisions] = await conn.query(`
    SELECT COUNT(*) as count
    FROM egghead_ContentResource a
    JOIN egghead_ContentResource b 
      ON JSON_UNQUOTE(JSON_EXTRACT(a.fields, '$.slug')) = JSON_UNQUOTE(JSON_EXTRACT(b.fields, '$.slug'))
    WHERE a.type = 'lesson' AND b.type = 'post'
  `) as any;

  // Check for hash-based collisions (LIKE %hash matches)
  // Find posts with post_xxxxx IDs and check if lessons match the hash
  const [posts] = await conn.query(`
    SELECT id, JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug
    FROM egghead_ContentResource 
    WHERE type = 'post' AND id LIKE 'post_%'
  `) as any;

  let hashCollisions = 0;
  for (const post of posts) {
    const hash = post.id.replace('post_', '');
    const [lessons] = await conn.query(`
      SELECT COUNT(*) as count
      FROM egghead_ContentResource 
      WHERE type = 'lesson'
      AND (JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) LIKE ? 
           OR JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) LIKE ?)
    `, [`%-${hash}`, `%~${hash}`]) as any;
    hashCollisions += lessons[0].count;
  }

  console.log("\nDuplicate/Collision checks:");
  console.log(`  Duplicate course slugs:     ${courseDupes[0].count}`);
  console.log(`  Duplicate lesson slugs:     ${lessonDupes[0].count} (expected - same lesson in multiple courses)`);
  console.log(`  Course/Post collisions:     ${coursePostCollisions[0].count}`);
  console.log(`  Lesson/Post collisions:     ${lessonPostCollisions[0].count}`);
  console.log(`  Hash-based collisions:      ${hashCollisions} (LIKE %hash matches)`);

  const allClear = 
    courseDupes[0].count === 0 && 
    coursePostCollisions[0].count === 0 && 
    lessonPostCollisions[0].count === 0 &&
    hashCollisions === 0;

  console.log(`\n${allClear ? '✅ ALL CLEAR - No problematic duplicates!' : '⚠️  ISSUES FOUND - See above'}`);

  await conn.end();
}

main().catch(console.error);
