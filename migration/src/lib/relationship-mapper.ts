/**
 * ContentResourceResource Relationship Mapper
 *
 * Utilities for creating relationship records between content resources.
 * Primary use cases:
 * - Course → Lesson links (ordered by position)
 * - Lesson → VideoResource links (1:1)
 *
 * @module relationship-mapper
 */

/**
 * ContentResourceResource record structure
 */
export interface ContentResourceResource {
  resourceOfId: string; // Parent ID (course or lesson)
  resourceId: string; // Child ID (lesson or video)
  position: number; // Order within parent (0-indexed)
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Creates links from a course to its lessons with position ordering.
 *
 * Position is 0-indexed and follows the order of lessonIds array.
 *
 * @param courseId - Parent course ContentResource ID
 * @param lessonIds - Array of lesson ContentResource IDs (ordered)
 * @returns Array of relationship records
 *
 * @example
 * ```typescript
 * const links = createCourseToLessonLinks(
 *   "course_clz123",
 *   ["lesson_clz456", "lesson_clz789", "lesson_clz012"]
 * );
 * // Returns:
 * // [
 * //   { resourceOfId: "course_clz123", resourceId: "lesson_clz456", position: 0 },
 * //   { resourceOfId: "course_clz123", resourceId: "lesson_clz789", position: 1 },
 * //   { resourceOfId: "course_clz123", resourceId: "lesson_clz012", position: 2 }
 * // ]
 * ```
 */
export function createCourseToLessonLinks(
  courseId: string,
  lessonIds: string[],
): ContentResourceResource[] {
  if (!courseId) {
    throw new Error("courseId is required");
  }

  if (!Array.isArray(lessonIds)) {
    throw new Error("lessonIds must be an array");
  }

  return lessonIds.map((lessonId, index) => ({
    resourceOfId: courseId,
    resourceId: lessonId,
    position: index,
  }));
}

/**
 * Creates a 1:1 link from a lesson to its video resource.
 *
 * Position is always 0 for lesson→video links (1:1 relationship).
 *
 * @param lessonId - Parent lesson ContentResource ID
 * @param videoId - Child videoResource ContentResource ID
 * @returns Single relationship record
 *
 * @example
 * ```typescript
 * const link = createLessonToVideoLink("lesson_clz456", "video_clz999");
 * // Returns:
 * // { resourceOfId: "lesson_clz456", resourceId: "video_clz999", position: 0 }
 * ```
 */
export function createLessonToVideoLink(
  lessonId: string,
  videoId: string,
): ContentResourceResource {
  if (!lessonId) {
    throw new Error("lessonId is required");
  }

  if (!videoId) {
    throw new Error("videoId is required");
  }

  return {
    resourceOfId: lessonId,
    resourceId: videoId,
    position: 0, // Always 0 for 1:1 lesson→video relationship
  };
}

/**
 * Generates MySQL INSERT statements for relationship records.
 *
 * Uses ON DUPLICATE KEY UPDATE for idempotency (safe to re-run).
 *
 * @param links - Array of relationship records
 * @returns SQL INSERT statement string
 *
 * @example
 * ```typescript
 * const links = createCourseToLessonLinks("course_123", ["lesson_1", "lesson_2"]);
 * const sql = generateRelationshipInserts(links);
 * // Returns:
 * // INSERT INTO egghead_ContentResourceResource (resourceOfId, resourceId, position)
 * // VALUES
 * //   ('course_123', 'lesson_1', 0),
 * //   ('course_123', 'lesson_2', 1)
 * // ON DUPLICATE KEY UPDATE position = VALUES(position);
 * ```
 */
export function generateRelationshipInserts(
  links: ContentResourceResource[],
): string {
  if (!Array.isArray(links) || links.length === 0) {
    throw new Error("links must be a non-empty array");
  }

  const values = links
    .map(
      (link) =>
        `  ('${link.resourceOfId}', '${link.resourceId}', ${link.position})`,
    )
    .join(",\n");

  return `INSERT INTO egghead_ContentResourceResource (resourceOfId, resourceId, position)
VALUES
${values}
ON DUPLICATE KEY UPDATE position = VALUES(position);`;
}

/**
 * Batch helper: Creates course→lesson links for multiple courses.
 *
 * @param courses - Array of { courseId, lessonIds } objects
 * @returns Flattened array of all relationship records
 *
 * @example
 * ```typescript
 * const allLinks = batchCreateCourseLinks([
 *   { courseId: "course_1", lessonIds: ["lesson_1", "lesson_2"] },
 *   { courseId: "course_2", lessonIds: ["lesson_3", "lesson_4", "lesson_5"] }
 * ]);
 * // Returns 5 relationship records total
 * ```
 */
export function batchCreateCourseLinks(
  courses: Array<{ courseId: string; lessonIds: string[] }>,
): ContentResourceResource[] {
  if (!Array.isArray(courses)) {
    throw new Error("courses must be an array");
  }

  return courses.flatMap((course) =>
    createCourseToLessonLinks(course.courseId, course.lessonIds),
  );
}

/**
 * Batch helper: Creates lesson→video links for multiple lessons.
 *
 * @param lessons - Array of { lessonId, videoId } objects
 * @returns Array of all relationship records
 *
 * @example
 * ```typescript
 * const allLinks = batchCreateVideoLinks([
 *   { lessonId: "lesson_1", videoId: "video_1" },
 *   { lessonId: "lesson_2", videoId: "video_2" }
 * ]);
 * // Returns 2 relationship records
 * ```
 */
export function batchCreateVideoLinks(
  lessons: Array<{ lessonId: string; videoId: string }>,
): ContentResourceResource[] {
  if (!Array.isArray(lessons)) {
    throw new Error("lessons must be an array");
  }

  return lessons.map((lesson) =>
    createLessonToVideoLink(lesson.lessonId, lesson.videoId),
  );
}

/**
 * Validates a relationship record structure.
 *
 * @param link - Relationship record to validate
 * @returns True if valid
 * @throws Error if validation fails
 */
export function validateRelationship(link: ContentResourceResource): boolean {
  if (!link.resourceOfId || typeof link.resourceOfId !== "string") {
    throw new Error("resourceOfId must be a non-empty string");
  }

  if (!link.resourceId || typeof link.resourceId !== "string") {
    throw new Error("resourceId must be a non-empty string");
  }

  if (typeof link.position !== "number" || link.position < 0) {
    throw new Error("position must be a non-negative number");
  }

  return true;
}

/**
 * Re-orders lessons by updating their position values.
 *
 * Useful when lessons are added/removed from a course.
 *
 * @param courseId - Parent course ID
 * @param lessonIds - New ordered array of lesson IDs
 * @returns New array of relationship records with updated positions
 *
 * @example
 * ```typescript
 * // Original order: [lesson_1, lesson_2, lesson_3]
 * // New order: [lesson_3, lesson_1, lesson_2]
 * const reordered = reorderLessons("course_123", ["lesson_3", "lesson_1", "lesson_2"]);
 * // Returns links with updated positions
 * ```
 */
export function reorderLessons(
  courseId: string,
  lessonIds: string[],
): ContentResourceResource[] {
  return createCourseToLessonLinks(courseId, lessonIds);
}

/**
 * Generates DELETE SQL for removing specific relationships.
 *
 * @param courseId - Parent course ID
 * @param lessonIdsToRemove - Array of lesson IDs to unlink
 * @returns SQL DELETE statement
 *
 * @example
 * ```typescript
 * const sql = generateDeleteLinks("course_123", ["lesson_1", "lesson_2"]);
 * // Returns:
 * // DELETE FROM egghead_ContentResourceResource
 * // WHERE resourceOfId = 'course_123'
 * //   AND resourceId IN ('lesson_1', 'lesson_2');
 * ```
 */
export function generateDeleteLinks(
  courseId: string,
  lessonIdsToRemove: string[],
): string {
  if (!courseId) {
    throw new Error("courseId is required");
  }

  if (!Array.isArray(lessonIdsToRemove) || lessonIdsToRemove.length === 0) {
    throw new Error("lessonIdsToRemove must be a non-empty array");
  }

  const lessonIdList = lessonIdsToRemove.map((id) => `'${id}'`).join(", ");

  return `DELETE FROM egghead_ContentResourceResource
WHERE resourceOfId = '${courseId}'
  AND resourceId IN (${lessonIdList});`;
}
