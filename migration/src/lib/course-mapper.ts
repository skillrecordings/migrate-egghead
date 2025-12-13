/**
 * Course Mapper: Rails playlists → Coursebuilder ContentResource
 *
 * Transforms Rails `playlists` table records (visibility_state='indexed')
 * into Coursebuilder `ContentResource` with type='course'
 */

import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

/**
 * Rails playlist record (from PostgreSQL)
 * Official courses: playlists WHERE visibility_state = 'indexed'
 */
export const RailsPlaylistSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  summary: z.string().nullable(),
  tagline: z.string().nullable(),
  state: z.string(), // 'published', 'retired', etc.
  visibilityState: z.string(), // 'indexed' = official course
  accessState: z.string(), // 'pro', 'free'
  ownerId: z.number(), // FK to users.id (instructor lookup via instructors.user_id)
  publishedAt: z.date().nullable(),
  squareCoverFileName: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RailsPlaylist = z.infer<typeof RailsPlaylistSchema>;

/**
 * Coursebuilder ContentResource fields for a course
 */
export const CourseFieldsSchema = z
  .object({
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    summary: z.string().optional(),
    tagline: z.string().optional(),
    state: z.enum(["published", "draft", "retired"]),
    visibility: z.enum(["public", "pro", "unlisted"]).default("public"),
    image: z.string().optional(),
    repo: z.string().optional(),

    // Pricing metadata
    price: z.number().optional(),
    purchasePrice: z.number().optional(),
    freeForever: z.boolean().default(false),

    // Completion status
    isComplete: z.boolean().default(false),

    // Legacy Rails fields
    legacyRailsPlaylistId: z.number().optional(),

    // Migration metadata
    migratedAt: z.string(),
    migratedFrom: z.literal("rails"),
  })
  .passthrough(); // Allow extra fields during migration

export type CourseFields = z.infer<typeof CourseFieldsSchema>;

/**
 * Full Coursebuilder ContentResource for a course
 */
export const CourseResourceSchema = z.object({
  id: z.string(),
  type: z.literal("course"),
  createdById: z.string(), // Must be set (use instructor user ID or system user)
  fields: CourseFieldsSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CourseResource = z.infer<typeof CourseResourceSchema>;

// ============================================================================
// Mapping Functions
// ============================================================================

/**
 * Maps Rails playlist state to Coursebuilder course state
 *
 * Rails states: 'published', 'draft', 'archived', etc.
 * CB states: 'published', 'draft', 'retired'
 */
function mapCourseState(railsState: string): "published" | "draft" | "retired" {
  switch (railsState) {
    case "published":
      return "published";
    case "draft":
      return "draft";
    case "archived":
    case "retired":
      return "retired";
    default:
      return "draft"; // Default to draft for unknown states
  }
}

/**
 * Determines course visibility based on access_state
 *
 * - accessState = 'free' → 'public'
 * - accessState = 'pro' → 'pro'
 * - Default → 'public'
 */
function mapPlaylistVisibility(
  accessState: string,
): "public" | "pro" | "unlisted" {
  switch (accessState) {
    case "pro":
      return "pro";
    case "free":
      return "public";
    default:
      return "public";
  }
}

/**
 * Generates course image URL from Rails square_cover_file_name
 *
 * Rails stores covers at: https://egghead.io/rails/active_storage/blobs/<key>/<filename>
 * For now, we'll preserve the filename and reconstruct URL later if needed.
 */
function mapCourseImage(
  squareCoverFileName: string | null,
): string | undefined {
  if (!squareCoverFileName) return undefined;

  // TODO: Reconstruct full URL when we know the Active Storage pattern
  // For now, just store the filename as a placeholder
  return squareCoverFileName;
}

/**
 * Main mapper: Rails playlist → Coursebuilder ContentResource
 *
 * @param playlist - Rails playlist record (visibility_state='indexed')
 * @param instructorUserId - Coursebuilder User ID for the instructor (mapped from playlist.owner_id → instructors.user_id)
 * @returns Coursebuilder ContentResource for course
 */
export function mapPlaylistToCourse(
  playlist: RailsPlaylist,
  instructorUserId: string,
): CourseResource {
  const courseId = createId();

  const fields: CourseFields = {
    slug: playlist.slug,
    title: playlist.title,
    description: playlist.description || undefined,
    summary: playlist.summary || undefined,
    tagline: playlist.tagline || undefined,
    state: mapCourseState(playlist.state),
    visibility: mapPlaylistVisibility(playlist.accessState),
    image: mapCourseImage(playlist.squareCoverFileName),

    // Playlists don't have these fields (series-specific)
    repo: undefined,
    price: undefined,
    purchasePrice: undefined,
    freeForever: playlist.accessState === "free",
    isComplete: playlist.state === "published",

    // Legacy tracking
    legacyRailsPlaylistId: playlist.id,

    // Migration metadata
    migratedAt: new Date().toISOString(),
    migratedFrom: "rails",
  };

  // Validate fields before returning
  const validatedFields = CourseFieldsSchema.parse(fields);

  return {
    id: courseId,
    type: "course",
    createdById: instructorUserId,
    fields: validatedFields,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
  };
}

/**
 * Generates SQL INSERT statement for a course
 *
 * @param course - Coursebuilder ContentResource for course
 * @returns SQL INSERT statement (parameterized for safety)
 */
export function generateCourseInsertSQL(course: CourseResource): {
  sql: string;
  params: unknown[];
} {
  return {
    sql: `
      INSERT INTO egghead_ContentResource (id, type, createdById, fields, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `,
    params: [
      course.id,
      course.type,
      course.createdById,
      JSON.stringify(course.fields),
      course.createdAt,
      course.updatedAt,
    ],
  };
}

// ============================================================================
// Exports
// ============================================================================
// Schemas are already exported inline above
