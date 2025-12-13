# ContentResource Schema Reference

**Purpose**: Source of truth for ContentResource field structures during egghead Rails → Coursebuilder migration.

**Last Updated**: December 2025

---

## Table of Contents

- [Overview](#overview)
- [Base ContentResource Table](#base-contentresource-table)
- [Type: `tag`](#type-tag)
- [Type: `course`](#type-course)
- [Type: `lesson`](#type-lesson)
- [Type: `videoResource`](#type-videoresource)
- [Relationships](#relationships)
- [Migration Metadata](#migration-metadata)
- [Idempotency](#idempotency)

---

## Overview

Coursebuilder uses a polymorphic `ContentResource` table to store all content types (tags, courses, lessons, videos). Each record has:

- **Fixed columns**: `id`, `type`, `createdById`, `createdAt`, `updatedAt`, `deletedAt`
- **Flexible JSON column**: `fields` - type-specific data stored as JSON

This schema documents the exact structure of the `fields` JSON for each migrated content type.

---

## Base ContentResource Table

**Table**: `egghead_ContentResource`

### Columns

| Column                              | Type         | Nullable | Description                                                      |
| ----------------------------------- | ------------ | -------- | ---------------------------------------------------------------- |
| `id`                                | VARCHAR(255) | NO       | CUID2 identifier (e.g., `clz9x8y3z0000...`)                      |
| `type`                              | VARCHAR(255) | NO       | Content type: `tag`, `course`, `lesson`, `videoResource`, `post` |
| `createdById`                       | VARCHAR(255) | NO       | User ID who created this resource                                |
| `organizationId`                    | VARCHAR(191) | YES      | Organization owner (nullable during migration)                   |
| `createdByOrganizationMembershipId` | VARCHAR(191) | YES      | Organization membership reference                                |
| `fields`                            | JSON         | YES      | Type-specific data (see below)                                   |
| `currentVersionId`                  | VARCHAR(255) | YES      | Version control reference                                        |
| `createdAt`                         | TIMESTAMP    | NO       | Creation timestamp                                               |
| `updatedAt`                         | TIMESTAMP    | NO       | Last update timestamp                                            |
| `deletedAt`                         | TIMESTAMP    | YES      | Soft delete timestamp                                            |

### Indexes

- `type_idx` - Query by content type
- `createdById_idx` - Query by creator
- `createdAt_idx` - Time-based queries
- `deletedAt_idx` - Filter soft-deleted records

### Foreign Keys

- `createdById` → `egghead_User.id` (ON DELETE RESTRICT)

---

## Type: `tag`

**Source**: Rails `tags` table  
**Mapper**: `migration/src/lib/tag-mapper.ts`  
**Count**: 627 tags

### Rails → Coursebuilder Mapping

| Rails Field        | CB Field                 | Transformation                   |
| ------------------ | ------------------------ | -------------------------------- |
| `id`               | `fields.legacyId`        | Store original numeric ID        |
| `name`             | `fields.name`            | Required, defaults to "Untitled" |
| `slug`             | `fields.slug`            | Required, defaults to `tag-{id}` |
| `label`            | `fields.label`           | Nullable                         |
| `description`      | `fields.description`     | Nullable                         |
| `image_url`        | `fields.imageUrl`        | Nullable                         |
| `context`          | `fields.context`         | Nullable                         |
| `popularity_order` | `fields.popularityOrder` | Nullable (integer)               |
| `taggings_count`   | `fields.taggingsCount`   | Nullable (integer)               |
| `updated_at`       | `updatedAt`              | Base column timestamp            |

### Zod Schema

```typescript
export const TagFieldsSchema = z.object({
  name: z.string(),
  slug: z.string(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  context: z.string().nullable(),
  popularityOrder: z.number().nullable(),
  taggingsCount: z.number().nullable(),
  legacyId: z.number(),
});
```

### Example Record

```json
{
  "id": "clz9x8y3z0000abcdef12345",
  "type": "topic",
  "organizationId": null,
  "createdById": "system_user_id",
  "fields": {
    "name": "React",
    "slug": "react",
    "label": "React",
    "description": "A JavaScript library for building user interfaces",
    "imageUrl": "https://egghead.io/tags/react.png",
    "context": "technology",
    "popularityOrder": 1,
    "taggingsCount": 542,
    "legacyId": 42
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-12-10T15:30:00.000Z",
  "deletedAt": null
}
```

### Notes

- `type` is always `"topic"` for migrated tags (egghead tags represent content topics)
- `organizationId` is null during migration (tags are global)
- `legacyId` enables lookups in mapping table `_migration_tag_map`

---

## Type: `course`

**Source**: Rails `series` table  
**Mapper**: `migration/src/lib/course-mapper.ts`  
**Count**: 420 courses

### Rails → Coursebuilder Mapping

| Rails Field              | CB Field                     | Transformation                            |
| ------------------------ | ---------------------------- | ----------------------------------------- |
| `id`                     | `fields.legacyRailsSeriesId` | Store original numeric ID                 |
| `slug`                   | `fields.slug`                | Required                                  |
| `title`                  | `fields.title`               | Required                                  |
| `description`            | `fields.description`         | Nullable → optional                       |
| `summary`                | `fields.summary`             | Nullable → optional                       |
| `tagline`                | `fields.tagline`             | Nullable → optional                       |
| `state`                  | `fields.state`               | Map to `published`, `draft`, `retired`    |
| `is_complete`            | `fields.isComplete`          | Boolean flag                              |
| `free_forever`           | `fields.freeForever`         | Boolean flag                              |
| `published_at`           | Not used                     | State determines publication              |
| `repo`                   | `fields.repo`                | Git repository URL                        |
| `price`                  | `fields.price`               | Nullable → optional                       |
| `purchase_price`         | `fields.purchasePrice`       | Nullable → optional                       |
| `kvstore`                | `fields.legacyKvstore`       | Rails key-value store (preserved as JSON) |
| `square_cover_file_name` | `fields.image`               | Filename (full URL reconstruction TBD)    |
| `instructor_id`          | `createdById`                | Map to CB User ID via instructor mapping  |
| `created_at`             | `createdAt`                  | Base column timestamp                     |
| `updated_at`             | `updatedAt`                  | Base column timestamp                     |

### State Mapping

| Rails `state` | CB `state`  |
| ------------- | ----------- |
| `published`   | `published` |
| `draft`       | `draft`     |
| `archived`    | `retired`   |
| `retired`     | `retired`   |
| Unknown       | `draft`     |

### Visibility Mapping

| Condition                       | CB `visibility` |
| ------------------------------- | --------------- |
| `free_forever = true`           | `public`        |
| Has `price` or `purchase_price` | `pro`           |
| Default                         | `public`        |

### Zod Schema

```typescript
export const CourseFieldsSchema = z
  .object({
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    summary: z.string().optional(),
    tagline: z.string().optional(),
    state: z.enum(["published", "draft", "retired"]),
    visibility: z.enum(["public", "pro", "unlisted"]).default("public"),
    image: z.string().optional(),
    repo: z.string().optional(),

    // Pricing
    price: z.number().optional(),
    purchasePrice: z.number().optional(),
    freeForever: z.boolean().default(false),

    // Completion
    isComplete: z.boolean().default(false),

    // Legacy tracking
    legacyRailsSeriesId: z.number(),
    legacyKvstore: z.record(z.string(), z.unknown()).optional(),

    // Migration metadata
    migratedAt: z.string(),
    migratedFrom: z.literal("rails"),
  })
  .passthrough(); // Allow extra fields during migration
```

### Example Record

```json
{
  "id": "clz9xabc1234567890abcdef",
  "type": "course",
  "organizationId": null,
  "createdById": "instructor_user_clz123",
  "fields": {
    "slug": "react-hooks-in-depth",
    "title": "React Hooks in Depth",
    "description": "Master React Hooks with practical examples",
    "summary": "Learn useState, useEffect, useContext, and custom hooks",
    "tagline": "From basics to advanced patterns",
    "state": "published",
    "visibility": "public",
    "image": "square-cover-react-hooks.jpg",
    "repo": "https://github.com/eggheadio/react-hooks-examples",
    "price": null,
    "purchasePrice": null,
    "freeForever": true,
    "isComplete": true,
    "legacyRailsSeriesId": 1234,
    "legacyKvstore": {
      "customField": "value"
    },
    "migratedAt": "2025-12-13T10:00:00.000Z",
    "migratedFrom": "rails"
  },
  "createdAt": "2023-05-15T08:30:00.000Z",
  "updatedAt": "2025-12-13T10:00:00.000Z",
  "deletedAt": null
}
```

### Notes

- `type` is always `"course"` (not `"post"` with `postType="course"` as in POC)
- `createdById` MUST be a valid User ID (instructor mapped from Rails)
- `visibility` derived from pricing, not a direct Rails field
- `image` is currently just the filename - full URL reconstruction pending
- `.passthrough()` allows migration metadata fields not in strict schema

---

## Type: `lesson`

**Source**: Rails `lessons` table + optional Sanity GraphQL data  
**Mapper**: `migration/src/lib/lesson-mapper.ts`  
**Count**: 5,132 lessons

### Dual Source Strategy

- **Modern lessons** (≥ ID 10685): Sanity has rich metadata (portable text, collaborators, libraries)
- **Legacy lessons** (< ID 10685): Rails-only data (summary, description)

### Rails → Coursebuilder Mapping

| Rails Field             | CB Field                 | Transformation                                |
| ----------------------- | ------------------------ | --------------------------------------------- |
| `id`                    | `fields.legacyRailsId`   | Store original numeric ID                     |
| `slug`                  | `fields.slug`            | Required (or from Sanity)                     |
| `title`                 | `fields.title`           | Required (or from Sanity)                     |
| `summary`               | `fields.description`     | Plain text (or Sanity portable text)          |
| `description`           | `fields.description`     | Fallback if no summary                        |
| `duration`              | `fields.duration`        | Seconds (integer)                             |
| `state`                 | `fields.state`           | Map or retire if no video                     |
| `visibility_state`      | `fields.visibility`      | Map to `public`, `pro`, `unlisted`            |
| `free_access`           | `fields.freeAccess`      | Boolean flag                                  |
| `instructor_id`         | `createdById`            | Map to CB User ID                             |
| `series_id`             | `fields.legacySeriesId`  | Store for course linkage                      |
| `current_video_hls_url` | `fields.videoResourceId` | Extract Mux playback ID, create videoResource |
| `created_at`            | `createdAt`              | Base column timestamp                         |
| `updated_at`            | `updatedAt`              | Base column timestamp                         |

### Sanity → Coursebuilder Mapping (Modern Lessons)

| Sanity Field        | CB Field                   | Transformation                                 |
| ------------------- | -------------------------- | ---------------------------------------------- |
| `_id`               | `fields.legacySanityId`    | Sanity content ID                              |
| `title`             | `fields.title`             | Overrides Rails title                          |
| `slug`              | `fields.slug`              | Overrides Rails slug                           |
| `description`       | `fields.description`       | Portable text → markdown                       |
| `body`              | `fields.body`              | Portable text → markdown                       |
| `thumbnailUrl`      | `fields.thumbnailUrl`      | Video thumbnail                                |
| `collaborators`     | `fields.collaborators`     | Array of `{userId, role, eggheadInstructorId}` |
| `softwareLibraries` | `fields.softwareLibraries` | Array of `{name, version, url}`                |
| `resources`         | `fields.resources`         | Array of `{title, url, type}`                  |
| `eggheadLessonId`   | Validation cross-check     | Should match Rails ID                          |

### State Mapping with Retirement Logic

```typescript
// If no video AND state is 'published', auto-retire
if (!hasVideo && state === "published") {
  state = "retired";
  retiredReason = "Video source file not found during migration";
  retiredAt = new Date().toISOString();
}
```

### Visibility Mapping

| Condition                     | CB `visibility` |
| ----------------------------- | --------------- |
| `visibility_state = 'hidden'` | `unlisted`      |
| `free_access = true`          | `public`        |
| Default                       | `pro`           |

### Zod Schema

```typescript
export const LessonResourceSchema = z.object({
  id: z.string(),
  type: z.literal("lesson"),
  createdById: z.string(),
  fields: z
    .object({
      title: z.string(),
      slug: z.string(),
      description: z.string(),
      body: z.string().nullable(),
      state: z.string(),
      visibility: z.string(),
      duration: z.number().nullable(),
      videoResourceId: z.string().nullable(),
      thumbnailUrl: z.string().nullable(),
      freeAccess: z.boolean().nullable(),

      // Sanity-sourced rich fields (modern lessons only)
      collaborators: z
        .array(
          z.object({
            userId: z.string(),
            role: z.string(),
            eggheadInstructorId: z.number().nullable(),
          }),
        )
        .nullable(),
      softwareLibraries: z
        .array(
          z.object({
            name: z.string(),
            version: z.string().nullable(),
            url: z.string().nullable(),
          }),
        )
        .nullable(),
      resources: z
        .array(
          z.object({
            title: z.string(),
            url: z.string(),
            type: z.string().nullable(),
          }),
        )
        .nullable(),

      // Legacy tracking
      legacyRailsId: z.number(),
      legacySanityId: z.string().nullable(),
      legacySeriesId: z.number().nullable(),

      // Retirement handling
      retiredReason: z.string().nullable(),
      retiredAt: z.string().nullable(),

      // Migration metadata
      migratedAt: z.string(),
      migratedFrom: z.enum(["sanity", "rails"]),
    })
    .passthrough(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

### Example Record (Modern Lesson with Sanity)

```json
{
  "id": "clz9xdef5678901234abcdef",
  "type": "lesson",
  "organizationId": null,
  "createdById": "instructor_user_clz123",
  "fields": {
    "title": "Understanding React Hooks: useState",
    "slug": "understanding-react-hooks-usestate",
    "description": "Learn how to manage component state with the useState hook in React. We'll cover basic syntax, state updates, and common patterns.",
    "body": "## Introduction\n\nThe `useState` hook is...",
    "state": "published",
    "visibility": "public",
    "duration": 324,
    "videoResourceId": "clz9xvideo123456789",
    "thumbnailUrl": "https://image.mux.com/abc123/thumbnail.png",
    "freeAccess": true,

    "collaborators": [
      {
        "userId": "sanity_person_123",
        "role": "instructor",
        "eggheadInstructorId": 456
      }
    ],
    "softwareLibraries": [
      {
        "name": "react",
        "version": "18.2.0",
        "url": "https://react.dev"
      }
    ],
    "resources": [
      {
        "title": "React Hooks Documentation",
        "url": "https://react.dev/reference/react",
        "type": "documentation"
      }
    ],

    "legacyRailsId": 10685,
    "legacySanityId": "lesson-abc123-def456",
    "legacySeriesId": 1234,

    "retiredReason": null,
    "retiredAt": null,

    "migratedAt": "2025-12-13T10:30:00.000Z",
    "migratedFrom": "sanity"
  },
  "createdAt": "2024-08-15T09:00:00.000Z",
  "updatedAt": "2025-12-13T10:30:00.000Z",
  "deletedAt": null
}
```

### Example Record (Legacy Lesson, Rails-only, Retired)

```json
{
  "id": "clz9xghi789012345abcdef",
  "type": "lesson",
  "organizationId": null,
  "createdById": "system_user_id",
  "fields": {
    "title": "Introduction to Angular 1.x",
    "slug": "introduction-to-angular-1x",
    "description": "Learn the basics of Angular 1.x framework",
    "body": null,
    "state": "retired",
    "visibility": "unlisted",
    "duration": 240,
    "videoResourceId": null,
    "thumbnailUrl": null,
    "freeAccess": true,

    "collaborators": null,
    "softwareLibraries": null,
    "resources": null,

    "legacyRailsId": 4567,
    "legacySanityId": null,
    "legacySeriesId": 890,

    "retiredReason": "Video source file not found during migration",
    "retiredAt": "2025-12-13T10:30:00.000Z",

    "migratedAt": "2025-12-13T10:30:00.000Z",
    "migratedFrom": "rails"
  },
  "createdAt": "2018-03-10T14:22:00.000Z",
  "updatedAt": "2025-12-13T10:30:00.000Z",
  "deletedAt": null
}
```

### Notes

- **Portable Text Conversion**: Uses `@portabletext/markdown` package
- **Retirement Logic**: Lessons without video playback IDs auto-retire if state was `published`
- **Video Source Priority**: Rails HLS URL → SQLite Mux tracker (for ID ≤ 10388)
- **Modern vs Legacy**: `migratedFrom` indicates source (`sanity` or `rails`)

---

## Type: `videoResource`

**Source**: Rails `current_video_hls_url` + SQLite `egghead_videos.db`  
**Mapper**: `migration/src/lib/lesson-mapper.ts`  
**Count**: ~5,000 video resources (97.5% coverage)

### Video Resolution Strategy

1. **Extract from Rails HLS URL** (modern lessons, ID > 10388):
   - URL format: `https://stream.mux.com/{playbackId}.m3u8`
   - Extract `playbackId` via regex: `/stream\.mux\.com\/([^.]+)\.m3u8/`

2. **Fallback to SQLite** (legacy lessons, ID ≤ 10388):
   - Query `egghead_videos.db` → `videos` table joined with `lessons`
   - Retrieve `mux_asset_id` and `mux_playback_id`

3. **No Video Found**:
   - Return `null` for `videoResource`
   - Mark lesson as `retired` if state was `published`

### Zod Schema

```typescript
export const VideoResourceSchema = z.object({
  id: z.string(),
  type: z.literal("videoResource"),
  createdById: z.string(),
  fields: z.object({
    muxAssetId: z.string().nullable(),
    muxPlaybackId: z.string(),
    duration: z.number().nullable(),
    state: z.literal("ready"),
    legacyRailsLessonId: z.number(),
    legacySource: z.enum(["rails_url", "sqlite"]),
    migratedAt: z.string(),
    migratedFrom: z.enum(["rails_url", "sqlite"]),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

### Example Record (from Rails HLS URL)

```json
{
  "id": "clz9xvid123456789abcdef",
  "type": "videoResource",
  "organizationId": null,
  "createdById": "system_user_id",
  "fields": {
    "muxAssetId": null,
    "muxPlaybackId": "abc123xyz789",
    "duration": 324,
    "state": "ready",
    "legacyRailsLessonId": 10685,
    "legacySource": "rails_url",
    "migratedAt": "2025-12-13T10:30:00.000Z",
    "migratedFrom": "rails_url"
  },
  "createdAt": "2024-08-15T09:00:00.000Z",
  "updatedAt": "2025-12-13T10:30:00.000Z",
  "deletedAt": null
}
```

### Example Record (from SQLite)

```json
{
  "id": "clz9xvid987654321fedcba",
  "type": "videoResource",
  "organizationId": null,
  "createdById": "system_user_id",
  "fields": {
    "muxAssetId": "mux-asset-abcd1234",
    "muxPlaybackId": "def456ghi789",
    "duration": 240,
    "state": "ready",
    "legacyRailsLessonId": 5000,
    "legacySource": "sqlite",
    "migratedAt": "2025-12-13T10:30:00.000Z",
    "migratedFrom": "sqlite"
  },
  "createdAt": "2019-06-20T11:15:00.000Z",
  "updatedAt": "2025-12-13T10:30:00.000Z",
  "deletedAt": null
}
```

### Notes

- `muxAssetId` is nullable (not available from HLS URLs)
- `muxPlaybackId` is REQUIRED (used for video player)
- `state` is always `"ready"` for migrated videos (assumes Mux asset exists)
- `createdById` uses `system_user_id` (videos aren't user-created)
- `legacySource` tracks where the video data came from

---

## Relationships

**Table**: `egghead_ContentResourceResource`

Links content resources together (e.g., lessons to courses).

### Schema

| Column         | Type         | Description                       |
| -------------- | ------------ | --------------------------------- |
| `resourceOfId` | VARCHAR(255) | Parent resource ID (e.g., course) |
| `resourceId`   | VARCHAR(255) | Child resource ID (e.g., lesson)  |
| `position`     | INT          | Sort order (0-indexed)            |
| `createdAt`    | TIMESTAMP    | Creation timestamp                |
| `updatedAt`    | TIMESTAMP    | Last update timestamp             |

### Example

```sql
-- Link lessons to a course
INSERT INTO egghead_ContentResourceResource (resourceOfId, resourceId, position)
VALUES
  ('course_id_123', 'lesson_id_1', 0),
  ('course_id_123', 'lesson_id_2', 1),
  ('course_id_123', 'lesson_id_3', 2);
```

### Notes

- **Composite Primary Key**: `(resourceOfId, resourceId)`
- **Foreign Keys**: Both columns reference `egghead_ContentResource.id` with CASCADE
- **Position**: 0-indexed, determines lesson order in course

---

## Migration Metadata

All migrated records include these metadata fields in `fields`:

### Required Metadata

| Field          | Type   | Description                                             |
| -------------- | ------ | ------------------------------------------------------- |
| `migratedAt`   | string | ISO 8601 timestamp when migration occurred              |
| `migratedFrom` | string | Source system: `rails`, `sanity`, `rails_url`, `sqlite` |

### Legacy ID Tracking

| Type            | Legacy ID Field       | Purpose                               |
| --------------- | --------------------- | ------------------------------------- |
| `tag`           | `legacyId`            | Rails `tags.id`                       |
| `course`        | `legacyRailsSeriesId` | Rails `series.id`                     |
| `lesson`        | `legacyRailsId`       | Rails `lessons.id`                    |
| `lesson`        | `legacySanityId`      | Sanity content ID (nullable)          |
| `videoResource` | `legacyRailsLessonId` | Rails lesson ID this video belongs to |

### Mapping Tables

Separate mapping tables enable idempotent lookups:

```sql
-- Tag mapping (to be created)
CREATE TABLE _migration_tag_map (
  legacy_id INT PRIMARY KEY,
  new_id VARCHAR(255) NOT NULL,
  migrated_at TIMESTAMP NOT NULL
);

-- Course mapping (to be created)
CREATE TABLE _migration_course_map (
  legacy_series_id INT PRIMARY KEY,
  new_course_id VARCHAR(255) NOT NULL,
  migrated_at TIMESTAMP NOT NULL
);

-- Lesson mapping (to be created)
CREATE TABLE _migration_lesson_map (
  legacy_rails_id INT PRIMARY KEY,
  new_lesson_id VARCHAR(255) NOT NULL,
  new_video_resource_id VARCHAR(255) NULL,
  migrated_at TIMESTAMP NOT NULL
);
```

---

## Idempotency

All migration scripts MUST be idempotent (safe to re-run).

### Check Patterns

#### Tag Exists

```typescript
export async function checkTagExists(
  db: Sql,
  legacyId: number,
): Promise<boolean> {
  const result = await db`
    SELECT 1 
    FROM egghead_ContentResource 
    WHERE type = 'tag' 
      AND fields->>'legacyId' = ${legacyId.toString()}
    LIMIT 1
  `;
  return result.length > 0;
}
```

#### Course Exists

```typescript
export async function checkCourseExists(
  db: Sql,
  legacySeriesId: number,
): Promise<boolean> {
  const result = await db`
    SELECT 1 
    FROM egghead_ContentResource 
    WHERE type = 'course' 
      AND fields->>'legacyRailsSeriesId' = ${legacySeriesId.toString()}
    LIMIT 1
  `;
  return result.length > 0;
}
```

#### Lesson Exists

```typescript
export async function checkLessonExists(
  db: Sql,
  railsLessonId: number,
): Promise<boolean> {
  const result = await db`
    SELECT 1 
    FROM egghead_ContentResource 
    WHERE type = 'lesson' 
      AND fields->>'legacyRailsId' = ${railsLessonId.toString()}
    LIMIT 1
  `;
  return result.length > 0;
}
```

#### Video Resource Exists

```typescript
export async function checkVideoResourceExists(
  db: Sql,
  railsLessonId: number,
): Promise<boolean> {
  const result = await db`
    SELECT 1 
    FROM egghead_ContentResource 
    WHERE type = 'videoResource' 
      AND fields->>'legacyRailsLessonId' = ${railsLessonId.toString()}
    LIMIT 1
  `;
  return result.length > 0;
}
```

### SQL Upsert Pattern

```sql
-- PostgreSQL (NOT used in this migration, but for reference)
INSERT INTO egghead_ContentResource (id, type, createdById, fields, createdAt, updatedAt)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (id) DO UPDATE SET
  fields = EXCLUDED.fields,
  updatedAt = EXCLUDED.updatedAt;

-- MySQL (used in migration)
INSERT INTO egghead_ContentResource (id, type, createdById, fields, createdAt, updatedAt)
VALUES (?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  fields = VALUES(fields),
  updatedAt = VALUES(updatedAt);
```

### Notes

- Check before insert to avoid duplicates
- Use legacy ID JSON field lookups: `fields->>'legacyId'`
- Mapping tables provide fast reverse lookups without JSON queries

---

## Implementation Notes

### Zod Schema Validation

All mappers use `.passthrough()` to allow migration metadata fields:

```typescript
export const CourseFieldsSchema = z
  .object({
    // ... defined fields
  })
  .passthrough(); // ← Allows migratedAt, migratedFrom, etc.
```

### MySQL JSON Queries

Query JSON fields using MySQL's `->` and `->>` operators:

```sql
-- Extract as JSON (returns JSON type)
SELECT fields->'$.slug' FROM egghead_ContentResource WHERE type = 'course';

-- Extract as text (returns string)
SELECT fields->>'$.legacyRailsId' FROM egghead_ContentResource WHERE type = 'lesson';
```

### CUID2 ID Generation

All new IDs use `@paralleldrive/cuid2`:

```typescript
import { createId } from "@paralleldrive/cuid2";

const courseId = createId(); // e.g., "clz9xabc1234567890abcdef"
```

### System User ID

Non-user-created content (tags, retired lessons, video resources) use a system user:

```typescript
const SYSTEM_USER_ID = "system_migration_user";
```

This user must exist in `egghead_User` before migration runs.

---

## Validation Checklist

Before running a migration script:

- [ ] Schema validated with Zod `.parse()`
- [ ] Idempotency check implemented
- [ ] Legacy ID stored in `fields`
- [ ] Migration metadata (`migratedAt`, `migratedFrom`) included
- [ ] Foreign key relationships valid (`createdById` exists in `egghead_User`)
- [ ] JSON fields properly stringified for SQL insert
- [ ] Dry-run tested against Docker containers
- [ ] Count reconciliation (Rails count = CB count after migration)

---

## References

- **Mapper Files**:
  - `migration/src/lib/tag-mapper.ts`
  - `migration/src/lib/course-mapper.ts`
  - `migration/src/lib/lesson-mapper.ts`

- **Database Schema**:
  - `investigation/docker/mysql/init.sql`
  - `course-builder/packages/adapter-drizzle/src/lib/mysql/schemas/content/content-resource.ts`

- **POC Learnings**: `reports/POC_LEARNINGS.md`

- **Schema Analysis**: `reports/COURSEBUILDER_SCHEMA_ANALYSIS.md`
