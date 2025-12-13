# Course Migration Documentation

## Overview

Migrates Rails `series` table (420 courses) → Coursebuilder `ContentResource` with `type='course'`.

## Files Created

| File                                 | Purpose                                                 |
| ------------------------------------ | ------------------------------------------------------- |
| `src/lib/course-mapper.ts`           | Core mapping logic: Rails series → Coursebuilder course |
| `src/lib/course-mapper.test.ts`      | Unit tests for mapper (8 tests, all passing)            |
| `scripts/migrate-courses.ts`         | Migration script (executable)                           |
| `scripts/migrate-courses.test.ts`    | Integration tests against Docker                        |
| `scripts/COURSE_MIGRATION_README.md` | This file                                               |

## Schema Mapping

### Rails `series` → Coursebuilder `ContentResource` (type='course')

| Rails Field              | Coursebuilder Location                     | Notes                                      |
| ------------------------ | ------------------------------------------ | ------------------------------------------ |
| `id`                     | `fields.legacyRailsSeriesId`               | Preserved for reference                    |
| `slug`                   | `fields.slug`                              | Direct mapping                             |
| `title`                  | `fields.title`                             | Direct mapping                             |
| `description`            | `fields.description`                       | Direct mapping                             |
| `summary`                | `fields.summary`                           | Direct mapping                             |
| `tagline`                | `fields.tagline`                           | Direct mapping                             |
| `state`                  | `fields.state`                             | Mapped: published/draft/archived → retired |
| `is_complete`            | `fields.isComplete`                        | Direct mapping                             |
| `free_forever`           | `fields.freeForever` + `fields.visibility` | true → visibility='public'                 |
| `price`                  | `fields.price`                             | Direct mapping                             |
| `purchase_price`         | `fields.purchasePrice`                     | Direct mapping                             |
| `repo`                   | `fields.repo`                              | Direct mapping                             |
| `square_cover_file_name` | `fields.image`                             | Filename preserved (TODO: reconstruct URL) |
| `kvstore`                | `fields.legacyKvstore`                     | JSON preserved                             |
| `instructor_id`          | `createdById`                              | Maps to Coursebuilder User ID              |
| `created_at`             | `createdAt`                                | Direct mapping                             |
| `updated_at`             | `updatedAt`                                | Direct mapping                             |

## State Mapping

| Rails State | Coursebuilder State | Notes                      |
| ----------- | ------------------- | -------------------------- |
| `published` | `published`         | Active, visible to users   |
| `draft`     | `draft`             | Not published              |
| `archived`  | `retired`           | No longer available        |
| (unknown)   | `draft`             | Default for unknown states |

## Visibility Logic

Coursebuilder uses `visibility` field:

```typescript
if (freeForever) {
  visibility = "public";
} else if (price || purchasePrice) {
  visibility = "pro";
} else {
  visibility = "public"; // Default
}
```

## Prerequisites

1. **Instructors migrated** - Requires instructor → User mapping
2. **Docker containers running** - For testing

   ```bash
   cd migration
   bun docker:reset
   ```

## Running Tests

### Unit Tests (Fast)

```bash
cd migration
bun test src/lib/course-mapper.test.ts
```

**Expected output:**

```
 8 pass
 0 fail
 19 expect() calls
```

### Integration Tests (Docker)

```bash
cd migration
bun docker:reset          # Start containers
bun test scripts/migrate-courses.test.ts
```

**Expected output:**

- Fetches courses from Rails PostgreSQL
- Validates all required fields present
- Confirms ordering consistency

## Running Migration

### Dry Run (Recommended First)

```bash
cd migration
bun scripts/migrate-courses.ts --dry-run --limit=10
```

### Full Migration

```bash
cd migration
bun scripts/migrate-courses.ts
```

### Options

| Flag        | Description                                |
| ----------- | ------------------------------------------ |
| `--dry-run` | Preview migration without writing to DB    |
| `--limit=N` | Migrate only first N courses (for testing) |

## Migration Output

```
╔════════════════════════════════════════════════════════════╗
║  Course Migration: Rails series → Coursebuilder            ║
║  Mode: PRODUCTION                                          ║
║  Limit: ALL                                                ║
╚════════════════════════════════════════════════════════════╝

📦 Fetching courses from Rails PostgreSQL...
✅ Fetched 420 courses from Rails

🚀 Starting migration of 420 courses...

[1/420] Processing: react-fundamentals
   ✅ Migrated course: react-fundamentals (ID: clxyz123...)
[2/420] Processing: intro-to-javascript
   ✅ Migrated course: intro-to-javascript (ID: clxyz456...)

...

╔════════════════════════════════════════════════════════════╗
║  Migration Complete                                        ║
╚════════════════════════════════════════════════════════════╝

Total courses:     420
Migrated:          420
Skipped (exists):  0
Errors:            0
Duration:          12.34s
```

## Idempotency

Migration uses `ON CONFLICT DO NOTHING` to prevent duplicates. Safe to re-run.

## TODOs (Current Limitations)

### 1. Instructor User Mapping

**Current:** Uses system user for all courses (`SYSTEM_USER_ID`)

**Needed:** Map Rails `instructor_id` → Coursebuilder User ID

```typescript
// After instructor migration completes:
const INSTRUCTOR_USER_MAP = new Map<number, string>([
  [45, "user_joel_uuid"],
  [67, "user_kent_uuid"],
  // ...
]);
```

**Blocked by:** Bead `ntu.2` (Migrate Instructors)

### 2. Coursebuilder MySQL Write

**Current:** Migration script does NOT write to Coursebuilder MySQL

**Needed:** Implement SQL INSERT

```typescript
// In migrateCourse():
const { sql, params } = generateCourseInsertSQL(course);
await coursebuilderDb.unsafe(sql, params);
```

**Blocked by:** Docker MySQL container configuration for Coursebuilder schema

### 3. Course→Lesson Linking

**Current:** Does not create ContentResourceResource joins

**Needed:** Link courses to lessons via `position` field

```typescript
// After course created:
await createCourseResourceLinks(courseId, lessonIds);
```

**Blocked by:** Bead `ntu.4` (Migrate Lessons)

### 4. Legacy ID Mapping Table

**Current:** No `_migration_course_map` table

**Needed:** Create table for legacy ID lookups

```sql
CREATE TABLE _migration_course_map (
  rails_series_id INT PRIMARY KEY,
  coursebuilder_course_id VARCHAR(191) NOT NULL,
  migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Use case:** Redirects, analytics continuity

### 5. Image URL Reconstruction

**Current:** Stores `square_cover_file_name` as-is

**Needed:** Reconstruct full Rails Active Storage URL or re-upload to Cloudinary

```typescript
// Example reconstruction:
const imageUrl = `https://egghead.io/rails/active_storage/blobs/${blobKey}/${fileName}`;
```

## Verification Queries

### After Migration

```sql
-- Count migrated courses
SELECT COUNT(*) as total_courses
FROM egghead_ContentResource
WHERE type = 'course';
-- Expected: 420

-- Check state distribution
SELECT
  JSON_EXTRACT(fields, '$.state') as state,
  COUNT(*) as count
FROM egghead_ContentResource
WHERE type = 'course'
GROUP BY state;
-- Expected: published (228), draft (X), retired (Y)

-- Check visibility distribution
SELECT
  JSON_EXTRACT(fields, '$.visibility') as visibility,
  COUNT(*) as count
FROM egghead_ContentResource
WHERE type = 'course'
GROUP BY visibility;
-- Expected: public (X), pro (Y)

-- Verify legacy IDs preserved
SELECT
  id,
  JSON_EXTRACT(fields, '$.slug') as slug,
  JSON_EXTRACT(fields, '$.legacyRailsSeriesId') as legacy_id
FROM egghead_ContentResource
WHERE type = 'course'
LIMIT 10;
```

### Compare with Rails

```sql
-- Rails published courses
SELECT COUNT(*) FROM series WHERE state = 'published';
-- Expected: 228

-- Coursebuilder published courses
SELECT COUNT(*)
FROM egghead_ContentResource
WHERE type = 'course'
  AND JSON_EXTRACT(fields, '$.state') = 'published';
-- Expected: 228 (should match)
```

## Next Steps

1. **Wait for `ntu.2`** - Instructor migration must complete first
2. **Configure MySQL writes** - Add Coursebuilder DB connection
3. **Test against Docker** - Run full migration in Docker environment
4. **Verify counts** - Ensure 420 courses migrated
5. **Spot check** - Manually verify 5-10 courses in UI

## Related Beads

| Bead    | Title                                            | Status  | Dependency  |
| ------- | ------------------------------------------------ | ------- | ----------- |
| `ntu.2` | Migrate instructors → User                       | TODO    | Blocks this |
| `ntu.3` | Migrate courses → ContentResource                | **WIP** | **THIS**    |
| `ntu.4` | Migrate lessons → ContentResource                | TODO    | Needs this  |
| `ntu.5` | Link courses→lessons via ContentResourceResource | TODO    | Needs ntu.4 |

## POC Learnings Applied

✅ **Use `@paralleldrive/cuid2`** - Consistent ID generation  
✅ **Validate with Zod** - Type-safe field mapping  
✅ **`.passthrough()` on schemas** - Allow migration metadata  
✅ **Characterization tests** - Test-first approach  
✅ **ON CONFLICT DO NOTHING** - Idempotency

## References

- **POC Migration**: `investigation/poc-migrate-modern-course.ts`
- **Schema Analysis**: `reports/COURSEBUILDER_SCHEMA_ANALYSIS.md`
- **POC Learnings**: `reports/POC_LEARNINGS.md`
