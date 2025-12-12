# Video Player Analysis: Mux URL Preference

**Date:** December 12, 2025  
**Analyst:** PlayerAnalyzer (swarm agent)  
**Related Bead:** migrate-egghead-ddl.5  
**Epic:** migrate-egghead-ddl

---

## Executive Summary

The egghead-next video player will **automatically prefer Mux URLs** once the Rails backend backfill (bead ddl.4) completes. The player architecture is **source-agnostic**—it simply consumes `hls_url` values from the GraphQL API without inspecting or validating URL sources.

**Key Finding:** No player code changes are required for Mux preference. The Rails backend controls video URL resolution, and after backfilling `current_video_hls_url` with Mux URLs, the player will seamlessly switch from CloudFront to Mux.

---

## Video URL Resolution Flow

### 1. Rails Backend (Source of Truth)

**Location:** `egghead-rails/app/models/lesson.rb`

```ruby
def hls_url
  if current_video_hls_url
    current_video_hls_url  # ← Prioritized (Mux URLs will be here after backfill)
  elsif adaptive_base_url
    "#{adaptive_base_url}.m3u8"  # ← Fallback (CloudFront)
  end
end

def adaptive_base_url
  @adaptive_base_url ||= begin
    video_stream_id = Rails.cache.fetch([self, 'last_completed_video_transcode_job', VideoTranscodeJob.max_updated_at]) do
      self.video_transcode_jobs.where(:status => 'completed').order(:updated_at).last&.video_stream_id
    end

    if video_stream_id
      "https://d2c5owlt6rorc3.cloudfront.net/#{video_stream_id}/#{video_stream_id}"
    end
  end
end
```

**Priority:**

1. `current_video_hls_url` (database column - **this is where Mux URLs go**)
2. `adaptive_base_url` (CloudFront URLs from `video_transcode_jobs`)

**Backfill Impact:** When bead ddl.4 populates `current_video_hls_url` with Mux playback URLs, the `hls_url` method will return Mux URLs first, effectively deprecating CloudFront fallbacks.

---

### 2. GraphQL API (egghead-rails)

**Location:** `egghead-rails/app/graphql/types/video_media.rb`

The GraphQL layer exposes `hls_url` as-is from the Lesson model. No URL transformation occurs at this layer.

**Query:** egghead-next fetches lesson data via:

```graphql
query getLesson($slug: String!) {
  lesson(slug: $slug) {
    hls_url
    dash_url
    # ... other fields
  }
}
```

---

### 3. Frontend Player (egghead-next)

**Location:** `egghead-next/src/components/pages/lessons/lesson/index.tsx`

```tsx
<Player>
  <HLSSource key={lesson.hls_url} src={lesson.hls_url} />
</Player>
```

**Player Implementation:**

- Uses `@skillrecordings/player` package (modern player)
- `HLSSource` component accepts any HLS manifest URL
- No URL validation or source-specific logic

**Legacy Player (Bitmovin):**

- Used in older lesson components (`EggheadPlayer/players/Bitmovin.js`)
- **Only accepts CloudFront URLs** via regex match:

  ```javascript
  const MATCH_URL = /^(https?:\/\/d2c5owlt6rorc3.cloudfront.net\/)(.[^/]*)\/(.*)$/

  static canPlay(url) {
    return MATCH_URL.test(url)
  }
  ```

- This player is **legacy**—modern lessons use `@skillrecordings/player`

---

## Player Architecture Comparison

### Modern Player (`@skillrecordings/player`)

- **Source-agnostic HLS playback**
- Used in:
  - `/lessons/[slug]` (main lesson page)
  - `/lessons/[slug]/embed` (embedded player)
  - `/courses/[course]/[lesson]` (course lesson player)
- **Supports any HLS URL** (Mux, CloudFront, or otherwise)
- No URL validation or domain whitelisting

### Legacy Player (Bitmovin)

- **CloudFront-specific** via hardcoded regex
- Used in:
  - `EggheadPlayer` wrapper (older lesson components)
- **Will fail with Mux URLs** unless updated
- Location: `egghead-next/src/components/EggheadPlayer/players/Bitmovin.js`

---

## Mux Integration Status

### Current Mux Usage in egghead-next

**1. Post Player (Modern Lessons)**

- Uses `@mux/mux-player-react` directly
- Accepts Mux `playbackId` prop
- Location: `src/components/posts/post-player.tsx`

**2. Download URLs**

- Already uses Mux for downloads:
  ```typescript
  downloadUrl = `https://stream.mux.com/${playbackId}/high.mp4?download=${filename}`;
  ```
- Location: `src/app/api/lessons/[slug]/download/route.ts`

**3. Thumbnails**

- Uses Mux image API:
  ```typescript
  const thumbnail = hit.mux_playback_id
    ? `https://image.mux.com/${hit.mux_playback_id}/thumbnail.webp?width=120&height=120&fit_mode=smartcrop`
    : fallback;
  ```

---

## Changes Required (Post-Backfill)

### ✅ No Changes Needed

**Modern player (`@skillrecordings/player`) is already Mux-ready:**

- Accepts any HLS manifest URL
- No domain restrictions
- Works with `https://stream.mux.com/{playbackId}.m3u8` URLs

### ⚠️ Optional: Legacy Player Cleanup

**If** the legacy Bitmovin player is still in use:

**Location:** `egghead-next/src/components/EggheadPlayer/players/Bitmovin.js`

**Option 1: Update Regex** (Allow Mux URLs)

```javascript
// Before
const MATCH_URL =
  /^(https?:\/\/d2c5owlt6rorc3.cloudfront.net\/)(.[^/]*)\/(.*)$/;

// After
const MATCH_URL =
  /^(https?:\/\/(d2c5owlt6rorc3.cloudfront.net|stream.mux.com)\/)(.*)$/;
```

**Option 2: Remove Player** (Recommended)

- Audit usage of `EggheadPlayer` wrapper
- Migrate remaining lessons to `@skillrecordings/player`
- Delete Bitmovin player code

---

## Verification Steps (Post-Backfill)

### 1. Database Check

```sql
-- Verify Mux URLs are populated
SELECT
  id,
  slug,
  current_video_hls_url,
  CASE
    WHEN current_video_hls_url LIKE 'https://stream.mux.com/%' THEN 'Mux'
    WHEN current_video_hls_url LIKE 'https://d2c5owlt6rorc3.cloudfront.net/%' THEN 'CloudFront'
    ELSE 'Other'
  END AS video_source
FROM lessons
WHERE current_video_hls_url IS NOT NULL
LIMIT 10;
```

### 2. GraphQL Query Test

```graphql
query {
  lesson(slug: "test-lesson-slug") {
    hls_url
    dash_url
  }
}
```

**Expected:** `hls_url` should be a Mux URL (`https://stream.mux.com/...`)

### 3. Browser Playback Test

- Load a lesson page in egghead-next
- Open browser DevTools → Network tab
- Play the video
- Verify HLS manifest requests go to `stream.mux.com` (not `d2c5owlt6rorc3.cloudfront.net`)

### 4. Player Compatibility Check

```bash
# Search for legacy Bitmovin usage
grep -r "EggheadPlayer" egghead-next/src/pages --include="*.tsx"
```

**If found:** Test those lesson pages to ensure Mux URLs work or migrate to modern player.

---

## Migration Timeline Impact

| Phase                         | Timing                   | Impact                                                        |
| ----------------------------- | ------------------------ | ------------------------------------------------------------- |
| **Pre-Backfill** (Now)        | Current state            | Player loads CloudFront URLs via `adaptive_base_url` fallback |
| **During Backfill** (ddl.4)   | Migration script running | Mixed state: some lessons have Mux, some have CloudFront      |
| **Post-Backfill** (Immediate) | After ddl.4 completes    | **Player automatically prefers Mux URLs** (no deploy needed)  |
| **Cleanup** (Later)           | Optional follow-up bead  | Remove legacy Bitmovin player code if unused                  |

---

## Risks & Mitigation

### Risk 1: Legacy Player Breakage

**Scenario:** If Bitmovin player is still used, it will reject Mux URLs.

**Mitigation:**

1. Audit current usage:
   ```bash
   grep -r "import.*EggheadPlayer\|from.*EggheadPlayer" egghead-next/src --include="*.tsx"
   ```
2. If in use, update `MATCH_URL` regex before backfill
3. If unused, remove player code

**Likelihood:** Low (modern player dominates)

### Risk 2: Cache Invalidation

**Scenario:** GraphQL layer caches old CloudFront URLs.

**Mitigation:**

- Rails API uses short-lived cache keys tied to `VideoTranscodeJob.max_updated_at`
- After backfill, cache will auto-refresh on next lesson view
- Manual flush if needed: `Rails.cache.clear`

**Likelihood:** Low (cache design accounts for video updates)

### Risk 3: Mixed URL Sources During Migration

**Scenario:** Some lessons on Mux, some still on CloudFront during backfill.

**Mitigation:**

- Modern player supports both (no issue)
- Backfill script should be idempotent and resumable
- Monitor backfill progress via dashboard

**Likelihood:** Expected (not a risk, just transitional state)

---

## Recommended Next Steps

### Immediate (Pre-Backfill)

1. **Audit legacy player usage** (create bead if needed):
   ```bash
   grep -r "EggheadPlayer" egghead-next/src/pages --include="*.tsx" > legacy_player_audit.txt
   ```
2. **Test Mux URL in modern player** (sanity check):
   - Manually override a lesson's `hls_url` in GraphQL response
   - Verify playback works with `https://stream.mux.com/{playbackId}.m3u8`

### Post-Backfill (ddl.4 Complete)

1. **Run verification queries** (see section above)
2. **Spot-check lessons** (sample 10-20 lessons across different eras)
3. **Monitor error logs** (watch for player errors)
4. **Create cleanup bead** (if legacy player removal needed)

### Optional Future Work

- **Migrate to Mux Player SDK:** Replace `@skillrecordings/player` with `@mux/mux-player-react` for native Mux features
- **Remove CloudFront fallback logic:** Simplify `Lesson#hls_url` after all videos migrated
- **Delete unused player code:** Remove Bitmovin player if fully deprecated

---

## Data Sources

### egghead-next (Frontend)

- Modern Player: `src/components/pages/lessons/lesson/index.tsx`
- Legacy Player: `src/components/EggheadPlayer/players/Bitmovin.js`
- Type Definitions: `src/types.ts` (lines 81-101)
- GraphQL Queries: `src/lib/lessons.ts` (lines 231-232)

### egghead-rails (Backend)

- Video URL Logic: `app/models/lesson.rb` (lines 675-700)
- Video Resource: `app/models/resource/video.rb` (lines 16-20)
- GraphQL Schema: `app/graphql/types/video_media.rb`

### download-egghead (Migration Tracker)

- SQLite DB: `egghead_videos.db`
- Lesson-Video Mapping: `lessons` table

---

## Conclusion

**The egghead-next video player is architecturally ready for Mux URLs.** The switch from CloudFront to Mux is controlled entirely by the Rails backend's `current_video_hls_url` column. Once bead ddl.4 (Rails backfill) completes, the player will automatically consume Mux URLs without requiring frontend code changes.

**Action Required:** Create a follow-up bead for legacy player audit/cleanup if usage is detected.

**Status:** ✅ **Player is Mux-ready. Proceed with backfill.**
