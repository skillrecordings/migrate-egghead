/**
 * Course Migration Script
 *
 * Migrates Rails `playlists` table (visibility_state='indexed') → Coursebuilder `ContentResource` with type='course'
 *
 * Prerequisites:
 * - Instructors already migrated to User table
 * - Lessons already migrated (for linking)
 * - Docker containers running (for testing)
 *
 * Usage:
 *   bun scripts/migrate-courses.ts [--dry-run] [--limit=N]
 *   bun scripts/migrate-courses.ts --stream [--limit=N]  # With event emission
 */

import {
  mapPlaylistToCourse,
  RailsPlaylistSchema,
  type RailsPlaylist,
} from "../src/lib/course-mapper";
import { closeAll, getMysqlDb, railsDb } from "../src/lib/db";
import { MigrationStreamWriter } from "../src/lib/migration-stream";
import { createEvent } from "../src/lib/event-types";

// ============================================================================
// Configuration
// ============================================================================

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG
  ? Number.parseInt(LIMIT_ARG.split("=")[1] ?? "0", 10)
  : null;
const ENABLE_STREAM = process.argv.includes("--stream");
const STREAM_ID = process.env.MIGRATION_RUN_ID || `courses-${Date.now()}`;

// Initialize stream writer if --stream flag is present
const writer = ENABLE_STREAM ? new MigrationStreamWriter() : null;

// System user for migration (Joel's account in Coursebuilder)
const SYSTEM_USER_ID = "c903e890-0970-4d13-bdee-ea535aaaf69b";

// TODO: After instructors are migrated, use actual instructor mapping
const INSTRUCTOR_USER_MAP = new Map<number, string>();

// ============================================================================
// Types
// ============================================================================

interface RailsPlaylistRow {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  summary: string | null;
  tagline: string | null;
  state: string;
  visibilityState: string;
  accessState: string;
  ownerId: number;
  instructorId: number; // From JOIN on instructors.user_id = playlists.owner_id
  publishedAt: Date | null;
  squareCoverFileName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
}

// ============================================================================
// Main Migration Logic
// ============================================================================

/**
 * Fetch official courses from playlists table
 * Official courses: visibility_state='indexed' AND state='published'
 */
async function fetchPlaylistsFromRails(): Promise<RailsPlaylistRow[]> {
  console.log("\n📦 Fetching courses from playlists table...");

  const query = `
    SELECT 
      p.id,
      p.slug,
      p.title,
      p.description,
      p.summary,
      p.tagline,
      p.state,
      p.visibility_state,
      p.access_state,
      p.owner_id,
      COALESCE(i.id, 0) as instructor_id,
      p.published_at,
      p.square_cover_file_name,
      p.created_at,
      p.updated_at
    FROM playlists p
    LEFT JOIN instructors i ON i.user_id = p.owner_id
    WHERE p.visibility_state = 'indexed' AND p.state = 'published'
    ORDER BY p.id
    ${LIMIT ? `LIMIT ${LIMIT}` : ""}
  `;

  const playlists = await railsDb.unsafe<RailsPlaylistRow[]>(query);

  console.log(`✅ Fetched ${playlists.length} courses from playlists`);
  return playlists;
}

/**
 * Fetch courses from Rails playlists table
 */
async function fetchCoursesFromRails(): Promise<RailsPlaylistRow[]> {
  return await fetchPlaylistsFromRails();
}

async function getInstructorUserId(
  instructorId: number | null,
): Promise<string> {
  if (!instructorId) {
    return SYSTEM_USER_ID;
  }

  // Check cache first
  const cachedId = INSTRUCTOR_USER_MAP.get(instructorId);
  if (cachedId) {
    return cachedId;
  }

  // TODO: Query Coursebuilder for instructor user ID
  // For now, use system user
  return SYSTEM_USER_ID;
}

async function checkIfCourseExists(_legacySeriesId: number): Promise<boolean> {
  // TODO: Query Coursebuilder MySQL to check if course already migrated
  // For now, assume not exists (idempotency will be handled by ON CONFLICT DO NOTHING)
  return false;
}

async function migrateCourse(
  railsCourse: RailsPlaylistRow,
  stats: MigrationStats,
): Promise<void> {
  try {
    // Check if already migrated
    const exists = await checkIfCourseExists(railsCourse.id);
    if (exists) {
      console.log(`   ⏭️  Course ${railsCourse.id} already migrated, skipping`);
      stats.skipped++;
      return;
    }

    // Get instructor user ID
    const instructorUserId = await getInstructorUserId(
      railsCourse.instructorId,
    );

    // Parse and map playlist to course
    const course = mapPlaylistToCourse(
      RailsPlaylistSchema.parse(railsCourse),
      instructorUserId,
    );

    if (DRY_RUN) {
      console.log(`   🔍 [DRY RUN] Would migrate: ${course.fields.slug}`);
      stats.migrated++;
      return;
    }

    // Insert into Coursebuilder MySQL
    const mysqlDb = await getMysqlDb();

    // Insert ContentResource
    await mysqlDb.execute(
      `INSERT INTO egghead_ContentResource (id, type, createdById, fields, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         fields = VALUES(fields),
         updatedAt = VALUES(updatedAt)`,
      [
        course.id,
        course.type,
        course.createdById,
        JSON.stringify(course.fields),
        course.createdAt,
        course.updatedAt,
      ],
    );

    // Insert mapping entry
    await mysqlDb.execute(
      `INSERT INTO _migration_course_map (rails_id, cb_id, rails_slug, rails_title)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         cb_id = VALUES(cb_id),
         rails_slug = VALUES(rails_slug),
         rails_title = VALUES(rails_title)`,
      [railsCourse.id, course.id, railsCourse.slug, railsCourse.title],
    );

    console.log(
      `   ✅ Migrated course: ${course.fields.slug} (ID: ${course.id})`,
    );
    stats.migrated++;

    // Emit success event
    if (writer) {
      try {
        await writer.appendEvent(
          STREAM_ID,
          createEvent("success", {
            entity: "courses",
            legacyId: railsCourse.id,
            newId: course.id,
          }),
        );
      } catch (err) {
        console.warn("⚠️  Failed to emit success event:", err);
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ Error migrating course ${railsCourse.id}:`, errorMsg);
    stats.errors++;

    // Emit error event
    if (writer) {
      try {
        await writer.appendEvent(
          STREAM_ID,
          createEvent("error", {
            entity: "courses",
            legacyId: railsCourse.id,
            error: errorMsg,
          }),
        );
      } catch (streamErr) {
        console.warn("⚠️  Failed to emit error event:", streamErr);
      }
    }
  }
}

// Unused for now - will be needed when we create the mapping table
// async function createCourseLessonMappingEntry(
//   courseId: string,
//   legacySeriesId: number,
// ): Promise<void> {
//   // TODO: Create entry in _migration_course_map for legacy ID lookups
//   // This allows us to map Rails series_id → Coursebuilder course ID
//   console.log(
//     `   📝 Would create mapping: Rails series ${legacySeriesId} → CB course ${courseId}`,
//   );
// }

async function main(): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Course Migration: Rails playlists → Coursebuilder         ║
║  Mode: ${DRY_RUN ? "DRY RUN" : "PRODUCTION"}                               ║
║  Limit: ${LIMIT || "ALL"}                                             ║
╚════════════════════════════════════════════════════════════╝
  `);

  const startTime = Date.now();
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // Fetch courses from Rails
    const courses = await fetchCoursesFromRails();
    stats.total = courses.length;

    console.log(`\n📊 Using playlists table for course data`);

    if (courses.length === 0) {
      console.log("\n⚠️  No courses found to migrate");
      return;
    }

    // Emit start event
    if (writer) {
      try {
        await writer.createStream({ streamId: STREAM_ID });
        await writer.appendEvent(
          STREAM_ID,
          createEvent("start", { entity: "courses", total: courses.length }),
        );
      } catch (err) {
        console.warn("⚠️  Failed to emit start event:", err);
      }
    }

    console.log(`\n🚀 Starting migration of ${courses.length} courses...\n`);

    // Migrate each course
    for (let index = 0; index < courses.length; index++) {
      const railsCourse = courses[index];
      if (!railsCourse) continue;

      const progress = `[${index + 1}/${courses.length}]`;
      console.log(`${progress} Processing: ${railsCourse.slug}`);

      await migrateCourse(railsCourse, stats);

      // Emit progress event every 10 records
      if (writer && (index + 1) % 10 === 0) {
        try {
          await writer.appendEvent(
            STREAM_ID,
            createEvent("progress", {
              entity: "courses",
              current: index + 1,
              total: courses.length,
            }),
          );
        } catch (err) {
          console.warn("⚠️  Failed to emit progress event:", err);
        }
      }
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const durationMs = Date.now() - startTime;

    // Emit complete event
    if (writer) {
      try {
        await writer.appendEvent(
          STREAM_ID,
          createEvent("complete", {
            entity: "courses",
            migrated: stats.migrated,
            failed: stats.errors,
            duration: durationMs,
          }),
        );
      } catch (err) {
        console.warn("⚠️  Failed to emit complete event:", err);
      }
    }

    console.log(`\n
╔════════════════════════════════════════════════════════════╗
║  Migration Complete                                        ║
╚════════════════════════════════════════════════════════════╝

Total courses:     ${stats.total}
Migrated:          ${stats.migrated}
Skipped (exists):  ${stats.skipped}
Errors:            ${stats.errors}
Duration:          ${duration}s

    `);

    if (stats.errors > 0) {
      console.error("⚠️  Migration completed with errors. Review logs above.");
      process.exit(1);
    }
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await closeAll();
  }
}

main();
