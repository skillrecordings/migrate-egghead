# Rails Schema Reference

> **Purpose**: Canonical reference for egghead-rails database schema  
> **Status**: Verified against production December 13, 2025  
> **Critical**: This is the SOURCE OF TRUTH for migration

---

## Content Model

### The Key Insight

**Playlists are NOT all courses.** The `playlists` table contains:

- **1.37M user playlists** - users can save lessons to personal playlists
- **437 official courses** - identified by `visibility_state = 'indexed'`

The join table is `tracklists` (polymorphic), NOT `playlist_lessons`.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RAILS CONTENT MODEL                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │    playlists     │  ← 1.37M total (mostly user playlists)
                    ├──────────────────┤
                    │ id               │
                    │ title            │
                    │ slug             │
                    │ owner_id → users │
                    │ state            │  ← 'published', 'retired', 'draft', etc.
                    │ visibility_state │  ← 'indexed' = official course
                    │ access_state     │  ← 'pro', 'free', 'bundled'
                    └────────┬─────────┘
                             │
                             │ playlist_id
                             ▼
                    ┌──────────────────┐
                    │   tracklists     │  ← POLYMORPHIC JOIN TABLE
                    ├──────────────────┤
                    │ id               │
                    │ playlist_id      │
                    │ tracklistable_id │
                    │ tracklistable_type│ ← 'Lesson', 'Playlist', 'Resource::File', etc.
                    │ row_order        │  ← lesson ordering within course
                    └────────┬─────────┘
                             │
                             │ tracklistable_id (when type='Lesson')
                             ▼
                    ┌──────────────────┐
                    │     lessons      │  ← 10,082 total
                    ├──────────────────┤
                    │ id               │
                    │ title            │
                    │ slug             │
                    │ state            │  ← 'published', 'retired', 'approved', etc.
                    │ instructor_id    │
                    │ duration         │
                    │ series_id        │  ← DEPRECATED, do not use
                    └──────────────────┘
```

---

## Official Courses vs User Playlists

### How to Identify Official Courses

```sql
-- Official courses: visibility_state = 'indexed'
SELECT * FROM playlists WHERE visibility_state = 'indexed';
-- Returns: 437 rows
```

### Breakdown

| Category                     | Count     | Query                                                             |
| ---------------------------- | --------- | ----------------------------------------------------------------- |
| Total playlists              | 1,376,718 | `SELECT COUNT(*) FROM playlists`                                  |
| User playlists               | 1,376,281 | `WHERE visibility_state != 'indexed' OR visibility_state IS NULL` |
| **Official courses**         | **437**   | `WHERE visibility_state = 'indexed'`                              |
| Official + published         | 437       | `WHERE visibility_state = 'indexed' AND state = 'published'`      |
| Official + has lessons       | 428       | Join with tracklists                                              |
| Official + published lessons | **427**   | Join with published lessons                                       |

### Access States

```sql
SELECT access_state, COUNT(*)
FROM playlists
WHERE visibility_state = 'indexed'
GROUP BY access_state;
```

| access_state | count | meaning               |
| ------------ | ----- | --------------------- |
| `pro`        | 332   | Requires subscription |
| `free`       | 104   | Free to all           |
| `null`/other | 1     | Edge case             |

---

## Lessons

### Total Counts

| Category           | Count  |
| ------------------ | ------ |
| Total lessons      | 10,082 |
| Published          | 6,639  |
| Retired            | 1,531  |
| Approved (pending) | 342    |
| Other states       | 1,567  |

### Lesson Placement

| Category                     | Count     | Notes                                   |
| ---------------------------- | --------- | --------------------------------------- |
| In indexed courses           | 5,065     | Lessons linked to official courses      |
| Published in indexed courses | 4,989     | What users see                          |
| **Standalone lessons**       | **1,650** | Published but not in any indexed course |
| Not in ANY playlist          | 1,210     | Truly orphaned                          |

### Standalone Lessons

These are published lessons NOT in any official course. They're accessible via direct URL and should be migrated as individual content items.

```sql
-- Find standalone published lessons
SELECT l.id, l.slug, l.title, i.slug as instructor
FROM lessons l
LEFT JOIN instructors i ON i.id = l.instructor_id
WHERE l.state = 'published'
AND NOT EXISTS (
  SELECT 1 FROM tracklists t
  JOIN playlists p ON p.id = t.playlist_id
  WHERE t.tracklistable_type = 'Lesson'
  AND t.tracklistable_id = l.id
  AND p.visibility_state = 'indexed'
)
ORDER BY l.id DESC;
-- Returns: 1,650 rows
```

Recent examples (John Lindquist's Claude/Cursor content):

- `create-interactive-ai-tools-with-claude-codes-ask-user-question~b47wn`
- `avoid-the-dangers-of-settings-pollution-in-subagents-hooks-and-scripts~xrecv`
- `optimizing-claude-skills-from-subagents-to-scripts~af2o7`

---

## Tracklists (Join Table)

### Polymorphic Types

```sql
SELECT tracklistable_type, COUNT(*)
FROM tracklists
GROUP BY tracklistable_type
ORDER BY count DESC;
```

| tracklistable_type | count   | notes                               |
| ------------------ | ------- | ----------------------------------- |
| `Playlist`         | 189,851 | Nested playlists (user collections) |
| `Lesson`           | 108,527 | **Primary: lessons in courses**     |
| `Resource::File`   | 175     | Downloadable files                  |
| `Series`           | 74      | Legacy, deprecated                  |
| `Podcast`          | 51      | Podcast episodes                    |
| `Resource::Url`    | 27      | External links                      |
| `course`/`Course`  | 20      | Edge cases                          |
| `Talk`             | 4       | Conference talks                    |
| `Download`         | 1       | Legacy                              |

### Ordering

`row_order` column determines lesson order within a course. Lower = earlier.

```sql
SELECT t.row_order, l.title
FROM tracklists t
JOIN lessons l ON l.id = t.tracklistable_id
WHERE t.playlist_id = 432490  -- Beginner's Guide to React
AND t.tracklistable_type = 'Lesson'
ORDER BY t.row_order;
```

---

## Migration Targets Summary

### What We're Migrating

| Content Type           | Count  | Notes                                                |
| ---------------------- | ------ | ---------------------------------------------------- |
| **Official courses**   | 427    | `visibility_state='indexed'` + has published lessons |
| **Lessons in courses** | ~5,025 | Published lessons in indexed courses                 |
| **Standalone lessons** | 1,650  | Published, not in indexed courses                    |
| **Total lessons**      | ~6,675 | Courses + standalone                                 |

### What We're NOT Migrating

| Content Type        | Count     | Reason                               |
| ------------------- | --------- | ------------------------------------ |
| User playlists      | 1,376,281 | User-generated, not official content |
| Retired courses     | 162       | `state='retired'`                    |
| Draft courses       | 6         | Not published                        |
| Retired lessons     | 1,531     | `state='retired'`                    |
| Unpublished lessons | ~1,800    | Various non-published states         |

---

## Key Tables Reference

### playlists (courses)

| Column             | Type         | Notes                                 |
| ------------------ | ------------ | ------------------------------------- |
| `id`               | integer      | Primary key                           |
| `title`            | varchar(255) | Course title                          |
| `slug`             | varchar(255) | URL slug                              |
| `description`      | text         | Course description                    |
| `owner_id`         | integer      | FK → users (instructor)               |
| `state`            | varchar      | 'published', 'retired', 'draft', etc. |
| `visibility_state` | varchar      | **'indexed' = official course**       |
| `access_state`     | text         | 'pro', 'free', 'bundled'              |
| `published_at`     | timestamp    | When published                        |
| `tagline`          | text         | Short description                     |
| `summary`          | text         | Longer description                    |
| `square_cover_*`   | various      | Cover image fields                    |

### lessons

| Column           | Type         | Notes                                    |
| ---------------- | ------------ | ---------------------------------------- |
| `id`             | integer      | Primary key                              |
| `title`          | varchar(255) | Lesson title                             |
| `slug`           | varchar(255) | URL slug                                 |
| `summary`        | text         | Description                              |
| `duration`       | integer      | Seconds                                  |
| `state`          | varchar      | 'published', 'retired', 'approved', etc. |
| `instructor_id`  | integer      | FK → instructors                         |
| `published_at`   | timestamp    | When published                           |
| `transcript`     | text         | Lesson transcript                        |
| `is_pro_content` | boolean      | Requires subscription                    |
| `series_id`      | integer      | **DEPRECATED - do not use**              |

### tracklists (join table)

| Column               | Type    | Notes                      |
| -------------------- | ------- | -------------------------- |
| `id`                 | integer | Primary key                |
| `playlist_id`        | integer | FK → playlists             |
| `tracklistable_id`   | integer | Polymorphic FK             |
| `tracklistable_type` | varchar | 'Lesson', 'Playlist', etc. |
| `row_order`          | integer | Sort order within playlist |

---

## Common Queries

### Get all official courses with lesson counts

```sql
SELECT
  p.id,
  p.slug,
  p.title,
  p.access_state,
  COUNT(DISTINCT l.id) as lesson_count
FROM playlists p
JOIN tracklists t ON t.playlist_id = p.id AND t.tracklistable_type = 'Lesson'
JOIN lessons l ON l.id = t.tracklistable_id AND l.state = 'published'
WHERE p.visibility_state = 'indexed' AND p.state = 'published'
GROUP BY p.id, p.slug, p.title, p.access_state
ORDER BY lesson_count DESC;
```

### Get lessons for a specific course (ordered)

```sql
SELECT
  t.row_order,
  l.id,
  l.slug,
  l.title,
  l.duration
FROM tracklists t
JOIN lessons l ON l.id = t.tracklistable_id
WHERE t.playlist_id = :course_id
AND t.tracklistable_type = 'Lesson'
AND l.state = 'published'
ORDER BY t.row_order;
```

### Get standalone lessons with instructor

```sql
SELECT
  l.id,
  l.slug,
  l.title,
  l.duration,
  i.slug as instructor_slug,
  i.full_name as instructor_name
FROM lessons l
LEFT JOIN instructors i ON i.id = l.instructor_id
WHERE l.state = 'published'
AND NOT EXISTS (
  SELECT 1 FROM tracklists t
  JOIN playlists p ON p.id = t.playlist_id
  WHERE t.tracklistable_type = 'Lesson'
  AND t.tracklistable_id = l.id
  AND p.visibility_state = 'indexed'
)
ORDER BY l.published_at DESC;
```

---

## Deprecated/Unused

### series table

**DO NOT USE.** Legacy table with 309 records. The `series_id` column on lessons is deprecated.

Lessons are linked to courses via `tracklists`, not `series_id`.

### playlist_lessons table

**DOES NOT EXIST.** The join table is `tracklists` (polymorphic).

---

## Verification Queries

Run these to verify counts match this document:

```sql
-- Should return 437
SELECT COUNT(*) FROM playlists WHERE visibility_state = 'indexed';

-- Should return 427
SELECT COUNT(DISTINCT p.id)
FROM playlists p
JOIN tracklists t ON t.playlist_id = p.id AND t.tracklistable_type = 'Lesson'
JOIN lessons l ON l.id = t.tracklistable_id AND l.state = 'published'
WHERE p.visibility_state = 'indexed' AND p.state = 'published';

-- Should return ~1650
SELECT COUNT(*) FROM lessons l
WHERE l.state = 'published'
AND NOT EXISTS (
  SELECT 1 FROM tracklists t
  JOIN playlists p ON p.id = t.playlist_id
  WHERE t.tracklistable_type = 'Lesson'
  AND t.tracklistable_id = l.id
  AND p.visibility_state = 'indexed'
);
```
