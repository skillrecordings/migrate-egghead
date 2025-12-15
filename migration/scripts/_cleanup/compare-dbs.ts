#!/usr/bin/env bun
/**
 * Compare backup branch vs production
 */

import mysql from "mysql2/promise";

async function queryDb(name: string, uri: string) {
  const conn = await mysql.createConnection({
    uri,
    ssl: { rejectUnauthorized: true },
  });

  const [typeCounts] = await conn.query(`
    SELECT type, COUNT(*) as count 
    FROM egghead_ContentResource 
    GROUP BY type 
    ORDER BY count DESC
  `) as any;

  const [total] = await conn.query(
    "SELECT COUNT(*) as total FROM egghead_ContentResource"
  ) as any;

  const [duplicates] = await conn.query(`
    SELECT COUNT(*) as duplicate_count
    FROM egghead_ContentResource a
    JOIN egghead_ContentResource b 
      ON JSON_UNQUOTE(JSON_EXTRACT(a.fields, '$.slug')) = JSON_UNQUOTE(JSON_EXTRACT(b.fields, '$.slug'))
    WHERE a.type = 'lesson' AND b.type = 'post'
  `) as any;

  await conn.end();

  return {
    name,
    total: total[0].total,
    types: typeCounts,
    duplicates: duplicates[0].duplicate_count,
  };
}

async function main() {
  const backup = await queryDb(
    "BACKUP (pre-migration branch)",
    process.env.MIGRATION_PRE_DATABASE_URL!
  );
  
  const prod = await queryDb(
    "PRODUCTION (main)",
    process.env.NEW_DATABASE_URL!
  );

  console.log("=== DATABASE COMPARISON ===\n");
  
  console.log(`${backup.name}:`);
  console.log(`  Total records: ${backup.total}`);
  console.log(`  Duplicates: ${backup.duplicates}`);
  console.table(backup.types);

  console.log(`\n${prod.name}:`);
  console.log(`  Total records: ${prod.total}`);
  console.log(`  Duplicates: ${prod.duplicates}`);
  console.table(prod.types);

  console.log("\n=== DELTA ===");
  console.log(`Records added: ${prod.total - backup.total}`);
  console.log(`Duplicates change: ${backup.duplicates} → ${prod.duplicates}`);
  
  // Find type differences
  const backupTypes = Object.fromEntries(backup.types.map((t: any) => [t.type, t.count]));
  const prodTypes = Object.fromEntries(prod.types.map((t: any) => [t.type, t.count]));
  
  console.log("\nBy type changes:");
  const allTypes = new Set([...Object.keys(backupTypes), ...Object.keys(prodTypes)]);
  for (const type of allTypes) {
    const b = backupTypes[type] || 0;
    const p = prodTypes[type] || 0;
    if (b !== p) {
      console.log(`  ${type}: ${b} → ${p} (${p - b > 0 ? '+' : ''}${p - b})`);
    }
  }
}

main().catch(console.error);
