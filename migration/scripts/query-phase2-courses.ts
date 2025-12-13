#!/usr/bin/env bun
/**
 * Query Rails PostgreSQL for Phase 2 course selection (15 courses)
 *
 * Phase 1 has 5 courses (4 from Rails + 1 Sanity-only):
 * - fix-common-git-mistakes (modern)
 * - use-d3-v3-to-build-interactive-charts-with-javascript (ancient/Wistia)
 * - the-beginner-s-guide-to-react (special chars)
 * - form-validation-in-elm (retired)
 * - claude-code-essentials-6d87 (Sanity-only, not in Rails)
 *
 * Phase 2 needs diversity across:
 * - Instructors (10+ unique)
 * - Tags (top 20 tags)
 * - Size (1-lesson AND 50+ lesson courses)
 * - Era (ancient/middle/modern)
 * - State (published + draft)
 *
 * Era Definitions:
 * - Ancient (Wistia): lesson.id < 4425
 * - Middle (CloudFront): 4425 <= lesson.id < 10685
 * - Modern (Mux): lesson.id >= 10685
 *
 * Usage:
 *   bun scripts/query-phase2-courses.ts
 */

import { closeAll, railsDb } from "../src/lib/db";

// Phase 1 courses to exclude
const PHASE_1_SLUGS = [
  "fix-common-git-mistakes",
  "use-d3-v3-to-build-interactive-charts-with-javascript",
  "the-beginner-s-guide-to-react",
  "form-validation-in-elm",
  // claude-code-essentials-6d87 is Sanity-only, not in Rails
];

interface CourseCandidate {
  slug: string;
  instructor: string;
  lessonCount: number;
  tagCount: number;
  minLessonId: number;
  maxLessonId: number;
  state: string;
}

interface CourseSelection {
  slug: string;
  reason: string;
  instructor: string;
  lessonCount: number;
  tagCount: number;
  era: "ancient" | "middle" | "modern";
  state: string;
}

function determineEra(
  minLessonId: number,
  maxLessonId: number,
): "ancient" | "middle" | "modern" {
  // If course has lessons in ancient range, call it ancient
  if (minLessonId < 4425) return "ancient";
  // If course has lessons in modern range, call it modern
  if (maxLessonId >= 10685) return "modern";
  // Otherwise it's middle
  return "middle";
}

async function main() {
  console.log("📊 Phase 2 Course Selection Query\n");

  // Step 1: Get top instructors (exclude Phase 1 instructors)
  console.log("👥 Step 1: Query top instructors by course count...");
  const topInstructors = await railsDb<
    { instructorSlug: string; courseCount: number }[]
  >`
    SELECT 
      i.slug as "instructorSlug",
      COUNT(DISTINCT s.id)::int as "courseCount"
    FROM instructors i
    JOIN series s ON s.instructor_id = i.id
    WHERE s.state = 'published'
      AND s.slug NOT IN ${railsDb(PHASE_1_SLUGS)}
    GROUP BY i.id, i.slug
    ORDER BY "courseCount" DESC
    LIMIT 15
  `;
  console.log(`   Found ${topInstructors.length} instructors\n`);

  // Step 2: Get courses with most tags
  console.log("🏷️  Step 2: Query courses with most tags...");
  const taggedCourses = await railsDb<{ slug: string; tagCount: number }[]>`
    SELECT 
      s.slug,
      COUNT(DISTINCT t.id)::int as "tagCount"
    FROM series s
    JOIN taggings tg ON tg.taggable_type = 'Series' AND tg.taggable_id = s.id
    JOIN tags t ON t.id = tg.tag_id
    WHERE s.state = 'published'
      AND s.slug NOT IN ${railsDb(PHASE_1_SLUGS)}
    GROUP BY s.id, s.slug
    ORDER BY "tagCount" DESC
    LIMIT 15
  `;
  console.log(`   Found ${taggedCourses.length} highly-tagged courses\n`);

  // Step 3: Get size extremes (1-lesson and 50+ lesson courses)
  console.log("📏 Step 3: Query size extremes...");
  const smallCourses = await railsDb<{ slug: string; lessonCount: number }[]>`
    SELECT 
      s.slug,
      COUNT(DISTINCT l.id)::int as "lessonCount"
    FROM series s
    JOIN lessons l ON l.series_id = s.id
    WHERE s.state = 'published'
      AND s.slug NOT IN ${railsDb(PHASE_1_SLUGS)}
    GROUP BY s.id, s.slug
    HAVING COUNT(DISTINCT l.id) = 1
    LIMIT 5
  `;

  const largeCourses = await railsDb<{ slug: string; lessonCount: number }[]>`
    SELECT 
      s.slug,
      COUNT(DISTINCT l.id)::int as "lessonCount"
    FROM series s
    JOIN lessons l ON l.series_id = s.id
    WHERE s.state = 'published'
      AND s.slug NOT IN ${railsDb(PHASE_1_SLUGS)}
    GROUP BY s.id, s.slug
    HAVING COUNT(DISTINCT l.id) >= 50
    ORDER BY "lessonCount" DESC
    LIMIT 5
  `;
  console.log(`   Found ${smallCourses.length} single-lesson courses`);
  console.log(`   Found ${largeCourses.length} large (50+) courses\n`);

  // Step 4: Get era spread (ancient, middle, modern)
  console.log("🕰️  Step 4: Query era spread...");
  const ancientCourses = await railsDb<
    {
      slug: string;
      minLessonId: number;
      maxLessonId: number;
    }[]
  >`
    SELECT 
      s.slug,
      MIN(l.id)::int as "minLessonId",
      MAX(l.id)::int as "maxLessonId"
    FROM series s
    JOIN lessons l ON l.series_id = s.id
    WHERE s.state = 'published'
      AND s.slug NOT IN ${railsDb(PHASE_1_SLUGS)}
    GROUP BY s.id, s.slug
    HAVING MIN(l.id) < 4425
    LIMIT 5
  `;

  const modernCourses = await railsDb<
    {
      slug: string;
      minLessonId: number;
      maxLessonId: number;
    }[]
  >`
    SELECT 
      s.slug,
      MIN(l.id)::int as "minLessonId",
      MAX(l.id)::int as "maxLessonId"
    FROM series s
    JOIN lessons l ON l.series_id = s.id
    WHERE s.state = 'published'
      AND s.slug NOT IN ${railsDb(PHASE_1_SLUGS)}
    GROUP BY s.id, s.slug
    HAVING MAX(l.id) >= 10685
    LIMIT 5
  `;
  console.log(`   Found ${ancientCourses.length} ancient-era courses`);
  console.log(`   Found ${modernCourses.length} modern-era courses\n`);

  // Step 5: Collect all candidate slugs
  const candidateSlugs = new Set<string>();
  topInstructors.forEach(
    (i) => i.instructorSlug && candidateSlugs.add(i.instructorSlug),
  );
  taggedCourses.forEach((c) => candidateSlugs.add(c.slug));
  smallCourses.forEach((c) => candidateSlugs.add(c.slug));
  largeCourses.forEach((c) => candidateSlugs.add(c.slug));
  ancientCourses.forEach((c) => candidateSlugs.add(c.slug));
  modernCourses.forEach((c) => candidateSlugs.add(c.slug));

  // Step 6: Get full details for all candidates
  console.log("📝 Step 5: Get full details for candidates...");
  const slugList = Array.from(candidateSlugs);
  const candidateDetails = await railsDb<CourseCandidate[]>`
    SELECT 
      s.slug,
      i.slug as instructor,
      s.state,
      COUNT(DISTINCT l.id)::int as "lessonCount",
      (
        SELECT COUNT(DISTINCT t.id)::int
        FROM taggings tg
        JOIN tags t ON t.id = tg.tag_id
        WHERE tg.taggable_type = 'Series' AND tg.taggable_id = s.id
      ) as "tagCount",
      MIN(l.id)::int as "minLessonId",
      MAX(l.id)::int as "maxLessonId"
    FROM series s
    JOIN instructors i ON i.id = s.instructor_id
    JOIN lessons l ON l.series_id = s.id
    WHERE s.slug IN ${railsDb(slugList)}
    GROUP BY s.id, s.slug, i.slug, s.state
    ORDER BY "tagCount" DESC, "lessonCount" DESC
  `;
  console.log(`   Got details for ${candidateDetails.length} candidates\n`);

  // Step 7: Select 15 courses with diversity
  console.log("🎯 Step 6: Select 15 courses with diversity criteria...\n");

  const selected: CourseSelection[] = [];
  const usedInstructors = new Set<string>();

  // Priority 1: Ancient courses (2-3)
  const ancient = candidateDetails
    .filter((c) => c.minLessonId < 4425)
    .slice(0, 3);
  ancient.forEach((c) => {
    const era = determineEra(c.minLessonId, c.maxLessonId);
    selected.push({
      slug: c.slug,
      reason: `Ancient era (Wistia), lesson IDs ${c.minLessonId}-${c.maxLessonId}`,
      instructor: c.instructor,
      lessonCount: c.lessonCount,
      tagCount: c.tagCount,
      era,
      state: c.state,
    });
    usedInstructors.add(c.instructor);
  });

  // Priority 2: Modern courses (2-3)
  const modern = candidateDetails
    .filter(
      (c) => c.maxLessonId >= 10685 && !selected.find((s) => s.slug === c.slug),
    )
    .slice(0, 3);
  modern.forEach((c) => {
    const era = determineEra(c.minLessonId, c.maxLessonId);
    selected.push({
      slug: c.slug,
      reason: `Modern era (direct Mux), lesson IDs ${c.minLessonId}-${c.maxLessonId}`,
      instructor: c.instructor,
      lessonCount: c.lessonCount,
      tagCount: c.tagCount,
      era,
      state: c.state,
    });
    usedInstructors.add(c.instructor);
  });

  // Priority 3: Size extremes
  const small = candidateDetails
    .filter(
      (c) => c.lessonCount === 1 && !selected.find((s) => s.slug === c.slug),
    )
    .slice(0, 2);
  small.forEach((c) => {
    const era = determineEra(c.minLessonId, c.maxLessonId);
    selected.push({
      slug: c.slug,
      reason: `Single-lesson course (edge case)`,
      instructor: c.instructor,
      lessonCount: c.lessonCount,
      tagCount: c.tagCount,
      era,
      state: c.state,
    });
    usedInstructors.add(c.instructor);
  });

  const large = candidateDetails
    .filter(
      (c) => c.lessonCount >= 50 && !selected.find((s) => s.slug === c.slug),
    )
    .slice(0, 2);
  large.forEach((c) => {
    const era = determineEra(c.minLessonId, c.maxLessonId);
    selected.push({
      slug: c.slug,
      reason: `Large course (${c.lessonCount} lessons) for scale testing`,
      instructor: c.instructor,
      lessonCount: c.lessonCount,
      tagCount: c.tagCount,
      era,
      state: c.state,
    });
    usedInstructors.add(c.instructor);
  });

  // Priority 4: Highly-tagged courses for tag diversity
  const highlyTagged = candidateDetails
    .filter((c) => c.tagCount >= 5 && !selected.find((s) => s.slug === c.slug))
    .slice(0, 3);
  highlyTagged.forEach((c) => {
    const era = determineEra(c.minLessonId, c.maxLessonId);
    selected.push({
      slug: c.slug,
      reason: `Highly-tagged (${c.tagCount} tags) for tag coverage`,
      instructor: c.instructor,
      lessonCount: c.lessonCount,
      tagCount: c.tagCount,
      era,
      state: c.state,
    });
    usedInstructors.add(c.instructor);
  });

  // Priority 5: Instructor diversity - fill remaining slots
  const remaining = 15 - selected.length;
  if (remaining > 0) {
    const diverseInstructors = candidateDetails
      .filter((c) => !selected.find((s) => s.slug === c.slug))
      .filter((c) => !usedInstructors.has(c.instructor))
      .slice(0, remaining);

    diverseInstructors.forEach((c) => {
      const era = determineEra(c.minLessonId, c.maxLessonId);
      selected.push({
        slug: c.slug,
        reason: `Instructor diversity (${c.instructor})`,
        instructor: c.instructor,
        lessonCount: c.lessonCount,
        tagCount: c.tagCount,
        era,
        state: c.state,
      });
      usedInstructors.add(c.instructor);
    });
  }

  // If still need more, just take top remaining by tag count
  if (selected.length < 15) {
    const filler = candidateDetails
      .filter((c) => !selected.find((s) => s.slug === c.slug))
      .slice(0, 15 - selected.length);

    filler.forEach((c) => {
      const era = determineEra(c.minLessonId, c.maxLessonId);
      selected.push({
        slug: c.slug,
        reason: `Additional coverage (${c.tagCount} tags, ${c.lessonCount} lessons)`,
        instructor: c.instructor,
        lessonCount: c.lessonCount,
        tagCount: c.tagCount,
        era,
        state: c.state,
      });
      usedInstructors.add(c.instructor);
    });
  }

  // Calculate summary stats
  const totalTags = selected.reduce((sum, c) => sum + c.tagCount, 0);
  const eraBreakdown = {
    ancient: selected.filter((c) => c.era === "ancient").length,
    middle: selected.filter((c) => c.era === "middle").length,
    modern: selected.filter((c) => c.era === "modern").length,
  };

  // Output results
  const output = {
    phase: 2,
    selectedCourses: selected,
    summary: {
      totalCourses: selected.length,
      uniqueInstructors: usedInstructors.size,
      totalTags: totalTags,
      avgTagsPerCourse: Math.round((totalTags / selected.length) * 10) / 10,
      eraBreakdown,
      sizesRange: {
        min: Math.min(...selected.map((c) => c.lessonCount)),
        max: Math.max(...selected.map((c) => c.lessonCount)),
      },
    },
  };

  console.log("✅ Phase 2 Course Selection Complete!\n");
  console.log(JSON.stringify(output, null, 2));

  await closeAll();
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
