#!/usr/bin/env bun
import mysql from "mysql2/promise";

const slug = process.argv[2] || 'install-mock-service-worker-msw~fefi6';

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  console.log(`\n=== Checking slug: ${slug} ===\n`);

  const [rows] = await conn.query(`
    SELECT 
      id, 
      type, 
      currentVersionId,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.title')) as title,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.visibility')) as visibility,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.state')) as state
    FROM egghead_ContentResource 
    WHERE JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) = ?
  `, [slug]) as any;

  if (rows.length === 0) {
    console.log("No records found with this slug");
  } else {
    console.log(`Found ${rows.length} record(s):\n`);
    for (const r of rows) {
      console.log(`ID: ${r.id}`);
      console.log(`Type: ${r.type}`);
      console.log(`Title: ${r.title}`);
      console.log(`currentVersionId: ${r.currentVersionId}`);
      console.log(`visibility: ${r.visibility}`);
      console.log(`state: ${r.state}`);
      console.log();
    }
  }

  await conn.end();
}

main().catch(console.error);
