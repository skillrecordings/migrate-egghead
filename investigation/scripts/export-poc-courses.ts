#!/usr/bin/env npx tsx
/**
 * Export POC courses with REAL schema from production
 *
 * Exports full table schemas via pg_dump + filtered data for:
 * - "fix-common-git-mistakes" (legacy, Rails-only)
 * - "claude-code-essentials-6d87" (modern, Sanity-based) - if exists
 *
 * Usage: pnpm tsx scripts/export-poc-courses.ts
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { Effect } from "effect";
import { SqlClient } from "@effect/sql";
import { runWithDb } from "../src/lib/db.js";

const POC_COURSE_SLUGS = [
  "fix-common-git-mistakes",
  "claude-code-essentials-6d87",
];

const DOCKER_DIR = path.join(process.cwd(), "docker", "postgres");

// Ensure output directory exists
fs.mkdirSync(DOCKER_DIR, { recursive: true });

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  console.log("🔍 Exporting POC courses from Rails...\n");

  // Step 1: Export schema via pg_dump
  console.log("📋 Step 1: Export table schemas via pg_dump...");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set");
  }

  const schemaCmd = `pg_dump "${databaseUrl}" \
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
    2>/dev/null`;

  const schema = execSync(schemaCmd, {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
  });
  fs.writeFileSync(path.join(DOCKER_DIR, "init.sql"), schema);
  console.log(`   ✅ Schema: ${schema.split("\n").length} lines\n`);

  // Step 2: Find related IDs
  console.log("📋 Step 2: Find related data...");

  // Get courses (note: SQL client transforms snake_case to camelCase)
  const courses = yield* sql<{
    id: number;
    slug: string;
    title: string;
    instructorId: number;
  }>`
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
    return;
  }

  const courseIds = courses.map((c) => c.id);

  // Get lessons
  const lessons = yield* sql<{
    id: number;
    slug: string;
    title: string;
    instructorId: number;
    seriesId: number;
  }>`
    SELECT id, slug, title, instructor_id, series_id
    FROM lessons
    WHERE series_id = ANY(${courseIds})
    ORDER BY series_id, id
  `;
  console.log(`   Lessons: ${lessons.length}`);

  const lessonIds = lessons.map((l) => l.id);

  // Get unique instructor IDs (camelCase from SQL transform)
  const instructorIds = [
    ...new Set([
      ...courses.map((c) => c.instructorId),
      ...lessons.map((l) => l.instructorId),
    ]),
  ].filter(Boolean);

  // Get instructors (full row)
  const instructors = yield* sql<Record<string, unknown>>`
    SELECT * FROM instructors WHERE id = ANY(${instructorIds})
  `;
  console.log(`   Instructors: ${instructors.length}`);

  // Get user IDs from instructors
  const userIds = instructors.map((i) => i.user_id as number).filter(Boolean);

  // Get users (full row, will anonymize)
  const users = yield* sql<Record<string, unknown>>`
    SELECT * FROM users WHERE id = ANY(${userIds})
  `;
  console.log(`   Users: ${users.length}`);

  // Get full course rows
  const seriesRows = yield* sql<Record<string, unknown>>`
    SELECT * FROM series WHERE id = ANY(${courseIds})
  `;

  // Get full lesson rows
  const lessonRows = yield* sql<Record<string, unknown>>`
    SELECT * FROM lessons WHERE id = ANY(${lessonIds})
  `;

  // Get tags and taggings
  const taggings = yield* sql<Record<string, unknown>>`
    SELECT * FROM taggings
    WHERE (taggable_type = 'Lesson' AND taggable_id = ANY(${lessonIds}))
       OR (taggable_type = 'Series' AND taggable_id = ANY(${courseIds}))
  `;
  console.log(`   Taggings: ${taggings.length}`);

  const tagIds = [...new Set(taggings.map((t) => t.tag_id as number))];
  const tags =
    tagIds.length > 0
      ? yield* sql<
          Record<string, unknown>
        >`SELECT * FROM tags WHERE id = ANY(${tagIds})`
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

  // Helper to generate INSERT statement
  const generateInsert = (
    table: string,
    row: Record<string, unknown>,
    anonymize?: (r: Record<string, unknown>) => Record<string, unknown>,
  ) => {
    const data = anonymize ? anonymize(row) : row;
    const columns = Object.keys(data);
    const values = columns.map((col) => sqlValue(data[col]));
    return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT (id) DO NOTHING;`;
  };

  // Anonymize user data
  const anonymizeUser = (
    u: Record<string, unknown>,
  ): Record<string, unknown> => ({
    ...u,
    email: `instructor${u.id}@test.egghead.io`,
    encrypted_password: "redacted",
    authentication_token: null,
    confirmation_token: null,
    reset_password_token: null,
    current_sign_in_ip: null,
    last_sign_in_ip: null,
    discord_id: null,
    slack_id: null,
    unconfirmed_email: null,
  });

  // Users
  seedLines.push(`-- Users (${users.length})`);
  for (const u of users) {
    seedLines.push(generateInsert("users", u, anonymizeUser));
  }
  seedLines.push("");

  // Instructors
  seedLines.push(`-- Instructors (${instructors.length})`);
  for (const i of instructors) {
    // Anonymize instructor email too
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
  fs.writeFileSync(path.join(DOCKER_DIR, "seed.sql"), seedSql);

  console.log(`   ✅ Seed: ${seedLines.length} lines\n`);

  // Summary
  console.log("📊 Export Summary:");
  console.log(`   Users:       ${users.length}`);
  console.log(`   Instructors: ${instructors.length}`);
  console.log(`   Courses:     ${seriesRows.length}`);
  console.log(`   Lessons:     ${lessonRows.length}`);
  console.log(`   Tags:        ${tags.length}`);
  console.log(`   Taggings:    ${taggings.length}`);

  return {
    users: users.length,
    instructors: instructors.length,
    courses: seriesRows.length,
    lessons: lessonRows.length,
    tags: tags.length,
    taggings: taggings.length,
  };
});

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

// Run
runWithDb(program)
  .then((result) => {
    console.log("\n✨ Done! Files written to docker/postgres/");
    console.log("\nNext steps:");
    console.log(
      "  cd docker && docker-compose down -v && docker-compose up -d",
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
