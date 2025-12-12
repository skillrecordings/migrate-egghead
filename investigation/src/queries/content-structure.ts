/**
 * Explore the actual content structure in Rails
 *
 * Key questions:
 * 1. How many playlists are there? What states?
 * 2. How does tracklist connect playlists to lessons?
 * 3. What's the relationship between series and playlists?
 * 4. What data do we need to export?
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "../lib/db.js";
import { table, header } from "../lib/print.js";

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // 1. Playlist counts by state
  header("Playlists by State");
  const playlistStates = yield* sql`
    SELECT state, access_state, COUNT(*) as count
    FROM playlists
    GROUP BY state, access_state
    ORDER BY count DESC
  `;
  table(playlistStates);

  // 2. Series counts by state (legacy?)
  header("Series by State (Legacy?)");
  const seriesStates = yield* sql`
    SELECT state, COUNT(*) as count
    FROM series
    GROUP BY state
    ORDER BY count DESC
  `;
  table(seriesStates);

  // 3. Tracklist breakdown - what types are linked?
  header("Tracklist Types (What's in playlists?)");
  const tracklistTypes = yield* sql`
    SELECT tracklistable_type, COUNT(*) as count
    FROM tracklists
    GROUP BY tracklistable_type
    ORDER BY count DESC
  `;
  table(tracklistTypes);

  // 4. Published playlists with lesson counts
  header("Published Playlists (Courses) - Top 10");
  const publishedPlaylists = yield* sql`
    SELECT 
      p.id,
      p.slug,
      p.title,
      p.state,
      p.access_state,
      COUNT(t.id) as item_count,
      u.email as owner_email
    FROM playlists p
    LEFT JOIN tracklists t ON t.playlist_id = p.id
    LEFT JOIN users u ON u.id = p.owner_id
    WHERE p.state = 'published'
    GROUP BY p.id, p.slug, p.title, p.state, p.access_state, u.email
    ORDER BY item_count DESC
    LIMIT 10
  `;
  table(publishedPlaylists);

  // 5. Sample tracklist for a playlist
  header("Sample Tracklist (first published playlist)");
  const sampleTracklist = yield* sql`
    SELECT 
      t.id,
      t.playlist_id,
      t.tracklistable_type,
      t.tracklistable_id,
      t.row_order,
      CASE 
        WHEN t.tracklistable_type = 'Lesson' THEN (SELECT title FROM lessons WHERE id = t.tracklistable_id)
        WHEN t.tracklistable_type = 'Series' THEN (SELECT title FROM series WHERE id = t.tracklistable_id)
        WHEN t.tracklistable_type = 'Playlist' THEN (SELECT title FROM playlists WHERE id = t.tracklistable_id)
        ELSE NULL
      END as item_title
    FROM tracklists t
    WHERE t.playlist_id = (
      SELECT id FROM playlists WHERE state = 'published' ORDER BY id LIMIT 1
    )
    ORDER BY t.row_order
    LIMIT 20
  `;
  table(sampleTracklist);

  // 6. Lessons - how many have series_id vs are in playlists?
  header("Lessons: Series vs Playlist membership");
  const lessonMembership = yield* sql`
    SELECT 
      COUNT(*) as total_lessons,
      SUM(CASE WHEN series_id IS NOT NULL THEN 1 ELSE 0 END) as with_series,
      SUM(CASE WHEN id IN (SELECT tracklistable_id FROM tracklists WHERE tracklistable_type = 'Lesson') THEN 1 ELSE 0 END) as in_tracklist
    FROM lessons
    WHERE state = 'published'
  `;
  table(lessonMembership);

  // 7. Are series still used? Or all migrated to playlists?
  header("Series with lessons vs Playlists with lessons");
  const seriesVsPlaylist = yield* sql`
    SELECT 
      'Series with lessons' as type,
      COUNT(DISTINCT s.id) as count
    FROM series s
    INNER JOIN lessons l ON l.series_id = s.id
    WHERE s.state = 'published'
    UNION ALL
    SELECT 
      'Playlists with lessons' as type,
      COUNT(DISTINCT p.id) as count
    FROM playlists p
    INNER JOIN tracklists t ON t.playlist_id = p.id AND t.tracklistable_type = 'Lesson'
    WHERE p.state = 'published'
  `;
  table(seriesVsPlaylist);

  // 8. Video data on lessons
  header("Lesson Video Data");
  const lessonVideos = yield* sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN wistia_id IS NOT NULL AND wistia_id != '' THEN 1 ELSE 0 END) as with_wistia,
      SUM(CASE WHEN current_video_hls_url IS NOT NULL AND current_video_hls_url != '' THEN 1 ELSE 0 END) as with_mux_hls,
      SUM(CASE WHEN transcript IS NOT NULL AND transcript != '' THEN 1 ELSE 0 END) as with_transcript
    FROM lessons
    WHERE state = 'published'
  `;
  table(lessonVideos);

  // 9. Sample lesson with video URLs
  header("Sample Lessons with Mux URLs");
  const sampleLessons = yield* sql`
    SELECT 
      id,
      slug,
      title,
      duration,
      current_video_hls_url,
      wistia_id
    FROM lessons
    WHERE state = 'published' 
      AND current_video_hls_url IS NOT NULL 
      AND current_video_hls_url != ''
    LIMIT 3
  `;
  table(sampleLessons);

  // 10. Instructors
  header("Instructors");
  const instructors = yield* sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN state = 'signed' THEN 1 ELSE 0 END) as signed,
      SUM(CASE WHEN state = 'invited' THEN 1 ELSE 0 END) as invited
    FROM instructors
  `;
  table(instructors);
});

runWithDb(program).catch(console.error);
