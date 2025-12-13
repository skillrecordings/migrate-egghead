#!/usr/bin/env bun
/**
 * Full Docker reset with real POC data
 *
 * Features:
 * - Caches exported data (PII scrubbed) to avoid hitting prod repeatedly
 * - All exports are scrubbed for PII before caching
 * - Use --live to force re-export from production
 * - Use --phase=N to select phase (1-5, default: 1)
 *
 * Usage:
 *   bun scripts/docker-reset.ts              # Phase 1, use cache (default, fast)
 *   bun scripts/docker-reset.ts --phase=2    # Phase 2, use cache
 *   bun scripts/docker-reset.ts --live       # Phase 1, force re-export from prod
 *   bun scripts/docker-reset.ts --phase=3 --live  # Phase 3, force re-export
 */

import { $ } from "bun";

import {
  anonymizeInstructor,
  anonymizeUser,
  cleanPgDump,
  generateInsert,
  generateSequenceResets,
  scrubRecord,
  wrapWithFkDisable,
} from "../src/lib/sql-gen";

import {
  getCourseSlugsByPhase,
  getSelectionConstraints,
  isCuratedPhase,
  isAlgorithmicPhase,
  SANITY_ONLY_COURSES,
  type PhaseNumber,
} from "../src/lib/phase-config";

const MIGRATION_DIR = `${import.meta.dir}/..`;
const DOCKER_DIR = `${MIGRATION_DIR}/../investigation/docker`;

// Parse args
const args = process.argv.slice(2);
const LIVE_MODE = args.includes("--live");
const phaseArg = args.find((a) => a.startsWith("--phase="));
const PHASE = phaseArg ? parseInt(phaseArg.split("=")[1]) : 1;

// Validate phase
if (PHASE < 1 || PHASE > 5) {
  console.error(`❌ Invalid phase: ${PHASE} (must be 1-5)`);
  process.exit(1);
}

// Phase-specific cache directory
const CACHE_DIR = `${MIGRATION_DIR}/.cache/phase-${PHASE}`;

// Course slugs - will be populated either from curated list or algorithmic selection
let COURSE_SLUGS: string[] = [];

/**
 * Get course slugs for the phase - either curated or algorithmically selected
 */
async function getCourseSlugsForPhase(): Promise<string[]> {
  // For curated phases (1-2), use the predefined list
  const curatedSlugs = getCourseSlugsByPhase(PHASE as PhaseNumber);
  if (curatedSlugs) {
    return curatedSlugs;
  }

  // For algorithmic phases (3-5), check cache first
  const selectionCachePath = `${CACHE_DIR}/selected-courses.json`;

  try {
    const cached = await Bun.file(selectionCachePath).json();
    if (cached?.courses && Array.isArray(cached.courses)) {
      console.log(
        `📦 Using cached algorithmic selection (${cached.courses.length} courses)`,
      );
      return cached.courses;
    }
  } catch {
    // No cache, need to run selection
  }

  // Run algorithmic selection
  console.log(`🎲 Running algorithmic course selection for Phase ${PHASE}...`);

  const { railsDb, closeAll } = await import("../src/lib/db");
  const constraints = getSelectionConstraints(PHASE as 3 | 4 | 5);

  // Get previous phase courses (superset guarantee)
  const previousPhase = (PHASE - 1) as PhaseNumber;
  let previousCourses: string[] = [];

  if (isCuratedPhase(previousPhase)) {
    previousCourses = getCourseSlugsByPhase(previousPhase) || [];
  } else {
    // Load from previous phase cache
    const prevCachePath = `${MIGRATION_DIR}/.cache/phase-${previousPhase}/selected-courses.json`;
    try {
      const prevCached = await Bun.file(prevCachePath).json();
      previousCourses = prevCached?.courses || [];
    } catch {
      console.error(
        `❌ Previous phase ${previousPhase} not cached. Run it first!`,
      );
      console.error(
        `   bun scripts/docker-reset.ts --phase=${previousPhase} --live`,
      );
      process.exit(1);
    }
  }

  // Query all candidate courses from playlists (NOT series - series is deprecated!)
  // Official courses are identified by visibility_state = 'indexed'
  // Join via tracklists (polymorphic) to get lessons
  // See reports/RAILS_SCHEMA_REFERENCE.md for schema documentation

  const candidates = await railsDb<
    {
      slug: string;
      instructorId: number;
      lessonCount: number;
      minLessonId: number;
      tags: string[] | null;
    }[]
  >`
    SELECT 
      p.slug,
      COALESCE(i.id, 0)::int as "instructorId",
      COUNT(DISTINCT l.id)::int as "lessonCount",
      MIN(l.id)::int as "minLessonId",
      ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
    FROM playlists p
    JOIN tracklists tr ON tr.playlist_id = p.id AND tr.tracklistable_type = 'Lesson'
    JOIN lessons l ON l.id = tr.tracklistable_id AND l.state = 'published'
    LEFT JOIN instructors i ON i.user_id = p.owner_id
    LEFT JOIN taggings tg ON tg.taggable_type = 'Playlist' AND tg.taggable_id = p.id
    LEFT JOIN tags t ON t.id = tg.tag_id
    WHERE p.visibility_state = 'indexed'
    AND p.state = 'published'
    GROUP BY p.id, p.slug, i.id
    HAVING COUNT(DISTINCT l.id) > 0
    ORDER BY p.id
  `;

  // Determine era based on min lesson ID
  const determineEra = (
    minLessonId: number,
  ): "ancient" | "middle" | "modern" => {
    if (minLessonId < 4425) return "ancient";
    if (minLessonId < 10685) return "middle";
    return "modern";
  };

  // Initialize tracking
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
    const course = candidates.find((c) => c.slug === slug);
    if (course) {
      selectedInstructors.add(course.instructorId);
      (course.tags || []).forEach((tag) => selectedTags.add(tag));
      selectedByEra[determineEra(course.minLessonId)]++;
    }
  }

  // Greedy selection
  while (selected.size < constraints.targetCount) {
    const remaining = candidates.filter((c) => !selected.has(c.slug));
    if (remaining.length === 0) break;

    // Score each candidate
    let bestScore = -1;
    let bestCourse: (typeof remaining)[0] | null = null;

    for (const course of remaining) {
      let score = 0;
      const era = determineEra(course.minLessonId);

      // Instructor uniqueness: +10
      if (!selectedInstructors.has(course.instructorId)) score += 10;

      // Tag coverage: +1 per new tag
      for (const tag of course.tags || []) {
        if (!selectedTags.has(tag)) score += 1;
      }

      // Era balance: +5 if underrepresented
      if (selected.size > 0) {
        const currentRatio = selectedByEra[era] / selected.size;
        const targetRatio = constraints.eraDistribution[era];
        if (currentRatio < targetRatio) score += 5;
      }

      // Size variety: +3 for extremes
      if (course.lessonCount === 1 || course.lessonCount >= 50) score += 3;

      if (score > bestScore) {
        bestScore = score;
        bestCourse = course;
      }
    }

    if (!bestCourse) break;

    selected.add(bestCourse.slug);
    selectedInstructors.add(bestCourse.instructorId);
    (bestCourse.tags || []).forEach((tag) => selectedTags.add(tag));
    selectedByEra[determineEra(bestCourse.minLessonId)]++;

    // Progress logging
    if (selected.size % 20 === 0) {
      console.log(
        `   Selected ${selected.size}/${constraints.targetCount} courses...`,
      );
    }
  }

  const selectedList = Array.from(selected);

  // Cache the selection
  await $`mkdir -p ${CACHE_DIR}`;
  await Bun.write(
    selectionCachePath,
    JSON.stringify(
      {
        phase: PHASE,
        courses: selectedList,
        stats: {
          totalCourses: selectedList.length,
          uniqueInstructors: selectedInstructors.size,
          tagsCovered: selectedTags.size,
          eraDistribution: selectedByEra,
        },
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  console.log(`   ✅ Selected ${selectedList.length} courses`);
  console.log(
    `   Instructors: ${selectedInstructors.size}, Tags: ${selectedTags.size}`,
  );
  console.log(
    `   Era: ${selectedByEra.ancient} ancient, ${selectedByEra.middle} middle, ${selectedByEra.modern} modern`,
  );

  await closeAll();
  return selectedList;
}

async function main() {
  // Get course slugs for this phase (curated or algorithmic)
  COURSE_SLUGS = await getCourseSlugsForPhase();

  console.log(
    `\n🔄 Docker Reset - Phase ${PHASE} (${COURSE_SLUGS.length} courses)\n`,
  );

  // Check cache
  const cacheValid = await isCacheValid();

  if (cacheValid && !LIVE_MODE) {
    console.log("📦 Using cached export (use --live to re-export from prod)\n");
  } else {
    if (LIVE_MODE) {
      console.log("🔴 LIVE MODE: Exporting from production...\n");
    } else {
      console.log("📋 No cache found, exporting from production...\n");
    }

    // Step 1: Export from production
    console.log("📋 Step 1: Export schema and data from Rails...");
    await exportPocData();

    // Step 2: Clean up pg_dump output
    console.log("\n📋 Step 2: Clean pg_dump for Docker compatibility...");
    await cleanInitSql();

    // Write cache marker
    await writeCacheMarker();
  }

  // Step 3: Copy to Docker location
  console.log("📋 Step 3: Copy files to investigation/docker/...");
  await $`cp ${CACHE_DIR}/init.sql ${DOCKER_DIR}/postgres/`;
  await $`cp ${CACHE_DIR}/seed.sql ${DOCKER_DIR}/postgres/`;
  console.log("   ✅ Files copied");

  // Step 4: Reset Docker
  console.log("\n📋 Step 4: Reset Docker containers...");
  await $`cd ${DOCKER_DIR} && docker-compose down -v 2>/dev/null || true`;
  await $`cd ${DOCKER_DIR} && docker-compose up -d`;

  // Step 5: Wait for health
  console.log("\n📋 Step 5: Waiting for containers to be healthy...");
  await waitForHealth();

  // Step 6: Verify
  console.log("\n📋 Step 6: Verify data loaded...");
  await verifyData();

  console.log("\n✨ Docker reset complete!");
  console.log("\nContainers:");
  console.log("  PostgreSQL: localhost:5433 (user: postgres, pass: postgres)");
  console.log("  MySQL:      localhost:3307 (user: root, pass: root)");
  console.log("  Sanity:     localhost:4000/graphql");
}

async function isCacheValid(): Promise<boolean> {
  const markerPath = `${CACHE_DIR}/.cache-marker`;
  const initPath = `${CACHE_DIR}/init.sql`;
  const seedPath = `${CACHE_DIR}/seed.sql`;

  try {
    const [marker, init, seed] = await Promise.all([
      Bun.file(markerPath).exists(),
      Bun.file(initPath).exists(),
      Bun.file(seedPath).exists(),
    ]);
    return marker && init && seed;
  } catch {
    return false;
  }
}

async function writeCacheMarker() {
  const markerPath = `${CACHE_DIR}/.cache-marker`;
  const marker = {
    exportedAt: new Date().toISOString(),
    phase: PHASE,
    courses: COURSE_SLUGS,
  };
  await Bun.write(markerPath, JSON.stringify(marker, null, 2));
}

async function exportPocData() {
  const { railsDb, closeAll } = await import("../src/lib/db");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set");
  }

  // Export schema via pg_dump
  const schema = await $`pg_dump "${databaseUrl}" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-comments \
    --table=users \
    --table=instructors \
    --table=lessons \
    --table=tags \
    --table=taggings \
    --table=playlists \
    --table=tracklists \
    2>/dev/null`.text();

  await $`mkdir -p ${CACHE_DIR}`;
  await Bun.write(`${CACHE_DIR}/init.sql`, schema);
  console.log(`   Schema: ${schema.split("\n").length} lines`);

  // ============================================================================
  // COURSES ARE IN PLAYLISTS + TRACKLISTS, NOT SERIES!
  // See reports/RAILS_SCHEMA_REFERENCE.md
  // ============================================================================

  // Get courses from playlists (the ONLY source of truth for courses)
  const courses = await railsDb`
    SELECT p.id, p.slug, p.title, p.owner_id, p.state, p.visibility_state, p.access_state
    FROM playlists p
    WHERE p.slug = ANY(${COURSE_SLUGS})
      AND p.visibility_state = 'indexed'
  `;
  console.log(`   Courses found: ${courses.length}`);

  if (courses.length === 0) {
    console.log("   ⚠️  No courses found in playlists table");
    await Bun.write(`${CACHE_DIR}/seed.sql`, "-- No courses found\n");
    await closeAll();
    return;
  }

  const courseIds = courses.map((c) => c.id);

  // Get tracklists (the join table linking playlists → lessons)
  const tracklistRows = await railsDb`
    SELECT t.*
    FROM tracklists t
    WHERE t.playlist_id = ANY(${courseIds})
      AND t.tracklistable_type = 'Lesson'
  `;
  const lessonIdsInCourses = tracklistRows.map((t) => t.tracklistableId);
  console.log(`   Tracklists: ${tracklistRows.length} entries`);

  // Get lessons in courses via tracklists (NOT series_id!)
  const courseLessonRows =
    lessonIdsInCourses.length > 0
      ? await railsDb`SELECT * FROM lessons WHERE id = ANY(${lessonIdsInCourses})`
      : [];
  console.log(`   Lessons in courses: ${courseLessonRows.length}`);

  // Get standalone lessons (published, not in any indexed playlist)
  const standaloneLessonRows = await railsDb`
    SELECT l.* FROM lessons l
    WHERE l.state = 'published'
    AND NOT EXISTS (
      SELECT 1 FROM tracklists t
      JOIN playlists p ON p.id = t.playlist_id
      WHERE t.tracklistable_type = 'Lesson'
      AND t.tracklistable_id = l.id
      AND p.visibility_state = 'indexed'
    )
    LIMIT 1650
  `;
  console.log(`   Standalone lessons: ${standaloneLessonRows.length}`);

  // Combine all lessons
  const lessonRows = [...courseLessonRows, ...standaloneLessonRows];
  const allLessonIds = lessonRows.map((l) => l.id);

  // Get instructor IDs from playlist owners and lessons
  const ownerIds = courses.map((c) => c.ownerId).filter(Boolean);
  const instructorsByUser =
    ownerIds.length > 0
      ? await railsDb`SELECT * FROM instructors WHERE user_id = ANY(${ownerIds})`
      : [];

  const lessonInstructorIds = lessonRows
    .map((l) => l.instructorId)
    .filter(Boolean);
  const instructorsByLesson =
    lessonInstructorIds.length > 0
      ? await railsDb`SELECT * FROM instructors WHERE id = ANY(${lessonInstructorIds})`
      : [];

  // Combine and dedupe instructors
  const allInstructors = [...instructorsByUser, ...instructorsByLesson];
  const instructorMap = new Map(allInstructors.map((i) => [i.id, i]));
  const instructors = [...instructorMap.values()];

  // Get user IDs from instructors
  const userIds = instructors.map((i) => i.userId).filter(Boolean);
  const users =
    userIds.length > 0
      ? await railsDb`SELECT * FROM users WHERE id = ANY(${userIds})`
      : [];

  // Get full playlist rows
  const playlistRows =
    await railsDb`SELECT * FROM playlists WHERE id = ANY(${courseIds})`;

  // Get tags and taggings (for Playlist type, not Series!)
  const taggings = await railsDb`
    SELECT * FROM taggings
    WHERE (taggable_type = 'Lesson' AND taggable_id = ANY(${allLessonIds}))
       OR (taggable_type = 'Playlist' AND taggable_id = ANY(${courseIds}))
  `;

  const tagIds = [...new Set(taggings.map((t) => t.tagId))].filter(Boolean);
  const tags =
    tagIds.length > 0
      ? await railsDb`SELECT * FROM tags WHERE id = ANY(${tagIds})`
      : [];

  // Generate seed SQL
  const inserts: string[] = [
    `-- Course Data Export (PLAYLISTS + TRACKLISTS)`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Courses (${courses.length}):`,
    ...courses.map((c) => `--   ${c.slug} (visibility: ${c.visibilityState})`),
    "",
  ];

  // Users
  inserts.push(`-- Users (${users.length})`);
  for (const u of users) {
    inserts.push(generateInsert("users", anonymizeUser(u)));
  }
  inserts.push("");

  // Instructors
  inserts.push(`-- Instructors (${instructors.length})`);
  for (const i of instructors) {
    inserts.push(generateInsert("instructors", anonymizeInstructor(i)));
  }
  inserts.push("");

  // Playlists (THE source of courses)
  inserts.push(`-- Playlists/Courses (${playlistRows.length})`);
  for (const p of playlistRows) {
    inserts.push(generateInsert("playlists", scrubRecord(p)));
  }
  inserts.push("");

  // Tracklists (the join table)
  inserts.push(`-- Tracklists (${tracklistRows.length})`);
  for (const t of tracklistRows) {
    inserts.push(generateInsert("tracklists", t));
  }
  inserts.push("");

  // Lessons
  inserts.push(`-- Lessons (${lessonRows.length})`);
  for (const l of lessonRows) {
    inserts.push(generateInsert("lessons", scrubRecord(l)));
  }
  inserts.push("");

  // Tags
  if (tags.length > 0) {
    inserts.push(`-- Tags (${tags.length})`);
    for (const t of tags) {
      inserts.push(generateInsert("tags", t));
    }
    inserts.push("");
  }

  // Taggings
  if (taggings.length > 0) {
    inserts.push(`-- Taggings (${taggings.length})`);
    for (const t of taggings) {
      inserts.push(generateInsert("taggings", t));
    }
    inserts.push("");
  }

  // Wrap with FK disable and add sequence resets
  const wrapped = wrapWithFkDisable(inserts);
  const sequenceResets = generateSequenceResets([
    "users",
    "instructors",
    "playlists",
    "tracklists",
    "lessons",
    "tags",
    "taggings",
  ]);

  const seedSql = [
    ...wrapped,
    "",
    "-- Reset sequences",
    ...sequenceResets,
  ].join("\n");
  await Bun.write(`${CACHE_DIR}/seed.sql`, seedSql);

  console.log(`   Seed: ${seedSql.split("\n").length} lines`);
  console.log(`   Users: ${users.length}, Instructors: ${instructors.length}`);
  console.log(
    `   Playlists: ${playlistRows.length}, Tracklists: ${tracklistRows.length}`,
  );
  console.log(`   Lessons (total): ${lessonRows.length}`);
  console.log(`     - In courses: ${courseLessonRows.length}`);
  console.log(`     - Standalone: ${standaloneLessonRows.length}`);
  console.log(`   Tags: ${tags.length}, Taggings: ${taggings.length}`);

  await closeAll();
}

async function cleanInitSql() {
  const initPath = `${CACHE_DIR}/init.sql`;
  const content = await Bun.file(initPath).text();
  const cleaned = cleanPgDump(content);
  await Bun.write(initPath, cleaned);
  console.log("   ✅ Cleaned pg_dump output");
}

async function waitForHealth(maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const result =
      await $`docker ps --format "{{.Names}}:{{.Status}}" 2>/dev/null`.text();
    const lines = result.trim().split("\n");

    const postgres = lines.find((l) => l.includes("egghead_test_postgres"));
    const mysql = lines.find((l) => l.includes("egghead_test_mysql"));

    if (postgres?.includes("healthy") && mysql?.includes("healthy")) {
      console.log("   ✅ All containers healthy");
      return;
    }

    await Bun.sleep(1000);
  }
  throw new Error("Containers did not become healthy in time");
}

async function verifyData() {
  const result =
    await $`docker exec egghead_test_postgres psql -U postgres -d egghead_test -t -c "
    SELECT 'users' as tbl, COUNT(*) FROM users
    UNION ALL SELECT 'instructors', COUNT(*) FROM instructors
    UNION ALL SELECT 'playlists', COUNT(*) FROM playlists
    UNION ALL SELECT 'tracklists', COUNT(*) FROM tracklists
    UNION ALL SELECT 'lessons', COUNT(*) FROM lessons
    UNION ALL SELECT 'tags', COUNT(*) FROM tags
    UNION ALL SELECT 'taggings', COUNT(*) FROM taggings
  "`.text();

  console.log("   Table counts:");
  for (const line of result.trim().split("\n")) {
    const [table, count] = line.split("|").map((s) => s.trim());
    if (table && count) {
      console.log(`     ${table}: ${count}`);
    }
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
