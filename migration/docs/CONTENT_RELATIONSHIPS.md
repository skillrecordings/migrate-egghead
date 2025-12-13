# Content Relationships Documentation

**Purpose**: Understanding and managing ContentResourceResource relationships in the egghead → Coursebuilder migration.

**Last Updated**: December 2025

---

## Table of Contents

- [Overview](#overview)
- [Relationship Types](#relationship-types)
- [Database Schema](#database-schema)
- [Relationship Patterns](#relationship-patterns)
- [Migration Utilities](#migration-utilities)
- [Examples](#examples)
- [Idempotency](#idempotency)
- [Validation](#validation)

---

## Overview

Coursebuilder uses the `egghead_ContentResourceResource` table to create relationships between content resources. This is a **many-to-many join table** that enables flexible content hierarchies.

### Key Concepts

- **Parent-Child Relationships**: Defined by `resourceOfId` (parent) → `resourceId` (child)
- **Position Ordering**: The `position` column determines order within a parent
- **Zero-Indexed**: Positions start at 0 (like arrays)
- **Primary Key**: Composite of `(resourceOfId, resourceId)` - prevents duplicate links

---

## Relationship Types

### 1. Course → Lesson Links (1:many, ordered)

A course contains multiple lessons in a specific order.

```typescript
// Example: React Hooks course with 3 lessons
{
  resourceOfId: "course_react_hooks",  // Parent course
  resourceId: "lesson_useState",       // Child lesson
  position: 0                          // First lesson
}
{
  resourceOfId: "course_react_hooks",
  resourceId: "lesson_useEffect",
  position: 1                          // Second lesson
}
{
  resourceOfId: "course_react_hooks",
  resourceId: "lesson_custom_hooks",
  position: 2                          // Third lesson
}
```

**Key Properties**:

- Position determines lesson order in the course UI
- Lessons can be reordered by updating position values
- Multiple courses can link to the same lesson (e.g., shared intro lessons)

### 2. Lesson → VideoResource Links (1:1)

Each lesson has a single video. Position is always 0.

```typescript
// Example: Lesson linked to its video
{
  resourceOfId: "lesson_useState",     // Parent lesson
  resourceId: "video_clz9x123456",     // Child video
  position: 0                          // Always 0 for 1:1 relationships
}
```

**Key Properties**:

- One lesson = one video (1:1 relationship)
- Position is always 0 (no ordering needed)
- If a lesson has no video, it gets retired during migration

---

## Database Schema

### Table: `egghead_ContentResourceResource`

```sql
CREATE TABLE `egghead_ContentResourceResource` (
  `resourceOfId` VARCHAR(255) NOT NULL,  -- Parent resource ID
  `resourceId` VARCHAR(255) NOT NULL,    -- Child resource ID
  `position` INT NOT NULL DEFAULT 0,     -- Order (0-indexed)
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`resourceOfId`, `resourceId`),
  KEY `egghead_ContentResourceResource_resourceId_idx` (`resourceId`),
  KEY `egghead_ContentResourceResource_position_idx` (`position`),
  CONSTRAINT `egghead_ContentResourceResource_resourceOfId_fkey`
    FOREIGN KEY (`resourceOfId`)
    REFERENCES `egghead_ContentResource` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `egghead_ContentResourceResource_resourceId_fkey`
    FOREIGN KEY (`resourceId`)
    REFERENCES `egghead_ContentResource` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Indexes

| Index Name       | Columns                      | Purpose                                            |
| ---------------- | ---------------------------- | -------------------------------------------------- |
| PRIMARY          | `(resourceOfId, resourceId)` | Prevent duplicate links, fast parent→child lookups |
| `resourceId_idx` | `resourceId`                 | Fast child→parent lookups                          |
| `position_idx`   | `position`                   | Optimize ordering queries                          |

### Foreign Keys

Both `resourceOfId` and `resourceId` reference `egghead_ContentResource.id`:

- **ON DELETE CASCADE**: If parent or child is deleted, the relationship is automatically deleted
- **ON UPDATE CASCADE**: If an ID changes (rare), the relationship updates automatically

---

## Relationship Patterns

### Pattern 1: Ordered Collection

**Use Case**: Course → Lessons, Playlist → Videos

```typescript
// Create ordered links
const links = createCourseToLessonLinks("course_123", [
  "lesson_1", // position 0
  "lesson_2", // position 1
  "lesson_3", // position 2
]);
```

**Characteristics**:

- Position matters (determines UI order)
- Can reorder by updating positions
- Common for sequential content

### Pattern 2: Single Attachment

**Use Case**: Lesson → Video, Post → ThumbnailImage

```typescript
// Create 1:1 link
const link = createLessonToVideoLink("lesson_123", "video_456");
// Always position 0
```

**Characteristics**:

- Position always 0 (no ordering needed)
- One parent = one child
- Simple 1:1 relationship

### Pattern 3: Many-to-Many (Tags, Categories)

**Note**: Tags use a separate table (`egghead_ContentResourceTag`), not `ContentResourceResource`.

For generic many-to-many relationships:

```typescript
// Example: Multiple courses can link to the same lesson
const links = [
  { resourceOfId: "course_1", resourceId: "lesson_intro", position: 0 },
  { resourceOfId: "course_2", resourceId: "lesson_intro", position: 0 },
];
```

---

## Migration Utilities

### Location

**File**: `migration/src/lib/relationship-mapper.ts`

### Core Functions

#### `createCourseToLessonLinks(courseId, lessonIds)`

Creates ordered links from a course to its lessons.

```typescript
const links = createCourseToLessonLinks("course_react", [
  "lesson_1",
  "lesson_2",
  "lesson_3",
]);
// Returns array of 3 links with positions 0, 1, 2
```

**Parameters**:

- `courseId` (string): Parent course ContentResource ID
- `lessonIds` (string[]): Ordered array of lesson IDs

**Returns**: `ContentResourceResource[]`

**Throws**: Error if courseId is empty or lessonIds is not an array

---

#### `createLessonToVideoLink(lessonId, videoId)`

Creates a 1:1 link from a lesson to its video.

```typescript
const link = createLessonToVideoLink("lesson_123", "video_456");
// Returns { resourceOfId: "lesson_123", resourceId: "video_456", position: 0 }
```

**Parameters**:

- `lessonId` (string): Parent lesson ContentResource ID
- `videoId` (string): Child videoResource ContentResource ID

**Returns**: `ContentResourceResource`

**Throws**: Error if lessonId or videoId is empty

---

#### `generateRelationshipInserts(links)`

Generates SQL INSERT statement for relationship records.

```typescript
const links = createCourseToLessonLinks("course_123", ["lesson_1", "lesson_2"]);
const sql = generateRelationshipInserts(links);
// Returns:
// INSERT INTO egghead_ContentResourceResource (resourceOfId, resourceId, position)
// VALUES
//   ('course_123', 'lesson_1', 0),
//   ('course_123', 'lesson_2', 1)
// ON DUPLICATE KEY UPDATE position = VALUES(position);
```

**Parameters**:

- `links` (ContentResourceResource[]): Array of relationship records

**Returns**: SQL string (idempotent via ON DUPLICATE KEY UPDATE)

**Throws**: Error if links is empty or not an array

---

### Batch Utilities

#### `batchCreateCourseLinks(courses)`

Creates course→lesson links for multiple courses at once.

```typescript
const allLinks = batchCreateCourseLinks([
  { courseId: "course_1", lessonIds: ["lesson_1", "lesson_2"] },
  { courseId: "course_2", lessonIds: ["lesson_3", "lesson_4", "lesson_5"] },
]);
// Returns flattened array of 5 relationship records
```

---

#### `batchCreateVideoLinks(lessons)`

Creates lesson→video links for multiple lessons at once.

```typescript
const allLinks = batchCreateVideoLinks([
  { lessonId: "lesson_1", videoId: "video_1" },
  { lessonId: "lesson_2", videoId: "video_2" },
]);
// Returns array of 2 relationship records (all with position 0)
```

---

### Reordering Utilities

#### `reorderLessons(courseId, lessonIds)`

Re-orders lessons in a course by updating positions.

```typescript
// Original order: [lesson_1, lesson_2, lesson_3]
// New order: [lesson_3, lesson_1, lesson_2]
const newLinks = reorderLessons("course_123", [
  "lesson_3", // position 0
  "lesson_1", // position 1
  "lesson_2", // position 2
]);
```

**Use Case**: When instructor reorders lessons in a course

---

#### `generateDeleteLinks(courseId, lessonIdsToRemove)`

Generates SQL DELETE statement for removing specific relationships.

```typescript
const sql = generateDeleteLinks("course_123", ["lesson_2", "lesson_4"]);
// Returns:
// DELETE FROM egghead_ContentResourceResource
// WHERE resourceOfId = 'course_123'
//   AND resourceId IN ('lesson_2', 'lesson_4');
```

**Use Case**: When lessons are removed from a course

---

### Validation

#### `validateRelationship(link)`

Validates a relationship record structure.

```typescript
const link = {
  resourceOfId: "course_123",
  resourceId: "lesson_456",
  position: 0,
};

validateRelationship(link); // Returns true or throws error
```

**Checks**:

- `resourceOfId` must be non-empty string
- `resourceId` must be non-empty string
- `position` must be non-negative number

---

## Examples

### Example 1: Migrating a Course with Lessons

```typescript
import {
  createCourseToLessonLinks,
  createLessonToVideoLink,
  generateRelationshipInserts,
} from "./src/lib/relationship-mapper";

// 1. Create course→lesson links (ordered)
const courseId = "course_react_hooks_clz123";
const lessonIds = [
  "lesson_useState_clz456",
  "lesson_useEffect_clz789",
  "lesson_custom_clz012",
];

const courseLinks = createCourseToLessonLinks(courseId, lessonIds);

// 2. Create lesson→video links (1:1)
const videoLinks = [
  createLessonToVideoLink("lesson_useState_clz456", "video_clz111"),
  createLessonToVideoLink("lesson_useEffect_clz789", "video_clz222"),
  createLessonToVideoLink("lesson_custom_clz012", "video_clz333"),
];

// 3. Generate SQL
const courseSql = generateRelationshipInserts(courseLinks);
const videoSql = generateRelationshipInserts(videoLinks);

// 4. Execute (using mysql2 or Drizzle)
await db.execute(courseSql);
await db.execute(videoSql);
```

---

### Example 2: Reordering Lessons

```typescript
import {
  reorderLessons,
  generateRelationshipInserts,
} from "./src/lib/relationship-mapper";

// Original order: [lesson_1, lesson_2, lesson_3]
// Instructor wants: [lesson_3, lesson_1, lesson_2]

const courseId = "course_123";
const newOrder = ["lesson_3", "lesson_1", "lesson_2"];

// Generate new links with updated positions
const newLinks = reorderLessons(courseId, newOrder);

// Generate SQL (idempotent - safe to re-run)
const sql = generateRelationshipInserts(newLinks);

// Execute
await db.execute(sql);
```

---

### Example 3: Removing Lessons from a Course

```typescript
import {
  generateDeleteLinks,
  reorderLessons,
  generateRelationshipInserts,
} from "./src/lib/relationship-mapper";

const courseId = "course_123";
const currentLessons = ["lesson_1", "lesson_2", "lesson_3", "lesson_4"];
const lessonsToKeep = ["lesson_1", "lesson_3"];
const lessonsToRemove = ["lesson_2", "lesson_4"];

// Step 1: Delete removed lessons
const deleteSql = generateDeleteLinks(courseId, lessonsToRemove);
await db.execute(deleteSql);

// Step 2: Reorder remaining lessons (close gaps in positions)
const reorderedLinks = reorderLessons(courseId, lessonsToKeep);
const reorderSql = generateRelationshipInserts(reorderedLinks);
await db.execute(reorderSql);

// Result: lesson_1 (pos 0), lesson_3 (pos 1)
```

---

## Idempotency

All relationship utilities are **idempotent** (safe to re-run).

### INSERT Idempotency

The `generateRelationshipInserts()` function uses `ON DUPLICATE KEY UPDATE`:

```sql
INSERT INTO egghead_ContentResourceResource (resourceOfId, resourceId, position)
VALUES
  ('course_123', 'lesson_1', 0),
  ('course_123', 'lesson_2', 1)
ON DUPLICATE KEY UPDATE position = VALUES(position);
```

**Behavior**:

- If link doesn't exist → creates it
- If link exists → updates position only
- Safe to run multiple times

### DELETE Idempotency

The `generateDeleteLinks()` function is naturally idempotent:

```sql
DELETE FROM egghead_ContentResourceResource
WHERE resourceOfId = 'course_123'
  AND resourceId IN ('lesson_1', 'lesson_2');
```

**Behavior**:

- If links exist → deletes them
- If links don't exist → no-op (no error)
- Safe to run multiple times

---

## Validation

### Pre-Migration Checks

Before migrating relationships, validate that referenced resources exist:

```typescript
// Check that course exists
const courseExists = await db.execute(`
  SELECT 1 FROM egghead_ContentResource 
  WHERE id = 'course_123' AND type = 'course'
`);

if (!courseExists.length) {
  throw new Error("Course course_123 not found");
}

// Check that all lessons exist
const lessonIds = ["lesson_1", "lesson_2", "lesson_3"];
const lessonsExist = await db.execute(`
  SELECT id FROM egghead_ContentResource 
  WHERE id IN (${lessonIds.map((id) => `'${id}'`).join(",")})
    AND type = 'lesson'
`);

if (lessonsExist.length !== lessonIds.length) {
  throw new Error("Not all lessons exist");
}
```

### Post-Migration Verification

After migrating relationships, verify counts:

```typescript
// Check course has correct number of lessons
const linkCount = await db.execute(`
  SELECT COUNT(*) as count 
  FROM egghead_ContentResourceResource 
  WHERE resourceOfId = 'course_123'
`);

console.log(`Course has ${linkCount[0].count} lessons`);

// Check positions are sequential (0, 1, 2, ...)
const positions = await db.execute(`
  SELECT position 
  FROM egghead_ContentResourceResource 
  WHERE resourceOfId = 'course_123' 
  ORDER BY position
`);

const expectedPositions = positions.map((_, i) => i);
const actualPositions = positions.map((row) => row.position);

if (JSON.stringify(actualPositions) !== JSON.stringify(expectedPositions)) {
  throw new Error("Positions are not sequential");
}
```

---

## Rails → Coursebuilder Mapping

### Rails Course-Lesson Links

In Rails, the `lessons` table has a `series_id` foreign key:

```sql
-- Rails schema
CREATE TABLE lessons (
  id INTEGER PRIMARY KEY,
  series_id INTEGER,  -- Parent course
  position INTEGER,   -- Lesson order within course
  ...
);
```

### Coursebuilder Migration

In Coursebuilder, this becomes a join table:

```typescript
// Migration pseudo-code
const railsLessons = await railsDb`
  SELECT id, series_id, position 
  FROM lessons 
  WHERE series_id = ${railsSeriesId}
  ORDER BY position
`;

// Map Rails IDs to Coursebuilder IDs
const courseId = await lookupCourseId(railsSeriesId);
const lessonIds = await Promise.all(
  railsLessons.map((lesson) => lookupLessonId(lesson.id)),
);

// Create relationships
const links = createCourseToLessonLinks(courseId, lessonIds);
const sql = generateRelationshipInserts(links);
await cbDb.execute(sql);
```

**Key Points**:

- Rails `series_id` → Coursebuilder `resourceOfId`
- Rails `position` → Coursebuilder `position`
- ID mapping required (Rails numeric IDs → Coursebuilder CUID2)

---

## Testing

### Unit Tests

**Location**: `migration/src/lib/relationship-mapper.test.ts`

Run tests:

```bash
cd migration
bun test relationship-mapper
```

### Integration Testing

Test against Docker MySQL:

```bash
# Start Docker containers
cd migration
bun docker:reset

# Run integration test
bun test:integration
```

---

## References

- **Schema**: `investigation/docker/mysql/init.sql`
- **Utilities**: `migration/src/lib/relationship-mapper.ts`
- **Tests**: `migration/src/lib/relationship-mapper.test.ts`
- **Content Resource Schema**: `migration/docs/CONTENT_RESOURCE_SCHEMA.md`
- **Coursebuilder Drizzle Schema**: `course-builder/packages/adapter-drizzle/src/lib/mysql/schemas/content/content-resource-resource.ts`

---

## Common Pitfalls

### ❌ Don't: Use position -1 or null

```typescript
// WRONG
const link = createLessonToVideoLink("lesson_123", "video_456");
link.position = -1; // Invalid!
```

Position must be >= 0.

---

### ❌ Don't: Skip position gaps

```typescript
// WRONG
const links = [
  { resourceOfId: "course_123", resourceId: "lesson_1", position: 0 },
  { resourceOfId: "course_123", resourceId: "lesson_2", position: 2 }, // Gap!
  { resourceOfId: "course_123", resourceId: "lesson_3", position: 5 }, // Gap!
];
```

Positions should be sequential (0, 1, 2, 3...).

---

### ❌ Don't: Manually write SQL strings

```typescript
// WRONG
const sql = `INSERT INTO egghead_ContentResourceResource VALUES ('${courseId}', '${lessonId}', ${position})`;
```

Use `generateRelationshipInserts()` for safety and idempotency.

---

### ✅ Do: Use utility functions

```typescript
// CORRECT
const links = createCourseToLessonLinks(courseId, lessonIds);
const sql = generateRelationshipInserts(links);
await db.execute(sql);
```

---

### ✅ Do: Validate before inserting

```typescript
// CORRECT
const links = createCourseToLessonLinks(courseId, lessonIds);

// Validate all links
links.forEach((link) => validateRelationship(link));

// Generate and execute SQL
const sql = generateRelationshipInserts(links);
await db.execute(sql);
```

---

## Appendix: TypeScript Interface

```typescript
/**
 * ContentResourceResource record structure
 */
export interface ContentResourceResource {
  resourceOfId: string; // Parent ID (course or lesson)
  resourceId: string; // Child ID (lesson or video)
  position: number; // Order within parent (0-indexed)
  createdAt?: Date;
  updatedAt?: Date;
}
```

---

**End of Documentation**
