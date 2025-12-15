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
 * ⚠️  CRITICAL: DUPLICATE PREVENTION
 * Before creating a type='lesson' record, we check if a type='post' with
 * postType='lesson' and the same slug already exists. If so, we SKIP the
 * migration for that lesson - the CB-published version takes precedence.
 *
 * This prevents route conflicts in Vercel builds where both:
 *   - /lessons/[slug] from type='lesson' (migration)
 *   - /lessons/[slug] from type='post' (CB publishing)
 * would try to generate the same route.
 *
 * See: Dec 15, 2025 incident - 261 duplicates deleted via delete-duplicate-lessons.ts
 *
 * Features:
 * - Idempotency: Uses ON DUPLICATE KEY UPDATE
 * - Duplicate prevention: Skips lessons that exist as type='post'
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
  closeMigrationDb,
  getCourseCbId,
  saveLessonMapping,
} from "../src/lib/migration-state";
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
  skippedDuplicatePost: number; // Lessons that already exist as type='post'
  skippedHashCollision: number; // Lessons that would collide via LIKE %hash
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
    skippedDuplicatePost: 0,
    skippedHashCollision: 0,
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
  console.log(
    `Skipped (CB post):   ${stats.skippedDuplicatePost.toLocaleString()} (already published via CB)`,
  );
  console.log(
    `Skipped (hash):      ${stats.skippedHashCollision.toLocaleString()} (would collide via LIKE %hash)`,
  );
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
 * Note: 36 lessons appear in multiple indexed courses. We use DISTINCT ON (l.id)
 * to return ONE row per lesson, prioritizing the first indexed course found.
 *
 * Expected counts:
 * - ~4,989 unique lessons in indexed courses (courseId NOT NULL)
 * - ~1,650 standalone lessons (courseId NULL)
 * - ~6,639 total unique published lessons
 */
async function fetchLessons(limit?: number): Promise<RailsLesson[]> {
  const query = limit
    ? railsDb<RailsLesson[]>`
        SELECT DISTINCT ON (l.id)
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
        ORDER BY l.id, p.id NULLS LAST
        LIMIT ${limit}
      `
    : railsDb<RailsLesson[]>`
        SELECT DISTINCT ON (l.id)
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
        ORDER BY l.id, p.id NULLS LAST
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
 * Check if a type='post' with postType='lesson' and the same slug exists.
 * These are CB-published lessons that take precedence over migration.
 *
 * Returns true if a duplicate exists (should skip migration)
 */
async function checkForDuplicatePost(slug: string): Promise<boolean> {
  const mysqlDb = await getMysqlDb();

  // Use execute with params (works with both mysql2 and PlanetScale)
  const [rows] = await mysqlDb.execute(
    `SELECT COUNT(*) as count
     FROM egghead_ContentResource
     WHERE type = 'post'
     AND JSON_EXTRACT(fields, '$.postType') = 'lesson'
     AND JSON_EXTRACT(fields, '$.slug') = ?`,
    [slug],
  );

  const result = rows as Array<{ count: number }>;
  return result[0]?.count > 0;
}

/**
 * Check if a type='lesson' with the same slug already exists.
 * This provides idempotency when migration runs multiple times.
 *
 * Returns true if lesson already exists (should skip migration)
 */
async function checkForExistingLesson(slug: string): Promise<boolean> {
  const mysqlDb = await getMysqlDb();

  const [rows] = await mysqlDb.execute(
    `SELECT COUNT(*) as count
     FROM egghead_ContentResource
     WHERE type = 'lesson'
     AND JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) = ?`,
    [slug],
  );

  const result = rows as Array<{ count: number }>;
  return result[0]?.count > 0;
}

/**
 * Check if a post exists with the same hash suffix.
 *
 * The get-post.ts query uses LIKE %hash pattern matching, so a lesson with
 * slug "foo-bar-abc123" would collide with a post "foo-bar~abc123" because
 * both match LIKE %abc123.
 *
 * This catches cases where:
 * - Different separator: ~abc123 vs -abc123
 * - Different casing: "Mongo DB" vs "MongoDB"
 * - But same hash suffix
 *
 * Returns true if a post with matching hash exists (should skip migration)
 */
async function checkForPostWithMatchingHash(slug: string): Promise<boolean> {
  // Extract hash from slug (last segment after ~ or -)
  const hashMatch = slug.match(/[-~]([a-z0-9]+)$/);
  if (!hashMatch) return false;

  const hash = hashMatch[1];
  const mysqlDb = await getMysqlDb();

  const [rows] = await mysqlDb.execute(
    `SELECT COUNT(*) as count
     FROM egghead_ContentResource
     WHERE type = 'post'
     AND (JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) LIKE ?
          OR JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) LIKE ?)`,
    [`%~${hash}`, `%-${hash}`],
  );

  const result = rows as Array<{ count: number }>;
  return result[0]?.count > 0;
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
 * Create course → lesson link with position
 */
async function linkLessonToCourse(
  courseId: string,
  lessonId: string,
  position: number,
): Promise<void> {
  const mysqlDb = await getMysqlDb();

  await mysqlDb.execute(
    `INSERT INTO egghead_ContentResourceResource (resourceOfId, resourceId, position, createdAt, updatedAt)
     VALUES (?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE position = VALUES(position), updatedAt = NOW()`,
    [courseId, lessonId, position],
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
        // ⚠️ CRITICAL: Check for duplicate type='post' before creating type='lesson'
        // CB-published lessons take precedence over migration
        // See: Dec 15, 2025 incident - 261 duplicates caused Vercel build failures
        const isDuplicatePost = await checkForDuplicatePost(railsLesson.slug);
        if (isDuplicatePost) {
          stats.skippedDuplicatePost++;
          stats.processed++;
          printProgress(stats);
          continue; // Skip this lesson - CB version exists
        }

        // Check if lesson with this slug already exists (idempotency)
        // This prevents duplicates when migration runs multiple times
        // (IDs are generated with cuid2, so ON DUPLICATE KEY won't catch slug dupes)
        const lessonExists = await checkForExistingLesson(railsLesson.slug);
        if (lessonExists) {
          stats.skippedExisting++;
          stats.processed++;
          printProgress(stats);
          continue; // Skip - already migrated
        }

        // Check for hash-based collision with posts
        // The get-post.ts query uses LIKE %hash, so "foo-abc123" collides with "foo~abc123"
        // See: Dec 15, 2025 - 3 lessons caused build failures due to hash collision
        const hasHashCollision = await checkForPostWithMatchingHash(
          railsLesson.slug,
        );
        if (hasHashCollision) {
          stats.skippedHashCollision++;
          stats.processed++;
          printProgress(stats);
          continue; // Skip - would collide with CB post via LIKE %hash
        }

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

          // Store legacy mapping (local SQLite)
          saveLessonMapping(
            railsLesson.id,
            lessonResource.id,
            railsLesson.slug,
            railsLesson.title,
          );

          // Link lesson to course (if lesson belongs to a course)
          if (railsLesson.courseId !== null && railsLesson.position !== null) {
            const cbCourseId = getCourseCbId(railsLesson.courseId);
            if (cbCourseId) {
              await linkLessonToCourse(
                cbCourseId,
                lessonResource.id,
                railsLesson.position,
              );
            }
          }

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
  closeMigrationDb();

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
