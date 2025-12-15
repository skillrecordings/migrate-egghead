#!/usr/bin/env bun
/**
 * Delete duplicate courses (keep one per slug)
 * 
 * Problem: Migration ran twice, creating 874 courses when we should have 436
 * Solution: For each slug with duplicates, keep the one with the "smallest" ID (arbitrary but consistent)
 */
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  const dryRun = !process.argv.includes('--execute');

  // Find all duplicate course IDs to delete (keep MIN(id) for each slug)
  const [toDelete] = await conn.query(`
    SELECT c.id, JSON_UNQUOTE(JSON_EXTRACT(c.fields, '$.slug')) as slug
    FROM egghead_ContentResource c
    WHERE c.type = 'course'
    AND c.id NOT IN (
      SELECT MIN(id)
      FROM egghead_ContentResource
      WHERE type = 'course'
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug'))
    )
  `) as any;

  console.log(`=== ${dryRun ? 'DRY RUN' : 'EXECUTING'} ===\n`);
  console.log(`Found ${toDelete.length} duplicate courses to delete\n`);

  if (dryRun) {
    console.log("Sample of courses to delete (first 10):");
    for (const row of toDelete.slice(0, 10)) {
      console.log(`  ${row.id} - ${row.slug}`);
    }
    if (toDelete.length > 10) {
      console.log(`  ... and ${toDelete.length - 10} more`);
    }
    console.log(`\nRun with --execute to delete`);
  } else {
    // Delete in batches
    const ids = toDelete.map((r: any) => r.id);
    const batchSize = 100;
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const placeholders = batch.map(() => '?').join(',');
      await conn.query(
        `DELETE FROM egghead_ContentResource WHERE id IN (${placeholders})`,
        batch
      );
      console.log(`Deleted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ids.length/batchSize)}`);
    }
    
    console.log(`\nDeleted ${ids.length} duplicate courses`);
  }

  // Verify final state
  const [finalCount] = await conn.query(`
    SELECT COUNT(*) as count FROM egghead_ContentResource WHERE type = 'course'
  `) as any;
  const [uniqueCount] = await conn.query(`
    SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug'))) as count 
    FROM egghead_ContentResource WHERE type = 'course'
  `) as any;

  console.log(`\n=== VERIFICATION ===`);
  console.log(`Total courses: ${finalCount[0].count}`);
  console.log(`Unique slugs: ${uniqueCount[0].count}`);
  console.log(`Duplicates remaining: ${finalCount[0].count - uniqueCount[0].count}`);

  await conn.end();
}

main().catch(console.error);
