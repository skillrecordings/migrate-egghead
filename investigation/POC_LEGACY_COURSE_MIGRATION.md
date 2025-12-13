# POC: Legacy Course Migration to Coursebuilder

## Summary

Successfully created a POC migration script that migrates a **legacy Rails-only course** (no Sanity document) to Coursebuilder.

**Course**: [Fix Common Git Mistakes](https://egghead.io/courses/fix-common-git-mistakes) (series_id: 401)

- 20 lessons
- Instructor: Kim Wickell
- 19/20 lessons with Mux video coverage (95%)

## Script Location

`investigation/poc-migrate-legacy-course.ts`

## What It Does

### 1. Fetches Course from Rails

- Queries `series` table for course metadata
- Gets instructor info from `users` table
- Returns: title, slug, description, state, instructor details

### 2. Fetches Lessons (Ordered)

- **Primary**: Queries `tracklists` table for lesson ordering (modern courses)
- **Fallback**: Uses `series_id` directly (older courses)
- Preserves `row_order` position for correct lesson sequence

### 3. Resolves Mux Assets

- **From Rails**: Extracts `mux_playback_id` from `current_video_hls_url`
  - Format: `https://stream.mux.com/{playback_id}.m3u8`
- **From SQLite** (optional): For legacy lessons (id ≤ 10388)
  - Currently commented out due to better-sqlite3 build issues
  - Not needed for modern courses

### 4. Generates ContentResource Records

Creates three types of records:

#### videoResource (19 records)

```json
{
  "id": "clxy...",
  "type": "videoResource",
  "createdById": null,
  "fields": {
    "muxAssetId": null,
    "muxPlaybackId": "abc123...",
    "duration": 107,
    "state": "ready",
    "legacyRailsLessonId": 5765,
    "legacySource": "rails",
    "migratedAt": "2025-12-13T...",
    "migratedFrom": "rails"
  }
}
```

#### lesson (19 records)

```json
{
  "id": "clxy...",
  "type": "lesson",
  "createdById": null,
  "fields": {
    "title": "Change a Commit Message...",
    "slug": "git-change-a-commit-message...",
    "description": "Learn how to change a commit...",
    "state": "published",
    "visibility": "public",
    "duration": 107,
    "videoResourceId": "clxy...",
    "instructorId": 210,
    "courseId": "clxy...",
    "legacyRailsId": 5765,
    "legacySeriesId": 401,
    "migratedAt": "2025-12-13T...",
    "migratedFrom": "rails"
  }
}
```

#### course (1 record)

```json
{
  "id": "clxy...",
  "type": "course",
  "createdById": null,
  "fields": {
    "title": "Fix Common Git Mistakes",
    "slug": "fix-common-git-mistakes",
    "description": "...",
    "state": "published",
    "visibility": "public",
    "instructorId": 210,
    "lessonIds": ["clxy1...", "clxy2...", ...],
    "legacyRailsId": 401,
    "migratedAt": "2025-12-13T...",
    "migratedFrom": "rails"
  }
}
```

### 5. Generates ContentResourceResource Links

- **Course → Lessons**: Links course to all lessons with position preserved
- **Lesson → Videos**: Links each lesson to its videoResource

## Field Mapping

### Rails → Coursebuilder

| Rails Field                     | Coursebuilder Field     | Notes                             |
| ------------------------------- | ----------------------- | --------------------------------- |
| `series.id`                     | `fields.legacyRailsId`  | Preserved for reference           |
| `series.slug`                   | `fields.slug`           | Direct copy                       |
| `series.title`                  | `fields.title`          | Direct copy                       |
| `series.description`            | `fields.description`    | Direct copy (can be null)         |
| `series.state`                  | `fields.state`          | `published`, `draft`, `retired`   |
| `series.instructor_id`          | `fields.instructorId`   | TODO: Map to CB user ID           |
| `lessons.id`                    | `fields.legacyRailsId`  | Preserved for reference           |
| `lessons.slug`                  | `fields.slug`           | Direct copy                       |
| `lessons.title`                 | `fields.title`          | Direct copy                       |
| `lessons.summary`               | `fields.description`    | Rails has no `description` column |
| `lessons.duration`              | `fields.duration`       | Seconds                           |
| `lessons.state`                 | `fields.state`          | `published`, `draft`, `retired`   |
| `lessons.visibility_state`      | `fields.visibility`     | `public`, `pro`, `free`           |
| `lessons.current_video_hls_url` | Extract `muxPlaybackId` | Parse from URL                    |
| `tracklists.row_order`          | `position` in links     | Preserves lesson order            |

## Gaps & TODOs

### ❌ Missing from POC

1. **Instructor Mapping**: `instructorId` is Rails user ID, not CB user ID
   - Need to create/map instructor users in Coursebuilder first
   - Should store Rails user ID in CB user record for reference
2. **Missing Video**: 1 lesson has no Mux URL
   - Lesson 5783: "Fix a Pull Request that has a Merge Conflict"
   - Decision: Skip or mark as retired?
3. **SQLite Lookup**: Commented out due to build issues
   - Not needed for modern courses (all videos in Rails)
   - Will be needed for ancient courses (id ≤ 4425)
4. **Tags**: Not migrated in POC
   - Rails `taggings` table links lessons to tags
   - CB schema doesn't have tags yet?
5. **Metadata**: Not migrated
   - `github_repo`, `github_user`, `code_url`, `notes`, etc.
   - Should these go in `fields` JSON?

### ✅ Handled in POC

- Lesson ordering (via tracklists)
- Mux playback ID extraction
- Dry run mode (no DB writes by default)
- Missing video detection
- Legacy ID preservation
- Migration metadata tracking

## How to Use

### 1. Dry Run (Default)

```bash
cd investigation
pnpm tsx poc-migrate-legacy-course.ts
```

Output:

- ✅ Course and lesson data fetched
- ✅ Mux assets resolved
- ✅ ContentResource records generated (in memory)
- ✅ No database writes

### 2. Execute Migration

Edit script:

```typescript
const DRY_RUN = false; // Set to false
```

Then run:

```bash
pnpm tsx poc-migrate-legacy-course.ts
```

This will:

- Insert all records into Coursebuilder PlanetScale DB
- Create all resource links
- Return success message with course URL

### 3. Verify

Visit: `https://coursebuilder.dev/courses/fix-common-git-mistakes`

## Next Steps

1. **Phase 1.1**: Create instructor user migration script
   - Map Rails users to CB users
   - Store `legacyRailsUserId` in CB user fields
2. **Phase 1.2**: Handle missing videos
   - Strategy: Mark as retired? Log for manual review?
3. **Phase 1.3**: Add SQLite support for ancient courses
   - Fix better-sqlite3 build issues
   - Integrate SQLite lookup for id ≤ 10388
4. **Phase 1.4**: Migrate tags
   - Decide CB schema for tags
   - Add to lesson `fields.tags`?
5. **Phase 1.5**: Batch migration
   - Loop through all legacy courses
   - Progress tracking
   - Error handling & retry logic

## Success Metrics

✅ **POC Complete**

- [x] Fetch course from Rails
- [x] Fetch lessons (ordered)
- [x] Resolve Mux assets (19/20)
- [x] Generate ContentResource records
- [x] Generate resource links
- [x] Dry run execution
- [x] Field mapping documented

📊 **Coverage**

- Course: 100% (1/1)
- Lessons: 95% (19/20 with videos)
- Data source: 100% from Rails (no Sanity)
- Lesson ordering: 100% (tracklists)

## Lessons Learned

1. **Rails has two course tables**: `series` (old) and `playlists` (new)
   - Some courses use `series_id` on lessons
   - Modern courses use `tracklists` for ordering
   - Always check both paths

2. **Mux URLs are in Rails**: Not just SQLite
   - `lessons.current_video_hls_url` has Mux playback URLs
   - Format: `https://stream.mux.com/{playback_id}.m3u8`
   - Can extract playback ID with regex

3. **Rails schema quirks**:
   - No `description` column on lessons (only `summary`)
   - `users` table has `first_name`/`last_name`, not `name`
   - `visibility_state` is separate from `state`

4. **Effect-TS SQL is clean**:
   - Type-safe queries with template strings
   - Auto camelCase transformation
   - Easy to compose effects

5. **CUID generation**: Use `@paralleldrive/cuid2`
   - Needed for ContentResource IDs
   - Not installed by default in investigation toolkit

## Files Created

- `investigation/poc-migrate-legacy-course.ts` - Main migration script
- `investigation/find-legacy-course-candidate.ts` - Helper to find good candidates
- `investigation/POC_LEGACY_COURSE_MIGRATION.md` - This document
