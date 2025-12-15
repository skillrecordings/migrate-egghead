#!/usr/bin/env bun
/**
 * Check for null currentVersionId across all types
 */
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  // Count null currentVersionId by type
  const [nullVersions] = await conn.query(`
    SELECT type, COUNT(*) as count
    FROM egghead_ContentResource 
    WHERE currentVersionId IS NULL
    GROUP BY type
    ORDER BY count DESC
  `) as any;

  console.log("=== RECORDS WITH NULL currentVersionId ===\n");
  console.table(nullVersions);

  // Check for course/post slug collisions
  const [coursePostCollisions] = await conn.query(`
    SELECT 
      a.id as course_id,
      b.id as post_id,
      JSON_UNQUOTE(JSON_EXTRACT(a.fields, '$.slug')) as slug,
      a.currentVersionId as course_version,
      b.currentVersionId as post_version
    FROM egghead_ContentResource a
    JOIN egghead_ContentResource b 
      ON JSON_UNQUOTE(JSON_EXTRACT(a.fields, '$.slug')) = JSON_UNQUOTE(JSON_EXTRACT(b.fields, '$.slug'))
    WHERE a.type = 'course' AND b.type = 'post'
  `) as any;

  console.log(`\n=== COURSE/POST SLUG COLLISIONS: ${coursePostCollisions.length} ===\n`);
  if (coursePostCollisions.length > 0) {
    for (const c of coursePostCollisions.slice(0, 10)) {
      console.log(`Slug: ${c.slug}`);
      console.log(`  Course: ${c.course_id} (version: ${c.course_version})`);
      console.log(`  Post: ${c.post_id} (version: ${c.post_version})`);
      console.log();
    }
    if (coursePostCollisions.length > 10) {
      console.log(`... and ${coursePostCollisions.length - 10} more`);
    }
  }

  // Check for duplicate courses (same slug, both type=course)
  const [dupeCourses] = await conn.query(`
    SELECT 
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug,
      COUNT(*) as count
    FROM egghead_ContentResource 
    WHERE type = 'course'
    GROUP BY slug
    HAVING count > 1
  `) as any;

  console.log(`\n=== DUPLICATE COURSE SLUGS: ${dupeCourses.length} ===\n`);
  if (dupeCourses.length > 0) {
    console.table(dupeCourses.slice(0, 10));
  }

  await conn.end();
}

main().catch(console.error);
