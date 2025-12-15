#!/usr/bin/env bun
/**
 * Check post_e58tr in both databases
 */
import mysql from "mysql2/promise";

async function checkDb(name: string, uri: string) {
  const conn = await mysql.createConnection({
    uri,
    ssl: { rejectUnauthorized: true },
  });

  console.log(`\n=== ${name} ===\n`);

  // Check by ID
  const [byId] = await conn.query(`
    SELECT id, type, currentVersionId, createdAt, updatedAt,
           JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug,
           JSON_UNQUOTE(JSON_EXTRACT(fields, '$.title')) as title
    FROM egghead_ContentResource 
    WHERE id = 'post_e58tr' OR id LIKE '%e58tr%'
  `) as any;

  if (byId.length === 0) {
    console.log("No record found with id containing 'e58tr'");
  } else {
    console.log("Found by ID:");
    for (const r of byId) {
      console.log(`  ID: ${r.id}`);
      console.log(`  Type: ${r.type}`);
      console.log(`  Slug: ${r.slug}`);
      console.log(`  Title: ${r.title}`);
      console.log(`  currentVersionId: ${r.currentVersionId}`);
      console.log(`  Created: ${r.createdAt}`);
      console.log(`  Updated: ${r.updatedAt}`);
      console.log();
    }
  }

  // Check by slug
  const [bySlug] = await conn.query(`
    SELECT id, type, currentVersionId,
           JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug,
           JSON_UNQUOTE(JSON_EXTRACT(fields, '$.title')) as title
    FROM egghead_ContentResource 
    WHERE JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) LIKE '%claude-code-tools%'
  `) as any;

  if (bySlug.length > 0) {
    console.log("Found by slug 'claude-code-tools':");
    for (const r of bySlug) {
      console.log(`  ID: ${r.id}, Type: ${r.type}, currentVersionId: ${r.currentVersionId}`);
      console.log(`  Slug: ${r.slug}`);
    }
  }

  await conn.end();
}

async function main() {
  await checkDb("PRE-MIGRATION (backup branch)", process.env.MIGRATION_PRE_DATABASE_URL!);
  await checkDb("PRODUCTION (main)", process.env.NEW_DATABASE_URL!);
}

main().catch(console.error);
