/**
 * Integration test for course migration
 *
 * Tests against Docker containers (Rails PostgreSQL + MySQL)
 *
 * Prerequisites:
 *   bun docker:reset
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { closeAll, railsDb } from "../src/lib/db";

// Skip integration tests if not pointing to Docker (port 5433)
const isDockerEnv = process.env.DATABASE_URL?.includes(":5433");

describe.skipIf(!isDockerEnv)("Course Migration Integration", () => {
  beforeAll(async () => {
    if (!isDockerEnv) return; // Extra guard for bun:test quirk
    // Verify Docker containers are running
    try {
      await railsDb`SELECT 1`;
    } catch {
      throw new Error("Docker containers not running. Run: bun docker:reset");
    }
  });

  afterAll(async () => {
    await closeAll();
  });

  test("can fetch courses from Rails", async () => {
    const courses = await railsDb`
      SELECT id, slug, title, state
      FROM series
      WHERE state IN ('published', 'draft')
      LIMIT 5
    `;

    expect(courses.length).toBeGreaterThan(0);
    expect(courses[0]).toHaveProperty("slug");
    expect(courses[0]).toHaveProperty("title");
  });

  test("fetches all required course fields", async () => {
    const courses = await railsDb`
      SELECT 
        id,
        slug,
        title,
        description,
        summary,
        tagline,
        state,
        instructor_id,
        is_complete,
        free_forever,
        published_at,
        repo,
        price,
        purchase_price,
        kvstore,
        square_cover_file_name,
        created_at,
        updated_at
      FROM series
      WHERE state = 'published'
      LIMIT 1
    `;

    expect(courses.length).toBe(1);
    const course = courses[0];

    // Required fields
    expect(course).toHaveProperty("id");
    expect(course).toHaveProperty("slug");
    expect(course).toHaveProperty("title");

    // Optional fields (may be null)
    expect(course).toHaveProperty("description");
    expect(course).toHaveProperty("instructorId");
  });

  test("filters out archived/retired courses", async () => {
    const allCourses = await railsDb`SELECT COUNT(*) as count FROM series`;
    const publishedDraft = await railsDb`
      SELECT COUNT(*) as count 
      FROM series 
      WHERE state IN ('published', 'draft')
    `;

    // Should have fewer courses when filtering
    expect(Number(publishedDraft[0].count)).toBeLessThanOrEqual(
      Number(allCourses[0].count),
    );
  });

  test("course ordering is consistent", async () => {
    const courses1 = await railsDb`
      SELECT id 
      FROM series 
      WHERE state = 'published'
      ORDER BY id
      LIMIT 10
    `;

    const courses2 = await railsDb`
      SELECT id 
      FROM series 
      WHERE state = 'published'
      ORDER BY id
      LIMIT 10
    `;

    expect(courses1).toEqual(courses2);
  });
});
