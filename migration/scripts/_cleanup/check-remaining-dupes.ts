#!/usr/bin/env bun
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  const [dupes] = await conn.query(`
    SELECT 
      a.id as lesson_id,
      a.type as lesson_type,
      b.id as post_id,
      b.type as post_type,
      JSON_UNQUOTE(JSON_EXTRACT(a.fields, '$.slug')) as slug,
      JSON_UNQUOTE(JSON_EXTRACT(a.fields, '$.title')) as lesson_title,
      JSON_UNQUOTE(JSON_EXTRACT(b.fields, '$.title')) as post_title
    FROM egghead_ContentResource a
    JOIN egghead_ContentResource b 
      ON JSON_UNQUOTE(JSON_EXTRACT(a.fields, '$.slug')) = JSON_UNQUOTE(JSON_EXTRACT(b.fields, '$.slug'))
    WHERE a.type = 'lesson' AND b.type = 'post'
  `) as any;

  console.log("=== REMAINING DUPLICATES IN PRODUCTION ===\n");
  console.log(`Found ${dupes.length} duplicate pairs:\n`);
  
  for (const d of dupes) {
    console.log(`Slug: ${d.slug}`);
    console.log(`  Lesson: ${d.lesson_id} - "${d.lesson_title}"`);
    console.log(`  Post:   ${d.post_id} - "${d.post_title}"`);
    console.log();
  }

  await conn.end();
}

main().catch(console.error);
