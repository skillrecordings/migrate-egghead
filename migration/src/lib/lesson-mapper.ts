/**
 * Lesson mapper: Rails → Coursebuilder ContentResource
 *
 * Handles transformation of lesson data from Rails PostgreSQL + SQLite Mux data
 * into Coursebuilder's ContentResource format.
 *
 * POC Learnings Applied:
 * - Use @paralleldrive/cuid2 for ID generation
 * - Use @portabletext/markdown for Sanity content
 * - Handle both Sanity (modern) and Rails-only (legacy) lessons
 * - Extract Mux playback IDs from Rails HLS URLs or SQLite
 * - Mark lessons without videos as 'retired'
 */

import { createId } from "@paralleldrive/cuid2";
import { portableTextToMarkdown as convertPortableTextToMarkdown } from "@portabletext/markdown";
import Database from "bun:sqlite";
import type { Sql } from "postgres";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

/** Rails lesson record (from PostgreSQL) */
export const RailsLessonSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(), // Rails uses 'summary', not 'description'
  duration: z.number().nullable(),
  state: z.string(),
  visibilityState: z.string().nullable(),
  freeAccess: z.boolean().nullable(),
  instructorId: z.number().nullable(),
  currentVideoHlsUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  // Tracklists join data (course linkage - canonical source)
  courseId: z.number().nullable(), // From tracklists.playlist_id (NULL = standalone lesson)
  position: z.number().nullable(), // From tracklists.row_order (lesson order in course)
});

export type RailsLesson = z.infer<typeof RailsLessonSchema>;

/** Sanity lesson metadata (optional, for modern lessons) */
export const SanityLessonSchema = z
  .object({
    _id: z.string(),
    _createdAt: z.string(),
    title: z.string(),
    slug: z.string(),
    description: z.any().nullable(), // Portable text
    body: z.any().nullable(), // Portable text
    thumbnailUrl: z.string().nullable(),
    collaborators: z
      .array(
        z.object({
          _id: z.string(),
          role: z.string(),
          person: z.object({
            _id: z.string(),
            name: z.string(),
            image: z.string().nullable(),
          }),
          eggheadInstructorId: z.number().nullable(),
        }),
      )
      .nullable(),
    softwareLibraries: z
      .array(
        z.object({
          name: z.string(),
          version: z.string().nullable(),
          url: z.string().nullable(),
        }),
      )
      .nullable(),
    resources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          type: z.string().nullable(),
        }),
      )
      .nullable(),
    eggheadLessonId: z.number().nullable(),
    railsLessonId: z.number().nullable(),
    state: z.string(),
  })
  .nullable();

export type SanityLesson = z.infer<typeof SanityLessonSchema>;

/** Mux video asset data */
export const MuxAssetSchema = z.object({
  muxAssetId: z.string().nullable(),
  muxPlaybackId: z.string().nullable(),
  source: z.enum(["rails_url", "sqlite", "none"]),
});

export type MuxAsset = z.infer<typeof MuxAssetSchema>;

/** Video resource to be created */
export const VideoResourceSchema = z.object({
  id: z.string(),
  type: z.literal("videoResource"),
  createdById: z.string(),
  fields: z.object({
    muxAssetId: z.string().nullable(),
    muxPlaybackId: z.string(),
    duration: z.number().nullable(),
    state: z.literal("ready"),
    legacyRailsLessonId: z.number(),
    legacySource: z.enum(["rails_url", "sqlite"]),
    migratedAt: z.string(),
    migratedFrom: z.enum(["rails_url", "sqlite"]),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type VideoResource = z.infer<typeof VideoResourceSchema>;

/** Lesson resource to be created */
export const LessonResourceSchema = z.object({
  id: z.string(),
  type: z.literal("lesson"),
  createdById: z.string(),
  fields: z
    .object({
      title: z.string(),
      slug: z.string(),
      description: z.string(),
      body: z.string().nullable(),
      state: z.string(),
      visibility: z.string(),
      duration: z.number().nullable(),
      videoResourceId: z.string().nullable(),
      thumbnailUrl: z.string().nullable(),
      freeAccess: z.boolean().nullable(),

      // Sanity-sourced rich fields (for modern lessons)
      collaborators: z
        .array(
          z.object({
            userId: z.string(),
            role: z.string(),
            eggheadInstructorId: z.number().nullable(),
          }),
        )
        .nullable(),
      softwareLibraries: z
        .array(
          z.object({
            name: z.string(),
            version: z.string().nullable(),
            url: z.string().nullable(),
          }),
        )
        .nullable(),
      resources: z
        .array(
          z.object({
            title: z.string(),
            url: z.string(),
            type: z.string().nullable(),
          }),
        )
        .nullable(),

      // Legacy tracking
      legacyRailsId: z.number(),
      legacySanityId: z.string().nullable(),
      legacySeriesId: z.number().nullable(), // DEPRECATED - kept for reference only

      // Course linkage (from tracklists)
      courseId: z.number().nullable(), // Course this lesson belongs to
      position: z.number().nullable(), // Position in course (from tracklists.row_order)

      // Retirement handling
      retiredReason: z.string().nullable(),
      retiredAt: z.string().nullable(),

      // Migration metadata
      migratedAt: z.string(),
      migratedFrom: z.enum(["sanity", "rails"]),
    })
    .passthrough(), // Allow extra fields for migration metadata
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type LessonResource = z.infer<typeof LessonResourceSchema>;

// ============================================================================
// Mux Asset Resolution
// ============================================================================

/**
 * Extract Mux playback ID from Rails HLS URL
 * Example: https://stream.mux.com/abc123.m3u8 → abc123
 */
export function extractMuxPlaybackIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/stream\.mux\.com\/([^.]+)\.m3u8/);
  return match ? match[1] : null;
}

/**
 * Get Mux asset data for a lesson
 *
 * Tries Rails current_video_hls_url first, falls back to SQLite for legacy videos.
 */
export async function getMuxAssetForLesson(
  railsLesson: RailsLesson,
  sqliteDb: Database | null,
): Promise<MuxAsset> {
  // Try Rails HLS URL first (modern lessons)
  const muxPlaybackId = extractMuxPlaybackIdFromUrl(
    railsLesson.currentVideoHlsUrl,
  );

  if (muxPlaybackId) {
    return {
      muxAssetId: null, // Not available in HLS URL
      muxPlaybackId,
      source: "rails_url",
    };
  }

  // Fallback: Check SQLite for legacy videos (lesson ID ≤ 10388)
  if (railsLesson.id <= 10388 && sqliteDb) {
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

      const video = stmt.get(railsLesson.id) as {
        mux_asset_id: string | null;
        mux_playback_id: string | null;
        state: string;
      } | null;

      if (video?.mux_playback_id) {
        return {
          muxAssetId: video.mux_asset_id,
          muxPlaybackId: video.mux_playback_id,
          source: "sqlite",
        };
      }
    } catch (err) {
      console.error(`SQLite error for lesson ${railsLesson.id}:`, err);
    }
  }

  return {
    muxAssetId: null,
    muxPlaybackId: null,
    source: "none",
  };
}

// ============================================================================
// Portable Text Conversion
// ============================================================================

/**
 * Convert Sanity Portable Text to markdown
 * Uses @portabletext/markdown for proper conversion
 */
export function portableTextToMarkdown(
  blocks: Array<{
    _type: string;
    children?: Array<{ _type: string; text?: string }>;
  }>,
): string {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return "";
  }

  try {
    return convertPortableTextToMarkdown(blocks);
  } catch (err) {
    console.warn("Failed to convert portable text to markdown:", err);
    // Fallback to basic text extraction
    return blocks
      .filter((block) => block._type === "block" && block.children)
      .map(
        (block) =>
          block.children
            ?.filter((child) => child._type === "span")
            .map((child) => child.text || "")
            .join("") || "",
      )
      .join("\n\n");
  }
}

// ============================================================================
// Video Resource Mapping
// ============================================================================

/**
 * Create a video resource from a lesson + Mux asset
 */
export function createVideoResource(
  railsLesson: RailsLesson,
  muxAsset: MuxAsset,
  systemUserId: string,
): VideoResource | null {
  if (!muxAsset.muxPlaybackId) {
    return null; // No video available
  }

  return {
    id: createId(),
    type: "videoResource",
    createdById: systemUserId,
    fields: {
      muxAssetId: muxAsset.muxAssetId,
      muxPlaybackId: muxAsset.muxPlaybackId,
      duration: railsLesson.duration,
      state: "ready",
      legacyRailsLessonId: railsLesson.id,
      legacySource: muxAsset.source,
      migratedAt: new Date().toISOString(),
      migratedFrom: muxAsset.source,
    },
    createdAt: railsLesson.createdAt,
    updatedAt: new Date(),
  };
}

// ============================================================================
// Lesson Resource Mapping
// ============================================================================

/**
 * Create a lesson resource from Rails + optional Sanity data
 */
export function createLessonResource(
  railsLesson: RailsLesson,
  videoResource: VideoResource | null,
  systemUserId: string,
  sanityLesson?: SanityLesson,
): LessonResource {
  const hasVideo = !!videoResource;

  // Determine state
  let state = railsLesson.state;
  let retiredReason: string | null = null;
  let retiredAt: string | null = null;

  if (!hasVideo && state === "published") {
    state = "retired";
    retiredReason = "Video source file not found during migration";
    retiredAt = new Date().toISOString();
  }

  // Use Sanity data if available (modern lessons), else Rails data
  const title = sanityLesson?.title || railsLesson.title;
  const slug = sanityLesson?.slug || railsLesson.slug;
  const description = sanityLesson
    ? portableTextToMarkdown(sanityLesson.description)
    : railsLesson.summary || "";
  const body = sanityLesson ? portableTextToMarkdown(sanityLesson.body) : null;

  // Visibility mapping
  const visibility =
    railsLesson.visibilityState === "hidden"
      ? "unlisted"
      : railsLesson.freeAccess
        ? "public"
        : "pro";

  return {
    id: createId(),
    type: "lesson",
    createdById: systemUserId, // TODO: Map instructor_id to Coursebuilder user
    fields: {
      title,
      slug,
      description,
      body,
      state,
      visibility,
      duration: railsLesson.duration,
      videoResourceId: videoResource?.id || null,
      thumbnailUrl: sanityLesson?.thumbnailUrl || null,
      freeAccess: railsLesson.freeAccess,

      // Sanity rich fields
      collaborators:
        sanityLesson?.collaborators?.map((c) => ({
          userId: c.person._id,
          role: c.role,
          eggheadInstructorId: c.eggheadInstructorId,
        })) || null,
      softwareLibraries: sanityLesson?.softwareLibraries || null,
      resources: sanityLesson?.resources || null,

      // Legacy tracking
      legacyRailsId: railsLesson.id,
      legacySanityId: sanityLesson?._id || null,
      legacySeriesId: null, // REMOVED: series_id was deprecated, use courseId from tracklists

      // Course linkage (from tracklists)
      courseId: railsLesson.courseId,
      position: railsLesson.position,

      // Retirement
      retiredReason,
      retiredAt,

      // Migration metadata
      migratedAt: new Date().toISOString(),
      migratedFrom: sanityLesson ? "sanity" : "rails",
    },
    createdAt: railsLesson.createdAt,
    updatedAt: new Date(),
  };
}

// ============================================================================
// Idempotency Checks
// ============================================================================

/**
 * Check if a lesson was already migrated
 */
export async function checkLessonExists(
  db: Sql,
  railsLessonId: number,
): Promise<boolean> {
  const result = await db`
    SELECT 1 
    FROM egghead_ContentResource 
    WHERE type = 'lesson' 
      AND fields->>'legacyRailsId' = ${railsLessonId.toString()}
    LIMIT 1
  `;

  return result.length > 0;
}

/**
 * Check if a video resource was already created for a lesson
 */
export async function checkVideoResourceExists(
  db: Sql,
  railsLessonId: number,
): Promise<boolean> {
  const result = await db`
    SELECT 1 
    FROM egghead_ContentResource 
    WHERE type = 'videoResource' 
      AND fields->>'legacyRailsLessonId' = ${railsLessonId.toString()}
    LIMIT 1
  `;

  return result.length > 0;
}
