/**
 * POC Migration Script: Modern Course (Claude Code Essentials)
 *
 * Migrates "Claude Code Essentials" from Sanity + Rails → Coursebuilder
 *
 * **Course**: claude-code-essentials~jc0n6 (17 lessons)
 * **Source**: Sanity (metadata) + Rails (video URLs)
 *
 * Data Flow:
 * 1. Fetch course from Sanity (GROQ)
 * 2. Fetch lessons from Sanity (ordered via resources[])
 * 3. For each lesson:
 *    - Get railsLessonId from Sanity
 *    - Query Rails for video URL (current_video_hls_url)
 *    - Extract muxPlaybackId from HLS URL
 *    - Create ContentResource type='lesson'
 *    - Create ContentResource type='videoResource'
 *    - Link lesson→video via ContentResourceResource
 * 4. Create ContentResource type='course'
 * 5. Link course→lessons via ContentResourceResource
 *
 * Output:
 * - Summary of migrated course + lessons
 * - Verification checklist
 */

import { createClient } from "@sanity/client";
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "./src/lib/db.js";
import { runWithMysql } from "./src/lib/mysql.js";
import Database from "better-sqlite3";

// Sanity client configuration
const sanityClient = createClient({
  projectId: "sb1i5dlc",
  dataset: "production",
  useCdn: false,
  apiVersion: "2024-01-01",
});

// Migration user ID (Joel's account in Coursebuilder)
const MIGRATION_USER_ID = "c903e890-0970-4d13-bdee-ea535aaaf69b";

// SQLite database for legacy video migration tracking (optional)
let sqliteDb: Database.Database | null = null;
try {
  sqliteDb = new Database("../download-egghead/egghead_videos.db", {
    readonly: true,
  });
  console.log("✅ SQLite database loaded for legacy video fallback");
} catch (err) {
  console.warn(
    "⚠️  SQLite database not available (legacy video fallback disabled)",
  );
  console.warn("   This is OK for modern courses with Rails video URLs");
}

// Types
interface SanityCourse {
  _id: string;
  _createdAt: string;
  title: string;
  slug: string;
  description: any; // Portable text
  image?: {
    url: string;
  };
  resources: Array<{
    _ref: string;
    _key: string;
  }>;
  collaborators?: Array<{
    _id: string;
    role: string;
    person: {
      _id: string;
      name: string;
      image?: string;
    };
    eggheadInstructorId?: number;
  }>;
  softwareLibraries?: Array<{
    name: string;
    version?: string;
    url?: string;
  }>;
  eggheadSeriesId?: number;
  state: string;
}

interface SanityLesson {
  _id: string;
  _createdAt: string;
  title: string;
  slug: string;
  description: any; // Portable text
  body?: any; // Portable text
  thumbnailUrl?: string;
  collaborators?: Array<{
    _id: string;
    role: string;
    person: {
      _id: string;
      name: string;
      image?: string;
    };
    eggheadInstructorId?: number;
  }>;
  softwareLibraries?: Array<{
    name: string;
    version?: string;
    url?: string;
  }>;
  resources?: Array<{
    title: string;
    url: string;
    type?: string;
  }>;
  eggheadLessonId?: number;
  railsLessonId?: number;
  state: string;
}

interface RailsLesson {
  id: number;
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  duration?: number;
  state: string;
  visibilityState?: string;
  currentVideoHlsUrl?: string;
  instructorId: number;
}

interface VideoAsset {
  muxAssetId?: string;
  muxPlaybackId?: string;
  source: "rails_url" | "sqlite" | "unknown";
}

/**
 * Extract Mux playback ID from Rails HLS URL
 * Example: https://stream.mux.com/abc123.m3u8 → abc123
 */
function extractMuxPlaybackIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/stream\.mux\.com\/([^.]+)\.m3u8/);
  return match ? match[1] : null;
}

/**
 * Generate a simple CUID-like ID (20 chars)
 * In production, use @paralleldrive/cuid2
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${randomPart}`.substring(0, 20);
}

/**
 * Convert Sanity Portable Text to plain markdown
 * For now, just extract text content
 */
function portableTextToMarkdown(blocks: any): string {
  if (!blocks || !Array.isArray(blocks)) return "";

  return blocks
    .map((block: any) => {
      if (block._type === "block" && block.children) {
        return block.children.map((child: any) => child.text || "").join("");
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Step 1: Fetch course from Sanity
 */
async function fetchCourseFromSanity(
  slug: string,
): Promise<SanityCourse | null> {
  console.log(`\n📦 Fetching course from Sanity: ${slug}`);

  const query = `*[_type == "course" && slug.current == $slug][0] {
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    description,
    "image": image.asset->url,
    resources[]-> {
      _id,
      _key,
      _type,
      title,
      "slug": slug.current
    },
    collaborators[]-> {
      _id,
      role,
      "person": person-> {
        _id,
        name,
        "image": image.url
      },
      eggheadInstructorId
    },
    softwareLibraries,
    eggheadSeriesId,
    state
  }`;

  const course = await sanityClient.fetch(query, { slug });

  if (!course) {
    console.error(`❌ Course not found in Sanity: ${slug}`);
    return null;
  }

  console.log(`✅ Found course: "${course.title}"`);
  console.log(`   - ID: ${course._id}`);
  console.log(`   - Lessons: ${course.resources?.length || 0}`);
  console.log(`   - State: ${course.state}`);

  return course;
}

/**
 * Step 2: Fetch lessons from Sanity (ordered)
 */
async function fetchLessonsFromSanity(
  lessonRefs: Array<{ _ref: string }>,
): Promise<SanityLesson[]> {
  console.log(`\n📚 Fetching ${lessonRefs.length} lessons from Sanity`);

  const lessonIds = lessonRefs.map((ref) => ref._ref);

  const query = `*[_type == "lesson" && _id in $ids] {
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    description,
    body,
    thumbnailUrl,
    collaborators[]-> {
      _id,
      role,
      "person": person-> {
        _id,
        name,
        "image": image.url
      },
      eggheadInstructorId
    },
    softwareLibraries,
    resources,
    eggheadLessonId,
    railsLessonId,
    state
  }`;

  const lessons = await sanityClient.fetch(query, { ids: lessonIds });

  // Preserve order from course.resources[]
  const orderedLessons = lessonRefs
    .map((ref) => lessons.find((l: SanityLesson) => l._id === ref._ref))
    .filter(Boolean) as SanityLesson[];

  console.log(`✅ Fetched ${orderedLessons.length} lessons`);
  orderedLessons.forEach((lesson, idx) => {
    console.log(
      `   ${idx + 1}. ${lesson.title} (ID: ${lesson.railsLessonId || lesson.eggheadLessonId})`,
    );
  });

  return orderedLessons;
}

/**
 * Step 3: Get video data for a lesson
 */
async function getVideoDataForLesson(
  railsLessonId: number | undefined,
): Promise<VideoAsset> {
  if (!railsLessonId) {
    console.warn(`   ⚠️  No Rails lesson ID - cannot fetch video`);
    return { source: "unknown" };
  }

  // Query Rails for video URL
  const railsProgram = Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql`
      SELECT 
        id,
        slug,
        title,
        duration,
        state,
        visibility_state as "visibilityState",
        current_video_hls_url as "currentVideoHlsUrl",
        instructor_id as "instructorId"
      FROM lessons
      WHERE id = ${railsLessonId}
      LIMIT 1
    `;
    return rows[0] as RailsLesson | undefined;
  });

  const railsLesson = await runWithDb(railsProgram);

  if (!railsLesson) {
    console.warn(`   ⚠️  Lesson ${railsLessonId} not found in Rails`);
    return { source: "unknown" };
  }

  // Extract Mux playback ID from HLS URL
  const muxPlaybackId = extractMuxPlaybackIdFromUrl(
    railsLesson.currentVideoHlsUrl || null,
  );

  if (muxPlaybackId) {
    console.log(`   ✅ Video URL found (Mux playback ID: ${muxPlaybackId})`);
    return {
      muxPlaybackId,
      source: "rails_url",
    };
  }

  // Fallback: Check SQLite for legacy videos (lesson ID ≤ 10388)
  if (railsLessonId <= 10388 && sqliteDb) {
    try {
      const stmt = sqliteDb.prepare(`
        SELECT 
          v.mux_asset_id,
          v.mux_playback_id,
          v.state
        FROM videos v
        INNER JOIN lessons l ON l.video_id = v.id
        WHERE l.id = ?
          AND v.mux_playback_id IS NOT NULL
        LIMIT 1
      `);
      const video = stmt.get(railsLessonId) as any;

      if (video) {
        console.log(
          `   ✅ Video found in SQLite (playback ID: ${video.mux_playback_id})`,
        );
        return {
          muxAssetId: video.mux_asset_id,
          muxPlaybackId: video.mux_playback_id,
          source: "sqlite",
        };
      }
    } catch (err) {
      console.error(`   ❌ SQLite error for lesson ${railsLessonId}:`, err);
    }
  }

  console.warn(`   ⚠️  No video found for lesson ${railsLessonId}`);
  return { source: "unknown" };
}

/**
 * Step 4: Insert data into Coursebuilder (MySQL)
 */
async function migrateToCoursebuilder(
  course: SanityCourse,
  lessons: SanityLesson[],
): Promise<void> {
  console.log(`\n🚀 Migrating to Coursebuilder...`);

  // Gather video data for all lessons first (outside Effect)
  console.log(`\n📹 Gathering video data for ${lessons.length} lessons...`);
  const videoDataMap = new Map<string, VideoAsset>();
  for (const lesson of lessons) {
    const videoData = await getVideoDataForLesson(
      lesson.railsLessonId || lesson.eggheadLessonId,
    );
    videoDataMap.set(lesson._id, videoData);
  }

  const mysqlProgram = Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    // --- Create video resources ---
    console.log(`\n1️⃣  Creating video resources...`);
    const videoResourceIds: Map<string, string> = new Map(); // lessonId → videoResourceId

    for (const lesson of lessons) {
      const videoData = videoDataMap.get(lesson._id);

      if (videoData?.muxPlaybackId) {
        const videoResourceId = generateId();

        const fields = {
          muxPlaybackId: videoData.muxPlaybackId,
          muxAssetId: videoData.muxAssetId || null,
          state: "ready",
          migratedAt: new Date().toISOString(),
          migratedFrom: videoData.source,
          legacyRailsLessonId: lesson.railsLessonId || lesson.eggheadLessonId,
        };

        yield* sql`
          INSERT INTO egghead_ContentResource (id, type, createdById, fields, createdAt, updatedAt)
          VALUES (
            ${videoResourceId},
            'videoResource',
            ${MIGRATION_USER_ID},
            ${JSON.stringify(fields)},
            NOW(),
            NOW()
          )
        `;

        videoResourceIds.set(lesson._id, videoResourceId);
        console.log(`   ✅ Video resource created for "${lesson.title}"`);
      } else {
        console.warn(
          `   ⚠️  Skipping video for "${lesson.title}" (no Mux data)`,
        );
      }
    }

    // --- Create lesson resources ---
    console.log(`\n2️⃣  Creating lesson resources...`);
    const lessonResourceIds: Map<string, string> = new Map(); // lessonId → lessonResourceId

    for (const lesson of lessons) {
      const lessonResourceId = generateId();
      const videoResourceId = videoResourceIds.get(lesson._id);

      const fields = {
        title: lesson.title,
        slug: lesson.slug,
        description: portableTextToMarkdown(lesson.description),
        body: portableTextToMarkdown(lesson.body),
        state: lesson.state,
        visibility: "public", // Default, can be updated later
        thumbnailUrl: lesson.thumbnailUrl || null,
        videoResourceId: videoResourceId || null,

        // Sanity-sourced rich fields
        collaborators: lesson.collaborators?.map((c) => ({
          userId: c.person._id,
          role: c.role,
          eggheadInstructorId: c.eggheadInstructorId,
        })),
        softwareLibraries: lesson.softwareLibraries || [],
        resources: lesson.resources || [],

        // Legacy IDs
        legacyRailsId: lesson.railsLessonId || lesson.eggheadLessonId,
        legacySanityId: lesson._id,

        // Migration metadata
        migratedAt: new Date().toISOString(),
        migratedFrom: "sanity",
      };

      yield* sql`
        INSERT INTO egghead_ContentResource (id, type, createdById, fields, createdAt, updatedAt)
        VALUES (
          ${lessonResourceId},
          'lesson',
          ${MIGRATION_USER_ID},
          ${JSON.stringify(fields)},
          ${new Date(lesson._createdAt)},
          NOW()
        )
      `;

      lessonResourceIds.set(lesson._id, lessonResourceId);
      console.log(`   ✅ Lesson created: "${lesson.title}"`);

      // Link lesson → video
      if (videoResourceId) {
        yield* sql`
          INSERT INTO egghead_ContentResourceResource (resourceOfId, resourceId, position)
          VALUES (
            ${lessonResourceId},
            ${videoResourceId},
            0
          )
        `;
      }
    }

    // --- Create course resource ---
    console.log(`\n3️⃣  Creating course resource...`);
    const courseResourceId = generateId();

    const courseFields = {
      title: course.title,
      slug: course.slug,
      description: portableTextToMarkdown(course.description),
      state: course.state,
      image: course.image || null,

      // Sanity-sourced rich fields
      collaborators: course.collaborators?.map((c) => ({
        userId: c.person._id,
        role: c.role,
        eggheadInstructorId: c.eggheadInstructorId,
      })),
      softwareLibraries: course.softwareLibraries || [],

      // Legacy IDs
      legacyRailsSeriesId: course.eggheadSeriesId,
      legacySanityId: course._id,

      // Migration metadata
      migratedAt: new Date().toISOString(),
      migratedFrom: "sanity",
    };

    yield* sql`
      INSERT INTO egghead_ContentResource (id, type, createdById, fields, createdAt, updatedAt)
      VALUES (
        ${courseResourceId},
        'course',
        ${MIGRATION_USER_ID},
        ${JSON.stringify(courseFields)},
        ${new Date(course._createdAt)},
        NOW()
      )
    `;

    console.log(`   ✅ Course created: "${course.title}"`);

    // --- Link course → lessons ---
    console.log(`\n4️⃣  Linking course to lessons...`);
    let position = 0;
    for (const lesson of lessons) {
      const lessonResourceId = lessonResourceIds.get(lesson._id);
      if (lessonResourceId) {
        yield* sql`
          INSERT INTO egghead_ContentResourceResource (resourceOfId, resourceId, position)
          VALUES (
            ${courseResourceId},
            ${lessonResourceId},
            ${position}
          )
        `;
        position++;
      }
    }

    console.log(`   ✅ Linked ${position} lessons to course`);

    return {
      courseId: courseResourceId,
      lessonCount: lessonResourceIds.size,
      videoCount: videoResourceIds.size,
    };
  });

  const result = await runWithMysql(mysqlProgram);

  console.log(`\n✨ Migration complete!`);
  console.log(`   Course ID: ${result.courseId}`);
  console.log(`   Lessons created: ${result.lessonCount}`);
  console.log(`   Videos created: ${result.videoCount}`);
  console.log(`\n📍 View at: /courses/${course.slug}`);
}

/**
 * Main execution
 */
async function main() {
  const COURSE_SLUG = "claude-code-essentials~jc0n6";

  console.log(`
╔════════════════════════════════════════════════════════════╗
║  POC Migration: Modern Course                              ║
║  Course: Claude Code Essentials                            ║
║  Slug: ${COURSE_SLUG.padEnd(45)}║
╚════════════════════════════════════════════════════════════╝
  `);

  try {
    // Step 1: Fetch course from Sanity
    const course = await fetchCourseFromSanity(COURSE_SLUG);
    if (!course) {
      process.exit(1);
    }

    // Step 2: Fetch lessons from Sanity (ordered)
    // The query already dereferenced resources[]-> so we have full lesson objects
    const lessonRefs =
      course.resources?.filter((r: any) => r._id && r._type === "lesson") || [];
    if (lessonRefs.length === 0) {
      console.error(`❌ No lessons found in course resources`);
      process.exit(1);
    }

    // Convert already-fetched lessons to refs for fetchLessonsFromSanity
    const refObjects = lessonRefs.map((r: any) => ({ _ref: r._id }));
    const lessons = await fetchLessonsFromSanity(refObjects);
    if (lessons.length === 0) {
      console.error(`❌ Failed to fetch lessons from Sanity`);
      process.exit(1);
    }

    // Step 3: Migrate to Coursebuilder
    await migrateToCoursebuilder(course, lessons);

    // Verification checklist
    console.log(`\n
╔════════════════════════════════════════════════════════════╗
║  Verification Checklist                                    ║
╚════════════════════════════════════════════════════════════╝

[ ] All ${lessons.length} lessons created with correct slugs
[ ] All videos have muxPlaybackId
[ ] Course→lesson ordering matches Sanity
[ ] Can view at /courses/${COURSE_SLUG}
[ ] Lesson pages load correctly
[ ] Video player works on each lesson
[ ] Collaborators displayed correctly
[ ] Software libraries shown
    `);
  } catch (err) {
    console.error(`\n❌ Migration failed:`, err);
    process.exit(1);
  } finally {
    if (sqliteDb) {
      sqliteDb.close();
    }
  }
}

main().catch(console.error);
