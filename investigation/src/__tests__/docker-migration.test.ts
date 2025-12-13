/**
 * Docker Migration Integration Test
 *
 * Tests the full migration flow using Docker containers:
 * 1. Read lesson from PostgreSQL (Rails source)
 * 2. Get Mux asset ID from SQLite (video tracker)
 * 3. Write ContentResource to MySQL (Coursebuilder target)
 * 4. Verify round-trip data integrity
 *
 * Prerequisites:
 * - Docker containers running (docker-compose up)
 * - PostgreSQL: port 5433 (seed data loaded)
 * - SQLite: investigation/docker/sqlite/test.db
 * - MySQL: port 3307 (schema initialized)
 *
 * Run: pnpm test docker-migration
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import Database from "better-sqlite3";
import { Effect } from "effect";
import { SqlClient } from "@effect/sql";
import { DatabaseLive } from "../lib/db.js";
import { MysqlLive } from "../lib/mysql.js";
import { join } from "node:path";

/**
 * Test configuration for Docker services
 */
const DOCKER_CONFIG = {
  postgres: {
    connectionString:
      "postgresql://postgres:postgres@localhost:5433/egghead_test",
  },
  mysql: {
    connectionString: "mysql://root:mysql@localhost:3307/coursebuilder_test",
  },
  sqlite: {
    dbPath: join(process.cwd(), "docker/sqlite/test.db"),
  },
};

/**
 * Sample lesson data from PostgreSQL seed
 */
type PostgresLesson = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  duration: number;
  state: string;
  instructorId: number;
  seriesId: number | null;
  seriesRowOrder: number | null;
  currentVideoHlsUrl: string | null;
  publishedAt: Date | null;
};

/**
 * SQLite video data with Mux asset
 */
type SqliteVideo = {
  id: number;
  slug: string;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  state: string;
};

/**
 * SQLite lesson data linking to video
 */
type SqliteLesson = {
  id: number;
  video_id: number | null;
  instructor_id: number;
  slug: string;
  state: string;
  course_id: number | null;
  title: string;
  body: string | null;
};

/**
 * ContentResource fields for migration
 */
type ContentResourceFields = {
  slug: string;
  title: string;
  description?: string;
  duration?: number;
  muxAssetId?: string;
  muxPlaybackId?: string;
  state?: string;
  legacy?: {
    railsLessonId: number;
    videoId: number;
    instructorId: number;
    seriesId: number | null;
  };
};

describe("Docker Migration Integration", () => {
  let sqliteDb: Database.Database;

  beforeAll(() => {
    // Initialize SQLite connection
    sqliteDb = new Database(DOCKER_CONFIG.sqlite.dbPath, { readonly: true });
  });

  afterAll(() => {
    sqliteDb.close();
  });

  test("reads lesson from PostgreSQL", async () => {
    const program = Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      // Read lesson ID 1 from seed data (Introduction to React Hooks)
      const lessons = yield* sql<PostgresLesson>`
        SELECT 
          id,
          title,
          slug,
          summary,
          duration,
          state,
          instructor_id as "instructorId",
          series_id as "seriesId",
          series_row_order as "seriesRowOrder",
          current_video_hls_url as "currentVideoHlsUrl",
          published_at as "publishedAt"
        FROM lessons 
        WHERE id = 1
      `;

      return lessons[0];
    });

    // Override DATABASE_URL for test
    const originalEnv = process.env.DATABASE_URL;
    process.env.DATABASE_URL = DOCKER_CONFIG.postgres.connectionString;

    const lesson = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive)),
    );

    process.env.DATABASE_URL = originalEnv;

    expect(lesson).toBeDefined();
    expect(lesson?.id).toBe(1);
    expect(lesson?.title).toBe("Introduction to React Hooks");
    expect(lesson?.slug).toBe("introduction-to-react-hooks");
    expect(lesson?.state).toBe("published");
    expect(lesson?.instructorId).toBe(1);
  });

  test("gets Mux asset from SQLite", () => {
    // SQLite seed has lesson ID 2001 linked to video ID 1001
    const lessonRow = sqliteDb
      .prepare<unknown[], SqliteLesson>("SELECT * FROM lessons WHERE id = 2001")
      .get();

    expect(lessonRow).toBeDefined();
    expect(lessonRow?.video_id).toBe(1001);

    const videoRow = sqliteDb
      .prepare<unknown[], SqliteVideo>("SELECT * FROM videos WHERE id = ?")
      .get(lessonRow?.video_id);

    expect(videoRow).toBeDefined();
    expect(videoRow?.mux_asset_id).toBe("test-mux-asset-1");
    expect(videoRow?.mux_playback_id).toBe("test-playback-1");
    expect(videoRow?.state).toBe("updated");
  });

  test("writes ContentResource to MySQL", async () => {
    const program = Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      // Create a system user for migrations (createdById is NOT NULL)
      const systemUserId = "migration-system-user";

      // Insert system user if not exists
      yield* sql`
        INSERT INTO egghead_User (id, email, name)
        VALUES (${systemUserId}, 'system@migration.local', 'Migration System')
        ON DUPLICATE KEY UPDATE id=id
      `;

      // Create a test ContentResource
      const resourceId = "test-resource-docker-1";
      const fields: ContentResourceFields = {
        slug: "test-lesson-from-docker",
        title: "Test Lesson from Docker Migration",
        description: "Integration test for migration flow",
        duration: 180,
        muxAssetId: "test-mux-asset-1",
        muxPlaybackId: "test-playback-1",
        state: "published",
        legacy: {
          railsLessonId: 1,
          videoId: 1001,
          instructorId: 1,
          seriesId: 1,
        },
      };

      // Insert ContentResource
      yield* sql`
        INSERT INTO egghead_ContentResource (id, type, createdById, fields)
        VALUES (
          ${resourceId},
          'videoResource',
          ${systemUserId},
          ${JSON.stringify(fields)}
        )
        ON DUPLICATE KEY UPDATE 
          fields = ${JSON.stringify(fields)},
          updatedAt = CURRENT_TIMESTAMP
      `;

      // Read it back
      const rows = yield* sql`
        SELECT * FROM egghead_ContentResource WHERE id = ${resourceId}
      `;

      return rows[0] as {
        id: string;
        type: string;
        createdById: string;
        fields: string; // JSON string
        createdAt: Date;
        updatedAt: Date;
      };
    });

    // Override NEW_DATABASE_URL for test
    const originalEnv = process.env.NEW_DATABASE_URL;
    process.env.NEW_DATABASE_URL = DOCKER_CONFIG.mysql.connectionString;

    const resource = await Effect.runPromise(
      program.pipe(Effect.provide(MysqlLive)),
    );

    process.env.NEW_DATABASE_URL = originalEnv;

    expect(resource).toBeDefined();
    expect(resource.id).toBe("test-resource-docker-1");
    expect(resource.type).toBe("videoResource");

    const parsedFields = JSON.parse(resource.fields) as ContentResourceFields;
    expect(parsedFields.slug).toBe("test-lesson-from-docker");
    expect(parsedFields.muxAssetId).toBe("test-mux-asset-1");
    expect(parsedFields.legacy?.railsLessonId).toBe(1);
  });

  test("full migration round-trip", async () => {
    /**
     * This test simulates the complete migration pipeline:
     * PostgreSQL lesson → SQLite video lookup → MySQL ContentResource
     */

    // 1. Read lesson from PostgreSQL
    const pgProgram = Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const lessons = yield* sql<PostgresLesson>`
        SELECT 
          id,
          title,
          slug,
          summary,
          duration,
          state,
          instructor_id as "instructorId",
          series_id as "seriesId"
        FROM lessons 
        WHERE id = 2
      `;
      return lessons[0];
    });

    const originalPgEnv = process.env.DATABASE_URL;
    process.env.DATABASE_URL = DOCKER_CONFIG.postgres.connectionString;

    const lesson = await Effect.runPromise(
      pgProgram.pipe(Effect.provide(DatabaseLive)),
    );

    process.env.DATABASE_URL = originalPgEnv;

    expect(lesson).toBeDefined();
    if (!lesson) throw new Error("Lesson not found");

    // 2. Look up video in SQLite using lesson ID
    // Note: PostgreSQL lesson IDs don't directly map to SQLite lesson IDs
    // In real migration, we'd use slug or other identifier
    // For this test, we'll use a known mapping from seed data

    // PostgreSQL lesson ID 2 → slug 'using-usestate-hook'
    // SQLite has lesson 2002 with video 1002
    const sqliteLesson = sqliteDb
      .prepare<unknown[], SqliteLesson>("SELECT * FROM lessons WHERE id = 2002")
      .get();

    expect(sqliteLesson).toBeDefined();
    if (!sqliteLesson) throw new Error("SQLite lesson not found");
    expect(sqliteLesson.video_id).toBe(1002);

    const video = sqliteDb
      .prepare<unknown[], SqliteVideo>("SELECT * FROM videos WHERE id = ?")
      .get(sqliteLesson.video_id);

    expect(video).toBeDefined();
    if (!video) throw new Error("Video not found");
    expect(video.mux_asset_id).toBeTruthy();

    // 3. Write to MySQL ContentResource
    const mysqlProgram = Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      const systemUserId = "migration-system-user";
      const resourceId = `lesson-${lesson.id}`;

      const fields: ContentResourceFields = {
        slug: lesson.slug,
        title: lesson.title,
        description: lesson.summary || undefined,
        duration: lesson.duration,
        muxAssetId: video.mux_asset_id || undefined,
        muxPlaybackId: video.mux_playback_id || undefined,
        state: lesson.state,
        legacy: {
          railsLessonId: lesson.id,
          videoId: video.id,
          instructorId: lesson.instructorId,
          seriesId: lesson.seriesId,
        },
      };

      yield* sql`
        INSERT INTO egghead_ContentResource (id, type, createdById, fields)
        VALUES (
          ${resourceId},
          'videoResource',
          ${systemUserId},
          ${JSON.stringify(fields)}
        )
        ON DUPLICATE KEY UPDATE 
          fields = ${JSON.stringify(fields)},
          updatedAt = CURRENT_TIMESTAMP
      `;

      const rows = yield* sql`
        SELECT * FROM egghead_ContentResource WHERE id = ${resourceId}
      `;

      return rows[0] as {
        id: string;
        type: string;
        fields: string;
      };
    });

    const originalMysqlEnv = process.env.NEW_DATABASE_URL;
    process.env.NEW_DATABASE_URL = DOCKER_CONFIG.mysql.connectionString;

    const resource = await Effect.runPromise(
      mysqlProgram.pipe(Effect.provide(MysqlLive)),
    );

    process.env.NEW_DATABASE_URL = originalMysqlEnv;

    // 4. Verify round-trip data integrity
    expect(resource).toBeDefined();
    expect(resource.id).toBe(`lesson-${lesson.id}`);

    const parsedFields = JSON.parse(resource.fields) as ContentResourceFields;

    // Verify PostgreSQL data made it through
    expect(parsedFields.slug).toBe(lesson.slug);
    expect(parsedFields.title).toBe(lesson.title);
    expect(parsedFields.duration).toBe(lesson.duration);
    expect(parsedFields.state).toBe(lesson.state);

    // Verify SQLite video data made it through
    expect(parsedFields.muxAssetId).toBe(video.mux_asset_id);
    expect(parsedFields.muxPlaybackId).toBe(video.mux_playback_id);

    // Verify legacy metadata preserved
    expect(parsedFields.legacy?.railsLessonId).toBe(lesson.id);
    expect(parsedFields.legacy?.videoId).toBe(video.id);
  });
});
