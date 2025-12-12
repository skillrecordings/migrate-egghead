# Video Migration Status Report

> **Generated**: December 12, 2025  
> **Updated**: December 12, 2025 - **Complete Execution Plan Added**  
> **Purpose**: Track video migration from legacy sources to Mux  
> **Goal**: All videos served via Mux playback IDs

### Latest Updates

- ✅ Added complete step-by-step execution plan with 6 steps
- ✅ Added verification checklist (before/during/after each step)
- ✅ Added rollback procedures for Mux upload and Rails backfill failures
- ✅ Documented new scripts needed: `add-gap-lessons.mjs` and `backfill-rails-mux-urls.mjs`
- ✅ Confirmed 17 Coursebuilder lessons already complete with Mux

---

## Executive Summary

| Era                    | Lesson IDs    | Count   | Video Source           | Mux Status                          |
| ---------------------- | ------------- | ------- | ---------------------- | ----------------------------------- |
| Ancient (Wistia)       | 1 - ~4425     | ~2,668  | Wistia                 | ✅ Migrated via SQLite              |
| Middle (CloudFront)    | ~4426 - 10388 | ~3,095  | Homebrew S3/CloudFront | ✅ Migrated via SQLite              |
| **Gap**                | 10389 - 10684 | **171** | Mixed                  | ⚠️ **PARTIALLY ON MUX** (see below) |
| Modern (Coursebuilder) | 10685+        | ~250    | Direct Mux upload      | ✅ Already on Mux                   |

**Total Published Lessons**: 6,639  
**Already on Mux**: ~6,491 (97.8%)  
**Gap needing SQLite migration**: 152 lessons (2.2%)

---

## Data Sources

### 1. SQLite Database (`download-egghead/egghead_videos.db`)

**Purpose**: Canonical tracker for OLD video migrations (ID ≤ 10388)

**Tables**:

- `videos` - 7,634 records, 7,441 with `mux_asset_id`
- `lessons` - 5,132 records (max ID: 10388)
- `courses` - 420 records
- `instructors` - 134 records

**Video States**:
| State | Count | Notes |
|-------|-------|-------|
| `updated` | 6,764 | Has `mux_asset_id` ✅ |
| `no_srt` | 677 | On Mux but missing subtitles |
| `missing_video` | 193 | Source file not found |

**How it was populated**:

1. `egghead_lessons.csv` - Exported from Rails with `video_url` (S3 source)
2. `write-db.mjs` - Wrote CSV to SQLite `videos` table
3. `index.mjs` - Downloaded source files to NAS (`/Volumes/Home/egghead/video-archive`)
4. `send-to-mux.mjs` - Uploaded to Mux, stored `mux_asset_id`

### 2. Rails PostgreSQL

**Purpose**: Source of truth for lesson metadata

**Relevant Fields**:

- `lessons.current_video_hls_url` - HLS manifest URL (CloudFront or Mux)
- `lessons.current_video_dash_url` - DASH manifest URL
- `lessons.wistia_id` - Legacy Wistia ID (ancient lessons)
- `lessons.duration` - Video duration in seconds
- `lessons.transcript` - Full transcript text

### 3. Coursebuilder PlanetScale (`egghead_ContentResource`)

**Purpose**: Target database for migrated content

**Current State** (Dec 12, 2025):

| Type             | Count | Notes                         |
| ---------------- | ----- | ----------------------------- |
| `videoResource`  | 391   | New uploads via Coursebuilder |
| `post`           | 369   | Lessons created in CB         |
| `raw-transcript` | 338   | Transcripts                   |
| `event`          | 2     | Events                        |
| `imageResource`  | 1     | Images                        |

**Key Insight**: Posts link to videoResources via `egghead_ContentResourceResource` join table.

- 305 posts have linked videoResources with `muxPlaybackId`
- 64 posts do NOT have linked videoResources (may need video migration)

**Querying for Mux status**:

```sql
SELECT
  p.id,
  JSON_EXTRACT(p.fields, '$.slug') as slug,
  JSON_EXTRACT(v.fields, '$.muxPlaybackId') as muxPlaybackId
FROM egghead_ContentResource p
LEFT JOIN egghead_ContentResourceResource crr ON crr.resourceOfId = p.id
LEFT JOIN egghead_ContentResource v ON v.id = crr.resourceId AND v.type = 'videoResource'
WHERE p.type = 'post'
```

---

## The Gap: 171 Lessons (ID 10389-10684)

These lessons were created **after** the SQLite migration (~Feb 2024) but **before** Coursebuilder started handling uploads directly (~Oct 2024).

### Breakdown (Updated Dec 12)

| Category                              | Count   | Status        | Action Needed                         |
| ------------------------------------- | ------- | ------------- | ------------------------------------- |
| Has S3 source URL in Rails            | **152** | ❌ Not on Mux | Add to SQLite → upload to Mux         |
| Already on Mux (in Rails)             | **2**   | ✅ Done       | None                                  |
| **Already in Coursebuilder with Mux** | **17**  | ✅ Done       | None - videos uploaded directly to CB |

### Key Discovery: 17 "Missing" Lessons Are Actually in Coursebuilder

The 17 lessons that appeared to have no video in Rails (`sourceUrl: null`, `currentVideoHlsUrl: null`) are actually **already migrated to Coursebuilder** with Mux playback IDs:

```
✅ HAS MUX | setup-and-dive-into-the-react-19-compiler-optimizations
✅ HAS MUX | developer-career-growth-and-asymmetric-bets-with-dax-raad~nzzun
✅ HAS MUX | nitro-vinxi-and-rscs-whats-good-with-dev-agrawal~s577t
✅ HAS MUX | create-non-empty-typescript-array-types~tg1mi
✅ HAS MUX | create-a-computed-signal-in-modern-angular~scn49
✅ HAS MUX | improve-the-dx-of-an-npm-workspaces-monorepo-with-task-pipelines-and-caching~zjpwe
✅ HAS MUX | create-a-custom-type-based-of-an-object-with-typescript-keyof-operator
✅ HAS MUX | getting-setup-with-shadcn-vue-in-vue-3~of23g
✅ HAS MUX | watch-for-changes-and-automatically-rebuild-projects-in-an-npm-workspace-monorepo~pguch
✅ HAS MUX | filter-typescript-unions-of-primitives-or-objects-depending-on-the-usecase~dfiug
✅ HAS MUX | use-nouncheckedindexedaccess-typescript-compiler-option-and-improve-type-safety~wdlaf
✅ HAS MUX | prevent-the-keyboard-from-covering-react-native-ui-components~i8gl1
✅ HAS MUX | create-a-typescript-union-type-from-a-javascript-object~nrv5j
✅ HAS MUX | use-infrastructure-as-code-with-architect-to-deploy-to-aws~hofb3
✅ HAS MUX | fix-typescript-errors-related-to-function-type-parameters-and-generic-constraints~drn8l
✅ HAS MUX | use-native-css-parts-to-access-the-shadow-dom-in-an-ionic-component~1a4bs
✅ HAS MUX | use-reactive-primitives-in-react-and-angular~c3xoh
```

These exist as `post` records in Coursebuilder with linked `videoResource` records that have `muxPlaybackId`.

### Gap Lessons Export

Full list exported to: `reports/VIDEO_GAP_LESSONS.json`

```json
{
  "id": 10389,
  "slug": "egghead-use-infrastructure-as-code-with-architect-to-deploy-to-aws",
  "title": "Use Infrastructure as Code with Architect to Deploy to AWS",
  "currentVideoHlsUrl": null,
  "duration": 123,
  "createdAt": "2024-01-30T..."
}
```

---

## Video URL Patterns

### CloudFront (Homebrew S3/CloudFront CDN)

```
https://d2c5owlt6rorc3.cloudfront.net/{slug}/hls/{slug}.m3u8
```

- These are HLS manifests pointing to S3-hosted segments
- Source files are in S3: `egghead-video-uploads.s3.amazonaws.com`

### Mux Direct

```
https://stream.mux.com/{playback_id}.m3u8
```

- Playback ID can be extracted from URL
- Asset ID needed for API calls (different from playback ID)

### S3 Source URLs (from CSV)

```
https://egghead-video-uploads.s3.amazonaws.com/production/{filename}.mp4
https://egghead-video-downloads.s3.amazonaws.com/lessons/{slug}/{slug}.mp4
https://d3cxrxf04bhbwz.cloudfront.net/lessons/{slug}/{filename}.mp4?Expires=...
```

- Signed CloudFront URLs expire
- Need to regenerate or access S3 directly

---

## Migration Scripts (`download-egghead/`)

### Existing Scripts

#### `write-db.mjs`

Populates SQLite `videos` table from `egghead_lessons.csv`:

```javascript
const stmt = db.prepare(
  `INSERT INTO videos (id, slug, source_url, subtitles_url, size) VALUES (?, ?, ?, ?, ?)`,
);
stmt.run(
  video.id,
  video.slug,
  video.video_url,
  video.subtitles_url,
  video.size,
);
```

#### `index.mjs`

Downloads source files to NAS:

```javascript
const nasVideo = `/Volumes/Home/egghead/video-archive`;
const targetPath = `${nasVideo}/${video.id}~${video.slug}.${extension}`;
// Downloads from video.video_url to targetPath
```

#### `send-to-mux.mjs`

Uploads to Mux API:

```javascript
const muxOptions = {
  input: [
    { url: video.source_url, type: "video" },
    {
      url: video.subtitles_url,
      type: "text",
      text_type: "subtitles",
      language_code: "en-US",
    },
  ],
  playback_policy: ["public"],
  mp4_support: "standard",
  max_resolution_tier: "1440p",
  passthrough: `${video.id}~~${video.slug}`,
};
// POST to https://api.mux.com/video/v1/assets
// Updates SQLite: UPDATE videos SET mux_asset_id = '...' WHERE id = ...
```

#### `check-assets.mjs`

Verifies Mux assets exist and aren't errored:

```javascript
// GET https://api.mux.com/video/v1/assets/{asset_id}
// Updates state to 'error' if muxAsset.status === 'errored'
```

---

### New Scripts Needed

#### `add-gap-lessons.mjs` 🆕

**Purpose**: Add 152 gap lessons to SQLite from `VIDEO_GAP_LESSONS.json`

**Input**: `reports/VIDEO_GAP_LESSONS.json`

**Logic**:

```javascript
import Database from "better-sqlite3";
import fs from "fs";

const db = new Database("./egghead_videos.db");
const gapLessons = JSON.parse(
  fs.readFileSync("../reports/VIDEO_GAP_LESSONS.json"),
);

const stmt = db.prepare(`
  INSERT OR IGNORE INTO videos (id, slug, source_url, state)
  VALUES (?, ?, ?, 'unprocessed')
`);

let inserted = 0;
for (const lesson of gapLessons) {
  const result = stmt.run(lesson.id, lesson.slug, lesson.sourceUrl);
  if (result.changes > 0) inserted++;
}

console.log(`✅ Inserted ${inserted} gap lessons`);
console.log(
  `📊 Total videos: ${db.prepare("SELECT COUNT(*) as count FROM videos").get().count}`,
);
```

**Output**: Console log with insert count

---

#### `backfill-rails-mux-urls.mjs` 🆕

**Purpose**: Update Rails `lessons` table with Mux URLs after successful upload

**Input**: SQLite `videos` table (where `mux_asset_id IS NOT NULL`)

**Logic**:

```javascript
import Database from "better-sqlite3";
import pg from "pg";
import Mux from "@mux/mux-node";

const sqliteDb = new Database("./egghead_videos.db");
const { Client } = pg;
const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
await pgClient.connect();

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

// Get videos with Mux assets
const videos = sqliteDb
  .prepare(
    `
  SELECT id, slug, mux_asset_id
  FROM videos
  WHERE mux_asset_id IS NOT NULL
  AND id >= 10389 AND id <= 10684
`,
  )
  .all();

let updated = 0;
for (const video of videos) {
  // Get playback ID from Mux
  const asset = await mux.video.assets.retrieve(video.mux_asset_id);
  const playbackId = asset.playback_ids[0].id;

  // Update Rails
  await pgClient.query(
    `
    UPDATE lessons
    SET current_video_hls_url = $1,
        current_video_dash_url = $2
    WHERE id = $3
  `,
    [
      `https://stream.mux.com/${playbackId}.m3u8`,
      `https://stream.mux.com/${playbackId}.mpd`,
      video.id,
    ],
  );

  updated++;
  console.log(`✅ ${video.id}: ${video.slug}`);
}

console.log(`\n🔄 Updated ${updated} lessons in Rails`);
await pgClient.end();
```

**Output**: Console log with update count

**Rate Limiting**: Respect Mux API rate limits (add delays if needed)

---

### Script Dependencies

All scripts require:

```json
{
  "dependencies": {
    "better-sqlite3": "^9.2.2",
    "@mux/mux-node": "^8.1.0",
    "pg": "^8.11.3"
  }
}
```

Install in `download-egghead/`:

```bash
cd download-egghead
npm install better-sqlite3 @mux/mux-node pg
```

---

## Migration Plan for Gap Lessons

### Revised Plan (Dec 12, 2025)

Only **152 lessons** need SQLite → Mux migration. The other 19 are either:

- Already on Mux in Rails (2)
- Already in Coursebuilder with Mux (17)

---

## Complete Execution Plan

### Prerequisites

**Environment Variables**:

```bash
# Mux API credentials
export MUX_TOKEN_ID=xxx
export MUX_TOKEN_SECRET=xxx

# AWS (if accessing S3 directly)
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx

# Rails DB (for backfill step)
export DATABASE_URL=postgres://...
```

**Working Directory**: `download-egghead/`

**Scripts Needed**:

- ✅ `write-db.mjs` - SQLite writer (existing)
- ✅ `index.mjs` - Video downloader (existing)
- ✅ `send-to-mux.mjs` - Mux uploader (existing)
- ✅ `check-assets.mjs` - Verification script (existing)
- 🆕 `add-gap-lessons.mjs` - Add gap lessons to SQLite (new)
- 🆕 `backfill-rails-mux-urls.mjs` - Update Rails with Mux URLs (new)

---

### Step-by-Step Execution

#### Step 1: Export Gap Lessons with Source URLs ✅ DONE

Source URLs are in `resources_videos.progressive_url` in Rails:

```
https://egghead-video-downloads.s3.amazonaws.com/lessons/{slug}/{slug}.mp4
```

Export query:

```sql
SELECT l.id, l.slug, rv.progressive_url as source_url
FROM lessons l
JOIN resources_videos rv ON rv.lesson_id = l.id
WHERE l.id >= 10389 AND l.id <= 10684
  AND l.state = 'published'
  AND rv.progressive_url IS NOT NULL
```

**Output**: `reports/VIDEO_GAP_LESSONS.json` (152 lessons)

---

#### Step 2: Add Gap Lessons to SQLite

**Script**: `add-gap-lessons.mjs`

**What it does**:

- Reads `VIDEO_GAP_LESSONS.json`
- Inserts each lesson into `videos` table with `state = 'unprocessed'`
- Handles duplicates gracefully (INSERT OR IGNORE)

**Schema**:

```sql
INSERT INTO videos (id, slug, source_url, state)
VALUES (?, ?, ?, 'unprocessed')
ON CONFLICT(id) DO NOTHING;
```

**Run**:

```bash
cd download-egghead
node add-gap-lessons.mjs
```

**Expected Output**:

```
✅ Inserted 152 gap lessons into SQLite
📊 Total videos in DB: 7,786 (was 7,634)
```

**Verification**:

```bash
sqlite3 egghead_videos.db "SELECT COUNT(*) FROM videos WHERE id >= 10389 AND id <= 10684"
# Expected: 152
```

---

#### Step 3: Download Source Files to NAS (Optional)

**Script**: `index.mjs`

**What it does**:

- Scans `videos` table for `state = 'unprocessed'`
- Downloads from `source_url` to `/Volumes/Home/egghead/video-archive/{id}~{slug}.mp4`
- Updates `state = 'indexed'` on success

**Run**:

```bash
node index.mjs
```

**When to skip**: If S3 URLs are still accessible, `send-to-mux.mjs` can upload directly from S3 without downloading first.

**Expected Output**:

```
⬇️  Downloading 152 videos...
✅ 150/152 downloaded
⚠️  2 failed (404 or expired URLs)
```

---

#### Step 4: Upload to Mux

**Script**: `send-to-mux.mjs`

**What it does**:

- Reads `videos` table for `state IN ('indexed', 'unprocessed')` AND `mux_asset_id IS NULL`
- Creates Mux asset via API with:
  - `input.url` = S3 source URL or NAS file path
  - `passthrough` = `{id}~~{slug}`
  - `playback_policy` = `public`
  - `mp4_support` = `standard`
- Updates `videos.mux_asset_id` on success
- Updates `state = 'updated'` when asset ready

**Run**:

```bash
MUX_TOKEN_ID=xxx MUX_TOKEN_SECRET=xxx node send-to-mux.mjs
```

**Expected Output**:

```
🚀 Uploading 152 videos to Mux...
✅ 150/152 uploaded successfully
⚠️  2 failed (check error log)
```

**Error Handling**:

- Mux API errors logged to console
- Failed videos remain in `state = 'unprocessed'` or `'indexed'`
- Can re-run safely (skips videos with `mux_asset_id`)

---

#### Step 5: Verify Mux Assets

**Script**: `check-assets.mjs`

**What it does**:

- Reads `videos` table for `mux_asset_id IS NOT NULL`
- Calls Mux API: `GET /video/v1/assets/{asset_id}`
- Checks `status` field:
  - `ready` → video playable ✅
  - `preparing` → still processing ⏳
  - `errored` → upload failed ❌
- Updates `state = 'error'` if `status = 'errored'`

**Run**:

```bash
node check-assets.mjs
```

**Expected Output**:

```
📊 Checking 7,593 Mux assets...
✅ 7,591 ready
⏳ 2 preparing
❌ 0 errored
```

**Re-check after 30 minutes** if any are still `preparing`.

---

#### Step 6: Backfill Rails with Mux URLs

**Script**: `backfill-rails-mux-urls.mjs`

**What it does**:

- Reads `videos` table for `mux_asset_id IS NOT NULL`
- Derives `mux_playback_id` from Mux API (or parse from asset)
- Updates Rails `lessons` table:
  ```sql
  UPDATE lessons
  SET current_video_hls_url = 'https://stream.mux.com/{playback_id}.m3u8',
      current_video_dash_url = 'https://stream.mux.com/{playback_id}.mpd'
  WHERE id = ?
  ```

**Run**:

```bash
DATABASE_URL=postgres://... node backfill-rails-mux-urls.mjs
```

**Expected Output**:

```
🔄 Backfilling Rails with Mux URLs...
✅ Updated 152 lessons
📊 Total lessons with Mux URLs: 6,639
```

**Why this matters**: Allows egghead-next to serve from Mux immediately without code changes.

---

## Verification Checklist

### Before Starting

- [ ] Export gap lessons to `VIDEO_GAP_LESSONS.json`
- [ ] Confirm 152 lessons have `progressive_url` in Rails
- [ ] Verify Mux API credentials work: `curl -u $MUX_TOKEN_ID:$MUX_TOKEN_SECRET https://api.mux.com/video/v1/assets`
- [ ] Backup SQLite DB: `cp egghead_videos.db egghead_videos.backup.db`

### After Step 2 (Add to SQLite)

- [ ] SQLite count: `SELECT COUNT(*) FROM videos WHERE id >= 10389 AND id <= 10684` = **152**
- [ ] No duplicates: `SELECT id, COUNT(*) FROM videos GROUP BY id HAVING COUNT(*) > 1` = **0 rows**

### After Step 4 (Upload to Mux)

- [ ] SQLite count with Mux IDs: `SELECT COUNT(*) FROM videos WHERE id >= 10389 AND mux_asset_id IS NOT NULL` = **~150-152**
- [ ] Mux dashboard shows new assets: https://dashboard.mux.com/
- [ ] Check for errors: `SELECT * FROM videos WHERE state = 'error' AND id >= 10389`

### After Step 5 (Verify)

- [ ] All assets ready: `SELECT COUNT(*) FROM videos WHERE mux_asset_id IS NOT NULL AND state = 'updated'`
- [ ] No errors: `SELECT COUNT(*) FROM videos WHERE state = 'error'` = **0**

### After Step 6 (Backfill Rails)

- [ ] Rails count: `SELECT COUNT(*) FROM lessons WHERE current_video_hls_url LIKE 'https://stream.mux.com%'` = **6,639**
- [ ] Gap lessons updated: `SELECT COUNT(*) FROM lessons WHERE id >= 10389 AND id <= 10684 AND current_video_hls_url LIKE 'https://stream.mux.com%'` = **154** (152 + 2 already on Mux)
- [ ] Spot check: Open egghead.io lesson page, verify video plays from Mux

### Final Sanity Checks

- [ ] Total published lessons: **6,639**
- [ ] Lessons with Mux URLs: **6,639** (100%)
- [ ] SQLite videos with `mux_asset_id`: **7,593** (includes unpublished/draft)
- [ ] No lessons serving from CloudFront

---

## Rollback Procedure

### If Mux Upload Fails

**Good news**: No data loss. Videos remain on CloudFront and S3.

**Rollback steps**:

1. **Stop the migration**:

   ```bash
   # Kill send-to-mux.mjs if running
   pkill -f send-to-mux
   ```

2. **Identify failed videos**:

   ```sql
   SELECT id, slug, state FROM videos
   WHERE id >= 10389 AND id <= 10684
   AND (state = 'error' OR mux_asset_id IS NULL);
   ```

3. **Do NOT backfill Rails** for failed videos - they'll continue serving from CloudFront.

4. **Manual retry** for specific lessons:

   ```bash
   # Re-run for specific ID range
   node send-to-mux.mjs --ids=10450,10451,10452
   ```

5. **Verify egghead-next still works**:
   - Lessons with Mux URLs serve from Mux ✅
   - Lessons without Mux URLs serve from CloudFront ✅
   - No broken videos

### If Rails Backfill Breaks

**Symptom**: Videos stop playing on egghead.io

**Rollback**:

```sql
-- Restore CloudFront URLs for gap lessons
UPDATE lessons
SET current_video_hls_url = 'https://d2c5owlt6rorc3.cloudfront.net/' || slug || '/hls/' || slug || '.m3u8'
WHERE id >= 10389 AND id <= 10684
  AND current_video_hls_url LIKE 'https://stream.mux.com%';
```

**Verify**: Spot check lessons play from CloudFront again.

### Worst Case: Restore SQLite Backup

```bash
cd download-egghead
cp egghead_videos.backup.db egghead_videos.db
```

This reverts all SQLite changes. Rails is unaffected.

---

## Coursebuilder Integration

Once all videos have `mux_asset_id` in SQLite, the content migration can:

1. **Create VideoResource** for each video:

```typescript
{
  type: 'videoResource',
  fields: {
    muxAssetId: video.mux_asset_id,
    muxPlaybackId: derived_from_mux_api,
    state: 'ready',
    duration: lesson.duration
  }
}
```

2. **Create Lesson** linking to VideoResource:

```typescript
{
  type: 'lesson',
  fields: {
    slug: lesson.slug,
    title: lesson.title,
    legacyId: lesson.id
  }
}
// + ContentResourceResource relationship
```

---

## Key Files

| File                                             | Purpose                                   |
| ------------------------------------------------ | ----------------------------------------- |
| `download-egghead/egghead_videos.db`             | SQLite tracker (canonical for old videos) |
| `download-egghead/egghead_lessons.csv`           | Original export with S3 URLs              |
| `download-egghead/send-to-mux.mjs`               | Mux upload script                         |
| `reports/VIDEO_GAP_LESSONS.json`                 | Gap lessons to migrate                    |
| `investigation/src/queries/content-structure.ts` | Rails content queries                     |

---

## Environment Variables Needed

```bash
# Mux API (for send-to-mux.mjs)
MUX_TOKEN_ID=xxx
MUX_TOKEN_SECRET=xxx

# AWS (if accessing S3 directly)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Rails DB (for investigation/)
DATABASE_URL=postgres://...

# Coursebuilder DB (for investigation/)
NEW_DATABASE_URL=mysql://...
```

---

## Next Steps

### Video Migration (152 lessons) - Execution Order

1. [x] Identify source URLs for gap lessons - **DONE** (in `resources_videos.progressive_url`)
2. [x] Cross-reference with Coursebuilder - **DONE** (17 already have Mux in CB)
3. [ ] **Execute Step 2**: Add 152 gap lessons to SQLite `videos` table (`add-gap-lessons.mjs`)
4. [ ] **Execute Step 3**: Download source files to NAS (optional - `index.mjs`)
5. [ ] **Execute Step 4**: Run `send-to-mux.mjs` for gap lessons
6. [ ] **Execute Step 5**: Verify with `check-assets.mjs`
7. [ ] **Execute Step 6**: Backfill Rails `current_video_hls_url` with Mux URLs (`backfill-rails-mux-urls.mjs`)
8. [ ] **Run verification checklist** (see above)

### egghead-next Updates (Post-Migration)

9. [ ] Update video player to prefer Mux URLs (already mostly done)
10. [ ] Remove CloudFront fallback logic (once 100% on Mux)
11. [ ] Test all video playback

### Content Migration to Coursebuilder (Parallel Track)

12. [ ] Create `videoResource` records for SQLite videos (link via `mux_asset_id`)
13. [ ] Create `lesson` (or `post`) records linking to videoResources
14. [ ] Migrate transcripts, tags, and metadata

---

## Data Source Priority

When looking up video for a lesson:

1. **Coursebuilder** - Check if `post` exists with linked `videoResource` that has `muxPlaybackId`
2. **SQLite** - Check `videos` table for `mux_asset_id` (derive playback ID from Mux API)
3. **Rails** - Check `lessons.current_video_hls_url` for Mux URL pattern
4. **Fallback** - CloudFront URL (legacy, to be deprecated)
