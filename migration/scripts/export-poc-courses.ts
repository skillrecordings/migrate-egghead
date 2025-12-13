#!/usr/bin/env bun
/**
 * Export POC courses with REAL schema from production
 *
 * Exports full table schemas via pg_dump + filtered data for:
 * - "fix-common-git-mistakes" (legacy, Rails-only)
 * - "claude-code-essentials-6d87" (modern, Sanity-based)
 *
 * Usage: bun scripts/export-poc-courses.ts
 */

import { $ } from "bun";
import { railsDb, closeAll } from "../src/lib/db";

const POC_COURSE_SLUGS = [
  "fix-common-git-mistakes",
  "claude-code-essentials-6d87",
];

const DOCKER_DIR = "./docker/postgres";

async function main() {
  console.log("🔍 Exporting POC courses from Rails...\n");

  // Ensure output directory exists
  await $`mkdir -p ${DOCKER_DIR}`;

  // Step 1: Export schema via pg_dump
  console.log("📋 Step 1: Export table schemas via pg_dump...");
  const databaseUrl = process.env.DATABASE_URL!;

  const schema = await $`pg_dump "${databaseUrl}" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-comments \
    --table=users \
    --table=instructors \
    --table=series \
    --table=lessons \
    --table=tags \
    --table=taggings \
    --table=playlists \
    --table=tracklists \
    2>/dev/null`.text();

  await Bun.write(`${DOCKER_DIR}/init.sql`, schema);
  console.log(`   ✅ Schema: ${schema.split("\n").length} lines\n`);

  // Step 2: Find related data
  console.log("📋 Step 2: Find related data...");

  // Get courses
  const courses = await railsDb`
    SELECT id, slug, title, instructor_id
    FROM series
    WHERE slug = ANY(${POC_COURSE_SLUGS})
  `;
  console.log(`   Courses: ${courses.length}`);
  courses.forEach((c) =>
    console.log(
      `     - ${c.slug} (id: ${c.id}, instructor: ${c.instructorId})`,
    ),
  );

  if (courses.length === 0) {
    console.log("   ❌ No courses found!");
    await closeAll();
    return;
  }

  const courseIds = courses.map((c) => c.id);

  // Get lessons
  const lessons = await railsDb`
    SELECT id, slug, title, instructor_id, series_id
    FROM lessons
    WHERE series_id = ANY(${courseIds})
    ORDER BY series_id, id
  `;
  console.log(`   Lessons: ${lessons.length}`);

  const lessonIds = lessons.map((l) => l.id);

  // Get unique instructor IDs
  const instructorIds = [
    ...new Set([
      ...courses.map((c) => c.instructorId),
      ...lessons.map((l) => l.instructorId),
    ]),
  ].filter(Boolean);
  console.log(`   Instructor IDs: ${instructorIds.join(", ")}`);

  // Get instructors (full row)
  const instructors =
    instructorIds.length > 0
      ? await railsDb`SELECT * FROM instructors WHERE id = ANY(${instructorIds})`
      : [];
  console.log(`   Instructors: ${instructors.length}`);

  // Get user IDs from instructors
  const userIds = instructors.map((i) => i.userId).filter(Boolean);

  // Get users (full row)
  const users =
    userIds.length > 0
      ? await railsDb`SELECT * FROM users WHERE id = ANY(${userIds})`
      : [];
  console.log(`   Users: ${users.length}`);

  // Get full course rows
  const seriesRows =
    await railsDb`SELECT * FROM series WHERE id = ANY(${courseIds})`;

  // Get full lesson rows
  const lessonRows =
    await railsDb`SELECT * FROM lessons WHERE id = ANY(${lessonIds})`;

  // Get tags and taggings
  const taggings = await railsDb`
    SELECT * FROM taggings
    WHERE (taggable_type = 'Lesson' AND taggable_id = ANY(${lessonIds}))
       OR (taggable_type = 'Series' AND taggable_id = ANY(${courseIds}))
  `;
  console.log(`   Taggings: ${taggings.length}`);

  const tagIds = [...new Set(taggings.map((t) => t.tagId))].filter(Boolean);
  const tags =
    tagIds.length > 0
      ? await railsDb`SELECT * FROM tags WHERE id = ANY(${tagIds})`
      : [];
  console.log(`   Tags: ${tags.length}`);

  // Step 3: Generate seed SQL
  console.log("\n📋 Step 3: Generate seed.sql...");

  const seedLines: string[] = [
    "-- POC Course Data Export",
    `-- Generated: ${new Date().toISOString()}`,
    `-- Courses: ${courses.map((c) => c.slug).join(", ")}`,
    "",
    "-- Disable FK checks during import",
    "SET session_replication_role = replica;",
    "",
  ];

  // Anonymize user data
  const anonymizeUser = (
    u: Record<string, unknown>,
  ): Record<string, unknown> => ({
    ...u,
    email: `instructor${u.id}@test.egghead.io`,
    encryptedPassword: "redacted",
    authenticationToken: null,
    confirmationToken: null,
    resetPasswordToken: null,
    currentSignInIp: null,
    lastSignInIp: null,
    discordId: null,
    slackId: null,
    unconfirmedEmail: null,
  });

  // Users
  seedLines.push(`-- Users (${users.length})`);
  for (const u of users) {
    seedLines.push(generateInsert("users", anonymizeUser(u)));
  }
  seedLines.push("");

  // Instructors (anonymize email)
  seedLines.push(`-- Instructors (${instructors.length})`);
  for (const i of instructors) {
    const anonymized = {
      ...i,
      email: i.email ? `instructor${i.id}@test.egghead.io` : null,
    };
    seedLines.push(generateInsert("instructors", anonymized));
  }
  seedLines.push("");

  // Series
  seedLines.push(`-- Series/Courses (${seriesRows.length})`);
  for (const s of seriesRows) {
    seedLines.push(generateInsert("series", s));
  }
  seedLines.push("");

  // Lessons
  seedLines.push(`-- Lessons (${lessonRows.length})`);
  for (const l of lessonRows) {
    seedLines.push(generateInsert("lessons", l));
  }
  seedLines.push("");

  // Tags
  if (tags.length > 0) {
    seedLines.push(`-- Tags (${tags.length})`);
    for (const t of tags) {
      seedLines.push(generateInsert("tags", t));
    }
    seedLines.push("");
  }

  // Taggings
  if (taggings.length > 0) {
    seedLines.push(`-- Taggings (${taggings.length})`);
    for (const t of taggings) {
      seedLines.push(generateInsert("taggings", t));
    }
    seedLines.push("");
  }

  // Re-enable FK checks and reset sequences
  seedLines.push("-- Re-enable FK checks");
  seedLines.push("SET session_replication_role = DEFAULT;");
  seedLines.push("");
  seedLines.push("-- Reset sequences");
  seedLines.push(
    "SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));",
  );
  seedLines.push(
    "SELECT setval('instructors_id_seq', COALESCE((SELECT MAX(id) FROM instructors), 1));",
  );
  seedLines.push(
    "SELECT setval('series_id_seq', COALESCE((SELECT MAX(id) FROM series), 1));",
  );
  seedLines.push(
    "SELECT setval('lessons_id_seq', COALESCE((SELECT MAX(id) FROM lessons), 1));",
  );
  seedLines.push(
    "SELECT setval('tags_id_seq', COALESCE((SELECT MAX(id) FROM tags), 1));",
  );
  seedLines.push(
    "SELECT setval('taggings_id_seq', COALESCE((SELECT MAX(id) FROM taggings), 1));",
  );

  const seedSql = seedLines.join("\n");
  await Bun.write(`${DOCKER_DIR}/seed.sql`, seedSql);

  console.log(`   ✅ Seed: ${seedLines.length} lines\n`);

  // Summary
  console.log("📊 Export Summary:");
  console.log(`   Users:       ${users.length}`);
  console.log(`   Instructors: ${instructors.length}`);
  console.log(`   Courses:     ${seriesRows.length}`);
  console.log(`   Lessons:     ${lessonRows.length}`);
  console.log(`   Tags:        ${tags.length}`);
  console.log(`   Taggings:    ${taggings.length}`);

  await closeAll();

  console.log("\n✨ Done! Files written to docker/postgres/");
  console.log("\nNext steps:");
  console.log("  bun run docker:reset");
}

/**
 * Generate INSERT statement from a row object
 * Converts camelCase keys back to snake_case for PostgreSQL
 */
function generateInsert(table: string, row: Record<string, unknown>): string {
  const snakeCase = (str: string) =>
    str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

  const columns = Object.keys(row).map(snakeCase);
  const values = Object.values(row).map(sqlValue);

  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT (id) DO NOTHING;`;
}

/**
 * Convert JS value to SQL literal
 */
function sqlValue(val: unknown): string {
  if (val === null || val === undefined) {
    return "NULL";
  }
  if (typeof val === "boolean") {
    return val ? "true" : "false";
  }
  if (typeof val === "number") {
    return String(val);
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (typeof val === "object") {
    // JSONB
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  // String - escape single quotes
  return `'${String(val).replace(/'/g, "''")}'`;
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
