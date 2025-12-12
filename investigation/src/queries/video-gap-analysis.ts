/**
 * Cross-reference gap lessons with Coursebuilder database
 *
 * Checks which gap lessons (ID 10389-10684) already have:
 * 1. VideoResource records in Coursebuilder
 * 2. Mux playback IDs
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithMysql } from "../lib/mysql.js";
import { runWithDb } from "../lib/db.js";
import { header, table } from "../lib/print.js";
import * as fs from "fs";

// Gap lesson IDs from our analysis
const GAP_START = 10389;
const GAP_END = 10684;

const checkCoursebuilder = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  header("Coursebuilder VideoResource Records");

  // Check for videoResource type records
  const videoResources = yield* sql`
    SELECT 
      id,
      type,
      JSON_EXTRACT(fields, '$.muxPlaybackId') as muxPlaybackId,
      JSON_EXTRACT(fields, '$.muxAssetId') as muxAssetId,
      JSON_EXTRACT(fields, '$.state') as state,
      JSON_EXTRACT(fields, '$.legacyId') as legacyId
    FROM egghead_ContentResource
    WHERE type = 'videoResource'
    LIMIT 20
  `;
  console.log(
    `Found ${videoResources.length} videoResource records (showing first 20)`,
  );
  table(videoResources);

  // Check for any records with legacyId in gap range
  header("Records with legacyId in Gap Range (10389-10684)");
  const gapRecords = yield* sql`
    SELECT 
      id,
      type,
      JSON_EXTRACT(fields, '$.legacyId') as legacyId,
      JSON_EXTRACT(fields, '$.muxPlaybackId') as muxPlaybackId,
      JSON_EXTRACT(fields, '$.slug') as slug
    FROM egghead_ContentResource
    WHERE JSON_EXTRACT(fields, '$.legacyId') >= ${GAP_START}
      AND JSON_EXTRACT(fields, '$.legacyId') <= ${GAP_END}
  `;
  console.log(`Found ${gapRecords.length} records with legacyId in gap range`);
  if (gapRecords.length > 0) {
    table(gapRecords);
  }

  // Check total counts by type
  header("ContentResource Counts by Type");
  const typeCounts = yield* sql`
    SELECT type, COUNT(*) as count
    FROM egghead_ContentResource
    GROUP BY type
    ORDER BY count DESC
  `;
  table(typeCounts);

  // Check for any Mux playback IDs
  header("Records with Mux Playback IDs");
  const muxRecords = yield* sql`
    SELECT 
      id,
      type,
      JSON_EXTRACT(fields, '$.muxPlaybackId') as muxPlaybackId,
      JSON_EXTRACT(fields, '$.title') as title
    FROM egghead_ContentResource
    WHERE JSON_EXTRACT(fields, '$.muxPlaybackId') IS NOT NULL
    LIMIT 10
  `;
  console.log(`Found records with muxPlaybackId (showing first 10)`);
  table(muxRecords);

  return {
    videoResources: videoResources.length,
    gapRecords: gapRecords.length,
  };
});

const checkRailsGapLessons = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  header("Rails Gap Lessons (10389-10684) - Video Status");

  // Get all gap lessons with video info
  const gapLessons = yield* sql`
    SELECT 
      l.id,
      l.slug,
      l.title,
      l.state,
      l.duration,
      l.current_video_hls_url,
      rv.progressive_url as source_url,
      rv.subtitles_url
    FROM lessons l
    LEFT JOIN resources_videos rv ON rv.lesson_id = l.id
    WHERE l.id >= ${GAP_START} AND l.id <= ${GAP_END}
      AND l.state = 'published'
    ORDER BY l.id
  `;

  // Categorize
  const withMux = gapLessons.filter((l: any) =>
    l.currentVideoHlsUrl?.includes("mux.com"),
  );
  const withCloudfront = gapLessons.filter(
    (l: any) =>
      l.currentVideoHlsUrl?.includes("cloudfront") &&
      !l.currentVideoHlsUrl?.includes("mux"),
  );
  const withSource = gapLessons.filter((l: any) => l.sourceUrl);
  const noVideo = gapLessons.filter(
    (l: any) => !l.currentVideoHlsUrl && !l.sourceUrl,
  );

  console.log(`\nTotal published gap lessons: ${gapLessons.length}`);
  console.log(`  - Already on Mux: ${withMux.length}`);
  console.log(`  - On CloudFront (needs migration): ${withCloudfront.length}`);
  console.log(`  - Has S3 source URL: ${withSource.length}`);
  console.log(`  - No video at all: ${noVideo.length}`);

  // Export lessons that need migration (have source URL but not on Mux)
  const needsMigration = gapLessons.filter(
    (l: any) => l.sourceUrl && !l.currentVideoHlsUrl?.includes("mux.com"),
  );

  console.log(`\nLessons needing Mux migration: ${needsMigration.length}`);

  // Write to JSON for the migration script
  const exportData = needsMigration.map((l: any) => ({
    id: l.id,
    slug: l.slug,
    source_url: l.sourceUrl,
    subtitles_url: l.subtitlesUrl,
  }));

  fs.writeFileSync(
    "../reports/GAP_LESSONS_FOR_MUX.json",
    JSON.stringify(exportData, null, 2),
  );
  console.log(
    `\nExported ${exportData.length} lessons to reports/GAP_LESSONS_FOR_MUX.json`,
  );

  // Show lessons with no video
  if (noVideo.length > 0) {
    header("Lessons with NO video (may be drafts)");
    table(
      noVideo.map((l: any) => ({
        id: l.id,
        slug: l.slug,
        title: l.title?.substring(0, 50),
        duration: l.duration,
      })),
    );
  }

  return {
    total: gapLessons.length,
    needsMigration: needsMigration.length,
    alreadyOnMux: withMux.length,
    noVideo: noVideo.length,
  };
});

// Run both checks
async function main() {
  console.log("=".repeat(80));
  console.log("VIDEO GAP ANALYSIS - Cross-referencing Rails and Coursebuilder");
  console.log("=".repeat(80));

  console.log("\n--- COURSEBUILDER DATABASE ---\n");
  const cbResults = await runWithMysql(checkCoursebuilder);

  console.log("\n--- RAILS DATABASE ---\n");
  const railsResults = await runWithDb(checkRailsGapLessons);

  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`\nCoursebuilder:`);
  console.log(`  - VideoResource records: ${cbResults.videoResources}`);
  console.log(`  - Gap lessons already imported: ${cbResults.gapRecords}`);
  console.log(`\nRails:`);
  console.log(`  - Total published gap lessons: ${railsResults.total}`);
  console.log(`  - Need Mux migration: ${railsResults.needsMigration}`);
  console.log(`  - Already on Mux: ${railsResults.alreadyOnMux}`);
  console.log(`  - No video (drafts?): ${railsResults.noVideo}`);
}

main().catch(console.error);
