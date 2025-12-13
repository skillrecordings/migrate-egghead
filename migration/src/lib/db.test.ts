/**
 * Tests for database connection and count functions.
 */
import { describe, expect, it } from "bun:test";
import { closeAll, getRailsCounts } from "./db";

describe("getRailsCounts", () => {
  it("should query playlists table for courses, not series table", async () => {
    // This test ensures we removed the series fallback and only use playlists
    const counts = await getRailsCounts();

    // Should have counts (will fail if queries are wrong)
    expect(counts.courses).toBeGreaterThan(0);
    expect(counts.lessons).toBeGreaterThan(0);
    expect(counts.tags).toBeGreaterThan(0);

    // Verify the course count is from playlists (visibility_state='indexed')
    // Production has 437 indexed playlists as of Dec 2025
    expect(counts.courses).toBeGreaterThanOrEqual(400);
    expect(counts.courses).toBeLessThan(500);

    // Verify lesson count includes both in-course and standalone
    // Production has ~6,675 published lessons as of Dec 2025
    expect(counts.lessons).toBeGreaterThanOrEqual(6000);
    expect(counts.lessons).toBeLessThan(7000);

    await closeAll();
  });

  it("should not reference series table", async () => {
    // Static analysis: ensure no 'series' table references in the source
    const fs = await import("node:fs/promises");
    const source = await fs.readFile("./src/lib/db.ts", "utf-8");

    // Should NOT contain 'FROM series' query
    expect(source).not.toContain("FROM series");
    expect(source).not.toContain("from series");

    // Should contain the canonical playlists query
    expect(source).toContain("visibility_state = 'indexed'");
  });
});
