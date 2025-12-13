# Content Migration Research Report

> **Status**: Complete | **Epic**: `migrate-egghead-9eu` | **Date**: 2025-12-12

This report synthesizes findings from four research subtasks analyzing how to migrate egghead content from Rails/Sanity to Coursebuilder's ContentResource model.

---

## Executive Summary

**The migration is feasible but substantial.** Key findings:

| Dimension           | Finding                                                    |
| ------------------- | ---------------------------------------------------------- |
| **Data Volume**     | 5,132 lessons, 420 courses, 627 tags, 134 instructors      |
| **Video Status**    | 97.5% already on Mux (7,441/7,634)                         |
| **Code Impact**     | 87 files, 31+ API endpoints, 7-8 weeks effort              |
| **Sanity Strategy** | Hybrid - migrate core content, keep marketing in Sanity    |
| **Risk Level**      | Medium - flexible schema helps, but 3-way merge is complex |

### Recommended Approach

1. **Phase 1**: Migrate Rails content (lessons, courses, instructors, tags) → ContentResource
2. **Phase 2**: Migrate Sanity course metadata → ContentResource `fields` JSON
3. **Phase 3**: Keep Sanity for marketing pages, blog, landing pages
4. **Phase 4**: Update egghead-next to read from Coursebuilder APIs

---

## 1. Rails Content Structure

### Core Tables

| Table         | Records | Purpose                          |
| ------------- | ------- | -------------------------------- |
| `lessons`     | 5,132   | Individual video lessons         |
| `series`      | 420     | Courses (collections of lessons) |
| `playlists`   | 1,847   | User-created collections         |
| `instructors` | 134     | Content creators                 |
| `tags`        | 627     | Topics/technologies              |
| `taggings`    | 15,000+ | Polymorphic tag associations     |

### Lesson Schema (Key Fields)

```sql
lessons {
  id: serial PK
  title: string
  slug: string (unique)
  summary: text
  description: text
  instructor_id: FK → instructors
  series_id: FK → series (nullable)
  state: enum ('published', 'approved', 'retired', 'flagged')
  visibility_state: enum ('indexed', 'hidden', 'unlisted')
  free_access: boolean
  duration: integer (seconds)
  media_url: string (legacy video URL)
  thumb_url: string
  created_at, updated_at: timestamps
}
```

### Series (Course) Schema

```sql
series {
  id: serial PK
  title: string
  slug: string (unique)
  description: text
  instructor_id: FK → instructors
  state: enum ('published', 'draft', 'retired')
  access_state: enum ('free', 'pro')
  image_url: string
  square_cover_url: string
  created_at, updated_at: timestamps
}
```

### Instructor Schema

```sql
instructors {
  id: serial PK
  user_id: FK → users
  slug: string (unique)
  full_name: string
  first_name: string
  bio_short: text
  twitter: string
  website: string
  avatar_url: string
}
```

### Content Hierarchy

```
Series (Course)
  └── Tracklist (ordered join)
        └── Lesson
              └── Video (via media_url or Mux)
              └── Tags (via taggings)
              └── Instructor
```

---

## 2. Sanity CMS Audit

### Document Schemas (28 total)

**Core Content** (migrate to CB):

- `resource` - Generic content wrapper
- `course` - Course metadata (overlaps with Rails series)
- `lesson` - Lesson metadata (overlaps with Rails lessons)
- `instructor` - Instructor profiles
- `collaborator` - Guest contributors

**Marketing** (keep in Sanity):

- `cta` - Call-to-action blocks
- `pricing` - Pricing page content
- `landingPage` - Marketing landing pages
- `article` - Blog posts

**Utility** (evaluate case-by-case):

- `tag` - Topic tags
- `software-library` - Technology references
- `podcast` - Podcast episodes
- `tip` - Quick tips

### GROQ Query Analysis

Found **62 GROQ queries** across egghead-next:

| Category           | Count | Examples                                        |
| ------------------ | ----- | ----------------------------------------------- |
| Course queries     | 18    | `getAllCourses`, `getCourse`, `getModuleBySlug` |
| Lesson queries     | 12    | `getLesson`, `getLessonsByTag`                  |
| Instructor queries | 8     | `getInstructor`, `getAllInstructors`            |
| Tag queries        | 6     | `getAllTags`, `getTagBySlug`                    |
| Marketing queries  | 18    | `getCta`, `getPricing`, `getLandingPage`        |

### Sanity-Rails Data Overlap

| Entity      | Rails Source        | Sanity Source          | Resolution                                       |
| ----------- | ------------------- | ---------------------- | ------------------------------------------------ |
| Lessons     | `lessons` table     | `lesson` documents     | Rails is canonical, Sanity has extended metadata |
| Courses     | `series` table      | `course` documents     | Rails is canonical, Sanity has marketing copy    |
| Instructors | `instructors` table | `instructor` documents | Rails is canonical, Sanity has rich bios         |
| Tags        | `tags` table        | `tag` documents        | Rails is canonical                               |

**Recommendation**: 3-way merge - Rails data is source of truth, Sanity provides extended fields, Coursebuilder is target.

---

## 3. Coursebuilder ContentResource Model

### Schema Overview

```typescript
// ContentResource - flexible content container
{
  id: varchar(255) PK,           // CUID
  type: varchar(191),            // 'lesson', 'course', 'videoResource', etc.
  fields: json,                  // Flexible metadata (no schema enforcement)
  createdById: varchar(255) FK,  // User who created
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp,          // Soft delete
}

// ContentResourceResource - hierarchy/relationships
{
  resourceOfId: varchar(255) FK, // Parent resource
  resourceId: varchar(255) FK,   // Child resource
  position: double,              // Ordering
  metadata: json,                // Relationship metadata
  createdAt: timestamp,
}

// ContentResourceTag - tag associations
{
  tagId: varchar(255) FK,
  contentResourceId: varchar(255) FK,
}

// ContentContribution - instructor/contributor links
{
  id: varchar(255) PK,
  userId: varchar(255) FK,
  contentResourceId: varchar(255) FK,
  contributionTypeId: varchar(255) FK,  // 'author', 'instructor', etc.
}
```

### Current ContentResource Types in Coursebuilder

| Type            | Count | Purpose               |
| --------------- | ----- | --------------------- |
| `videoResource` | 391   | Mux video metadata    |
| `post`          | 369   | Lessons created in CB |
| `tip`           | 0     | Quick tips            |
| `tutorial`      | 0     | Multi-step tutorials  |
| `workshop`      | 0     | Workshop content      |

### Fields JSON Pattern

The `fields` column stores type-specific metadata as JSON:

```typescript
// Lesson fields example
{
  title: string,
  slug: string,
  summary: string,
  body: string,              // MDX content
  state: 'draft' | 'published',
  visibility: 'public' | 'private' | 'unlisted',
  duration: number,
  legacyId: number,          // Rails lesson.id for lookups
  legacySlug: string,        // Rails slug for redirects
  free: boolean,
  // Extended from Sanity
  softwareLibraries: string[],
  prerequisites: string[],
}

// Course fields example
{
  title: string,
  slug: string,
  description: string,
  image: string,
  squareCover: string,
  state: 'draft' | 'published',
  access: 'free' | 'pro',
  legacyId: number,
  legacySlug: string,
  // Extended from Sanity
  features: string[],
  testimonials: object[],
}
```

### Mapping Strategy

| Rails/Sanity  | ContentResource                                             |
| ------------- | ----------------------------------------------------------- |
| `lessons`     | `type: 'lesson'`                                            |
| `series`      | `type: 'course'`                                            |
| `instructors` | `ContentContribution` with `contributionType: 'instructor'` |
| `tags`        | `Tag` table + `ContentResourceTag` join                     |
| `tracklists`  | `ContentResourceResource` with `position`                   |
| `playlists`   | `type: 'playlist'` (user-created)                           |

---

## 4. Code Change Analysis

### Files Requiring Changes (87 total)

**API Routes** (31 files):

- `src/pages/api/lessons/[slug].ts` → Query Coursebuilder
- `src/pages/api/courses/[slug].ts` → Query Coursebuilder
- `src/pages/api/instructors/[slug].ts` → Query Coursebuilder
- `src/pages/api/tags/[slug].ts` → Query Coursebuilder
- Plus 27 more API routes

**Page Components** (24 files):

- `src/pages/lessons/[slug].tsx`
- `src/pages/courses/[slug].tsx`
- `src/pages/instructors/[slug].tsx`
- `src/pages/q/[tag].tsx`
- Plus 20 more pages

**Data Fetching** (18 files):

- `src/lib/lessons.ts` → New Coursebuilder client
- `src/lib/courses.ts` → New Coursebuilder client
- `src/lib/instructors.ts` → New Coursebuilder client
- `src/lib/tags.ts` → New Coursebuilder client
- Plus 14 more data files

**Components** (14 files):

- `src/components/lessons/LessonCard.tsx`
- `src/components/courses/CourseCard.tsx`
- `src/components/search/SearchResults.tsx`
- Plus 11 more components

### API Endpoint Migration

| Rails Endpoint                | Current Usage     | Coursebuilder Equivalent            |
| ----------------------------- | ----------------- | ----------------------------------- |
| `GET /api/v1/lessons/:id`     | Lesson data       | `GET /api/content/lesson/:slug`     |
| `GET /api/v1/series/:id`      | Course data       | `GET /api/content/course/:slug`     |
| `GET /api/v1/instructors/:id` | Instructor data   | `GET /api/content/instructor/:slug` |
| `GET /api/v1/tags/:id`        | Tag data          | `GET /api/content/tag/:slug`        |
| `GET /api/v1/lessons`         | Lesson list       | `GET /api/content?type=lesson`      |
| `POST /api/v1/watch`          | Progress tracking | `POST /api/progress`                |
| `GET /api/v1/bookmarks`       | User bookmarks    | `GET /api/bookmarks`                |

### Effort Estimate

| Task                              | Estimate      |
| --------------------------------- | ------------- |
| ContentResource migration scripts | 1 week        |
| API route updates (31 files)      | 2 weeks       |
| Page component updates (24 files) | 1.5 weeks     |
| Data fetching layer (18 files)    | 1 week        |
| Component updates (14 files)      | 0.5 weeks     |
| Testing & validation              | 1 week        |
| **Total**                         | **7-8 weeks** |

---

## 5. Migration Pipeline Design

### Phase 1: Content Data Migration

```typescript
// Inngest function: migrate-content.ts
export const migrateContent = inngest.createFunction(
  { id: "migrate-content", concurrency: 5 },
  { event: "migration/content.start" },
  async ({ step }) => {
    // Step 1: Migrate instructors (no dependencies)
    await step.run("migrate-instructors", migrateInstructors);

    // Step 2: Migrate tags (no dependencies)
    await step.run("migrate-tags", migrateTags);

    // Step 3: Migrate courses (depends on instructors)
    await step.run("migrate-courses", migrateCourses);

    // Step 4: Migrate lessons (depends on instructors, courses)
    await step.run("migrate-lessons", migrateLessons);

    // Step 5: Create relationships (depends on all above)
    await step.run("create-relationships", createRelationships);

    // Step 6: Merge Sanity metadata
    await step.run("merge-sanity", mergeSanityMetadata);
  },
);
```

### Phase 2: ID Mapping Tables

```sql
-- Temporary mapping tables for lookups
CREATE TABLE _migration_lesson_map (
  rails_id INT PRIMARY KEY,
  cb_id VARCHAR(255) NOT NULL,
  rails_slug VARCHAR(255),
  INDEX idx_cb_id (cb_id),
  INDEX idx_slug (rails_slug)
);

CREATE TABLE _migration_course_map (
  rails_id INT PRIMARY KEY,
  cb_id VARCHAR(255) NOT NULL,
  rails_slug VARCHAR(255),
  INDEX idx_cb_id (cb_id),
  INDEX idx_slug (rails_slug)
);

CREATE TABLE _migration_instructor_map (
  rails_id INT PRIMARY KEY,
  cb_id VARCHAR(255) NOT NULL,
  rails_slug VARCHAR(255),
  INDEX idx_cb_id (cb_id),
  INDEX idx_slug (rails_slug)
);
```

### Phase 3: Redirect Strategy

All legacy URLs must redirect to new Coursebuilder URLs:

```typescript
// next.config.js redirects
{
  source: '/lessons/:slug',
  destination: '/learn/:slug',
  permanent: true,
}

// Or dynamic redirect middleware
export function middleware(request: NextRequest) {
  const legacySlug = request.nextUrl.pathname.split('/')[2]
  const newSlug = await lookupNewSlug('lesson', legacySlug)
  if (newSlug) {
    return NextResponse.redirect(new URL(`/learn/${newSlug}`, request.url))
  }
}
```

---

## 6. Risk Assessment

### High Risk

| Risk                        | Mitigation                                           |
| --------------------------- | ---------------------------------------------------- |
| 3-way data merge complexity | Clear precedence rules: Rails > Sanity > defaults    |
| Broken URLs (SEO impact)    | Comprehensive redirect mapping, sitemap preservation |
| Missing video links         | Video migration 97.5% complete, handle edge cases    |

### Medium Risk

| Risk                    | Mitigation                                     |
| ----------------------- | ---------------------------------------------- |
| Sanity query migration  | Gradual migration, keep Sanity for marketing   |
| Progress data migration | Separate migration task, not content-dependent |
| Search index rebuild    | Typesense re-index after content migration     |

### Low Risk

| Risk                 | Mitigation                                 |
| -------------------- | ------------------------------------------ |
| Tag migration        | Simple 1:1 mapping                         |
| Instructor migration | Simple 1:1 mapping via ContentContribution |

---

## 7. Recommendations

### Immediate Actions

1. **Create ContentResource types** in Coursebuilder schema for `lesson`, `course`, `playlist`
2. **Build migration scripts** for Rails → ContentResource (Inngest functions)
3. **Create ID mapping tables** for legacy slug lookups

### Short-term (Phase 1-2)

4. **Migrate core content** (lessons, courses, instructors, tags)
5. **Merge Sanity metadata** into ContentResource `fields`
6. **Update API routes** to query Coursebuilder

### Medium-term (Phase 3-4)

7. **Update page components** to use new data shape
8. **Implement redirects** for all legacy URLs
9. **Rebuild search index** with new content

### Long-term (Phase 5-6)

10. **Deprecate Rails content APIs**
11. **Evaluate Sanity retention** for marketing content
12. **Remove legacy code paths**

---

## 8. Files Reference

### Key Source Files (Rails)

- `egghead-rails/app/models/lesson.rb`
- `egghead-rails/app/models/series.rb`
- `egghead-rails/app/models/instructor.rb`
- `egghead-rails/app/models/tag.rb`
- `egghead-rails/db/schema.rb`

### Key Source Files (Sanity)

- `egghead-next/studio/schemas/documents/`
- `egghead-next/src/lib/sanity.ts`

### Key Target Files (Coursebuilder)

- `course-builder/packages/adapter-drizzle/src/lib/mysql/schemas/content/`
- `course-builder/apps/egghead/src/lib/content.ts` (to create)

---

## Appendix: Data Counts

```sql
-- Rails PostgreSQL (as of 2025-12-12)
SELECT 'lessons' as table_name, COUNT(*) FROM lessons
UNION ALL SELECT 'series', COUNT(*) FROM series
UNION ALL SELECT 'instructors', COUNT(*) FROM instructors
UNION ALL SELECT 'tags', COUNT(*) FROM tags
UNION ALL SELECT 'playlists', COUNT(*) FROM playlists
UNION ALL SELECT 'taggings', COUNT(*) FROM taggings;

-- Results:
-- lessons: 5,132
-- series: 420
-- instructors: 134
-- tags: 627
-- playlists: 1,847
-- taggings: 15,000+
```

```sql
-- Coursebuilder PlanetScale (as of 2025-12-12)
SELECT type, COUNT(*) FROM egghead_ContentResource GROUP BY type;

-- Results:
-- videoResource: 391
-- post: 369
```

---

_Report generated from research subtasks 9eu.1-9eu.4_
