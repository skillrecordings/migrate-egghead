#!/usr/bin/env bun
/**
 * Delete lessons that collide with posts via hash matching
 * 
 * Problem: The get-post.ts query uses LIKE %hash to find records.
 * Migration created lessons with slightly different slugs (dash vs tilde, 
 * different casing like "MongoDB" vs "Mongo DB") but same hash suffix.
 * 
 * Example:
 *   Post:   post_fefi6 - install-mock-service-worker-msw~fefi6
 *   Lesson: p4yk1tjd3fkqymsewrxhnve0 - install-mock-service-worker-msw-fefi6
 * 
 * The LIKE %fefi6 query matches BOTH, and the lesson has currentVersionId: null
 * which fails Zod validation.
 * 
 * Solution: Delete the migration lessons - CB-published posts take precedence.
 */
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  const dryRun = !process.argv.includes('--execute');

  // These are the lessons that collide with posts via hash matching
  const lessonIds = [
    'vjebr2tch2dhsm1bteru6occ', // access-mongo-databases-from-mongodb-compass-cb5n2
    'p4yk1tjd3fkqymsewrxhnve0', // install-mock-service-worker-msw-fefi6
    'iraq17e4vgct2zrnyib0mqsb', // delete-documents-in-mongodb-collections-using-deleteone-and-deletemany-vu2o7
  ];

  console.log(`=== ${dryRun ? 'DRY RUN' : 'EXECUTING'} ===\n`);
  console.log(`Deleting ${lessonIds.length} lessons that collide with posts via hash matching\n`);

  if (dryRun) {
    for (const id of lessonIds) {
      const [rows] = await conn.query(
        `SELECT JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug FROM egghead_ContentResource WHERE id = ?`,
        [id]
      ) as any;
      console.log(`Would delete: ${id} - ${rows[0]?.slug}`);
    }
    console.log(`\nRun with --execute to delete`);
  } else {
    for (const id of lessonIds) {
      await conn.query('DELETE FROM egghead_ContentResource WHERE id = ?', [id]);
      console.log(`Deleted: ${id}`);
    }
    console.log(`\nDeleted ${lessonIds.length} collision lessons`);
  }

  await conn.end();
}

main().catch(console.error);
