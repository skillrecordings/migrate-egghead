/**
 * Unit tests for phase-config module
 *
 * Validates type safety, expected counts, and helper functions.
 */

import { describe, expect, test } from "bun:test";
import {
  EXPECTED_COUNTS,
  getCourseSlugsByPhase,
  getExpectedCounts,
  getPhaseConfig,
  getSelectionConstraints,
  isAlgorithmicPhase,
  isCuratedPhase,
  type PhaseNumber,
  SANITY_ONLY_COURSES,
} from "./phase-config";

describe("phase-config", () => {
  describe("Phase 1: Curated Edge Cases", () => {
    test("has correct expected counts", () => {
      const expected = getExpectedCounts(1);
      expect(expected.courses).toBe(5); // 4 Rails + 1 Sanity
      expect(expected.lessons).toBe(92); // 84 Rails + 8 Sanity
      expect(expected.tags).toBe(7);
    });

    test("has curated course list", () => {
      const courses = getCourseSlugsByPhase(1);
      expect(courses).toBeDefined();
      expect(courses).toHaveLength(4); // Phase 1 has 4 Rails courses

      // Verify edge case courses are present
      expect(courses).toContain("fix-common-git-mistakes"); // Modern
      expect(courses).toContain(
        "use-d3-v3-to-build-interactive-charts-with-javascript",
      ); // Ancient
      expect(courses).toContain("the-beginner-s-guide-to-react"); // Special chars
      expect(courses).toContain("form-validation-in-elm"); // Retired
    });

    test("is identified as curated phase", () => {
      expect(isCuratedPhase(1)).toBe(true);
      expect(isAlgorithmicPhase(1)).toBe(false);
    });

    test("returns complete config", () => {
      const config = getPhaseConfig(1);
      expect(config.phase).toBe(1);
      expect(config.method).toBe("curated");
      expect(config.courses).toBeDefined();
      expect(config.courses).toHaveLength(4);
      expect(config.constraints).toBeUndefined();
      expect(config.expected.courses).toBe(5);
    });
  });

  describe("Phase 2: Curated Diversity", () => {
    test("has correct expected counts", () => {
      const expected = getExpectedCounts(2);
      expect(expected.courses).toBe(20);
      expect(expected.lessons).toBe(350);
      expect(expected.tags).toBe(50);
    });

    test("extends Phase 1 courses", () => {
      const phase1Courses = getCourseSlugsByPhase(1);
      const phase2Courses = getCourseSlugsByPhase(2);

      expect(phase2Courses).toBeDefined();
      expect(phase1Courses).toBeDefined();

      if (!phase1Courses || !phase2Courses) {
        throw new Error("Phase courses should be defined");
      }

      // Phase 2 should include all Phase 1 courses
      for (const course of phase1Courses) {
        expect(phase2Courses).toContain(course);
      }
    });

    test("is identified as curated phase", () => {
      expect(isCuratedPhase(2)).toBe(true);
      expect(isAlgorithmicPhase(2)).toBe(false);
    });
  });

  describe("Phase 3: Algorithmic Expansion", () => {
    test("has correct expected counts", () => {
      const expected = getExpectedCounts(3);
      expect(expected.courses).toBe(80);
      expect(expected.lessons).toBe(1400);
      expect(expected.tags).toBe(200);
    });

    test("has no predefined course list", () => {
      const courses = getCourseSlugsByPhase(3);
      expect(courses).toBeUndefined();
    });

    test("has algorithmic constraints", () => {
      const constraints = getSelectionConstraints(3);
      expect(constraints.targetCount).toBe(80);
      expect(constraints.minInstructors).toBe(30);
      expect(constraints.minTags).toBe(200);
      expect(constraints.includeRetired).toBe(true);
    });

    test("has era distribution", () => {
      const constraints = getSelectionConstraints(3);
      expect(constraints.eraDistribution.ancient).toBe(0.2);
      expect(constraints.eraDistribution.middle).toBe(0.5);
      expect(constraints.eraDistribution.modern).toBe(0.3);

      // Distribution should sum to 1.0
      const sum =
        constraints.eraDistribution.ancient +
        constraints.eraDistribution.middle +
        constraints.eraDistribution.modern;
      expect(sum).toBe(1.0);
    });

    test("is identified as algorithmic phase", () => {
      expect(isCuratedPhase(3)).toBe(false);
      expect(isAlgorithmicPhase(3)).toBe(true);
    });

    test("returns complete config", () => {
      const config = getPhaseConfig(3);
      expect(config.phase).toBe(3);
      expect(config.method).toBe("algorithmic");
      expect(config.courses).toBeUndefined();
      expect(config.constraints).toBeDefined();
      expect(config.constraints?.targetCount).toBe(80);
    });
  });

  describe("Phase 4: Large-Scale Test", () => {
    test("has correct expected counts", () => {
      const expected = getExpectedCounts(4);
      expect(expected.courses).toBe(200);
      expect(expected.lessons).toBe(3500);
      expect(expected.tags).toBe(400);
    });

    test("has scaled algorithmic constraints", () => {
      const constraints = getSelectionConstraints(4);
      expect(constraints.targetCount).toBe(200);
      expect(constraints.minInstructors).toBe(60);
      expect(constraints.minTags).toBe(400);
    });

    test("is identified as algorithmic phase", () => {
      expect(isAlgorithmicPhase(4)).toBe(true);
    });
  });

  describe("Phase 5: Full Production", () => {
    test("has full production counts", () => {
      const expected = getExpectedCounts(5);
      expect(expected.courses).toBe(420);
      expect(expected.lessons).toBe(5132);
      expect(expected.tags).toBe(627);
    });

    test("has full-scale constraints", () => {
      const constraints = getSelectionConstraints(5);
      expect(constraints.targetCount).toBe(420);
      expect(constraints.minInstructors).toBe(134); // All instructors
      expect(constraints.minTags).toBe(627); // All tags
    });

    test("is identified as algorithmic phase", () => {
      expect(isAlgorithmicPhase(5)).toBe(true);
    });
  });

  describe("Logarithmic Scaling Validation", () => {
    test("course counts scale logarithmically", () => {
      const counts = [1, 2, 3, 4, 5].map(
        (p) => EXPECTED_COUNTS[p as PhaseNumber].courses,
      );

      // Verify logarithmic-ish growth (each phase significantly larger than previous)
      expect(counts[0]).toBe(5); // Phase 1
      expect(counts[1]).toBe(20); // Phase 2: ~4x
      expect(counts[2]).toBe(80); // Phase 3: ~4x
      expect(counts[3]).toBe(200); // Phase 4: ~2.5x
      expect(counts[4]).toBe(420); // Phase 5: ~2.1x
    });

    test("lesson counts scale proportionally", () => {
      const counts = [1, 2, 3, 4, 5].map(
        (p) => EXPECTED_COUNTS[p as PhaseNumber].lessons,
      );

      // Verify proportional growth (lessons per course ~12-17)
      const phase1PerCourse = counts[0] / EXPECTED_COUNTS[1].courses; // ~18
      const phase5PerCourse = counts[4] / EXPECTED_COUNTS[5].courses; // ~12

      expect(phase1PerCourse).toBeGreaterThan(10);
      expect(phase5PerCourse).toBeGreaterThan(10);
    });

    test("tag counts scale logarithmically", () => {
      const counts = [1, 2, 3, 4, 5].map(
        (p) => EXPECTED_COUNTS[p as PhaseNumber].tags,
      );

      // Tags grow slower than courses (many courses share tags)
      expect(counts[0]).toBe(7); // Phase 1
      expect(counts[4]).toBe(627); // Phase 5: ~89x (vs 84x for courses)
    });
  });

  describe("Sanity-Only Courses", () => {
    test("has claude-code-essentials-6d87", () => {
      expect(SANITY_ONLY_COURSES).toContain("claude-code-essentials-6d87");
    });

    test("is not in Phase 1 Rails courses", () => {
      const phase1Courses = getCourseSlugsByPhase(1);
      expect(phase1Courses).not.toContain("claude-code-essentials-6d87");
    });

    test("is accounted for in Phase 1 expected counts", () => {
      // Phase 1 has 4 Rails courses + 1 Sanity-only = 5 total
      const phase1Courses = getCourseSlugsByPhase(1);
      const expected = getExpectedCounts(1);

      expect(phase1Courses).toHaveLength(4); // Rails courses
      expect(expected.courses).toBe(5); // Total including Sanity
    });
  });

  describe("Helper Functions", () => {
    test("isCuratedPhase works for all phases", () => {
      expect(isCuratedPhase(1)).toBe(true);
      expect(isCuratedPhase(2)).toBe(true);
      expect(isCuratedPhase(3)).toBe(false);
      expect(isCuratedPhase(4)).toBe(false);
      expect(isCuratedPhase(5)).toBe(false);
    });

    test("isAlgorithmicPhase works for all phases", () => {
      expect(isAlgorithmicPhase(1)).toBe(false);
      expect(isAlgorithmicPhase(2)).toBe(false);
      expect(isAlgorithmicPhase(3)).toBe(true);
      expect(isAlgorithmicPhase(4)).toBe(true);
      expect(isAlgorithmicPhase(5)).toBe(true);
    });

    test("getCourseSlugsByPhase returns courses for curated phases", () => {
      expect(getCourseSlugsByPhase(1)).toBeDefined();
      expect(getCourseSlugsByPhase(2)).toBeDefined();
      expect(getCourseSlugsByPhase(3)).toBeUndefined();
      expect(getCourseSlugsByPhase(4)).toBeUndefined();
      expect(getCourseSlugsByPhase(5)).toBeUndefined();
    });
  });
});
