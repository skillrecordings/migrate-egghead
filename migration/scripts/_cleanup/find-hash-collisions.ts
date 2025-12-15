#!/usr/bin/env bun
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  console.log("=== Finding ALL hash-based collisions ===\n");
  console.log("These are lessons that would match posts via LIKE %hash query\n");

  // Find posts with ~hash or post_hash pattern
  const [posts] = await conn.query(`
    SELECT 
      id,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug
    FROM egghead_ContentResource 
    WHERE type = 'post'
    AND id LIKE 'post_%'
  `) as any;

  console.log(`Checking ${posts.length} CB-published posts...\n`);

  const collisions: any[] = [];

  for (const post of posts) {
    // Extract hash from post ID (post_xxxxx -> xxxxx)
    const hash = post.id.replace('post_', '');
    
    // Find any lesson whose slug ends with this hash (dash or tilde)
    const [lessons] = await conn.query(`
      SELECT id, type, JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug, currentVersionId
      FROM egghead_ContentResource 
      WHERE type = 'lesson'
      AND (JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) LIKE ? 
           OR JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) LIKE ?)
    `, [`%-${hash}`, `%~${hash}`]) as any;

    if (lessons.length > 0) {
      for (const lesson of lessons) {
        collisions.push({
          hash,
          postId: post.id,
          postSlug: post.slug,
          lessonId: lesson.id,
          lessonSlug: lesson.slug,
        });
      }
    }
  }

  console.log(`Found ${collisions.length} hash-based collisions:\n`);
  
  for (const c of collisions.slice(0, 30)) {
    console.log(`Hash: ${c.hash}`);
    console.log(`  Post:   ${c.postId} - ${c.postSlug}`);
    console.log(`  Lesson: ${c.lessonId} - ${c.lessonSlug}`);
    console.log();
  }

  if (collisions.length > 30) {
    console.log(`... and ${collisions.length - 30} more\n`);
  }

  // Output lesson IDs for deletion
  if (collisions.length > 0) {
    console.log("\n=== Lesson IDs to delete ===");
    const ids = collisions.map(c => c.lessonId);
    console.log(`Total: ${ids.length}`);
    console.log(ids.slice(0, 10).join('\n'));
    if (ids.length > 10) console.log(`... and ${ids.length - 10} more`);
  }

  await conn.end();
}

main().catch(console.error);
