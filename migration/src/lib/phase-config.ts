/**
 * Phase Configuration for Incremental Test Data Expansion
 *
 * Defines 5 phases of test data scaling from 5 courses (POC) to 427 courses (full production).
 * Supports both curated course lists (Phases 1-2) and algorithmic selection (Phases 3-5).
 *
 * Phase Strategy:
 * - Phase 1: Curated edge cases (5 courses, ~92 lessons)
 * - Phase 2: Curated diversity (20 courses, ~350 lessons)
 * - Phase 3: Algorithmic expansion (80 courses, ~1400 lessons)
 * - Phase 4: Large-scale test (200 courses, ~3500 lessons)
 * - Phase 5: Full production (427 courses, ~5025 lessons in courses + 1650 standalone)
 *
 * IMPORTANT: Courses come from `playlists` with `visibility_state='indexed'`, NOT `series`.
 * The `series` table is DEPRECATED. See reports/RAILS_SCHEMA_REFERENCE.md.
 *
 * @module phase-config
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Phase number (1-5)
 */
export type PhaseNumber = 1 | 2 | 3 | 4 | 5;

/**
 * Course selection method
 */
export type SelectionMethod = "curated" | "algorithmic";

/**
 * Era distribution for algorithmic selection
 */
export interface EraDistribution {
  /** Ancient courses (Wistia era, lesson IDs < 4425) */
  ancient: number;
  /** Middle courses (S3/CloudFront era, lesson IDs 4426-10388) */
  middle: number;
  /** Modern courses (direct Mux upload, lesson IDs > 10685) */
  modern: number;
}

/**
 * Constraints for algorithmic course selection
 */
export interface SelectionConstraints {
  /** Target number of courses to select */
  targetCount: number;
  /** Minimum number of unique instructors to include */
  minInstructors: number;
  /** Minimum number of unique tags to include */
  minTags: number;
  /** Whether to include retired courses (state='removed') */
  includeRetired: boolean;
  /** Distribution across video eras */
  eraDistribution: EraDistribution;
}

/**
 * Expected entity counts for a phase
 */
export interface ExpectedCounts {
  /** Expected course count */
  courses: number;
  /** Expected lesson count */
  lessons: number;
  /** Expected tag count */
  tags: number;
}

/**
 * Complete phase configuration
 */
export interface PhaseConfig {
  /** Phase number (1-5) */
  phase: PhaseNumber;
  /** Selection method (curated or algorithmic) */
  method: SelectionMethod;
  /** Course slugs (for curated phases) */
  courses?: string[];
  /** Selection constraints (for algorithmic phases) */
  constraints?: SelectionConstraints;
  /** Expected counts after migration */
  expected: ExpectedCounts;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Phase 1: Curated edge cases
 *
 * Selected to test specific edge cases:
 * - fix-common-git-mistakes: Modern course (original POC)
 * - use-d3-v3: Ancient Wistia course (lesson ID 66)
 * - the-beginner-s-guide-to-react: Special chars in title (apostrophe)
 * - form-validation-in-elm: Retired (state=removed, visibility=hidden)
 */
const PHASE_1_COURSES = [
  "fix-common-git-mistakes",
  "use-d3-v3-to-build-interactive-charts-with-javascript",
  "the-beginner-s-guide-to-react",
  "form-validation-in-elm",
];

/**
 * Sanity-only courses (not in Rails PostgreSQL)
 *
 * These courses exist only in Sanity and are merged during migration.
 */
export const SANITY_ONLY_COURSES = ["claude-code-essentials-6d87"];

/**
 * Phase 2: Curated diversity
 *
 * 15 additional courses selected by query-phase2-courses.ts for:
 * - Instructor diversity (14 unique instructors)
 * - Tag variety (45 tags covered)
 * - Size extremes (61-lesson course for scale testing)
 * - Era spread (13 ancient, 2 middle)
 */
const PHASE_2_COURSES = [
  ...PHASE_1_COURSES,
  // 15 courses from query-phase2-courses.ts (instructor diversity + era spread)
  "up-and-running-with-redux-observable",
  "optimize-user-experience-for-mobile-devices-and-browsers",
  "build-redux-style-applications-with-angular-rxjs-and-ngrx-store",
  "build-maps-with-react-leaflet",
  "develop-accessible-web-apps-with-react",
  "json-web-token-jwt-authentication-with-node-js-and-auth0",
  "convert-scss-sass-to-css-in-js",
  "graphql-data-in-react-with-apollo-client",
  "end-to-end-testing-with-google-s-puppeteer-and-jest",
  "building-serverless-web-applications-with-react-aws-amplify",
  "develop-react-applications-with-mobx-and-typescript",
  "using-chrome-developer-tools-elements",
  "chrome-devtools-sources-panel",
  "asynchronous-programming-the-end-of-the-loop",
  "angularjs-authentication-with-jwt",
];

/**
 * Curated course slugs by phase
 */
const PHASE_COURSES: Record<1 | 2, string[]> = {
  1: PHASE_1_COURSES,
  2: PHASE_2_COURSES,
};

/**
 * Algorithmic selection constraints by phase
 *
 * Note: Actual course count is 427 (playlists with visibility_state='indexed').
 * Tag count is ~332 (tags on indexed playlists).
 */
const PHASE_CONSTRAINTS: Record<3 | 4 | 5, SelectionConstraints> = {
  3: {
    targetCount: 80,
    minInstructors: 30,
    minTags: 150,
    includeRetired: false, // Only published indexed playlists
    eraDistribution: {
      ancient: 0.2, // 20% ancient (Wistia)
      middle: 0.5, // 50% middle (S3/CloudFront)
      modern: 0.3, // 30% modern (direct Mux)
    },
  },
  4: {
    targetCount: 200,
    minInstructors: 60,
    minTags: 250,
    includeRetired: false,
    eraDistribution: {
      ancient: 0.15,
      middle: 0.55,
      modern: 0.3,
    },
  },
  5: {
    targetCount: 427, // All indexed playlists with published lessons
    minInstructors: 134, // All instructors
    minTags: 332, // All tags on indexed playlists
    includeRetired: false, // visibility_state='indexed' are all published
    eraDistribution: {
      ancient: 0.1,
      middle: 0.6,
      modern: 0.3,
    },
  },
};

/**
 * Expected entity counts by phase
 *
 * These are approximate targets based on:
 * - Phase 1: POC data (5 courses including 1 Sanity-only)
 * - Phase 2: Estimated from 20 courses average
 * - Phase 3-5: Logarithmic scaling to 427 courses
 *
 * VERIFIED COUNTS (Dec 13, 2025):
 * - 427 official courses (playlists with visibility_state='indexed' + published lessons)
 * - ~5,025 lessons in courses
 * - 1,650 standalone lessons (published, not in indexed courses)
 * - ~332 tags on indexed playlists
 */
export const EXPECTED_COUNTS: Record<PhaseNumber, ExpectedCounts> = {
  1: {
    courses: 5, // 4 Rails + 1 Sanity-only
    lessons: 92, // 84 Rails + 8 Sanity-only
    tags: 7,
  },
  2: {
    courses: 20, // 19 Rails + 1 Sanity-only
    lessons: 303, // 295 Rails + 8 Sanity-only
    tags: 44,
  },
  3: {
    courses: 80,
    lessons: 1000, // ~12.5 lessons/course average
    tags: 150,
  },
  4: {
    courses: 200,
    lessons: 2500,
    tags: 250,
  },
  5: {
    courses: 427, // All indexed playlists with published lessons
    lessons: 5025, // Lessons in indexed courses
    tags: 332, // Tags on indexed playlists
  },
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get complete phase configuration
 *
 * @param phase - Phase number (1-5)
 * @returns Complete phase configuration with courses/constraints and expected counts
 *
 * @example
 * ```typescript
 * const phase1 = getPhaseConfig(1);
 * // { phase: 1, method: "curated", courses: [...], expected: {...} }
 *
 * const phase3 = getPhaseConfig(3);
 * // { phase: 3, method: "algorithmic", constraints: {...}, expected: {...} }
 * ```
 */
export function getPhaseConfig(phase: PhaseNumber): PhaseConfig {
  if (phase === 1 || phase === 2) {
    return {
      phase,
      method: "curated",
      courses: PHASE_COURSES[phase],
      expected: EXPECTED_COUNTS[phase],
    };
  }

  return {
    phase,
    method: "algorithmic",
    constraints: PHASE_CONSTRAINTS[phase],
    expected: EXPECTED_COUNTS[phase],
  };
}

/**
 * Get course slugs for a phase
 *
 * For curated phases (1-2), returns the predefined list.
 * For algorithmic phases (3-5), returns undefined (must be computed).
 *
 * @param phase - Phase number (1-5)
 * @returns Course slugs for curated phases, undefined for algorithmic phases
 *
 * @example
 * ```typescript
 * const phase1Courses = getCourseSlugsByPhase(1);
 * // ["fix-common-git-mistakes", ...]
 *
 * const phase3Courses = getCourseSlugsByPhase(3);
 * // undefined (must run algorithmic selection)
 * ```
 */
export function getCourseSlugsByPhase(
  phase: PhaseNumber,
): string[] | undefined {
  if (phase === 1 || phase === 2) {
    return PHASE_COURSES[phase];
  }

  // Algorithmic phases don't have predefined course lists
  return undefined;
}

/**
 * Get expected counts for a phase
 *
 * @param phase - Phase number (1-5)
 * @returns Expected entity counts (courses, lessons, tags)
 *
 * @example
 * ```typescript
 * const expected = getExpectedCounts(1);
 * // { courses: 5, lessons: 92, tags: 7 }
 * ```
 */
export function getExpectedCounts(phase: PhaseNumber): ExpectedCounts {
  return EXPECTED_COUNTS[phase];
}

/**
 * Check if a phase uses curated selection
 *
 * @param phase - Phase number (1-5)
 * @returns True if phase uses curated course list
 */
export function isCuratedPhase(phase: PhaseNumber): phase is 1 | 2 {
  return phase === 1 || phase === 2;
}

/**
 * Check if a phase uses algorithmic selection
 *
 * @param phase - Phase number (1-5)
 * @returns True if phase uses algorithmic course selection
 */
export function isAlgorithmicPhase(phase: PhaseNumber): phase is 3 | 4 | 5 {
  return phase === 3 || phase === 4 || phase === 5;
}

/**
 * Get selection constraints for an algorithmic phase
 *
 * @param phase - Phase number (3-5)
 * @returns Selection constraints for algorithmic course selection
 * @throws Error if phase is not algorithmic (1 or 2)
 *
 * @example
 * ```typescript
 * const constraints = getSelectionConstraints(3);
 * // { targetCount: 80, minInstructors: 30, ... }
 * ```
 */
export function getSelectionConstraints(
  phase: 3 | 4 | 5,
): SelectionConstraints {
  return PHASE_CONSTRAINTS[phase];
}
