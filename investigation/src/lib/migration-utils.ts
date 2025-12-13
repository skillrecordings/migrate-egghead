/**
 * Migration utilities for egghead → Coursebuilder migration
 *
 * Provides logging, progress tracking, ID generation, and data conversion helpers.
 */

import { createId } from "@paralleldrive/cuid2";

// ============================================================================
// Progress Tracking
// ============================================================================

interface ProgressTracker {
  increment: () => void;
  complete: () => void;
}

/**
 * Creates a progress tracker for migration operations
 *
 * @example
 * const progress = createProgressTracker(1000, 'Migrating users')
 * for (const user of users) {
 *   await migrateUser(user)
 *   progress.increment()
 * }
 * progress.complete()
 */
export function createProgressTracker(
  total: number,
  label: string,
): ProgressTracker {
  let current = 0;
  const startTime = Date.now();

  return {
    increment: () => {
      current++;
      const percent = ((current / total) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Clear line and rewrite (basic progress bar)
      process.stdout.write(
        `\r${label}: ${current}/${total} (${percent}%) - ${elapsed}s`,
      );

      if (current === total) {
        process.stdout.write("\n");
      }
    },

    complete: () => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✓ ${label}: ${total} items in ${duration}s`);
    },
  };
}

// ============================================================================
// Migration Logging
// ============================================================================

/**
 * Logs the start of a migration operation
 */
export function logMigrationStart(type: string, count: number): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(` Starting migration: ${type}`);
  console.log(` Total items: ${count.toLocaleString()}`);
  console.log("=".repeat(60));
}

/**
 * Logs successful completion of a migration operation
 */
export function logMigrationComplete(
  type: string,
  count: number,
  durationMs: number,
): void {
  const seconds = (durationMs / 1000).toFixed(2);
  const rate = count > 0 ? (count / (durationMs / 1000)).toFixed(0) : "0";

  console.log(`\n${"=".repeat(60)}`);
  console.log(` ✓ Migration complete: ${type}`);
  console.log(` Items migrated: ${count.toLocaleString()}`);
  console.log(` Duration: ${seconds}s (${rate} items/sec)`);
  console.log("=".repeat(60));
}

/**
 * Logs a migration error for a specific item
 */
export function logMigrationError(
  type: string,
  id: string | number,
  error: Error,
): void {
  console.error(`\n✗ Error migrating ${type} [${id}]:`);
  console.error(`  ${error.message}`);
  if (error.stack) {
    console.error(`  Stack: ${error.stack.split("\n").slice(1, 3).join("\n")}`);
  }
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generates a unique ID for ContentResource records using cuid2
 *
 * @example
 * const id = generateContentResourceId() // => "clxyz123abc..."
 */
export function generateContentResourceId(): string {
  return createId();
}

// ============================================================================
// Portable Text Conversion
// ============================================================================

// Minimal portable text types for type safety
interface PortableTextSpan {
  _type: "span";
  text: string;
  marks?: string[];
}

interface PortableTextBlock {
  _type: "block";
  children?: PortableTextSpan[];
  style?: string;
}

type PortableTextContent = PortableTextBlock | Record<string, unknown>;

/**
 * Converts Sanity Portable Text blocks to Markdown
 *
 * NOTE: Requires @portabletext/to-markdown to be installed:
 *   pnpm add @portabletext/to-markdown
 *
 * @param blocks - Portable Text block array (can be null/undefined)
 * @returns Markdown string, or empty string if input is invalid
 *
 * @example
 * const markdown = portableTextToMarkdown(lesson.description)
 */
export function portableTextToMarkdown(
  blocks: PortableTextContent[] | null | undefined,
): string {
  // Handle null/undefined/empty gracefully
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return "";
  }

  // TODO: Implement when @portabletext/to-markdown is installed
  // import { toMarkdown } from '@portabletext/to-markdown'
  // return toMarkdown(blocks)

  // Fallback: basic text extraction
  return blocks
    .filter(
      (block): block is PortableTextBlock =>
        block._type === "block" && Array.isArray(block.children),
    )
    .map((block) =>
      block
        .children!.filter(
          (child): child is PortableTextSpan => child._type === "span",
        )
        .map((child) => child.text)
        .join(""),
    )
    .join("\n\n");
}

// ============================================================================
// Idempotency Helpers
// ============================================================================

type LegacyIdCheckResult = {
  field: string;
  value: number;
};

/**
 * Builds a field/value pair for checking if a legacy record was already migrated
 *
 * Used to query Coursebuilder for existing records by their legacy ID.
 *
 * @example
 * const check = buildLegacyIdCheck('lesson', 12345)
 * // => { field: 'fields.egghead_lesson_id', value: 12345 }
 *
 * // Use in query:
 * const existing = await db.query.ContentResource.findFirst({
 *   where: eq(sql`${check.field}`, check.value)
 * })
 */
export function buildLegacyIdCheck(
  type: "lesson" | "course" | "videoResource",
  legacyId: number,
): LegacyIdCheckResult {
  const fieldMap: Record<typeof type, string> = {
    lesson: "fields.egghead_lesson_id",
    course: "fields.egghead_course_id",
    videoResource: "fields.egghead_video_id",
  };

  return {
    field: fieldMap[type],
    value: legacyId,
  };
}

// ============================================================================
// Exports
// ============================================================================

export type { ProgressTracker, LegacyIdCheckResult };
