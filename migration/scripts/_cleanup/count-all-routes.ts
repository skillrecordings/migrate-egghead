#!/usr/bin/env bun
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  console.log("=== POTENTIAL ROUTE COUNTS ===\n");

  // Posts (type='post') - used by [post].tsx
  const [posts] = await conn.query(`
    SELECT COUNT(*) as count FROM egghead_ContentResource WHERE type = 'post'
  `) as any;
  console.log(`[post].tsx routes (type='post'): ${posts[0].count}`);

  // Lessons (type='lesson') - migrated content
  const [lessons] = await conn.query(`
    SELECT COUNT(*) as count FROM egghead_ContentResource WHERE type = 'lesson'
  `) as any;
  console.log(`Migrated lessons (type='lesson'): ${lessons[0].count}`);

  // Courses (type='course') - migrated content  
  const [courses] = await conn.query(`
    SELECT COUNT(*) as count FROM egghead_ContentResource WHERE type = 'course'
  `) as any;
  console.log(`Migrated courses (type='course'): ${courses[0].count}`);

  // Check if any route might be combining posts + lessons
  const [combined] = await conn.query(`
    SELECT COUNT(*) as count FROM egghead_ContentResource WHERE type IN ('post', 'lesson')
  `) as any;
  console.log(`\nPosts + Lessons combined: ${combined[0].count}`);

  // 369 + 369 = 738, close to 751
  // Maybe there's some overlap or additional records?
  const [postLessons] = await conn.query(`
    SELECT COUNT(*) as count FROM egghead_ContentResource 
    WHERE type = 'post' AND JSON_UNQUOTE(JSON_EXTRACT(fields, '$.postType')) = 'lesson'
  `) as any;
  console.log(`Posts with postType='lesson': ${postLessons[0].count}`);

  // Check unique slugs across post and lesson types
  const [uniqueSlugs] = await conn.query(`
    SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug'))) as count 
    FROM egghead_ContentResource 
    WHERE type IN ('post', 'lesson')
  `) as any;
  console.log(`Unique slugs across post+lesson: ${uniqueSlugs[0].count}`);

  await conn.end();
}

main().catch(console.error);
