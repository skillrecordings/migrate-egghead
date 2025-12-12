/**
 * Export gap lessons (ID 10389-10684) from Rails PostgreSQL
 *
 * Queries lessons and their resources_videos.progressive_url for the gap range
 * and outputs JSON for import into SQLite.
 *
 * Gap context:
 * - 171 total lessons in range (10389-10684)
 * - 152 need video migration
 * - Source URLs from resources_videos.progressive_url
 * - SQLite max ID currently: 10300
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "../lib/db.js";
import * as fs from "fs/promises";
import * as path from "path";

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  console.log("Querying gap lessons (ID 10389-10684) from Rails...");

  // Query lessons with their video source URLs
  // Note: srt column contains subtitles, not transcript_url
  const gapLessons = yield* sql`
    SELECT 
      l.id,
      l.slug,
      rv.progressive_url as source_url,
      l.srt as subtitles_url,
      NULL as size
    FROM lessons l
    LEFT JOIN resources_videos rv ON rv.lesson_id = l.id
    WHERE l.id >= 10389 AND l.id <= 10684
      AND l.state = 'published'
    ORDER BY l.id
  `;

  console.log(`Found ${gapLessons.length} lessons in gap range`);

  // Filter to only lessons with source URLs
  const lessonsWithVideo = gapLessons.filter(
    (lesson: any) => lesson.sourceUrl && lesson.sourceUrl.trim() !== "",
  );

  console.log(`${lessonsWithVideo.length} have source URLs for migration`);

  // Transform to match SQLite schema
  const records = lessonsWithVideo.map((lesson: any) => ({
    id: lesson.id,
    slug: lesson.slug,
    source_url: lesson.sourceUrl,
    subtitles_url: lesson.subtitlesUrl,
    size: null,
    mux_asset_id: null,
    state: "unprocessed",
  }));

  // Write to JSON file
  const outputPath = path.join(
    process.cwd(),
    "..",
    "download-egghead",
    "gap-lessons.json",
  );

  yield* Effect.promise(() =>
    fs.writeFile(outputPath, JSON.stringify(records, null, 2), "utf-8"),
  );

  console.log(`\n✅ Exported ${records.length} gap lessons to:`);
  console.log(`   ${outputPath}`);
  console.log(`\nSample record:`);
  console.log(JSON.stringify(records[0], null, 2));

  return records.length;
});

runWithDb(program).catch(console.error);
