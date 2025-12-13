/**
 * Database connections for migration scripts
 *
 * Rails uses PostgreSQL (postgres package)
 * Coursebuilder uses MySQL (mysql2 package)
 *
 * Mode detection:
 * - USE_DOCKER=1 or TUI running → use Docker containers
 * - Otherwise → use production (DATABASE_URL, NEW_DATABASE_URL)
 */
import mysql from "mysql2/promise";
import postgres from "postgres";

/** Docker connection strings */
const DOCKER_POSTGRES_URL =
  "postgresql://postgres:postgres@localhost:5433/egghead_test";
const DOCKER_MYSQL_URL = "mysql://root:root@localhost:3307/coursebuilder_test";

/** Detect if we should use Docker (dev mode) */
const USE_DOCKER = process.env.USE_DOCKER === "1";

/** Get the appropriate PostgreSQL URL */
function getPostgresUrl(): string {
  if (USE_DOCKER) {
    return DOCKER_POSTGRES_URL;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL not set - need Rails PostgreSQL connection (or set USE_DOCKER=1)",
    );
  }
  return url;
}

/** Get the appropriate MySQL URL */
function getMysqlUrl(): string {
  if (USE_DOCKER) {
    return DOCKER_MYSQL_URL;
  }
  const url = process.env.NEW_DATABASE_URL;
  if (!url) {
    throw new Error(
      "NEW_DATABASE_URL not set - need MySQL connection (or set USE_DOCKER=1)",
    );
  }
  return url;
}

/** Rails PostgreSQL (source) */
export const railsDb = postgres(getPostgresUrl(), {
  transform: postgres.camel, // snake_case → camelCase
});

/** Coursebuilder MySQL connection - lazy initialized */
let _mysqlConnection: mysql.Connection | null = null;

/** Get MySQL connection (creates if not exists) */
export async function getMysqlDb(): Promise<mysql.Connection> {
  if (!_mysqlConnection) {
    _mysqlConnection = await mysql.createConnection(getMysqlUrl());
  }

  return _mysqlConnection;
}

/** Close all connections */
export async function closeAll() {
  await railsDb.end();
  if (_mysqlConnection) {
    await _mysqlConnection.end();
    _mysqlConnection = null;
  }
}

/** Alias for getMysqlDb - some tests expect this */
export const coursebuilderDb = getMysqlDb;

// ============================================================================
// Migration Status Queries (for TUI standalone mode)
// ============================================================================

export interface MigrationCounts {
  rails: {
    tags: number;
    courses: number;
    lessons: number;
  };
  coursebuilder: {
    tags: number;
    courses: number;
    lessons: number;
  };
  mappingTables: {
    tagMap: number;
    courseMap: number;
    lessonMap: number;
  };
}

/**
 * Get counts from Rails PostgreSQL (source).
 *
 * IMPORTANT: Official courses are playlists with visibility_state='indexed'.
 * The series table is DEPRECATED. See reports/RAILS_SCHEMA_REFERENCE.md.
 *
 * Canonical queries:
 * - Courses: playlists WHERE visibility_state='indexed' AND state='published' (437)
 * - Lessons in courses: COUNT(DISTINCT lessons) via tracklists join (~5,025)
 * - Standalone lessons: published lessons NOT in any indexed playlist (~1,650)
 * - Total lessons: ~6,675
 */
export async function getRailsCounts(): Promise<MigrationCounts["rails"]> {
  const [tags] = await railsDb`SELECT COUNT(*)::int as count FROM tags`;

  // Courses: ONLY playlists with visibility_state='indexed'
  let courseCount = 0;
  try {
    const [courses] = await railsDb`
      SELECT COUNT(*)::int as count 
      FROM playlists 
      WHERE visibility_state = 'indexed' AND state = 'published'
    `;
    courseCount = courses.count;
  } catch (err) {
    console.warn("Failed to count courses from playlists:", err);
    courseCount = 0;
  }

  // Lessons: count all published lessons (includes both in-course and standalone)
  // Total = lessons in courses (~5,025) + standalone lessons (~1,650) = ~6,675
  let lessonCount = 0;
  try {
    const [lessons] =
      await railsDb`SELECT COUNT(*)::int as count FROM lessons WHERE state = 'published'`;
    lessonCount = lessons.count;
    // If 0 published, try counting all (Docker test data may not have state populated)
    if (lessonCount === 0) {
      const [allLessons] =
        await railsDb`SELECT COUNT(*)::int as count FROM lessons`;
      lessonCount = allLessons.count;
    }
  } catch (err) {
    console.warn("Failed to count published lessons, trying all lessons:", err);
    const [allLessons] =
      await railsDb`SELECT COUNT(*)::int as count FROM lessons`;
    lessonCount = allLessons.count;
  }

  return {
    tags: tags.count,
    courses: courseCount,
    lessons: lessonCount,
  };
}

/**
 * Get counts from Coursebuilder MySQL (target).
 */
export async function getCoursebuilderCounts(): Promise<
  MigrationCounts["coursebuilder"]
> {
  const db = await getMysqlDb();

  // Tags are in separate Tag table, not ContentResource
  let tagCount = 0;
  try {
    const [[tagRow]] = await db.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM Tag`,
    );
    tagCount = (tagRow as { count: number }).count;
  } catch {
    // Table doesn't exist yet
  }

  let courseCount = 0;
  let lessonCount = 0;
  try {
    const [[courseRow]] = await db.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM egghead_ContentResource 
       WHERE type = 'course' OR (type = 'post' AND JSON_EXTRACT(fields, '$.postType') = 'course')`,
    );
    courseCount = (courseRow as { count: number }).count;

    const [[lessonRow]] = await db.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM egghead_ContentResource 
       WHERE type = 'lesson' OR (type = 'post' AND JSON_EXTRACT(fields, '$.postType') = 'lesson')`,
    );
    lessonCount = (lessonRow as { count: number }).count;
  } catch {
    // Tables don't exist yet
  }

  return {
    tags: tagCount,
    courses: courseCount,
    lessons: lessonCount,
  };
}

/**
 * Get counts from mapping tables.
 */
export async function getMappingTableCounts(): Promise<
  MigrationCounts["mappingTables"]
> {
  const db = await getMysqlDb();

  // Check if tables exist first
  const tableExists = async (tableName: string): Promise<boolean> => {
    try {
      await db.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
      return true;
    } catch {
      return false;
    }
  };

  const [tagMapExists, courseMapExists, lessonMapExists] = await Promise.all([
    tableExists("_migration_tag_map"),
    tableExists("_migration_course_map"),
    tableExists("_migration_lesson_map"),
  ]);

  const getCount = async (tableName: string, exists: boolean) => {
    if (!exists) return 0;
    const [[row]] = await db.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM ${tableName}`,
    );
    return (row as { count: number }).count;
  };

  const [tagMap, courseMap, lessonMap] = await Promise.all([
    getCount("_migration_tag_map", tagMapExists),
    getCount("_migration_course_map", courseMapExists),
    getCount("_migration_lesson_map", lessonMapExists),
  ]);

  return { tagMap, courseMap, lessonMap };
}

/**
 * Get all migration counts in one call.
 */
export async function getAllMigrationCounts(): Promise<MigrationCounts> {
  const [rails, coursebuilder, mappingTables] = await Promise.all([
    getRailsCounts(),
    getCoursebuilderCounts(),
    getMappingTableCounts(),
  ]);

  return { rails, coursebuilder, mappingTables };
}
