#!/usr/bin/env bun
/**
 * Delete Duplicate Lessons from Production
 *
 * URGENT FIX: Remove type='lesson' records that have matching slugs with type='post' records.
 * These duplicates are causing Vercel build failures due to conflicting routes.
 *
 * Context:
 * - Coursebuilder has two ways to represent lessons:
 *   - type='post' with postType='lesson' - created via CB UI (CORRECT)
 *   - type='lesson' - created by migration script (DUPLICATES)
 * - When a lesson exists as both types with the same slug, we delete the type='lesson' version
 *
 * Process:
 * 1. Query for duplicate slugs (lessons matching posts)
 * 2. Delete ContentResourceResource links (lesson→video, course→lesson)
 * 3. Delete the type='lesson' ContentResource records
 * 4. Log all deletions for audit trail
 *
 * Usage:
 *   bun scripts/delete-duplicate-lessons.ts              # Dry run (default)
 *   bun scripts/delete-duplicate-lessons.ts --execute    # Execute deletion
 */

import { closeAll, getMysqlDb } from "../src/lib/db";

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");

interface DuplicateLesson {
  id: string;
  slug: string;
  title: string;
  createdAt: Date;
}

interface DeletionStats {
  duplicateLessonsFound: number;
  lessonsDeleted: number;
  relationshipsDeleted: number;
  errors: number;
}

function createStats(): DeletionStats {
  return {
    duplicateLessonsFound: 0,
    lessonsDeleted: 0,
    relationshipsDeleted: 0,
    errors: 0,
  };
}

/**
 * Find all type='lesson' records that have matching slugs with type='post' records
 */
async function findDuplicateLessons(): Promise<DuplicateLesson[]> {
  const db = await getMysqlDb();

  const [rows] = await db.query<
    Array<{
      id: string;
      slug: string | null;
      title: string | null;
      createdAt: Date;
    }>
  >(`
    SELECT 
      l.id,
      JSON_UNQUOTE(JSON_EXTRACT(l.fields, '$.slug')) as slug,
      JSON_UNQUOTE(JSON_EXTRACT(l.fields, '$.title')) as title,
      l.createdAt
    FROM egghead_ContentResource l
    WHERE l.type = 'lesson'
    AND JSON_EXTRACT(l.fields, '$.slug') IN (
      SELECT JSON_EXTRACT(fields, '$.slug')
      FROM egghead_ContentResource
      WHERE type = 'post'
      AND JSON_EXTRACT(fields, '$.postType') = 'lesson'
    )
    ORDER BY l.createdAt
  `);

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug || "unknown",
    title: row.title || "Untitled",
    createdAt: new Date(row.createdAt),
  }));
}

/**
 * Delete ContentResourceResource links for a lesson
 * (both lesson→video and course→lesson relationships)
 */
async function deleteLessonRelationships(lessonId: string): Promise<number> {
  const db = await getMysqlDb();

  // Delete where lesson is the resource (course→lesson links)
  const [result1] = await db.execute(
    `DELETE FROM egghead_ContentResourceResource 
     WHERE resourceId = ?`,
    [lessonId],
  );

  // Delete where lesson is the resourceOf (lesson→video links)
  const [result2] = await db.execute(
    `DELETE FROM egghead_ContentResourceResource 
     WHERE resourceOfId = ?`,
    [lessonId],
  );

  const affectedRows1 =
    (result1 as { affectedRows?: number }).affectedRows || 0;
  const affectedRows2 =
    (result2 as { affectedRows?: number }).affectedRows || 0;

  return affectedRows1 + affectedRows2;
}

/**
 * Delete a lesson ContentResource record
 */
async function deleteLesson(lessonId: string): Promise<void> {
  const db = await getMysqlDb();

  await db.execute(
    `DELETE FROM egghead_ContentResource 
     WHERE id = ? AND type = 'lesson'`,
    [lessonId],
  );
}

/**
 * Main deletion logic
 */
async function deleteDuplicateLessons() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  Delete Duplicate Lessons                                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no deletions)" : "EXECUTE (LIVE)"}`);
  console.log("");

  const stats = createStats();

  // Step 1: Find duplicates
  console.log("🔍 Step 1: Finding duplicate lessons...");
  const duplicates = await findDuplicateLessons();
  stats.duplicateLessonsFound = duplicates.length;

  console.log(
    `   Found: ${duplicates.length} duplicate type='lesson' records\n`,
  );

  if (duplicates.length === 0) {
    console.log("✅ No duplicates found. Nothing to delete.\n");
    return stats;
  }

  // Show sample of what will be deleted
  console.log("📋 Sample of lessons to be deleted:");
  console.log("   (Showing first 10)\n");
  duplicates.slice(0, 10).forEach((dup, idx) => {
    console.log(`   ${idx + 1}. ${dup.slug}`);
    console.log(`      Title: ${dup.title}`);
    console.log(`      ID: ${dup.id}`);
    console.log(`      Created: ${dup.createdAt.toISOString()}`);
    console.log("");
  });

  if (duplicates.length > 10) {
    console.log(`   ... and ${duplicates.length - 10} more\n`);
  }

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN - No deletions will be performed");
    console.log("   Run with --execute to actually delete these records\n");
    return stats;
  }

  // Step 2: Delete each duplicate
  console.log("🗑️  Step 2: Deleting duplicate lessons...");

  for (const duplicate of duplicates) {
    try {
      // Delete relationships first
      const relationshipsDeleted = await deleteLessonRelationships(
        duplicate.id,
      );
      stats.relationshipsDeleted += relationshipsDeleted;

      // Delete the lesson itself
      await deleteLesson(duplicate.id);
      stats.lessonsDeleted++;

      // Log the deletion
      console.log(
        `   ✓ Deleted: ${duplicate.slug} (${relationshipsDeleted} relationships)`,
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`   ✗ Failed to delete ${duplicate.slug}: ${errorMsg}`);
      stats.errors++;
    }
  }

  console.log("");
  return stats;
}

/**
 * Print summary
 */
function printSummary(stats: DeletionStats): void {
  console.log("=".repeat(60));
  console.log(" Deletion Summary");
  console.log("=".repeat(60));
  console.log(`Duplicate Lessons Found:    ${stats.duplicateLessonsFound}`);
  console.log(`Lessons Deleted:            ${stats.lessonsDeleted}`);
  console.log(`Relationships Deleted:      ${stats.relationshipsDeleted}`);
  console.log(`Errors:                     ${stats.errors}`);
  console.log("=".repeat(60));

  if (stats.errors === 0 && stats.lessonsDeleted > 0) {
    console.log("\n✅ All duplicate lessons deleted successfully!");
  } else if (stats.errors > 0) {
    console.log(`\n⚠️  Completed with ${stats.errors} error(s)`);
  }
  console.log("");
}

/**
 * Main execution
 */
deleteDuplicateLessons()
  .then(async (stats) => {
    printSummary(stats);
    await closeAll();
    process.exit(stats.errors > 0 ? 1 : 0);
  })
  .catch(async (err) => {
    console.error("\n❌ Deletion failed:", err);
    await closeAll();
    process.exit(1);
  });
