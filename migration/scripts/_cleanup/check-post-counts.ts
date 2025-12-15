#!/usr/bin/env bun
import mysql from "mysql2/promise";

async function main() {
  // Check both databases
  const prodConn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  const backupConn = await mysql.createConnection({
    uri: process.env.MIGRATION_PRE_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  console.log("=== POST COUNTS ===\n");

  // Production
  const [prodPosts] = await prodConn.query(`
    SELECT 
      type,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.postType')) as postType,
      COUNT(*) as count
    FROM egghead_ContentResource 
    WHERE type = 'post'
    GROUP BY type, postType
  `) as any;

  console.log("PRODUCTION (current):");
  console.table(prodPosts);

  // Backup (pre-migration)
  const [backupPosts] = await backupConn.query(`
    SELECT 
      type,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.postType')) as postType,
      COUNT(*) as count
    FROM egghead_ContentResource 
    WHERE type = 'post'
    GROUP BY type, postType
  `) as any;

  console.log("\nBACKUP (pre-migration):");
  console.table(backupPosts);

  // Check what getAllPostSlugs would return
  const [allSlugs] = await prodConn.query(`
    SELECT COUNT(*) as count FROM egghead_ContentResource WHERE type = 'post'
  `) as any;

  console.log(`\ngetAllPostSlugs() would return: ${allSlugs[0].count} posts`);

  // Check if there are duplicate slugs among posts
  const [dupeSlugs] = await prodConn.query(`
    SELECT JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug, COUNT(*) as count
    FROM egghead_ContentResource 
    WHERE type = 'post'
    GROUP BY slug
    HAVING count > 1
  `) as any;

  console.log(`\nDuplicate post slugs: ${dupeSlugs.length}`);
  if (dupeSlugs.length > 0) {
    console.table(dupeSlugs.slice(0, 10));
  }

  await prodConn.end();
  await backupConn.end();
}

main().catch(console.error);
