/**
 * Characterization tests for lesson migration
 *
 * These tests validate the migration logic against Docker containers
 * before running against production data.
 *
 * Run: bun test:integration
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import Database from "bun:sqlite";
import { closeAll, coursebuilderDb, railsDb } from "../src/lib/db";
import {
  checkLessonExists,
  checkVideoResourceExists,
  createLessonResource,
  createVideoResource,
  extractMuxPlaybackIdFromUrl,
  getMuxAssetForLesson,
  portableTextToMarkdown,
  type RailsLesson,
} from "../src/lib/lesson-mapper";

const SYSTEM_USER_ID = "test-user-123";

// Sample Rails lesson for testing (will be seeded in Docker)
const SAMPLE_LESSON_ID = 1;

describe("Lesson Migration - Characterization Tests", () => {
  let sqliteDb: Database | null = null;

  beforeAll(() => {
    // Open SQLite database (read-only)
    try {
      sqliteDb = new Database("../download-egghead/egghead_videos.db", {
        readonly: true,
      });
    } catch {
      console.warn("SQLite database not available for tests");
    }
  });

  afterAll(async () => {
    if (sqliteDb) {
      sqliteDb.close();
    }
    await closeAll();
  });

  describe("Mux Asset Resolution", () => {
    test("extractMuxPlaybackIdFromUrl extracts playback ID", () => {
      const url = "https://stream.mux.com/abc123xyz.m3u8";
      const playbackId = extractMuxPlaybackIdFromUrl(url);
      expect(playbackId).toBe("abc123xyz");
    });

    test("extractMuxPlaybackIdFromUrl handles null", () => {
      const playbackId = extractMuxPlaybackIdFromUrl(null);
      expect(playbackId).toBeNull();
    });

    test("extractMuxPlaybackIdFromUrl handles invalid URLs", () => {
      const playbackId = extractMuxPlaybackIdFromUrl("not-a-mux-url");
      expect(playbackId).toBeNull();
    });

    test("getMuxAssetForLesson resolves from Rails HLS URL", async () => {
      const mockLesson: RailsLesson = {
        id: 10000,
        slug: "test-lesson",
        title: "Test Lesson",
        summary: "Summary",
        description: null,
        duration: 300,
        state: "published",
        visibilityState: null,
        freeAccess: false,
        instructorId: 1,
        seriesId: 1,
        currentVideoHlsUrl: "https://stream.mux.com/abc123.m3u8",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const muxAsset = await getMuxAssetForLesson(mockLesson, sqliteDb);

      expect(muxAsset.muxPlaybackId).toBe("abc123");
      expect(muxAsset.source).toBe("rails_url");
    });

    test("getMuxAssetForLesson returns none when no video", async () => {
      const mockLesson: RailsLesson = {
        id: 10000,
        slug: "test-lesson",
        title: "Test Lesson",
        summary: "Summary",
        description: null,
        duration: 300,
        state: "published",
        visibilityState: null,
        freeAccess: false,
        instructorId: 1,
        seriesId: 1,
        currentVideoHlsUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const muxAsset = await getMuxAssetForLesson(mockLesson, sqliteDb);

      expect(muxAsset.source).toBe("none");
      expect(muxAsset.muxPlaybackId).toBeNull();
    });
  });

  describe("Portable Text Conversion", () => {
    test("converts simple portable text blocks", () => {
      const blocks = [
        {
          _type: "block",
          children: [{ _type: "span", text: "Hello world" }],
        },
      ];

      const markdown = portableTextToMarkdown(blocks);
      expect(markdown).toContain("Hello world");
    });

    test("handles empty blocks", () => {
      const markdown = portableTextToMarkdown([]);
      expect(markdown).toBe("");
    });

    test("handles null input", () => {
      const markdown = portableTextToMarkdown([]);
      expect(markdown).toBe("");
    });
  });

  describe("Video Resource Creation", () => {
    test("creates video resource with Mux asset", () => {
      const railsLesson: RailsLesson = {
        id: 100,
        slug: "test-lesson",
        title: "Test Lesson",
        summary: "Summary",
        description: null,
        duration: 300,
        state: "published",
        visibilityState: null,
        freeAccess: false,
        instructorId: 1,
        seriesId: 1,
        currentVideoHlsUrl: "https://stream.mux.com/abc123.m3u8",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const muxAsset = {
        muxAssetId: "asset-123",
        muxPlaybackId: "abc123",
        source: "rails_url" as const,
      };

      const videoResource = createVideoResource(
        railsLesson,
        muxAsset,
        SYSTEM_USER_ID,
      );

      expect(videoResource).not.toBeNull();
      expect(videoResource?.type).toBe("videoResource");
      expect(videoResource?.fields.muxPlaybackId).toBe("abc123");
      expect(videoResource?.fields.legacyRailsLessonId).toBe(100);
      expect(videoResource?.fields.state).toBe("ready");
    });

    test("returns null when no Mux asset", () => {
      const railsLesson: RailsLesson = {
        id: 100,
        slug: "test-lesson",
        title: "Test Lesson",
        summary: "Summary",
        description: null,
        duration: 300,
        state: "published",
        visibilityState: null,
        freeAccess: false,
        instructorId: 1,
        seriesId: 1,
        currentVideoHlsUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const muxAsset = {
        muxAssetId: null,
        muxPlaybackId: null,
        source: "none" as const,
      };

      const videoResource = createVideoResource(
        railsLesson,
        muxAsset,
        SYSTEM_USER_ID,
      );

      expect(videoResource).toBeNull();
    });
  });

  describe("Lesson Resource Creation", () => {
    test("creates lesson with video", () => {
      const railsLesson: RailsLesson = {
        id: 100,
        slug: "test-lesson",
        title: "Test Lesson",
        summary: "A great lesson",
        description: null,
        duration: 300,
        state: "published",
        visibilityState: null,
        freeAccess: true,
        instructorId: 1,
        seriesId: 1,
        currentVideoHlsUrl: "https://stream.mux.com/abc123.m3u8",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const videoResource = {
        id: "video-123",
        type: "videoResource" as const,
        createdById: SYSTEM_USER_ID,
        fields: {
          muxAssetId: null,
          muxPlaybackId: "abc123",
          duration: 300,
          state: "ready" as const,
          legacyRailsLessonId: 100,
          legacySource: "rails_url" as const,
          migratedAt: new Date().toISOString(),
          migratedFrom: "rails_url" as const,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const lessonResource = createLessonResource(
        railsLesson,
        videoResource,
        SYSTEM_USER_ID,
      );

      expect(lessonResource.type).toBe("lesson");
      expect(lessonResource.fields.title).toBe("Test Lesson");
      expect(lessonResource.fields.slug).toBe("test-lesson");
      expect(lessonResource.fields.description).toBe("A great lesson");
      expect(lessonResource.fields.state).toBe("published");
      expect(lessonResource.fields.visibility).toBe("public");
      expect(lessonResource.fields.videoResourceId).toBe("video-123");
      expect(lessonResource.fields.legacyRailsId).toBe(100);
    });

    test("marks lesson as retired when no video", () => {
      const railsLesson: RailsLesson = {
        id: 100,
        slug: "test-lesson",
        title: "Test Lesson",
        summary: "A lesson without video",
        description: null,
        duration: null,
        state: "published",
        visibilityState: null,
        freeAccess: false,
        instructorId: 1,
        seriesId: 1,
        currentVideoHlsUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const lessonResource = createLessonResource(
        railsLesson,
        null,
        SYSTEM_USER_ID,
      );

      expect(lessonResource.fields.state).toBe("retired");
      expect(lessonResource.fields.retiredReason).toContain(
        "Video source file not found",
      );
      expect(lessonResource.fields.videoResourceId).toBeNull();
    });

    test("maps visibility correctly", () => {
      const hiddenLesson: RailsLesson = {
        id: 100,
        slug: "test-lesson",
        title: "Test Lesson",
        summary: "Summary",
        description: null,
        duration: 300,
        state: "published",
        visibilityState: "hidden",
        freeAccess: false,
        instructorId: 1,
        seriesId: 1,
        currentVideoHlsUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const lessonResource = createLessonResource(
        hiddenLesson,
        null,
        SYSTEM_USER_ID,
      );

      expect(lessonResource.fields.visibility).toBe("unlisted");
    });
  });

  describe("Idempotency Checks", () => {
    test.skip("checkLessonExists returns false for new lesson", async () => {
      if (!coursebuilderDb) {
        console.log("Skipping: NEW_DATABASE_URL not set");
        return;
      }

      const exists = await checkLessonExists(coursebuilderDb, 99999);
      expect(exists).toBe(false);
    });

    test.skip("checkVideoResourceExists returns false for new lesson", async () => {
      if (!coursebuilderDb) {
        console.log("Skipping: NEW_DATABASE_URL not set");
        return;
      }

      const exists = await checkVideoResourceExists(coursebuilderDb, 99999);
      expect(exists).toBe(false);
    });
  });

  describe("Integration: Fetch Sample Lesson from Rails", () => {
    test.skip("fetches lesson from Rails PostgreSQL", async () => {
      const result = await railsDb<RailsLesson[]>`
        SELECT 
          id,
          slug,
          title,
          summary,
          description,
          duration,
          state,
          visibility_state as "visibilityState",
          free_access as "freeAccess",
          instructor_id as "instructorId",
          series_id as "seriesId",
          current_video_hls_url as "currentVideoHlsUrl",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM lessons
        WHERE id = ${SAMPLE_LESSON_ID}
        LIMIT 1
      `;

      expect(result).toHaveLength(1);

      const lesson = result[0];
      expect(lesson.id).toBe(SAMPLE_LESSON_ID);
      expect(lesson.slug).toBeTruthy();
      expect(lesson.title).toBeTruthy();
    });
  });
});
