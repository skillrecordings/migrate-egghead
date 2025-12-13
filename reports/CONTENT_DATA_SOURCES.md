# Content Data Sources for egghead Migration

> **Purpose**: Document where content data lives and how to source it during migration  
> **Status**: Complete - Phase 0 documentation  
> **Updated**: December 13, 2025

---

## Executive Summary

egghead content exists in **two distinct eras** with different data sources and architectures:

| Era        | Timeframe          | Count                           | Primary Source   | Video Source                                         | CMS           |
| ---------- | ------------------ | ------------------------------- | ---------------- | ---------------------------------------------------- | ------------- |
| **Legacy** | 2012 - Oct 2024    | ~390 courses<br/>~4,600 lessons | Rails PostgreSQL | Wistia → CloudFront<br/>(migrated to Mux via SQLite) | None          |
| **Modern** | Oct 2024 - Present | ~30 courses<br/>~530 lessons    | Sanity CMS       | Direct Mux upload                                    | Sanity Studio |

**Key Decision** (Joel, Dec 11): **Eliminate Sanity CMS entirely**. All content moves to Coursebuilder's `ContentResource` table in PlanetScale. Single database architecture.

---

## The Two Eras

### Era 1: Legacy Content (Pre-October 2024)

**Characteristics**:

- Created before Coursebuilder existed
- All metadata in Rails PostgreSQL
- Videos migrated from Wistia/CloudFront to Mux via `download-egghead/egghead_videos.db`
- No Sanity CMS involvement
- ~390 published courses, ~4,600 lessons

**Data Sources**:
| Data Type | Source | Table/Location | Notes |
|-----------|--------|---------------|-------|
| Lesson metadata | Rails PostgreSQL | `lessons` | slug, title, summary, description, state, instructor_id, series_id |
| Course metadata | Rails PostgreSQL | `series` + `playlists` | series = old courses, playlists = newer courses |
| Video URLs | Rails PostgreSQL | `lessons.current_video_hls_url` | Mux HLS playback URLs |
| Mux asset IDs | SQLite | `download-egghead/egghead_videos.db` → `videos.mux_asset_id` | For lessons ID ≤ 10388 |
| Instructor info | Rails PostgreSQL | `users` WHERE `is_instructor = true` | 134 instructors |
| Tags | Rails PostgreSQL | `tags` + `taggings` | 627 tags, many-to-many with lessons |
| Progress tracking | Rails PostgreSQL | `playlists` (watch-later), tracklists | 2.9M records to migrate |

**Video Migration Timeline**:
| Lesson ID Range | Era | Original Source | Current Location |
|-----------------|-----|-----------------|------------------|
| 1 - ~4,425 | Ancient | Wistia | Mux (via SQLite migration) |
| ~4,426 - 10,388 | Middle | CloudFront S3 | Mux (via SQLite migration) |
| 10,389 - 10,684 | Transition | Mixed | Partially migrated |
| 10,685+ | Modern | Direct Mux upload | Already on Mux |

**SQLite Database Stats** (`download-egghead/egghead_videos.db`):

```
Total videos:          7,780
Videos with Mux ID:    7,587 (97.5%)
Videos with playback:  6,895 (88.6%)
Total lessons:         5,132
Total courses:         420
Total instructors:     134
Total tags:            627

Video States:
  updated:         6,895 (has mux_asset_id ✅)
  no_srt:           677 (on Mux but missing subtitles)
  missing_video:    207 (source file not found)
  error:              1 (failed migration)
```

### Era 2: Modern Content (October 2024 - Present)

**Characteristics**:

- Created in Coursebuilder era
- Metadata in Sanity CMS (richer, structured content)
- Videos uploaded directly to Mux via Coursebuilder
- Rails has mirror records (synced via Sanity webhooks)
- ~30 courses, ~530 lessons

**Data Sources**:
| Data Type | Source | Location | Notes |
|-----------|--------|----------|-------|
| Rich content | Sanity CMS | Sanity datasets | description (portable text), collaborators, software libraries, resources |
| Video URLs | Rails PostgreSQL | `lessons.current_video_hls_url` | Mux playback URLs (synced from Mux) |
| Mux assets | Mux API | Direct | Created via Coursebuilder video upload |
| Mirror records | Rails PostgreSQL | `lessons` (state='draft' initially) | For revenue share tracking |
| Thumbnails | Sanity CMS | `lesson.thumbnailUrl` | Custom thumbnails (not Mux defaults) |

**Sanity CMS References**:

- 343 references in `egghead-next/src`
- Webhooks sync Sanity → Rails (see `egghead-rails/docs/sanity-webhooks.md`)
- Current workflow: Create in Sanity → webhook fires → Rails creates mirror record
- Publish in Sanity → webhook fires → Rails updates state → included in revenue share

---

## Migration Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│              CONTENT MIGRATION SOURCE DECISION                   │
└─────────────────────────────────────────────────────────────────┘

For each lesson/course:

1. Check if Sanity document exists
   ├─ YES → Modern content
   │   ├─ Source rich content from Sanity
   │   ├─ Source video URL from Rails (current_video_hls_url)
   │   ├─ Source Mux asset ID from Rails OR Mux API
   │   └─ Migrate to Coursebuilder ContentResource (type: lesson)
   │
   └─ NO → Legacy content
       ├─ Source all metadata from Rails
       ├─ Source video URL from Rails (current_video_hls_url)
       ├─ If lesson_id ≤ 10388:
       │   └─ Source Mux asset ID from SQLite (egghead_videos.db)
       ├─ Else:
       │   └─ Source Mux asset ID from Rails OR extract from current_video_hls_url
       └─ Migrate to Coursebuilder ContentResource (type: lesson)

Video Resource Linking:
├─ Check if videoResource exists in Coursebuilder
│   ├─ YES (modern upload) → Link existing videoResource
│   └─ NO (legacy) → Create videoResource from Mux asset ID
```

---

## Field Mapping Reference

### Rails PostgreSQL Schema

**Lessons Table** (`lessons`):

```sql
CREATE TABLE lessons (
  id SERIAL PRIMARY KEY,
  slug VARCHAR NOT NULL UNIQUE,
  title VARCHAR NOT NULL,
  summary TEXT,
  description TEXT,
  duration INTEGER,                    -- video duration in seconds
  state VARCHAR NOT NULL,              -- 'published', 'draft', 'retired'
  visibility_state VARCHAR,            -- NULL, 'pro', 'free'
  free_access BOOLEAN DEFAULT false,
  instructor_id INTEGER NOT NULL,      -- FK to users
  series_id INTEGER,                   -- FK to series (old courses)
  current_video_hls_url TEXT,          -- Mux HLS playback URL
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Series Table** (`series` - old courses):

```sql
CREATE TABLE series (
  id SERIAL PRIMARY KEY,
  slug VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  state VARCHAR NOT NULL,              -- 'published', 'bundled', 'cancelled'
  instructor_id INTEGER NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Playlists Table** (`playlists` - newer courses):

```sql
CREATE TABLE playlists (
  id SERIAL PRIMARY KEY,
  slug VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  state VARCHAR NOT NULL,              -- 'published', 'new', 'retired'
  access_state VARCHAR,                -- NULL, 'pro', 'free', 'bundled'
  owner_id INTEGER NOT NULL,           -- FK to users (can be instructor or learner)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Tracklists Table** (links lessons to playlists):

```sql
CREATE TABLE tracklists (
  id SERIAL PRIMARY KEY,
  playlist_id INTEGER NOT NULL,        -- FK to playlists
  tracklistable_type VARCHAR,          -- 'Lesson', 'Playlist', 'Resource::File', etc.
  tracklistable_id INTEGER,            -- FK to tracklistable (polymorphic)
  row_order INTEGER,                   -- Position in playlist
  created_at TIMESTAMP
);
```

**Tags** (`tags` + `taggings`):

```sql
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  slug VARCHAR NOT NULL,
  created_at TIMESTAMP
);

CREATE TABLE taggings (
  id SERIAL PRIMARY KEY,
  tag_id INTEGER NOT NULL,             -- FK to tags
  taggable_type VARCHAR,               -- 'Lesson', 'Series', etc.
  taggable_id INTEGER,                 -- FK to taggable (polymorphic)
  created_at TIMESTAMP
);
```

**Current Counts** (Rails PostgreSQL):

```
Lessons:             6,639 total
  - With series_id:  2,382 (old course structure)
  - In tracklists:   6,290 (new course structure)

Published Series:    228 (old courses)
Published Playlists: 342 (new courses, excludes 975K+ watch-later)
Instructors:         134
Tags:                627
```

### Sanity CMS Schema

**Lesson Document**:

```typescript
{
  _id: string,                         // Sanity document ID
  _type: 'lesson',
  _createdAt: string,
  title: string,
  slug: { current: string },
  description: PortableText[],         // Rich text (NOT plain text)
  body: PortableText[],                // Extended lesson notes
  thumbnailUrl: string,                // Custom thumbnail (optional)
  collaborators: Array<{               // Instructor(s)
    _ref: string,                      // Reference to collaborator document
    role: 'instructor' | 'presenter'
  }>,
  softwareLibraries: Array<{           // Technologies used
    name: string,
    version: string,
    url: string
  }>,
  resources: Array<{                   // Related links
    title: string,
    url: string,
    type: 'article' | 'documentation' | 'repository'
  }>,
  eggheadLessonId: number,            // Link to Rails lesson.id
  state: 'draft' | 'published' | 'retired'
}
```

**Course Document** (Sanity):

```typescript
{
  _id: string,
  _type: 'course',
  title: string,
  slug: { current: string },
  description: PortableText[],
  image: { asset: { _ref: string } },  // Cover image
  lessons: Array<{
    _ref: string,                      // Reference to lesson documents
    _key: string
  }>,
  collaborators: Array<{ _ref: string }>,
  softwareLibraries: Array<{ ... }>,
  eggheadSeriesId: number,            // Link to Rails series.id OR playlist.id
  state: 'draft' | 'published'
}
```

### SQLite Schema (`download-egghead/egghead_videos.db`)

**Videos Table**:

```sql
CREATE TABLE videos (
  id INTEGER PRIMARY KEY,              -- lesson video ID
  slug VARCHAR NOT NULL,
  source_url VARCHAR,                  -- Original Wistia/CloudFront URL
  subtitles_url VARCHAR,               -- SRT file URL
  size INTEGER,                        -- File size in bytes
  mux_asset_id VARCHAR,                -- Mux asset ID (e.g., "abc123...")
  mux_playback_id TEXT,                -- Mux playback ID (e.g., "xyz789...")
  state VARCHAR NOT NULL DEFAULT 'unprocessed'
                                       -- 'updated', 'no_srt', 'missing_video', 'error'
);
```

**Lessons Table** (SQLite):

```sql
CREATE TABLE lessons (
  id INTEGER PRIMARY KEY,              -- lesson.id from Rails
  video_id INTEGER,                    -- FK to videos.id (SQLite)
  instructor_id INTEGER NOT NULL,
  slug VARCHAR NOT NULL,
  state VARCHAR NOT NULL DEFAULT 'draft',
  course_id INTEGER,                   -- FK to courses.id (SQLite)
  title VARCHAR NOT NULL,
  body TEXT
);
```

**Courses Table** (SQLite):

```sql
CREATE TABLE courses (
  id INTEGER PRIMARY KEY,              -- series.id from Rails
  slug VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  instructor_id INTEGER NOT NULL
);
```

### Coursebuilder Schema (Target)

**ContentResource Table** (`egghead_ContentResource`):

```typescript
{
  id: varchar(255),
  type: 'lesson' | 'course' | 'videoResource' | 'post',
  createdById: varchar(255),           // FK to egghead_User
  fields: json,                        // Flexible metadata storage
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp | null
}
```

**ContentResource `fields` for Lesson**:

```typescript
{
  title: string,
  slug: string,
  description: string,                 // Plain text or portable text
  state: 'published' | 'draft' | 'retired',
  visibility: 'public' | 'pro' | 'free',
  duration: number,                    // seconds
  videoResourceId: string,             // FK to ContentResource (type: videoResource)
  instructorId: string,                // FK to egghead_User
  courseId: string,                    // FK to ContentResource (type: course)
  tags: string[],                      // Array of tag slugs

  // Legacy IDs for reference
  legacyRailsId: number,              // Original Rails lesson.id
  legacySanityId: string | null,      // Sanity _id (if modern content)

  // Sanity-sourced fields (if modern)
  collaborators?: Array<{
    userId: string,
    role: 'instructor' | 'presenter'
  }>,
  softwareLibraries?: Array<{
    name: string,
    version: string,
    url: string
  }>,
  resources?: Array<{
    title: string,
    url: string,
    type: string
  }>,
  thumbnailUrl?: string,

  // Migration metadata
  migratedAt: string,                 // ISO timestamp
  migratedFrom: 'rails' | 'sanity',
  migrationNotes?: string
}
```

**ContentResource `fields` for VideoResource**:

```typescript
{
  muxAssetId: string,                  // Mux asset ID
  muxPlaybackId: string,               // Mux playback ID
  duration: number,                    // seconds
  state: 'ready' | 'processing' | 'errored',

  // Legacy tracking
  legacyVideoId: number | null,       // SQLite videos.id (if legacy)
  legacySourceUrl: string | null,     // Original Wistia/CloudFront URL

  // Migration metadata
  migratedAt: string,
  migratedFrom: 'sqlite' | 'rails' | 'mux-direct'
}
```

---

## Migration Strategy by Source

### Legacy Content Migration (Rails → Coursebuilder)

**For lessons ID ≤ 10,388**:

1. Query Rails `lessons` table for metadata
2. Query SQLite `videos` table for `mux_asset_id` (JOIN on lesson.id = videos.id)
3. Create `ContentResource` (type: lesson) with Rails metadata
4. Create `ContentResource` (type: videoResource) with Mux asset from SQLite
5. Link lesson → videoResource via `fields.videoResourceId`

**For lessons ID > 10,388 (but no Sanity doc)**:

1. Query Rails `lessons` table for metadata
2. Extract Mux asset ID from `current_video_hls_url` OR query Mux API
3. Create `ContentResource` (type: lesson)
4. Create `ContentResource` (type: videoResource)
5. Link lesson → videoResource

**Example SQL (Rails)**:

```sql
-- Get legacy lesson with series info
SELECT
  l.id,
  l.slug,
  l.title,
  l.summary,
  l.description,
  l.duration,
  l.state,
  l.visibility_state,
  l.free_access,
  l.current_video_hls_url,
  l.instructor_id,
  u.email as instructor_email,
  u.name as instructor_name,
  s.id as series_id,
  s.slug as series_slug,
  s.title as series_title
FROM lessons l
LEFT JOIN users u ON u.id = l.instructor_id
LEFT JOIN series s ON s.id = l.series_id
WHERE l.state = 'published'
  AND l.id <= 10388
ORDER BY l.id;
```

**Example SQL (SQLite)**:

```sql
-- Get Mux asset for legacy lesson
SELECT
  v.id,
  v.mux_asset_id,
  v.mux_playback_id,
  v.state,
  v.source_url,
  v.subtitles_url
FROM videos v
INNER JOIN lessons l ON l.video_id = v.id
WHERE l.id = ?  -- lesson.id from Rails
  AND v.mux_asset_id IS NOT NULL;
```

### Modern Content Migration (Sanity + Rails → Coursebuilder)

**For lessons with Sanity documents**:

1. Query Sanity for rich content (description, collaborators, softwareLibraries, resources)
2. Query Rails `lessons` for video URL and state
3. Extract Mux asset from Rails `current_video_hls_url` OR Mux API
4. Create `ContentResource` (type: lesson) with Sanity + Rails merged data
5. Check if `videoResource` already exists (modern uploads via Coursebuilder):
   - If YES: Link existing videoResource
   - If NO: Create videoResource from Mux asset
6. Store Sanity `_id` in `fields.legacySanityId` for reference

**Example GROQ (Sanity)**:

```groq
*[_type == "lesson" && state == "published"] {
  _id,
  _createdAt,
  title,
  "slug": slug.current,
  description,
  body,
  thumbnailUrl,
  "collaborators": collaborators[]-> {
    _id,
    role,
    "person": person-> {
      _id,
      name,
      "image": image.url
    },
    eggheadInstructorId
  },
  softwareLibraries,
  resources,
  eggheadLessonId,
  state
}
```

**Sanity Elimination Plan**:

- Migrate all Sanity content to Coursebuilder `ContentResource.fields`
- Portable text → Convert to plain markdown OR store as JSON in fields
- Keep rich structure (collaborators, softwareLibraries) in JSON fields
- Remove 343 Sanity references from `egghead-next/src`
- Disable Sanity webhooks to Rails
- Archive Sanity datasets (DO NOT delete - historical reference)

---

## Data Gaps and Considerations

### Known Gaps

1. **Missing Videos** (193 lessons):
   - State: `missing_video` in SQLite
   - Source files not found during migration
   - Decision: Mark as `state: 'retired'` in Coursebuilder, preserve metadata

2. **No Subtitles** (677 lessons):
   - State: `no_srt` in SQLite
   - Videos on Mux but missing SRT files
   - Decision: Migrate anyway, subtitles can be added later

3. **Watch-Later Playlists** (975,641 records):
   - User-created playlists, not courses
   - Decision: Migrate to separate user progress/bookmark system

4. **Legacy Subscriptions** (68,095 records):
   - All `state = NULL`, no active subs
   - Decision: Archive only, don't migrate to Coursebuilder

### Critical Data Integrity Checks

**Before migration**:

- [ ] Verify 100% of published lessons have Mux asset IDs (SQLite OR Rails)
- [ ] Verify 100% of published courses have at least 1 published lesson
- [ ] Verify instructor user accounts exist for all lessons/courses
- [ ] Verify tag slugs are unique and consistent

**During migration**:

- [ ] Log any lesson without Mux asset (should be 0 for published content)
- [ ] Log any orphaned lessons (no course/series)
- [ ] Log any Sanity docs without matching Rails records

**After migration**:

- [ ] Verify total lesson count matches (Rails published = Coursebuilder published)
- [ ] Verify total course count matches
- [ ] Verify all video URLs resolve (Mux API check)
- [ ] Verify all redirects work (old slugs → new URLs)

---

## Migration Execution Plan

### Phase 1: Data Export (Inngest Background Jobs)

```typescript
// Inngest function: Export Legacy Lessons
export const exportLegacyLessons = inngest.createFunction(
  { id: "export-legacy-lessons" },
  { event: "migration/export-legacy-lessons" },
  async ({ event, step }) => {
    // Step 1: Query Rails for all published lessons
    const railsLessons = await step.run("query-rails", async () => {
      return await railsDb.query(`
        SELECT l.*, u.email as instructor_email, s.slug as series_slug
        FROM lessons l
        LEFT JOIN users u ON u.id = l.instructor_id
        LEFT JOIN series s ON s.id = l.series_id
        WHERE l.state = 'published'
        ORDER BY l.id
      `);
    });

    // Step 2: For each lesson, get Mux asset from SQLite
    const lessonsWithMux = await step.run("get-mux-assets", async () => {
      return await Promise.all(
        railsLessons.map(async (lesson) => {
          if (lesson.id <= 10388) {
            const video = await sqliteDb.query(
              `
            SELECT mux_asset_id, mux_playback_id, state
            FROM videos v
            INNER JOIN lessons l ON l.video_id = v.id
            WHERE l.id = ?
          `,
              [lesson.id],
            );
            return { ...lesson, muxAsset: video };
          } else {
            // Extract from current_video_hls_url or Mux API
            const muxAsset = extractMuxAssetFromUrl(
              lesson.current_video_hls_url,
            );
            return { ...lesson, muxAsset };
          }
        }),
      );
    });

    // Step 3: Write to temp JSON for import
    await step.run("write-export", async () => {
      await fs.writeFile(
        "/tmp/legacy-lessons-export.json",
        JSON.stringify(lessonsWithMux, null, 2),
      );
    });

    return { count: lessonsWithMux.length };
  },
);
```

### Phase 2: Data Import (Inngest Background Jobs)

```typescript
// Inngest function: Import Lessons to Coursebuilder
export const importLessons = inngest.createFunction(
  { id: "import-lessons" },
  { event: "migration/import-lessons" },
  async ({ event, step }) => {
    const lessons = JSON.parse(
      await fs.readFile("/tmp/legacy-lessons-export.json", "utf-8"),
    );

    // Step 1: Import instructors first (idempotent)
    await step.run("import-instructors", async () => {
      const instructors = [...new Set(lessons.map((l) => l.instructor_id))];
      await importInstructors(instructors);
    });

    // Step 2: Import video resources (idempotent by mux_asset_id)
    await step.run("import-video-resources", async () => {
      for (const lesson of lessons) {
        await db
          .insert(ContentResource)
          .values({
            id: generateId(),
            type: "videoResource",
            fields: {
              muxAssetId: lesson.muxAsset.mux_asset_id,
              muxPlaybackId: lesson.muxAsset.mux_playback_id,
              duration: lesson.duration,
              state: "ready",
              legacyVideoId: lesson.muxAsset.id,
              migratedAt: new Date().toISOString(),
              migratedFrom: "sqlite",
            },
          })
          .onConflictDoNothing(); // Skip if already exists
      }
    });

    // Step 3: Import lessons (link to video resources)
    await step.run("import-lessons", async () => {
      for (const lesson of lessons) {
        const videoResource = await db
          .select()
          .from(ContentResource)
          .where(
            and(
              eq(ContentResource.type, "videoResource"),
              eq(
                ContentResource.fields.muxAssetId,
                lesson.muxAsset.mux_asset_id,
              ),
            ),
          )
          .limit(1);

        await db.insert(ContentResource).values({
          id: generateId(),
          type: "lesson",
          createdById: lesson.instructor_id, // Map to CB user
          fields: {
            title: lesson.title,
            slug: lesson.slug,
            description: lesson.description || lesson.summary,
            state: lesson.state,
            visibility: lesson.visibility_state || "public",
            duration: lesson.duration,
            videoResourceId: videoResource[0].id,
            instructorId: lesson.instructor_id,
            courseId: lesson.series_id, // Map later
            legacyRailsId: lesson.id,
            migratedAt: new Date().toISOString(),
            migratedFrom: "rails",
          },
        });
      }
    });

    return { imported: lessons.length };
  },
);
```

---

## Summary

| Aspect                 | Details                                        |
| ---------------------- | ---------------------------------------------- |
| **Total Lessons**      | 6,639 (Rails), 5,132 with videos (SQLite)      |
| **Total Courses**      | 228 published series + 342 published playlists |
| **Legacy Content**     | ~4,600 lessons - source from Rails + SQLite    |
| **Modern Content**     | ~530 lessons - source from Sanity + Rails      |
| **Video Coverage**     | 97.5% have Mux assets (7,587/7,780)            |
| **Migration Path**     | Sanity + Rails → Coursebuilder ContentResource |
| **Sanity Elimination** | Remove 343 references, migrate to PlanetScale  |
| **Data Integrity**     | Pre/during/post checks ensure 100% coverage    |

**Critical Decision**: Modern content (Sanity CMS) provides richer metadata (portable text descriptions, collaborators, software libraries). This structure should be **preserved in Coursebuilder** via JSON fields, not flattened to plain text. The investment in structured content is valuable for future features (filtering by library, instructor bio pages, etc.).
