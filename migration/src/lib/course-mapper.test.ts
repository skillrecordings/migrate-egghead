/**
 * Tests for course-mapper.ts
 *
 * Characterization tests to validate Rails playlists → Coursebuilder course mapping
 */

import { describe, expect, test } from "bun:test";
import { type RailsPlaylist, mapPlaylistToCourse } from "./course-mapper";

describe("Course Mapper", () => {
  test("maps basic published playlist to course", () => {
    const railsPlaylist: RailsPlaylist = {
      id: 123,
      slug: "react-fundamentals",
      title: "React Fundamentals",
      description: "Learn React from the ground up",
      summary: "Complete React course",
      tagline: "Master React",
      state: "published",
      visibilityState: "indexed",
      accessState: "pro",
      ownerId: 45,
      publishedAt: new Date("2024-01-15"),
      squareCoverFileName: "react-cover.jpg",
      createdAt: new Date("2023-12-01"),
      updatedAt: new Date("2024-01-15"),
    };

    const course = mapPlaylistToCourse(railsPlaylist, "user_instructor45");

    expect(course.type).toBe("course");
    expect(course.createdById).toBe("user_instructor45");
    expect(course.fields.slug).toBe("react-fundamentals");
    expect(course.fields.title).toBe("React Fundamentals");
    expect(course.fields.state).toBe("published");
    expect(course.fields.visibility).toBe("pro"); // accessState='pro' → visibility='pro'
    expect(course.fields.isComplete).toBe(true); // published playlists are considered complete
    expect(course.fields.legacyRailsPlaylistId).toBe(123);
    expect(course.fields.migratedFrom).toBe("rails");
  });

  test("maps free playlist to public visibility", () => {
    const railsPlaylist: RailsPlaylist = {
      id: 456,
      slug: "intro-to-js",
      title: "Intro to JavaScript",
      description: "JavaScript basics",
      summary: null,
      tagline: null,
      state: "published",
      visibilityState: "indexed",
      accessState: "free",
      ownerId: 67,
      publishedAt: new Date("2024-02-01"),
      squareCoverFileName: null,
      createdAt: new Date("2024-01-20"),
      updatedAt: new Date("2024-02-01"),
    };

    const course = mapPlaylistToCourse(railsPlaylist, "user_instructor67");

    expect(course.fields.visibility).toBe("public");
    expect(course.fields.freeForever).toBe(true); // accessState='free' → freeForever=true
  });

  test("maps draft playlist", () => {
    const railsPlaylist: RailsPlaylist = {
      id: 789,
      slug: "advanced-typescript",
      title: "Advanced TypeScript",
      description: null,
      summary: null,
      tagline: null,
      state: "draft",
      visibilityState: "indexed",
      accessState: "pro",
      ownerId: 89,
      publishedAt: null,
      squareCoverFileName: null,
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
    };

    const course = mapPlaylistToCourse(railsPlaylist, "user_instructor89");

    expect(course.fields.state).toBe("draft");
    expect(course.fields.description).toBeUndefined();
    expect(course.fields.isComplete).toBe(false); // draft playlists are not complete
  });

  test("maps archived playlist to retired", () => {
    const railsPlaylist: RailsPlaylist = {
      id: 111,
      slug: "old-angular",
      title: "AngularJS 1.x Course",
      description: "Legacy AngularJS",
      summary: null,
      tagline: null,
      state: "archived",
      visibilityState: "indexed",
      accessState: "free",
      ownerId: 12,
      publishedAt: new Date("2015-01-01"),
      squareCoverFileName: null,
      createdAt: new Date("2015-01-01"),
      updatedAt: new Date("2020-01-01"),
    };

    const course = mapPlaylistToCourse(railsPlaylist, "user_instructor12");

    expect(course.fields.state).toBe("retired");
  });

  test("generates unique IDs for each course", () => {
    const railsPlaylist: RailsPlaylist = {
      id: 333,
      slug: "test-course",
      title: "Test Course",
      description: null,
      summary: null,
      tagline: null,
      state: "published",
      visibilityState: "indexed",
      accessState: "free",
      ownerId: 56,
      publishedAt: new Date("2024-04-01"),
      squareCoverFileName: null,
      createdAt: new Date("2024-04-01"),
      updatedAt: new Date("2024-04-01"),
    };

    const course1 = mapPlaylistToCourse(railsPlaylist, "user_instructor56");
    const course2 = mapPlaylistToCourse(railsPlaylist, "user_instructor56");

    expect(course1.id).not.toBe(course2.id);
  });

  test("preserves created and updated timestamps", () => {
    const createdDate = new Date("2023-06-01");
    const updatedDate = new Date("2024-06-01");

    const railsPlaylist: RailsPlaylist = {
      id: 444,
      slug: "timestamp-test",
      title: "Timestamp Test",
      description: null,
      summary: null,
      tagline: null,
      state: "published",
      visibilityState: "indexed",
      accessState: "pro",
      ownerId: 78,
      publishedAt: null,
      squareCoverFileName: null,
      createdAt: createdDate,
      updatedAt: updatedDate,
    };

    const course = mapPlaylistToCourse(railsPlaylist, "user_instructor78");

    expect(course.createdAt).toEqual(createdDate);
    expect(course.updatedAt).toEqual(updatedDate);
  });

  test("defaults visibility to public when access_state unknown", () => {
    const railsPlaylist: RailsPlaylist = {
      id: 555,
      slug: "free-course",
      title: "Free Course",
      description: null,
      summary: null,
      tagline: null,
      state: "published",
      visibilityState: "indexed",
      accessState: "unknown_state",
      ownerId: 90,
      publishedAt: new Date("2024-05-01"),
      squareCoverFileName: null,
      createdAt: new Date("2024-05-01"),
      updatedAt: new Date("2024-05-01"),
    };

    const course = mapPlaylistToCourse(railsPlaylist, "user_instructor90");

    expect(course.fields.visibility).toBe("public");
  });
});
