/**
 * POC Migration Script: Migrate a Legacy Rails-Only Course to Coursebuilder
 *
 * Course: Fix Common Git Mistakes (series_id: 401)
 * - 20 lessons
 * - Instructor: Kim Wickell (instructor_id: 210)
 * - NO Sanity document (pure legacy)
 *
 * This script demonstrates the full migration path for legacy content:
 * 1. Fetch course from Rails (series table)
 * 2. Fetch lessons via tracklists (ordered)
 * 3. Get Mux assets from Rails current_video_hls_url OR SQLite
 * 4. Create ContentResource type='lesson' with videoResource
 * 5. Create ContentResource type='course' with lessons linked
 */
import { createId } from "@paralleldrive/cuid2";
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "./src/lib/db.js";
import { runWithMysql } from "./src/lib/mysql.js";
import { header, subheader, table } from "./src/lib/print.js";
import { openVideosDb } from "./src/lib/sqlite.js";

const COURSE_ID = 401; // Fix Common Git Mistakes
const DRY_RUN = true; // Set to false to actually write to DB
const SYSTEM_USER_ID = "c903e890-0970-4d13-bdee-ea535aaaf69b"; // Joel's user for migration

interface RailsLesson {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  duration: number | null;
  state: string;
  visibilityState: string | null;
  instructorId: number;
  currentVideoHlsUrl: string | null;
  position: number; // from tracklist
}

interface RailsSeries {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  state: string;
  instructorId: number;
  instructorEmail: string;
  instructorFirstName: string;
  instructorLastName: string;
}

interface MuxAsset {
  assetId: string | null;
  playbackId: string | null;
  source: "rails" | "sqlite" | "none";
}

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  header("POC: Migrate Legacy Course to Coursebuilder");
  console.log(`Course ID: ${COURSE_ID}`);
  console.log(
    `Dry Run: ${DRY_RUN ? "YES (no DB writes)" : "NO (WILL WRITE TO DB)"}\n`,
  );

  // ============================================================
  // STEP 1: Fetch course from Rails
  // ============================================================
  subheader("Step 1: Fetch Course from Rails");

  const [series] = yield* sql<RailsSeries>`
    SELECT 
      s.id,
      s.slug,
      s.title,
      s.description,
      s.state,
      s.instructor_id,
      u.email as instructor_email,
      u.first_name as instructor_first_name,
      u.last_name as instructor_last_name
    FROM series s
    LEFT JOIN users u ON u.id = s.instructor_id
    WHERE s.id = ${COURSE_ID}
  `;

  if (!series) {
    throw new Error(`Series ${COURSE_ID} not found`);
  }

  console.log(`✅ Found series: "${series.title}"`);
  console.log(`   Slug: ${series.slug}`);
  console.log(
    `   Instructor: ${series.instructorFirstName} ${series.instructorLastName} (${series.instructorEmail})`,
  );
  console.log("");

  // ============================================================
  // STEP 2: Fetch lessons via tracklists (ordered)
  // ============================================================
  subheader("Step 2: Fetch Lessons (ordered by tracklist)");

  // First, find the playlist ID for this series
  // Some series have playlists, some use series_id directly
  const lessonsViaTracklist = yield* sql<RailsLesson>`
    SELECT 
      l.id,
      l.slug,
      l.title,
      l.summary,
      l.duration,
      l.state,
      l.visibility_state,
      l.instructor_id,
      l.current_video_hls_url,
      t.row_order as position
    FROM tracklists t
    INNER JOIN lessons l ON l.id = t.tracklistable_id
    WHERE t.playlist_id IN (
      SELECT id FROM playlists WHERE slug = ${series.slug}
    )
      AND t.tracklistable_type = 'Lesson'
    ORDER BY t.row_order
  `;

  // Fallback: if no tracklist, try series_id directly
  const lessonsViaSeries =
    lessonsViaTracklist.length === 0
      ? yield* sql<RailsLesson>`
    SELECT 
      l.id,
      l.slug,
      l.title,
      l.summary,
      l.duration,
      l.state,
      l.visibility_state,
      l.instructor_id,
      l.current_video_hls_url,
      0 as position
    FROM lessons l
    WHERE l.series_id = ${COURSE_ID}
      AND l.state = 'published'
    ORDER BY l.id
  `
      : [];

  const lessons =
    lessonsViaTracklist.length > 0 ? lessonsViaTracklist : lessonsViaSeries;

  console.log(`✅ Found ${lessons.length} lessons`);
  console.log(
    `   Source: ${lessonsViaTracklist.length > 0 ? "tracklists" : "series_id"}\n`,
  );

  table(
    lessons.slice(0, 5).map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title.substring(0, 50),
      position: l.position,
      duration: l.duration,
      hasVideo: l.currentVideoHlsUrl ? "✅" : "❌",
    })),
  );
  console.log(`... and ${lessons.length - 5} more\n`);

  // ============================================================
  // STEP 3: Get Mux assets for each lesson
  // ============================================================
  // STEP 3: Get Mux assets for each lesson
  // ============================================================
  subheader("Step 3: Resolve Mux Assets");

  const lessonsWithMux: Array<RailsLesson & { mux: MuxAsset }> = [];

  for (const lesson of lessons) {
    let mux: MuxAsset = { assetId: null, playbackId: null, source: "none" };

    // Try Rails current_video_hls_url first
    if (lesson.currentVideoHlsUrl) {
      // Extract playback ID from HLS URL
      // Format: https://stream.mux.com/{playback_id}.m3u8
      const match = lesson.currentVideoHlsUrl.match(
        /stream\.mux\.com\/([^.]+)/,
      );
      if (match) {
        mux = {
          assetId: null, // Not available in HLS URL
          playbackId: match[1],
          source: "rails",
        };
      }
    }

    // NOTE: SQLite lookup skipped due to better-sqlite3 build issues
    // For this POC, we're using a modern course (all lessons > 10388)
    // so all Mux assets are available via Rails current_video_hls_url

    lessonsWithMux.push({ ...lesson, mux });
  }

  const withMux = lessonsWithMux.filter((l) => l.mux.playbackId);
  const withoutMux = lessonsWithMux.filter((l) => !l.mux.playbackId);

  console.log(`✅ Mux Resolution:`);
  console.log(`   With Mux: ${withMux.length}/${lessons.length}`);
  console.log(
    `   From Rails: ${lessonsWithMux.filter((l) => l.mux.source === "rails").length}`,
  );
  console.log(
    `   From SQLite: ${lessonsWithMux.filter((l) => l.mux.source === "sqlite").length}`,
  );
  console.log(`   Missing: ${withoutMux.length}`);

  if (withoutMux.length > 0) {
    console.log("\n⚠️  Lessons missing Mux assets:");
    table(
      withoutMux.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title.substring(0, 60),
      })),
    );
  }
  console.log("");

  // ============================================================
  // STEP 4: Generate Coursebuilder ContentResource records
  // ============================================================
  subheader("Step 4: Generate ContentResource Records");

  // 4a. Video Resources
  const videoResources = withMux.map((lesson) => ({
    id: createId(),
    type: "videoResource" as const,
    createdById: SYSTEM_USER_ID,
    fields: {
      muxAssetId: lesson.mux.assetId,
      muxPlaybackId: lesson.mux.playbackId ?? "",
      duration: lesson.duration,
      state: "ready" as const,
      legacyRailsLessonId: lesson.id,
      legacySource: lesson.mux.source,
      migratedAt: new Date().toISOString(),
      migratedFrom: lesson.mux.source,
    },
  }));

  console.log(`Generated ${videoResources.length} videoResource records`);

  // 4b. Lesson Resources (link to videoResource)
  const lessonResources = withMux.map((lesson, index) => ({
    id: createId(),
    type: "lesson" as const,
    createdById: SYSTEM_USER_ID, // TODO: Map instructor_id to Coursebuilder user
    fields: {
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.summary || "",
      state: lesson.state,
      visibility: lesson.visibilityState || "public",
      duration: lesson.duration,
      videoResourceId: videoResources[index].id,
      instructorId: lesson.instructorId, // TODO: Map to Coursebuilder user ID
      courseId: null, // Will be set after course creation
      legacyRailsId: lesson.id,
      legacySeriesId: COURSE_ID,
      migratedAt: new Date().toISOString(),
      migratedFrom: "rails" as const,
    },
  }));

  console.log(`Generated ${lessonResources.length} lesson records`);

  // 4c. Course Resource
  const courseResource = {
    id: createId(),
    type: "course" as const,
    createdById: SYSTEM_USER_ID, // TODO: Map instructor_id to Coursebuilder user
    fields: {
      title: series.title,
      slug: series.slug,
      description: series.description || "",
      state: series.state,
      visibility: "public",
      instructorId: series.instructorId,
      lessonIds: lessonResources.map((l) => l.id),
      legacyRailsId: COURSE_ID,
      migratedAt: new Date().toISOString(),
      migratedFrom: "rails" as const,
    },
  };

  console.log(`Generated course record: "${courseResource.fields.title}"`);

  // Update lesson courseId references
  for (const lesson of lessonResources) {
    lesson.fields.courseId = courseResource.id;
  }

  console.log("");

  // ============================================================
  // STEP 5: Create ContentResourceResource links (course → lessons)
  // ============================================================
  subheader("Step 5: Generate ContentResourceResource Links");

  const courseToLessonLinks = lessonResources.map((lesson, index) => ({
    resourceOfId: courseResource.id,
    resourceId: lesson.id,
    position: index,
    metadata: {
      legacyTracklistPosition: withMux[index].position,
    },
  }));

  const lessonToVideoLinks = lessonResources.map((lesson, index) => ({
    resourceOfId: lesson.id,
    resourceId: videoResources[index].id,
    position: 0,
    metadata: {},
  }));

  console.log(`Generated ${courseToLessonLinks.length} course→lesson links`);
  console.log(`Generated ${lessonToVideoLinks.length} lesson→video links\n`);

  // ============================================================
  // STEP 6: Write to Coursebuilder DB (if not dry run)
  // ============================================================
  if (!DRY_RUN) {
    subheader("Step 6: Writing to Coursebuilder Database");

    yield* Effect.promise(() =>
      runWithMysql(
        Effect.gen(function* () {
          const mysqlClient = yield* SqlClient.SqlClient;

          // Insert video resources
          for (const video of videoResources) {
            yield* mysqlClient`
              INSERT INTO egghead_ContentResource (id, type, createdById, fields, createdAt, updatedAt)
              VALUES (
                ${video.id},
                ${video.type},
                ${video.createdById},
                ${JSON.stringify(video.fields)},
                NOW(),
                NOW()
              )
            `;
          }
          console.log(
            `✅ Inserted ${videoResources.length} videoResource records`,
          );

          // Insert lessons
          for (const lesson of lessonResources) {
            yield* mysqlClient`
              INSERT INTO egghead_ContentResource (id, type, createdById, fields, createdAt, updatedAt)
              VALUES (
                ${lesson.id},
                ${lesson.type},
                ${lesson.createdById},
                ${JSON.stringify(lesson.fields)},
                NOW(),
                NOW()
              )
            `;
          }
          console.log(`✅ Inserted ${lessonResources.length} lesson records`);

          // Insert course
          yield* mysqlClient`
            INSERT INTO egghead_ContentResource (id, type, createdById, fields, createdAt, updatedAt)
            VALUES (
              ${courseResource.id},
              ${courseResource.type},
              ${courseResource.createdById},
              ${JSON.stringify(courseResource.fields)},
              NOW(),
              NOW()
            )
          `;
          console.log(`✅ Inserted course record`);

          // Insert links
          for (const link of [...courseToLessonLinks, ...lessonToVideoLinks]) {
            yield* mysqlClient`
              INSERT INTO egghead_ContentResourceResource (resourceOfId, resourceId, position, metadata, createdAt, updatedAt)
              VALUES (
                ${link.resourceOfId},
                ${link.resourceId},
                ${link.position},
                ${JSON.stringify(link.metadata)},
                NOW(),
                NOW()
              )
            `;
          }
          console.log(
            `✅ Inserted ${courseToLessonLinks.length + lessonToVideoLinks.length} resource links`,
          );
        }),
      ),
    );

    console.log("\n✅ Migration complete!");
    console.log(`   View at: /courses/${series.slug}`);
  } else {
    subheader("Step 6: Dry Run - No DB Writes");
    console.log("✅ Dry run complete. Set DRY_RUN=false to write to database.");
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n");
  header("Migration Summary");

  console.log(`Course: ${series.title}`);
  console.log(`Slug: ${series.slug}`);
  console.log(`Lessons: ${lessons.length}`);
  console.log(`Lessons with Mux: ${withMux.length}/${lessons.length}`);
  console.log(`Lessons without Mux: ${withoutMux.length}`);
  console.log("");
  console.log("Generated Records:");
  console.log(`  - 1 course (ContentResource type='course')`);
  console.log(
    `  - ${lessonResources.length} lessons (ContentResource type='lesson')`,
  );
  console.log(
    `  - ${videoResources.length} videos (ContentResource type='videoResource')`,
  );
  console.log(`  - ${courseToLessonLinks.length} course→lesson links`);
  console.log(`  - ${lessonToVideoLinks.length} lesson→video links`);
  console.log("");

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN - No database writes performed");
    console.log("   Set DRY_RUN=false in script to execute migration");
  } else {
    console.log("✅ Migration written to database");
    console.log(`   View at: /courses/${series.slug}`);
  }
});

runWithDb(program).catch(console.error);
