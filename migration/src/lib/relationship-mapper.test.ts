import { describe, expect, it } from "vitest";
import type { ContentResourceResource } from "./relationship-mapper";
import {
  batchCreateCourseLinks,
  batchCreateVideoLinks,
  createCourseToLessonLinks,
  createLessonToVideoLink,
  generateDeleteLinks,
  generateRelationshipInserts,
  reorderLessons,
  validateRelationship,
} from "./relationship-mapper";

describe("createCourseToLessonLinks", () => {
  it("creates ordered links from course to lessons", () => {
    const result = createCourseToLessonLinks("course_123", [
      "lesson_1",
      "lesson_2",
      "lesson_3",
    ]);

    expect(result).toEqual([
      { resourceOfId: "course_123", resourceId: "lesson_1", position: 0 },
      { resourceOfId: "course_123", resourceId: "lesson_2", position: 1 },
      { resourceOfId: "course_123", resourceId: "lesson_3", position: 2 },
    ]);
  });

  it("returns empty array for empty lesson list", () => {
    const result = createCourseToLessonLinks("course_123", []);
    expect(result).toEqual([]);
  });

  it("throws error if courseId is missing", () => {
    expect(() => createCourseToLessonLinks("", ["lesson_1"])).toThrow(
      "courseId is required",
    );
  });

  it("throws error if lessonIds is not an array", () => {
    expect(() =>
      createCourseToLessonLinks(
        "course_123",
        "lesson_1" as unknown as string[],
      ),
    ).toThrow("lessonIds must be an array");
  });
});

describe("createLessonToVideoLink", () => {
  it("creates 1:1 link from lesson to video", () => {
    const result = createLessonToVideoLink("lesson_123", "video_456");

    expect(result).toEqual({
      resourceOfId: "lesson_123",
      resourceId: "video_456",
      position: 0,
    });
  });

  it("always sets position to 0 for lesson→video links", () => {
    const result = createLessonToVideoLink("lesson_999", "video_888");
    expect(result.position).toBe(0);
  });

  it("throws error if lessonId is missing", () => {
    expect(() => createLessonToVideoLink("", "video_123")).toThrow(
      "lessonId is required",
    );
  });

  it("throws error if videoId is missing", () => {
    expect(() => createLessonToVideoLink("lesson_123", "")).toThrow(
      "videoId is required",
    );
  });
});

describe("generateRelationshipInserts", () => {
  it("generates SQL INSERT for single link", () => {
    const links = [
      { resourceOfId: "course_123", resourceId: "lesson_1", position: 0 },
    ];

    const sql = generateRelationshipInserts(links);

    expect(sql).toContain(
      "INSERT INTO egghead_ContentResourceResource (resourceOfId, resourceId, position)",
    );
    expect(sql).toContain("('course_123', 'lesson_1', 0)");
    expect(sql).toContain(
      "ON DUPLICATE KEY UPDATE position = VALUES(position)",
    );
  });

  it("generates SQL INSERT for multiple links", () => {
    const links = [
      { resourceOfId: "course_123", resourceId: "lesson_1", position: 0 },
      { resourceOfId: "course_123", resourceId: "lesson_2", position: 1 },
      { resourceOfId: "course_123", resourceId: "lesson_3", position: 2 },
    ];

    const sql = generateRelationshipInserts(links);

    expect(sql).toContain("('course_123', 'lesson_1', 0)");
    expect(sql).toContain("('course_123', 'lesson_2', 1)");
    expect(sql).toContain("('course_123', 'lesson_3', 2)");
  });

  it("throws error for empty links array", () => {
    expect(() => generateRelationshipInserts([])).toThrow(
      "links must be a non-empty array",
    );
  });

  it("throws error if links is not an array", () => {
    expect(() =>
      generateRelationshipInserts({} as unknown as ContentResourceResource[]),
    ).toThrow("links must be a non-empty array");
  });

  it("throws error if links is not an array", () => {
    expect(() => generateRelationshipInserts({} as any)).toThrow(
      "links must be a non-empty array",
    );
  });
});

describe("batchCreateCourseLinks", () => {
  it("creates links for multiple courses", () => {
    const courses = [
      { courseId: "course_1", lessonIds: ["lesson_1", "lesson_2"] },
      { courseId: "course_2", lessonIds: ["lesson_3", "lesson_4", "lesson_5"] },
    ];

    const result = batchCreateCourseLinks(courses);

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({
      resourceOfId: "course_1",
      resourceId: "lesson_1",
      position: 0,
    });
    expect(result[1]).toEqual({
      resourceOfId: "course_1",
      resourceId: "lesson_2",
      position: 1,
    });
    expect(result[2]).toEqual({
      resourceOfId: "course_2",
      resourceId: "lesson_3",
      position: 0,
    });
  });

  it("returns empty array for empty courses list", () => {
    const result = batchCreateCourseLinks([]);
    expect(result).toEqual([]);
  });

  it("throws error if courses is not an array", () => {
    expect(() =>
      batchCreateCourseLinks(
        {} as unknown as Array<{ courseId: string; lessonIds: string[] }>,
      ),
    ).toThrow("courses must be an array");
  });
});

describe("batchCreateVideoLinks", () => {
  it("creates links for multiple lessons", () => {
    const lessons = [
      { lessonId: "lesson_1", videoId: "video_1" },
      { lessonId: "lesson_2", videoId: "video_2" },
      { lessonId: "lesson_3", videoId: "video_3" },
    ];

    const result = batchCreateVideoLinks(lessons);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      resourceOfId: "lesson_1",
      resourceId: "video_1",
      position: 0,
    });
    expect(result[1]).toEqual({
      resourceOfId: "lesson_2",
      resourceId: "video_2",
      position: 0,
    });
  });

  it("always sets position to 0 for all lesson→video links", () => {
    const lessons = [
      { lessonId: "lesson_1", videoId: "video_1" },
      { lessonId: "lesson_2", videoId: "video_2" },
    ];

    const result = batchCreateVideoLinks(lessons);

    expect(result.every((link) => link.position === 0)).toBe(true);
  });

  it("throws error if lessons is not an array", () => {
    expect(() =>
      batchCreateVideoLinks(
        {} as unknown as Array<{ lessonId: string; videoId: string }>,
      ),
    ).toThrow("lessons must be an array");
  });
});

describe("validateRelationship", () => {
  it("validates a correct relationship record", () => {
    const link: ContentResourceResource = {
      resourceOfId: "course_123",
      resourceId: "lesson_456",
      position: 0,
    };

    expect(validateRelationship(link)).toBe(true);
  });

  it("throws error for missing resourceOfId", () => {
    const link = {
      resourceOfId: "",
      resourceId: "lesson_456",
      position: 0,
    } as ContentResourceResource;

    expect(() => validateRelationship(link)).toThrow(
      "resourceOfId must be a non-empty string",
    );
  });

  it("throws error for missing resourceId", () => {
    const link = {
      resourceOfId: "course_123",
      resourceId: "",
      position: 0,
    } as ContentResourceResource;

    expect(() => validateRelationship(link)).toThrow(
      "resourceId must be a non-empty string",
    );
  });

  it("throws error for negative position", () => {
    const link = {
      resourceOfId: "course_123",
      resourceId: "lesson_456",
      position: -1,
    } as ContentResourceResource;

    expect(() => validateRelationship(link)).toThrow(
      "position must be a non-negative number",
    );
  });

  it("throws error for non-number position", () => {
    const link = {
      resourceOfId: "course_123",
      resourceId: "lesson_456",
      position: "0",
    } as unknown as ContentResourceResource;

    expect(() => validateRelationship(link)).toThrow(
      "position must be a non-negative number",
    );
  });
});

describe("reorderLessons", () => {
  it("creates new links with updated positions", () => {
    const result = reorderLessons("course_123", [
      "lesson_3",
      "lesson_1",
      "lesson_2",
    ]);

    expect(result).toEqual([
      { resourceOfId: "course_123", resourceId: "lesson_3", position: 0 },
      { resourceOfId: "course_123", resourceId: "lesson_1", position: 1 },
      { resourceOfId: "course_123", resourceId: "lesson_2", position: 2 },
    ]);
  });

  it("handles single lesson", () => {
    const result = reorderLessons("course_123", ["lesson_1"]);

    expect(result).toEqual([
      { resourceOfId: "course_123", resourceId: "lesson_1", position: 0 },
    ]);
  });
});

describe("generateDeleteLinks", () => {
  it("generates SQL DELETE for single lesson", () => {
    const sql = generateDeleteLinks("course_123", ["lesson_1"]);

    expect(sql).toContain("DELETE FROM egghead_ContentResourceResource");
    expect(sql).toContain("WHERE resourceOfId = 'course_123'");
    expect(sql).toContain("AND resourceId IN ('lesson_1')");
  });

  it("generates SQL DELETE for multiple lessons", () => {
    const sql = generateDeleteLinks("course_123", [
      "lesson_1",
      "lesson_2",
      "lesson_3",
    ]);

    expect(sql).toContain(
      "AND resourceId IN ('lesson_1', 'lesson_2', 'lesson_3')",
    );
  });

  it("throws error if courseId is missing", () => {
    expect(() => generateDeleteLinks("", ["lesson_1"])).toThrow(
      "courseId is required",
    );
  });

  it("throws error if lessonIdsToRemove is empty", () => {
    expect(() => generateDeleteLinks("course_123", [])).toThrow(
      "lessonIdsToRemove must be a non-empty array",
    );
  });

  it("throws error if lessonIdsToRemove is not an array", () => {
    expect(() =>
      generateDeleteLinks("course_123", "lesson_1" as unknown as string[]),
    ).toThrow("lessonIdsToRemove must be a non-empty array");
  });
});

describe("integration examples", () => {
  it("creates course with lessons and videos", () => {
    const courseId = "course_react_hooks";
    const lessonIds = ["lesson_useState", "lesson_useEffect", "lesson_custom"];
    const videoIds = ["video_1", "video_2", "video_3"];

    // Create course → lesson links
    const courseLinks = createCourseToLessonLinks(courseId, lessonIds);
    expect(courseLinks).toHaveLength(3);

    // Create lesson → video links
    const videoLinks = lessonIds.map((lessonId, index) =>
      createLessonToVideoLink(lessonId, videoIds[index]),
    );
    expect(videoLinks).toHaveLength(3);

    // Generate SQL
    const courseSql = generateRelationshipInserts(courseLinks);
    const videoSql = generateRelationshipInserts(videoLinks);

    expect(courseSql).toBeTruthy();
    expect(videoSql).toBeTruthy();
  });

  it("reorders lessons in a course", () => {
    const courseId = "course_123";
    const originalOrder = ["lesson_1", "lesson_2", "lesson_3"];
    const newOrder = ["lesson_3", "lesson_1", "lesson_2"];

    // Create original links
    const originalLinks = createCourseToLessonLinks(courseId, originalOrder);
    expect(originalLinks[0].resourceId).toBe("lesson_1");

    // Reorder
    const newLinks = reorderLessons(courseId, newOrder);
    expect(newLinks[0].resourceId).toBe("lesson_3");
    expect(newLinks[1].resourceId).toBe("lesson_1");
    expect(newLinks[2].resourceId).toBe("lesson_2");

    // Generate update SQL
    const sql = generateRelationshipInserts(newLinks);
    expect(sql).toBeTruthy();
  });

  it("removes lessons from a course", () => {
    const courseId = "course_123";
    const lessonsToKeep = ["lesson_1", "lesson_3"];
    const lessonsToRemove = ["lesson_2", "lesson_4"];

    // Create new links with only kept lessons
    const newLinks = createCourseToLessonLinks(courseId, lessonsToKeep);
    expect(newLinks).toHaveLength(2);

    // Generate delete SQL for removed lessons
    const deleteSql = generateDeleteLinks(courseId, lessonsToRemove);
    expect(deleteSql).toContain("'lesson_2'");
    expect(deleteSql).toContain("'lesson_4'");
  });
});
