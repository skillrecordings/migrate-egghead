#!/usr/bin/env bun
import mysql from "mysql2/promise";

const hash = process.argv[2] || 'fefi6';

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  console.log(`\n=== Checking records matching hash: ${hash} ===\n`);

  // Match the query pattern from get-post.ts
  const [rows] = await conn.query(`
    SELECT 
      id, 
      type, 
      currentVersionId,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.title')) as title,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.visibility')) as visibility
    FROM egghead_ContentResource 
    WHERE id LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) LIKE ?
    LIMIT 10
  `, [`%${hash}`, `%${hash}`]) as any;

  if (rows.length === 0) {
    console.log("No records found matching this hash");
  } else {
    console.log(`Found ${rows.length} record(s):\n`);
    for (const r of rows) {
      console.log(`ID: ${r.id}`);
      console.log(`Type: ${r.type}`);
      console.log(`Slug: ${r.slug}`);
      console.log(`Title: ${r.title}`);
      console.log(`currentVersionId: ${r.currentVersionId}`);
      console.log(`visibility: ${r.visibility}`);
      console.log();
    }
  }

  await conn.end();
}

main().catch(console.error);
