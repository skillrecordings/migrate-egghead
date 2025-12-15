#!/usr/bin/env bun
import mysql from "mysql2/promise";

const slug = process.argv[2] || 'create-a-custom-type-based-of-an-object-with-typescript-keyof-operator';

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  // Simulate the get-post.ts query exactly
  // parseSlugForHash extracts hash after ~ or uses last segment
  const hashMatch = slug.match(/~([a-z0-9]+)$/);
  const hash = hashMatch ? hashMatch[1] : slug.split('-').pop();

  console.log(`\n=== Checking LIKE query for slug: ${slug} ===`);
  console.log(`Extracted hash: ${hash}\n`);

  const [rows] = await conn.query(`
    SELECT 
      id, 
      type, 
      currentVersionId,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.title')) as title
    FROM egghead_ContentResource 
    WHERE id = ? 
       OR JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) = ?
       OR id LIKE ?
       OR JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) LIKE ?
    LIMIT 10
  `, [slug, slug, `%${hash}`, `%${hash}`]) as any;

  console.log(`Found ${rows.length} record(s) matching LIKE %${hash}:\n`);
  
  for (const r of rows) {
    console.log(`ID: ${r.id}`);
    console.log(`Type: ${r.type}`);
    console.log(`Slug: ${r.slug}`);
    console.log(`currentVersionId: ${r.currentVersionId}`);
    console.log();
  }

  await conn.end();
}

main().catch(console.error);
