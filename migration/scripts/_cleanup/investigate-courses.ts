#!/usr/bin/env bun
/**
 * Investigate why we have 874 courses when we expected ~420
 */
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  // Total courses
  const [total] = await conn.query(`
    SELECT COUNT(*) as count FROM egghead_ContentResource WHERE type = 'course'
  `) as any;
  console.log(`Total courses: ${total[0].count}`);

  // Unique slugs
  const [uniqueSlugs] = await conn.query(`
    SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug'))) as count 
    FROM egghead_ContentResource WHERE type = 'course'
  `) as any;
  console.log(`Unique course slugs: ${uniqueSlugs[0].count}`);

  // Courses with duplicates
  const [dupeCount] = await conn.query(`
    SELECT SUM(count) as total_dupes FROM (
      SELECT COUNT(*) as count
      FROM egghead_ContentResource 
      WHERE type = 'course'
      GROUP BY JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug'))
      HAVING count > 1
    ) t
  `) as any;
  console.log(`Courses that are duplicates: ${dupeCount[0].total_dupes}`);

  // So unique + extra dupes = total
  console.log(`\nMath check: ${uniqueSlugs[0].count} unique + ${dupeCount[0].total_dupes - 436} extra = ${total[0].count}`);
  console.log(`Extra courses from duplication: ${total[0].count - uniqueSlugs[0].count}`);

  // Check if we ran migration twice by looking at createdAt distribution
  const [createdDist] = await conn.query(`
    SELECT 
      DATE(createdAt) as date,
      COUNT(*) as count
    FROM egghead_ContentResource 
    WHERE type = 'course'
    GROUP BY DATE(createdAt)
    ORDER BY date DESC
    LIMIT 10
  `) as any;
  console.log(`\nCourse creation dates:`);
  console.table(createdDist);

  // Sample some duplicates to see the pattern
  const [sampleDupes] = await conn.query(`
    SELECT 
      id,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) as slug,
      JSON_UNQUOTE(JSON_EXTRACT(fields, '$.title')) as title,
      createdAt
    FROM egghead_ContentResource 
    WHERE type = 'course'
    AND JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) = 'claude-code-tools-deep-dive~e58tr'
    ORDER BY createdAt
  `) as any;
  console.log(`\nSample duplicate (claude-code-tools-deep-dive):`);
  console.table(sampleDupes);

  // Check Rails for expected count
  console.log(`\n=== Expected from Rails ===`);
  console.log(`Should be ~420 official courses (visibility_state='indexed')`);

  await conn.end();
}

main().catch(console.error);
