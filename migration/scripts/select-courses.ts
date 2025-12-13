#!/usr/bin/env bun
/**
 * Algorithmic Course Selection for Phases 3-5
 *
 * Uses greedy selection algorithm with scoring based on:
 * - Instructor uniqueness (+10 for new instructor)
 * - Tag coverage (+1 per new tag)
 * - Era balance (+5 for underrepresented era)
 * - Size variety (+3 for extremes: 1 lesson or 50+)
 *
 * Guarantees:
 * - Phase N includes ALL courses from Phase N-1 (superset property)
 * - Meets era distribution targets from phase-config.ts
 * - Maximizes instructor and tag diversity
 *
 * Usage:
 *   bun scripts/select-courses.ts --phase 3           # Select for Phase 3
 *   bun scripts/select-courses.ts --phase 4 --dry-run # Preview Phase 4
 *   bun scripts/select-courses.ts --phase 5 --list    # List Phase 5 courses
 */

import { closeAll, railsDb } from "../src/lib/db";
import {
  getCourseSlugsByPhase,
  getSelectionConstraints,
  isCuratedPhase,
  type PhaseNumber,
  type SelectionConstraints,
} from "../src/lib/phase-config";

// ============================================================================
// Types
// ============================================================================

interface CourseCandidate {
  slug: string;
  instructorId: number;
  instructor: string;
  state: string;
  lessonCount: number;
  minLessonId: number;
  maxLessonId: number;
  tags: string[];
  era: "ancient" | "middle" | "modern";
}

interface ScoredCourse extends CourseCandidate {
  score: number;
  scoreBreakdown: {
    instructorBonus: number;
    tagBonus: number;
    eraBonus: number;
    sizeBonus: number;
  };
}

interface SelectionOutput {
  phase: PhaseNumber;
  selectedCourses: string[];
  stats: {
    totalCourses: number;
    uniqueInstructors: number;
    tagsCovered: number;
    eraDistribution: {
      ancient: number;
      middle: number;
      modern: number;
    };
    sizeRange: {
      min: number;
      max: number;
    };
  };
}

// ============================================================================
// CLI Parsing
// ============================================================================

const args = process.argv.slice(2);
const phaseArg = args.find((a) => a.startsWith("--phase="))?.split("=")[1];
const DRY_RUN = args.includes("--dry-run");
const LIST_ONLY = args.includes("--list");

if (!phaseArg) {
  console.error("❌ Missing required --phase argument");
  console.error("\nUsage:");
  console.error("  bun scripts/select-courses.ts --phase 3");
  console.error("  bun scripts/select-courses.ts --phase 4 --dry-run");
  console.error("  bun scripts/select-courses.ts --phase 5 --list");
  process.exit(1);
}

const phase = parseInt(phaseArg, 10) as PhaseNumber;

if (![1, 2, 3, 4, 5].includes(phase)) {
  console.error(`❌ Invalid phase: ${phase} (must be 1-5)`);
  process.exit(1);
}

if (isCuratedPhase(phase)) {
  console.error(`❌ Phase ${phase} uses curated selection, not algorithmic`);
  console.error("   Use getCourseSlugsByPhase() to get the curated list");
  process.exit(1);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine course era based on min lesson ID
 */
function determineEra(minLessonId: number): "ancient" | "middle" | "modern" {
  if (minLessonId < 4425) return "ancient";
  if (minLessonId < 10685) return "middle";
  return "modern";
}

/**
 * Score a course for selection priority
 */
function scoreCourse(
  course: CourseCandidate,
  selected: Set<string>,
  selectedInstructors: Set<number>,
  selectedTags: Set<string>,
  selectedByEra: Record<string, number>,
  constraints: SelectionConstraints,
): ScoredCourse {
  let instructorBonus = 0;
  let tagBonus = 0;
  let eraBonus = 0;
  let sizeBonus = 0;

  // Instructor uniqueness: +10 for new instructor
  if (!selectedInstructors.has(course.instructorId)) {
    instructorBonus = 10;
  }

  // Tag coverage: +1 per new tag
  for (const tag of course.tags) {
    if (!selectedTags.has(tag)) {
      tagBonus += 1;
    }
  }

  // Era balance: +5 if this era is underrepresented
  if (selected.size > 0) {
    const currentEraRatio = selectedByEra[course.era] / selected.size;
    const targetRatio = constraints.eraDistribution[course.era];
    if (currentEraRatio < targetRatio) {
      eraBonus = 5;
    }
  }

  // Size variety: +3 for extreme sizes (1 lesson or 50+)
  if (course.lessonCount === 1 || course.lessonCount >= 50) {
    sizeBonus = 3;
  }

  const totalScore = instructorBonus + tagBonus + eraBonus + sizeBonus;

  return {
    ...course,
    score: totalScore,
    scoreBreakdown: {
      instructorBonus,
      tagBonus,
      eraBonus,
      sizeBonus,
    },
  };
}

// ============================================================================
// Main Selection Algorithm
// ============================================================================

async function main() {
  console.log(`🎯 Algorithmic Course Selection for Phase ${phase}\n`);

  // Safe to cast since we validated phase is 3-5 above
  const constraints = getSelectionConstraints(phase as 3 | 4 | 5);

  console.log("📋 Selection Constraints:");
  console.log(`   Target courses: ${constraints.targetCount}`);
  console.log(`   Min instructors: ${constraints.minInstructors}`);
  console.log(`   Min tags: ${constraints.minTags}`);
  console.log(`   Include retired: ${constraints.includeRetired}`);
  console.log(
    `   Era distribution: ${Math.round(constraints.eraDistribution.ancient * 100)}% ancient, ${Math.round(constraints.eraDistribution.middle * 100)}% middle, ${Math.round(constraints.eraDistribution.modern * 100)}% modern\n`,
  );

  // Step 1: Get previous phase courses (superset guarantee)
  console.log("📦 Step 1: Load previous phase courses...");
  const previousPhase = (phase - 1) as PhaseNumber;
  let previousCourses: string[] = [];

  if (isCuratedPhase(previousPhase)) {
    const slugs = getCourseSlugsByPhase(previousPhase);
    previousCourses = slugs || [];
  } else {
    console.error(
      `   ⚠️  Previous phase ${previousPhase} is algorithmic - you must run it first!`,
    );
    console.error(
      `   Run: bun scripts/select-courses.ts --phase ${previousPhase}`,
    );
    await closeAll();
    process.exit(1);
  }

  console.log(
    `   Loaded ${previousCourses.length} courses from Phase ${previousPhase}\n`,
  );

  // Step 2: Query all candidate courses
  console.log("📊 Step 2: Query candidate courses from Rails...");

  const stateFilter = constraints.includeRetired
    ? ["published", "draft", "removed"]
    : ["published", "draft"];

  const candidates = await railsDb<
    {
      slug: string;
      instructorId: number;
      instructor: string;
      state: string;
      lessonCount: number;
      minLessonId: number;
      maxLessonId: number;
      tags: string[] | null;
    }[]
  >`
    SELECT 
      s.slug,
      s.instructor_id as "instructorId",
      i.slug as instructor,
      s.state,
      COUNT(DISTINCT l.id)::int as "lessonCount",
      MIN(l.id)::int as "minLessonId",
      MAX(l.id)::int as "maxLessonId",
      ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
    FROM series s
    JOIN instructors i ON i.id = s.instructor_id
    LEFT JOIN lessons l ON l.series_id = s.id
    LEFT JOIN taggings tg ON tg.taggable_type = 'Series' AND tg.taggable_id = s.id
    LEFT JOIN tags t ON t.id = tg.tag_id
    WHERE s.state IN ${railsDb(stateFilter)}
    GROUP BY s.id, s.slug, s.instructor_id, i.slug, s.state
    HAVING COUNT(DISTINCT l.id) > 0
    ORDER BY s.id
  `;

  // Map to CourseCandidate with era
  const candidateList: CourseCandidate[] = candidates.map((c) => ({
    slug: c.slug,
    instructorId: c.instructorId,
    instructor: c.instructor,
    state: c.state,
    lessonCount: c.lessonCount,
    minLessonId: c.minLessonId,
    maxLessonId: c.maxLessonId,
    tags: c.tags || [],
    era: determineEra(c.minLessonId),
  }));

  console.log(`   Found ${candidateList.length} candidate courses\n`);

  // Step 3: Initialize tracking sets
  console.log("🔄 Step 3: Initialize selection with previous phase courses...");
  const selected = new Set<string>(previousCourses);
  const selectedInstructors = new Set<number>();
  const selectedTags = new Set<string>();
  const selectedByEra: Record<string, number> = {
    ancient: 0,
    middle: 0,
    modern: 0,
  };

  // Populate tracking from previous phase
  for (const slug of previousCourses) {
    const course = candidateList.find((c) => c.slug === slug);
    if (course) {
      selectedInstructors.add(course.instructorId);
      course.tags.forEach((tag) => selectedTags.add(tag));
      selectedByEra[course.era]++;
    }
  }

  console.log(`   Starting with ${selected.size} courses`);
  console.log(`   ${selectedInstructors.size} instructors`);
  console.log(`   ${selectedTags.size} tags`);
  console.log(
    `   Era: ${selectedByEra.ancient} ancient, ${selectedByEra.middle} middle, ${selectedByEra.modern} modern\n`,
  );

  // Step 4: Greedy selection
  console.log(
    `🎲 Step 4: Greedy selection to ${constraints.targetCount} courses...\n`,
  );

  let iteration = 0;
  while (selected.size < constraints.targetCount) {
    iteration++;

    // Filter to unselected courses
    const remaining = candidateList.filter((c) => !selected.has(c.slug));

    if (remaining.length === 0) {
      console.warn(
        `   ⚠️  No more candidates available (selected ${selected.size}/${constraints.targetCount})`,
      );
      break;
    }

    // Score all remaining courses
    const scored = remaining.map((c) =>
      scoreCourse(
        c,
        selected,
        selectedInstructors,
        selectedTags,
        selectedByEra,
        constraints,
      ),
    );

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Select top course
    const winner = scored[0];
    if (!winner) break;

    selected.add(winner.slug);
    selectedInstructors.add(winner.instructorId);
    winner.tags.forEach((tag) => selectedTags.add(tag));
    selectedByEra[winner.era]++;

    // Log progress every 10 iterations
    if (iteration % 10 === 0 || iteration === 1) {
      console.log(
        `   [${selected.size}/${constraints.targetCount}] Selected: ${winner.slug}`,
      );
      console.log(
        `              Score: ${winner.score} (instructor:${winner.scoreBreakdown.instructorBonus} tags:${winner.scoreBreakdown.tagBonus} era:${winner.scoreBreakdown.eraBonus} size:${winner.scoreBreakdown.sizeBonus})`,
      );
    }
  }

  console.log(`\n✅ Selection complete: ${selected.size} courses\n`);

  // Step 5: Generate output
  const selectedList = Array.from(selected);
  const selectedCourses = candidateList.filter((c) =>
    selectedList.includes(c.slug),
  );

  const output: SelectionOutput = {
    phase,
    selectedCourses: selectedList,
    stats: {
      totalCourses: selected.size,
      uniqueInstructors: selectedInstructors.size,
      tagsCovered: selectedTags.size,
      eraDistribution: {
        ancient: selectedByEra.ancient,
        middle: selectedByEra.middle,
        modern: selectedByEra.modern,
      },
      sizeRange: {
        min: Math.min(...selectedCourses.map((c) => c.lessonCount)),
        max: Math.max(...selectedCourses.map((c) => c.lessonCount)),
      },
    },
  };

  // Output format based on flags
  if (LIST_ONLY) {
    console.log("📝 Selected Course Slugs:\n");
    selectedList.forEach((slug) => console.log(`  - ${slug}`));
  } else {
    console.log("📊 Selection Results:\n");
    console.log(JSON.stringify(output, null, 2));
  }

  console.log("\n📈 Summary:");
  console.log(`   Courses: ${output.stats.totalCourses}`);
  console.log(`   Instructors: ${output.stats.uniqueInstructors}`);
  console.log(`   Tags: ${output.stats.tagsCovered}`);
  console.log(
    `   Era: ${output.stats.eraDistribution.ancient} ancient, ${output.stats.eraDistribution.middle} middle, ${output.stats.eraDistribution.modern} modern`,
  );
  console.log(
    `   Size: ${output.stats.sizeRange.min}-${output.stats.sizeRange.max} lessons`,
  );

  // Constraint validation
  console.log("\n🎯 Constraint Validation:");
  const passInstructors =
    output.stats.uniqueInstructors >= constraints.minInstructors;
  const passTags = output.stats.tagsCovered >= constraints.minTags;
  const passCount = output.stats.totalCourses >= constraints.targetCount;

  console.log(
    `   ${passInstructors ? "✅" : "❌"} Instructors: ${output.stats.uniqueInstructors} >= ${constraints.minInstructors}`,
  );
  console.log(
    `   ${passTags ? "✅" : "❌"} Tags: ${output.stats.tagsCovered} >= ${constraints.minTags}`,
  );
  console.log(
    `   ${passCount ? "✅" : "❌"} Courses: ${output.stats.totalCourses} >= ${constraints.targetCount}`,
  );

  // Era distribution check
  const ancientRatio =
    output.stats.eraDistribution.ancient / output.stats.totalCourses;
  const middleRatio =
    output.stats.eraDistribution.middle / output.stats.totalCourses;
  const modernRatio =
    output.stats.eraDistribution.modern / output.stats.totalCourses;

  console.log("\n🕰️  Era Distribution:");
  console.log(
    `   Ancient: ${Math.round(ancientRatio * 100)}% (target: ${Math.round(constraints.eraDistribution.ancient * 100)}%)`,
  );
  console.log(
    `   Middle: ${Math.round(middleRatio * 100)}% (target: ${Math.round(constraints.eraDistribution.middle * 100)}%)`,
  );
  console.log(
    `   Modern: ${Math.round(modernRatio * 100)}% (target: ${Math.round(constraints.eraDistribution.modern * 100)}%)`,
  );

  if (DRY_RUN) {
    console.log("\n🔍 DRY RUN - No changes made");
  }

  await closeAll();

  // Exit with error if constraints not met
  if (!passInstructors || !passTags || !passCount) {
    console.error("\n❌ Selection failed to meet constraints");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
