/**
 * Find a good legacy course candidate for POC migration
 *
 * Criteria:
 * - Published in Rails
 * - NO Sanity document (pure legacy)
 * - 10-20 lessons
 * - Good Mux coverage
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "./src/lib/db.js";
import { header, table } from "./src/lib/print.js";
import { openVideosDb } from "./src/lib/sqlite.js";

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  header("Finding Legacy Course Candidates");

  // Get published series with lesson counts
  const series = yield* sql`
    SELECT 
      s.id,
      s.slug,
      s.title,
      s.state,
      s.instructor_id,
      CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
      u.email as instructor_email,
      COUNT(l.id) as lesson_count
    FROM series s
    LEFT JOIN lessons l ON l.series_id = s.id AND l.state = 'published'
    LEFT JOIN users u ON u.id = s.instructor_id
    WHERE s.state = 'published'
    GROUP BY s.id, s.slug, s.title, s.state, s.instructor_id, u.first_name, u.last_name, u.email
    HAVING COUNT(l.id) BETWEEN 10 AND 20
    ORDER BY lesson_count DESC, s.id DESC
    LIMIT 20
  `;

  console.log(`Found ${series.length} published series with 10-20 lessons\n`);
  table(series);

  // Now check which ones have NO Sanity document
  // For now, we'll just pick one manually and verify in next step
  // In a real migration, we'd query Sanity API to check for eggheadSeriesId

  // Open SQLite to check Mux coverage
  const db = openVideosDb();

  console.log("\n");
  header("Checking Mux Coverage for Top Candidates");

  for (const course of series.slice(0, 5)) {
    // Get lessons for this series
    const lessons = yield* sql`
      SELECT id, slug, title, current_video_hls_url
      FROM lessons
      WHERE series_id = ${course.id}
        AND state = 'published'
      ORDER BY id
    `;

    // Check how many have Mux URLs
    const withMux = lessons.filter(
      (l: { currentVideoHlsUrl?: string }) => l.currentVideoHlsUrl,
    );

    // For older lessons (id <= 10388), check SQLite
    const lessonIds = lessons.map((l: { id: number }) => l.id);
    let sqliteMuxCount = 0;

    for (const lessonId of lessonIds) {
      if (lessonId <= 10388) {
        const sqliteResult = db
          .prepare(
            `
          SELECT v.mux_playback_id 
          FROM videos v
          INNER JOIN lessons l ON l.video_id = v.id
          WHERE l.id = ?
            AND v.mux_playback_id IS NOT NULL
        `,
          )
          .get(lessonId);

        if (sqliteResult) {
          sqliteMuxCount++;
        }
      }
    }

    const totalMux = withMux.length + sqliteMuxCount;
    const coverage = ((totalMux / lessons.length) * 100).toFixed(1);

    console.log(`\n📦 ${course.title}`);
    console.log(`   ID: ${course.id} | Slug: ${course.slug}`);
    console.log(`   Instructor: ${course.instructorName}`);
    console.log(`   Lessons: ${lessons.length}`);
    console.log(
      `   Mux Coverage: ${totalMux}/${lessons.length} (${coverage}%)`,
    );
    console.log(`   - From Rails current_video_hls_url: ${withMux.length}`);
    console.log(`   - From SQLite: ${sqliteMuxCount}`);

    if (totalMux === lessons.length) {
      console.log(`   ✅ 100% Mux coverage - GOOD CANDIDATE`);
    }
  }

  db.close();

  console.log("\n");
  header("Recommendation");
  console.log("Pick a course with 100% Mux coverage from the list above.");
  console.log("Verify it has NO Sanity document before proceeding.");
});

runWithDb(program).catch(console.error);
