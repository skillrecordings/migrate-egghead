#!/usr/bin/env bun
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  console.log("=== Finding tilde/dash slug collisions ===\n");

  // Find posts with ~hash pattern
  const [posts] = await conn.query(`
    SELECT 
      id,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug
    FROM egghead_ContentResource 
    WHERE type = 'post'
    AND JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) LIKE '%~%'
  `) as any;

  console.log(`Found ${posts.length} posts with ~hash slugs\n`);

  // For each post, check if there's a lesson with -hash instead
  let collisions = 0;
  const collisionList: any[] = [];

  for (const post of posts) {
    // Extract the hash (after ~)
    const match = post.slug.match(/~([a-z0-9]+)$/);
    if (!match) continue;
    
    const hash = match[1];
    const dashSlug = post.slug.replace(`~${hash}`, `-${hash}`);

    const [lessons] = await conn.query(`
      SELECT id, JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug
      FROM egghead_ContentResource 
      WHERE type = 'lesson'
      AND JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) = ?
    `, [dashSlug]) as any;

    if (lessons.length > 0) {
      collisions++;
      collisionList.push({
        postId: post.id,
        postSlug: post.slug,
        lessonId: lessons[0].id,
        lessonSlug: lessons[0].slug,
        hash,
      });
    }
  }

  console.log(`Found ${collisions} tilde/dash collisions:\n`);
  
  for (const c of collisionList.slice(0, 20)) {
    console.log(`Hash: ${c.hash}`);
    console.log(`  Post:   ${c.postId} - ${c.postSlug}`);
    console.log(`  Lesson: ${c.lessonId} - ${c.lessonSlug}`);
    console.log();
  }

  if (collisionList.length > 20) {
    console.log(`... and ${collisionList.length - 20} more`);
  }

  // Output lesson IDs for deletion
  if (collisionList.length > 0) {
    console.log("\n=== Lesson IDs to delete ===");
    console.log(collisionList.map(c => c.lessonId).join('\n'));
  }

  await conn.end();
}

main().catch(console.error);
