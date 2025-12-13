#!/usr/bin/env bun
/**
 * Migrate Lessons: Rails PostgreSQL → Coursebuilder MySQL
 *
 * Migrates ~6,675 published lessons from Rails to Coursebuilder:
 * - ~5,025 lessons in indexed courses (linked via tracklists)
 * - ~1,650 standalone lessons (not in any indexed course)
 *
 * Process:
 * 1. Fetches lessons from Rails PostgreSQL (LEFT JOIN tracklists for course linkage)
 * 2. Resolves Mux assets (Rails HLS URL or SQLite)
 * 3. Creates video resources (ContentResource type='videoResource')
 * 4. Creates lesson resources (ContentResource type='lesson')
 * 5. Stores legacy ID mappings for lookups
 *
 * Key Notes:
 * - Course linkage via tracklists.playlist_id (NOT deprecated series_id)
 * - Standalone lessons have NULL courseId/position
 * - Lessons without videos are marked as 'retired'
 *
 * Features:
 * - Idempotency: Uses ON DUPLICATE KEY UPDATE
 * - Batch processing: Processes in chunks to avoid memory issues
 * - Progress tracking: Real-time progress updates
 * - Error handling: Continues on individual failures, logs errors
 *
 * Usage:
 *   bun scripts/migrate-lessons.ts [--dry-run] [--limit N]
 *   bun scripts/migrate-lessons.ts --stream [--limit N]  # With event emission
 */

import Database from "bun:sqlite";
import { closeAll, getMysqlDb, railsDb } from "../src/lib/db";
import { MigrationStreamWriter } from "../src/lib/migration-stream";
import { createEvent } from "../src/lib/event-types";
import {
  createLessonResource,
  createVideoResource,
  getMuxAssetForLesson,
  type LessonResource,
  type RailsLesson,
  RailsLessonSchema,
  type VideoResource,
} from "../src/lib/lesson-mapper";

// ============================================================================
// Configuration
// ============================================================================

const SYSTEM_USER_ID = "c903e890-0970-4d13-bdee-ea535aaaf69b"; // Joel's user
const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = process.argv.includes("--limit")
  ? Number.parseInt(process.argv[process.argv.indexOf("--limit") + 1], 10)
  : undefined;
const ENABLE_STREAM = process.argv.includes("--stream");
const STREAM_ID = process.env.MIGRATION_RUN_ID || `lessons-${Date.now()}`;

// Initialize stream writer if --stream flag is present
const writer = ENABLE_STREAM ? new MigrationStreamWriter() : null;

// ============================================================================
// Progress Tracking
// ============================================================================

interface MigrationStats {
  totalLessons: number;
  processed: number;
  videoResourcesCreated: number;
  lessonsCreated: number;
  skippedExisting: number;
  retiredNoVideo: number;
  inCourses: number;
  standalone: number;
  errors: number;
  startTime: number;
}

function createStats(): MigrationStats {
  return {
    totalLessons: 0,
    processed: 0,
    videoResourcesCreated: 0,
    lessonsCreated: 0,
    skippedExisting: 0,
    retiredNoVideo: 0,
    inCourses: 0,
    standalone: 0,
    errors: 0,
    startTime: Date.now(),
  };
}

function printProgress(stats: MigrationStats): void {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const percent = ((stats.processed / stats.totalLessons) * 100).toFixed(1);

  process.stdout.write(
    `\r[${stats.processed}/${stats.totalLessons}] ${percent}% - ${elapsed}s - Videos: ${stats.videoResourcesCreated} - Lessons: ${stats.lessonsCreated} - Retired: ${stats.retiredNoVideo} - Errors: ${stats.errors}`,
  );

  if (stats.processed === stats.totalLessons) {
    process.stdout.write("\n");
  }
}

function printSummary(stats: MigrationStats): void {
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const rate =
    stats.processed > 0
      ? ((stats.processed / (Date.now() - stats.startTime)) * 1000).toFixed(0)
      : "0";

  console.log("\n");
  console.log("=".repeat(60));
  console.log(" Migration Summary");
  console.log("=".repeat(60));
  console.log(`Total Lessons:       ${stats.totalLessons.toLocaleString()}`);
  console.log(`Processed:           ${stats.processed.toLocaleString()}`);
  console.log(
    `Video Resources:     ${stats.videoResourcesCreated.toLocaleString()}`,
  );
  console.log(`Lessons Created:     ${stats.lessonsCreated.toLocaleString()}`);
  console.log(
    `  - In Courses:      ${stats.inCourses.toLocaleString()} (linked via tracklists)`,
  );
  console.log(
    `  - Standalone:      ${stats.standalone.toLocaleString()} (no course)`,
  );
  console.log(`Skipped (existing):  ${stats.skippedExisting.toLocaleString()}`);
  console.log(`Retired (no video):  ${stats.retiredNoVideo.toLocaleString()}`);
  console.log(`Errors:              ${stats.errors.toLocaleString()}`);
  console.log(`Duration:            ${duration}s (${rate} items/sec)`);
  console.log("=".repeat(60));
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Fetch published lessons from Rails
 *
 * Gets ALL published lessons (both in courses and standalone):
 * - Lessons in courses: JOIN via tracklists (courseId, position)
 * - Standalone lessons: LEFT JOIN returns NULL courseId/position
 *
 * Expected counts:
 * - ~5,025 lessons in courses (courseId NOT NULL)
 * - ~1,650 standalone lessons (courseId NULL)
 * - ~6,675 total published lessons
 */
async function fetchLessons(limit?: number): Promise<RailsLesson[]> {
  const query = limit
    ? railsDb<RailsLesson[]>`
        SELECT 
          l.id,
          l.slug,
          l.title,
          l.summary,
          l.duration,
          l.state,
          l.visibility_state as "visibilityState",
          l.free_forever as "freeAccess",
          l.instructor_id as "instructorId",
          l.current_video_hls_url as "currentVideoHlsUrl",
          l.created_at as "createdAt",
          l.updated_at as "updatedAt",
          t.playlist_id as "courseId",
          t.row_order as "position"
        FROM lessons l
        LEFT JOIN tracklists t 
          ON t.tracklistable_type = 'Lesson' 
          AND t.tracklistable_id = l.id
        LEFT JOIN playlists p 
          ON p.id = t.playlist_id 
          AND p.visibility_state = 'indexed'
        WHERE l.state = 'published'
        ORDER BY l.id
        LIMIT ${limit}
      `
    : railsDb<RailsLesson[]>`
        SELECT 
          l.id,
          l.slug,
          l.title,
          l.summary,
          l.duration,
          l.state,
          l.visibility_state as "visibilityState",
          l.free_forever as "freeAccess",
          l.instructor_id as "instructorId",
          l.current_video_hls_url as "currentVideoHlsUrl",
          l.created_at as "createdAt",
          l.updated_at as "updatedAt",
          t.playlist_id as "courseId",
          t.row_order as "position"
        FROM lessons l
        LEFT JOIN tracklists t 
          ON t.tracklistable_type = 'Lesson' 
          AND t.tracklistable_id = l.id
        LEFT JOIN playlists p 
          ON p.id = t.playlist_id 
          AND p.visibility_state = 'indexed'
        WHERE l.state = 'published'
        ORDER BY l.id
      `;

  const lessons = await query;

  // Validate with Zod (no fallback - tracklists is canonical)
  return lessons.map((lesson) => RailsLessonSchema.parse(lesson));
}

/**
 * Insert video resource into Coursebuilder
 */
async function insertVideoResource(
  videoResource: VideoResource,
): Promise<void> {
  const mysqlDb = await getMysqlDb();

  await mysqlDb.execute(
    `INSERT INTO egghead_ContentResource (id, type, createdById, fields, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE fields = VALUES(fields), updatedAt = VALUES(updatedAt)`,
    [
      videoResource.id,
      videoResource.type,
      videoResource.createdById,
      JSON.stringify(videoResource.fields),
      videoResource.createdAt,
      videoResource.updatedAt,
    ],
  );
}

/**
 * Insert lesson resource into Coursebuilder
 */
async function insertLessonResource(
  lessonResource: LessonResource,
): Promise<void> {
  const mysqlDb = await getMysqlDb();

  await mysqlDb.execute(
    `INSERT INTO egghead_ContentResource (id, type, createdById, fields, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE fields = VALUES(fields), updatedAt = VALUES(updatedAt)`,
    [
      lessonResource.id,
      lessonResource.type,
      lessonResource.createdById,
      JSON.stringify(lessonResource.fields),
      lessonResource.createdAt,
      lessonResource.updatedAt,
    ],
  );
}

/**
 * Create lesson → video link
 */
async function linkLessonToVideo(
  lessonId: string,
  videoId: string,
): Promise<void> {
  const mysqlDb = await getMysqlDb();

  await mysqlDb.execute(
    `INSERT INTO egghead_ContentResourceResource (resourceOfId, resourceId, position, createdAt, updatedAt)
     VALUES (?, ?, 0, NOW(), NOW())
     ON DUPLICATE KEY UPDATE updatedAt = NOW()`,
    [lessonId, videoId],
  );
}

/**
 * Store legacy ID mapping
 */
async function storeLegacyMapping(
  railsLessonId: number,
  coursebuilderLessonId: string,
  railsSlug: string,
  railsTitle: string,
): Promise<void> {
  const mysqlDb = await getMysqlDb();

  await mysqlDb.execute(
    `INSERT INTO _migration_lesson_map (rails_id, cb_id, rails_slug, rails_title)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE cb_id = VALUES(cb_id), rails_slug = VALUES(rails_slug), rails_title = VALUES(rails_title)`,
    [railsLessonId, coursebuilderLessonId, railsSlug, railsTitle],
  );
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function migrateLessons() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  Lesson Migration: Rails → Coursebuilder                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Mode:       ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(
    `Limit:      ${LIMIT !== undefined ? LIMIT : "All published lessons"}`,
  );
  console.log(`Batch Size: ${BATCH_SIZE}`);
  console.log("");

  // Open SQLite database
  let sqliteDb: Database | null = null;
  try {
    sqliteDb = new Database("../download-egghead/egghead_videos.db", {
      readonly: true,
    });
    console.log("✅ SQLite database loaded");
  } catch {
    console.warn(
      "⚠️  SQLite database not available (legacy video fallback disabled)",
    );
  }

  // Fetch lessons from Rails
  console.log("\n📦 Fetching lessons from Rails...");
  const lessons = await fetchLessons(LIMIT);
  console.log(`✅ Found ${lessons.length} published lessons\n`);

  const stats = createStats();
  stats.totalLessons = lessons.length;

  // Emit start event
  if (writer) {
    try {
      await writer.createStream({ streamId: STREAM_ID });
      await writer.appendEvent(
        STREAM_ID,
        createEvent("start", { entity: "lessons", total: lessons.length }),
      );
    } catch (err) {
      console.warn("⚠️  Failed to emit start event:", err);
    }
  }

  // Process in batches
  for (let i = 0; i < lessons.length; i += BATCH_SIZE) {
    const batch = lessons.slice(i, i + BATCH_SIZE);

    for (const railsLesson of batch) {
      try {
        // Note: Idempotency is handled by ON DUPLICATE KEY UPDATE in insert functions
        // No need to check if already migrated - upserts handle it

        // Resolve Mux asset
        const muxAsset = await getMuxAssetForLesson(railsLesson, sqliteDb);

        // Create video resource (if video exists)
        let videoResource: VideoResource | null = null;
        if (muxAsset.muxPlaybackId) {
          videoResource = createVideoResource(
            railsLesson,
            muxAsset,
            SYSTEM_USER_ID,
          );

          if (!DRY_RUN && videoResource) {
            await insertVideoResource(videoResource);
            stats.videoResourcesCreated++;
          } else if (DRY_RUN && videoResource) {
            stats.videoResourcesCreated++;
          }
        }

        // Create lesson resource
        const lessonResource = createLessonResource(
          railsLesson,
          videoResource,
          SYSTEM_USER_ID,
        );

        if (!DRY_RUN) {
          await insertLessonResource(lessonResource);

          // Link lesson → video
          if (videoResource) {
            await linkLessonToVideo(lessonResource.id, videoResource.id);
          }

          // Store legacy mapping
          await storeLegacyMapping(
            railsLesson.id,
            lessonResource.id,
            railsLesson.slug,
            railsLesson.title,
          );

          stats.lessonsCreated++;
        } else {
          stats.lessonsCreated++;
        }

        // Track course vs standalone
        if (railsLesson.courseId) {
          stats.inCourses++;
        } else {
          stats.standalone++;
        }

        // Track retired lessons
        if (lessonResource.fields.state === "retired") {
          stats.retiredNoVideo++;
        }

        // Emit success event (every 50 records)
        if (writer && stats.processed % 50 === 0) {
          try {
            await writer.appendEvent(
              STREAM_ID,
              createEvent("success", {
                entity: "lessons",
                legacyId: railsLesson.id,
                newId: lessonResource.id,
              }),
            );
          } catch (err) {
            console.warn("⚠️  Failed to emit success event:", err);
          }
        }

        stats.processed++;
        printProgress(stats);

        // Emit progress event (every 50 records)
        if (writer && stats.processed % 50 === 0) {
          try {
            await writer.appendEvent(
              STREAM_ID,
              createEvent("progress", {
                entity: "lessons",
                current: stats.processed,
                total: stats.totalLessons,
              }),
            );
          } catch (err) {
            console.warn("⚠️  Failed to emit progress event:", err);
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `\n❌ Error migrating lesson ${railsLesson.id}:`,
          errorMsg,
        );
        stats.errors++;

        // Emit error event
        if (writer) {
          try {
            await writer.appendEvent(
              STREAM_ID,
              createEvent("error", {
                entity: "lessons",
                legacyId: railsLesson.id,
                error: errorMsg,
              }),
            );
          } catch (streamErr) {
            console.warn("⚠️  Failed to emit error event:", streamErr);
          }
        }

        stats.processed++;
        printProgress(stats);
      }
    }
  }

  // Cleanup
  if (sqliteDb) {
    sqliteDb.close();
  }

  // Emit complete event
  if (writer) {
    try {
      const duration = Date.now() - stats.startTime;
      await writer.appendEvent(
        STREAM_ID,
        createEvent("complete", {
          entity: "lessons",
          migrated: stats.lessonsCreated,
          failed: stats.errors,
          duration,
        }),
      );
    } catch (err) {
      console.warn("⚠️  Failed to emit complete event:", err);
    }
  }

  // Print summary
  printSummary(stats);

  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN - No database writes performed");
    console.log("   Run without --dry-run to execute migration");
  }
}

// ============================================================================
// Main Execution
// ============================================================================

migrateLessons()
  .then(async () => {
    await closeAll();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("\n❌ Migration failed:", err);
    await closeAll();
    process.exit(1);
  });
