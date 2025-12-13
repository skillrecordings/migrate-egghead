/**
 * Deep verification of course/lesson counts from production Rails
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "../lib/db.js";

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  console.log("=== DEEP VERIFICATION FROM PRODUCTION RAILS ===\n");

  // Total playlists
  const totalPlaylists = yield* sql<{ count: string }>`
    SELECT COUNT(*) as count FROM playlists
  `;
  
  // Playlists with at least 1 lesson
  const playlistsWithLessons = yield* sql<{ count: string }>`
    SELECT COUNT(DISTINCT p.id) as count 
    FROM playlists p 
    JOIN playlist_lessons pl ON pl.playlist_id = p.id
  `;
  
  // Playlists by state
  const playlistsByState = yield* sql<{ state: string; count: string }>`
    SELECT state, COUNT(*) as count FROM playlists GROUP BY state ORDER BY count DESC
  `;
  
  // Total lessons
  const totalLessons = yield* sql<{ count: string }>`
    SELECT COUNT(*) as count FROM lessons
  `;
  
  // Lessons by state
  const lessonsByState = yield* sql<{ state: string; count: string }>`
    SELECT state, COUNT(*) as count FROM lessons GROUP BY state ORDER BY count DESC
  `;
  
  // Standalone lessons (not in any playlist)
  const standaloneLessons = yield* sql<{ count: string }>`
    SELECT COUNT(*) as count 
    FROM lessons l 
    WHERE NOT EXISTS (
      SELECT 1 FROM playlist_lessons pl WHERE pl.lesson_id = l.id
    )
  `;
  
  // Lessons in playlists
  const lessonsInPlaylists = yield* sql<{ count: string }>`
    SELECT COUNT(DISTINCT l.id) as count 
    FROM lessons l 
    JOIN playlist_lessons pl ON pl.lesson_id = l.id
  `;
  
  // Published standalone lessons
  const publishedStandalone = yield* sql<{ count: string }>`
    SELECT COUNT(*) as count 
    FROM lessons l 
    WHERE l.state = 'published'
    AND NOT EXISTS (
      SELECT 1 FROM playlist_lessons pl WHERE pl.lesson_id = l.id
    )
  `;
  
  // Published playlists with published lessons
  const publishedPlaylistsWithPublishedLessons = yield* sql<{ count: string }>`
    SELECT COUNT(DISTINCT p.id) as count 
    FROM playlists p 
    JOIN playlist_lessons pl ON pl.playlist_id = p.id
    JOIN lessons l ON l.id = pl.lesson_id
    WHERE p.state = 'published' AND l.state = 'published'
  `;
  
  // Breakdown: playlists with lessons by state
  const playlistsWithLessonsByState = yield* sql<{ state: string; count: string }>`
    SELECT p.state, COUNT(DISTINCT p.id) as count 
    FROM playlists p 
    JOIN playlist_lessons pl ON pl.playlist_id = p.id
    GROUP BY p.state 
    ORDER BY count DESC
  `;

  console.log("PLAYLISTS (COURSES):");
  console.log(`  Total playlists:                    ${totalPlaylists[0].count}`);
  console.log(`  With at least 1 lesson:             ${playlistsWithLessons[0].count}`);
  console.log(`  Published + has published lessons:  ${publishedPlaylistsWithPublishedLessons[0].count}`);
  console.log(`  By state (all):`);
  playlistsByState.forEach(r => console.log(`    ${r.state || 'NULL'}: ${r.count}`));
  console.log(`  With lessons, by state:`);
  playlistsWithLessonsByState.forEach(r => console.log(`    ${r.state || 'NULL'}: ${r.count}`));

  console.log("\nLESSONS:");
  console.log(`  Total lessons:                      ${totalLessons[0].count}`);
  console.log(`  In playlists:                       ${lessonsInPlaylists[0].count}`);
  console.log(`  Standalone (no playlist):           ${standaloneLessons[0].count}`);
  console.log(`  Standalone + published:             ${publishedStandalone[0].count}`);
  console.log(`  By state:`);
  lessonsByState.forEach(r => console.log(`    ${r.state || 'NULL'}: ${r.count}`));

  console.log("\n=== WHAT WE SHOULD MIGRATE ===");
  console.log(`  Published courses with lessons:     ${publishedPlaylistsWithPublishedLessons[0].count}`);
  console.log(`  Published standalone lessons:       ${publishedStandalone[0].count}`);
  console.log(`  TOTAL CONTENT ITEMS:                ${parseInt(publishedPlaylistsWithPublishedLessons[0].count) + parseInt(publishedStandalone[0].count)}`);
});

runWithDb(program).catch(console.error);
