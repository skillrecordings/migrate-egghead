/**
 * E2E Test Fixtures and Helper Functions
 *
 * Provides utilities for verifying migration data integrity,
 * count reconciliation, and relationship validation.
 *
 * Schema Detection:
 * - Production uses `playlists` table with `visibility_state='indexed'` for courses
 * - Docker test data may use `series` table (legacy schema)
 * - Tests automatically detect which schema is available and adjust queries
 */

import type mysql from "mysql2/promise";
import type postgres from "postgres";

/**
 * Rails schema type for courses
 */
export type RailsSchema = "playlists" | "series";

export interface MigrationStats {
  sourceCount: number;
  targetCount: number;
  entityType: "tag" | "course" | "lesson";
}

export interface ReconciliationResult extends MigrationStats {
  delta: number;
  percentMigrated: number;
}

export interface RelationshipVerification {
  totalCount: number;
  validCount: number;
  orphanedLessons: number;
}

/**
 * Detects which Rails schema is being used for courses
 *
 * @param railsDb - Rails PostgreSQL connection
 * @returns 'playlists' if production schema, 'series' if legacy Docker schema
 *
 * Production schema uses playlists table with visibility_state='indexed'.
 * Docker test data may use series table (legacy).
 */
export async function detectRailsSchema(
  railsDb: ReturnType<typeof postgres>,
): Promise<RailsSchema> {
  try {
    // Check for playlists with indexed visibility (production schema)
    const [result] = await railsDb`
      SELECT COUNT(*)::int as count 
      FROM playlists 
      WHERE visibility_state = 'indexed'
    `;

    // If we have indexed playlists, we're using production schema
    if (result && result.count > 0) {
      return "playlists";
    }
  } catch {
    // playlists table doesn't exist or query failed
  }

  // Fallback to series (Docker test data)
  return "series";
}

/**
 * Ensures Docker containers are running and accessible
 */
export async function ensureDockerRunning(
  railsDb: ReturnType<typeof postgres>,
  mysqlDb: mysql.Connection,
): Promise<void> {
  try {
    // Check Rails PostgreSQL
    await railsDb`SELECT 1`;

    // Check MySQL
    await mysqlDb.execute("SELECT 1");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Docker containers not running or not accessible: ${errorMessage}\n` +
        "Run: bun docker:reset",
    );
  }
}

/**
 * Verifies ContentResource field structure matches schema
 */
export function verifyContentResourceStructure(
  fields: Record<string, unknown>,
  type: "tag" | "course" | "lesson" | "videoResource",
): void {
  // Common fields for all types
  expect(fields).toHaveProperty("migratedAt");
  expect(fields).toHaveProperty("migratedFrom");

  // Type-specific field validation
  switch (type) {
    case "tag":
      expect(fields).toHaveProperty("name");
      expect(fields).toHaveProperty("slug");
      expect(fields).toHaveProperty("legacyId");
      break;

    case "course":
      expect(fields).toHaveProperty("slug");
      expect(fields).toHaveProperty("title");
      expect(fields).toHaveProperty("state");
      expect(fields).toHaveProperty("legacyRailsSeriesId");
      break;

    case "lesson":
      expect(fields).toHaveProperty("title");
      expect(fields).toHaveProperty("slug");
      expect(fields).toHaveProperty("description");
      expect(fields).toHaveProperty("state");
      expect(fields).toHaveProperty("visibility");
      expect(fields).toHaveProperty("legacyRailsId");
      break;

    case "videoResource":
      expect(fields).toHaveProperty("muxPlaybackId");
      expect(fields).toHaveProperty("state");
      expect(fields.state).toBe("ready");
      expect(fields).toHaveProperty("legacyRailsLessonId");
      expect(fields).toHaveProperty("legacySource");
      break;
  }
}

/**
 * Reconciles counts between Rails source and MySQL target
 *
 * @param railsDb - Rails PostgreSQL connection
 * @param mysqlDb - MySQL/Coursebuilder connection
 * @param entityType - Type of entity to reconcile
 * @param schema - Rails schema type (playlists or series)
 * @returns Reconciliation result with counts and delta
 */
export async function reconcileCounts(
  railsDb: ReturnType<typeof postgres>,
  mysqlDb: mysql.Connection,
  entityType: "tag" | "course" | "lesson",
  schema: RailsSchema = "series",
): Promise<ReconciliationResult> {
  let sourceCount: number;
  let targetCount: number;

  switch (entityType) {
    case "tag": {
      const railsResult = await railsDb`SELECT COUNT(*) as count FROM tags`;
      sourceCount = Number(railsResult[0]?.count || 0);

      const [mysqlResult] = await mysqlDb.execute<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM egghead_ContentResource WHERE type = 'topic'",
      );
      targetCount = mysqlResult[0]?.count || 0;
      break;
    }

    case "course": {
      if (schema === "playlists") {
        // Production schema: playlists with visibility_state='indexed'
        const railsResult = await railsDb`
          SELECT COUNT(DISTINCT p.id)::int as count
          FROM playlists p
          WHERE p.visibility_state = 'indexed'
            AND EXISTS (
              SELECT 1 FROM tracklists t
              JOIN lessons l ON l.id = t.tracklistable_id
              WHERE t.playlist_id = p.id
                AND t.tracklistable_type = 'Lesson'
                AND l.state = 'published'
            )
        `;
        sourceCount = Number(railsResult[0]?.count || 0);
      } else {
        // Docker schema: series table
        const railsResult = await railsDb`
          SELECT COUNT(*) as count 
          FROM series 
          WHERE state IN ('published', 'draft', 'removed')
        `;
        sourceCount = Number(railsResult[0]?.count || 0);
      }

      const [mysqlResult] = await mysqlDb.execute<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM egghead_ContentResource WHERE type = 'course'",
      );
      targetCount = mysqlResult[0]?.count || 0;
      break;
    }

    case "lesson": {
      if (schema === "playlists") {
        // Production schema: count lessons in indexed playlists
        const railsResult = await railsDb`
          SELECT COUNT(DISTINCT l.id)::int as count
          FROM lessons l
          JOIN tracklists t ON t.tracklistable_id = l.id
          JOIN playlists p ON p.id = t.playlist_id
          WHERE t.tracklistable_type = 'Lesson'
            AND p.visibility_state = 'indexed'
            AND l.state = 'published'
        `;
        sourceCount = Number(railsResult[0]?.count || 0);
      } else {
        // Docker schema: all lessons
        const railsResult =
          await railsDb`SELECT COUNT(*) as count FROM lessons`;
        sourceCount = Number(railsResult[0]?.count || 0);
      }

      const [mysqlResult] = await mysqlDb.execute<Array<{ count: number }>>(
        "SELECT COUNT(*) as count FROM egghead_ContentResource WHERE type = 'lesson'",
      );
      targetCount = mysqlResult[0]?.count || 0;
      break;
    }
  }

  const delta = sourceCount - targetCount;
  const percentMigrated =
    sourceCount > 0 ? (targetCount / sourceCount) * 100 : 0;

  return {
    sourceCount,
    targetCount,
    delta,
    percentMigrated,
    entityType,
  };
}

/**
 * Verifies course-lesson relationships are valid
 */
export async function verifyRelationships(
  mysqlDb: mysql.Connection,
): Promise<RelationshipVerification> {
  // Get total relationship count
  const [countResult] = await mysqlDb.execute<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM egghead_ContentResourceResource",
  );
  const totalCount = countResult[0]?.count || 0;

  // Verify relationships point to valid resources
  const [validResult] = await mysqlDb.execute<Array<{ count: number }>>(
    `SELECT COUNT(*) as count 
     FROM egghead_ContentResourceResource crr
     WHERE EXISTS (
       SELECT 1 FROM egghead_ContentResource 
       WHERE id = crr.resourceOfId AND type = 'course'
     )
     AND EXISTS (
       SELECT 1 FROM egghead_ContentResource 
       WHERE id = crr.resourceId AND type = 'lesson'
     )`,
  );
  const validCount = validResult[0]?.count || 0;

  // Count orphaned lessons (lessons without course relationships)
  const [orphanedResult] = await mysqlDb.execute<Array<{ count: number }>>(
    `SELECT COUNT(*) as count 
     FROM egghead_ContentResource cr
     WHERE cr.type = 'lesson'
     AND NOT EXISTS (
       SELECT 1 FROM egghead_ContentResourceResource 
       WHERE resourceId = cr.id
     )`,
  );
  const orphanedLessons = orphanedResult[0]?.count || 0;

  return {
    totalCount,
    validCount,
    orphanedLessons,
  };
}

/**
 * Test helper: expect wrapper for consistent error messages
 */
export function expect(value: unknown): {
  toHaveProperty: (prop: string) => void;
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
  toBeTruthy: () => void;
  toBeUndefined: () => void;
} {
  return {
    toHaveProperty(prop: string) {
      if (
        value === null ||
        value === undefined ||
        typeof value !== "object" ||
        !(prop in value)
      ) {
        throw new Error(`Expected value to have property "${prop}"`);
      }
    },

    toBe(expected: unknown) {
      if (value !== expected) {
        throw new Error(
          `Expected ${JSON.stringify(value)} to be ${JSON.stringify(expected)}`,
        );
      }
    },

    toBeGreaterThan(expected: number) {
      if (typeof value !== "number" || value <= expected) {
        throw new Error(`Expected ${value} to be greater than ${expected}`);
      }
    },

    toBeGreaterThanOrEqual(expected: number) {
      if (typeof value !== "number" || value < expected) {
        throw new Error(
          `Expected ${value} to be greater than or equal to ${expected}`,
        );
      }
    },

    toBeTruthy() {
      if (!value) {
        throw new Error(`Expected ${JSON.stringify(value)} to be truthy`);
      }
    },

    toBeUndefined() {
      if (value !== undefined) {
        throw new Error(
          `Expected ${JSON.stringify(value)} to be undefined, got ${typeof value}`,
        );
      }
    },
  };
}
