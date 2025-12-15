# The Lore: egghead Migration

```
                    ╔═══════════════════════════════════════════════════════════╗
                    ║                                                           ║
                    ║   ██████╗  █████╗ ██╗██╗     ███████╗                     ║
                    ║   ██╔══██╗██╔══██╗██║██║     ██╔════╝                     ║
                    ║   ██████╔╝███████║██║██║     ███████╗                     ║
                    ║   ██╔══██╗██╔══██║██║██║     ╚════██║                     ║
                    ║   ██║  ██║██║  ██║██║███████╗███████║                     ║
                    ║   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝                     ║
                    ║                                                           ║
                    ║   ██╗███████╗                                             ║
                    ║   ██║██╔════╝                                             ║
                    ║   ██║███████╗                                             ║
                    ║   ██║╚════██║                                             ║
                    ║   ██║███████║                                             ║
                    ║   ╚═╝╚══════╝                                             ║
                    ║                                                           ║
                    ║   ██████╗ ███████╗ █████╗ ██████╗                         ║
                    ║   ██╔══██╗██╔════╝██╔══██╗██╔══██╗                        ║
                    ║   ██║  ██║█████╗  ███████║██║  ██║                        ║
                    ║   ██║  ██║██╔══╝  ██╔══██║██║  ██║                        ║
                    ║   ██████╔╝███████╗██║  ██║██████╔╝                        ║
                    ║   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝                         ║
                    ║                                                           ║
                    ╚═══════════════════════════════════════════════════════════╝

                              egghead-rails          egghead-next
                                   │                      │
                                   │    ┌────────────┐    │
                                   └───►│            │◄───┘
                                        │   ☠️  ☠️   │
                                        │  KILLING  │
                                        │   FLOOR   │
                                        │   ☠️  ☠️   │
                                        │            │
                                        └─────┬──────┘
                                              │
                                              ▼
                                   ┌──────────────────┐
                                   │                  │
                                   │  COURSEBUILDER   │
                                   │                  │
                                   │   ┌──────────┐   │
                                   │   │PlanetScale│  │
                                   │   │  Inngest  │  │
                                   │   │    Mux    │  │
                                   │   └──────────┘   │
                                   │                  │
                                   │  THE SURVIVOR    │
                                   └──────────────────┘
```

## The Mission

**Kill egghead-rails AND egghead-next. Consolidate everything onto Coursebuilder.**

Three systems → One:

| System            | Role                                               | Fate     |
| ----------------- | -------------------------------------------------- | -------- |
| `egghead-rails/`  | PostgreSQL backend, Stripe webhooks, subscriptions | **KILL** |
| `egghead-next/`   | Next.js frontend, video player, search             | **KILL** |
| `course-builder/` | Target platform (PlanetScale, Inngest, Mux)        | **KEEP** |

## The Numbers

- **699K users** to migrate
- **3,335 active subscriptions** (all in modern `account_subscriptions` table)
- **2.9M progress records** to migrate
- **420 courses**, **5,132 lessons**
- **97.5% of videos already on Mux**

## The Two Eras

Content exists in two distinct eras:

| Era        | Timeframe          | Count                        | Primary Source   | Video Source                           |
| ---------- | ------------------ | ---------------------------- | ---------------- | -------------------------------------- |
| **Legacy** | 2012 - Oct 2024    | ~390 courses, ~4,600 lessons | Rails PostgreSQL | Wistia → CloudFront → Mux (via SQLite) |
| **Modern** | Oct 2024 - Present | ~30 courses, ~530 lessons    | Sanity CMS       | Direct Mux upload                      |

**Key Decision (Joel, Dec 11):** Eliminate Sanity CMS entirely. All content moves to Coursebuilder's `ContentResource` table. Single database architecture.

## POC Learnings (December 2025)

We migrated 2 courses as proof of concept:

- **Claude Code Essentials** (17 lessons from Sanity)
- **Fix Common Git Mistakes** (19 lessons from Rails)

### What Burned Us

| Finding                | Impact               | Resolution                                                         |
| ---------------------- | -------------------- | ------------------------------------------------------------------ |
| Type mismatch          | Queries failed       | Support both `type='course'` AND `type='post' + postType='course'` |
| `'use server'` exports | Schema exports broke | Remove `'use server'` from query files with type exports           |
| Schema strictness      | Validation failed    | Add `.passthrough()` to allow migration metadata fields            |
| `createdById` NOT NULL | Inserts failed       | Use system user ID: `c903e890-0970-4d13-bdee-ea535aaaf69b`         |
| 97.5% Mux coverage     | 193 lessons missing  | Mark as retired or backfill                                        |
| **Duplicate lessons**  | Vercel build failed  | Check for existing `type='post'` before creating `type='lesson'`   |

### Dec 15, 2025 Incident: Duplicate Lessons

**Problem:** Vercel builds failed with route conflicts. Both `type='lesson'` (migration) and `type='post'` (CB-published) records existed with the same slugs, causing Next.js to try generating the same `/lessons/[slug]` route twice.

**Root Cause:** Migration script created `type='lesson'` records without checking if a `type='post'` with `postType='lesson'` and the same slug already existed.

**Impact:** 261 duplicate records. CB-published lessons (via the UI) were being shadowed by migration-created duplicates.

**Resolution:**

1. Created `migration/scripts/delete-duplicate-lessons.ts` to remove duplicates
2. Updated `migrate-lessons.ts` to check for existing `type='post'` before inserting
3. Froze a pre-migration DB backup before cleanup

**Key Insight:** CB-published content (`type='post'`, ID pattern `post_*`) takes precedence over migration content (`type='lesson'`). Always check before creating.

## The Three Databases

| Database                                      | Connection                                 | Purpose                                           |
| --------------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| Rails PostgreSQL                              | `DATABASE_URL` in `investigation/.env`     | Source of truth for users, subscriptions, lessons |
| Coursebuilder PlanetScale                     | `NEW_DATABASE_URL` in `investigation/.env` | Target database, tables prefixed `egghead_`       |
| SQLite (`download-egghead/egghead_videos.db`) | Direct file access                         | Mux video migration tracker                       |

## Video Source Timeline

| Era                    | Lesson IDs    | Video Source           | Mux Status                 |
| ---------------------- | ------------- | ---------------------- | -------------------------- |
| Ancient (Wistia)       | 1 - ~4425     | Wistia                 | Migrated to Mux via SQLite |
| Middle (CloudFront)    | ~4426 - 10388 | Homebrew S3/CloudFront | Partially in SQLite        |
| Modern (Coursebuilder) | 10685+        | Direct Mux upload      | Already on Mux             |

## The Phase Plan

```
Phase 0: Minimum Viable Safety     ← IN PROGRESS
  └─ E2E test, Inngest dev server, idempotency columns
  └─ Human Gate: phase-0.4

Phase 1: Data Migration
  └─ Users, Orgs, Subscriptions, Progress, Content
  └─ Human Gate: phase-1.9

Phase 2: Webhook Handlers
  └─ Stripe webhooks → Inngest
  └─ Human Gate: phase-2.8

Phase 3: Cron Jobs
  └─ Sidekiq → Inngest

Phase 4: External Integrations
  └─ Customer.io, emails
  └─ Human Gate: phase-4.7

Phase 5: UI Components
  └─ Video player, search, pricing
  └─ Human Gate: phase-5.9

Phase 6: Cutover
  └─ Shadow mode, DNS flip, kill Rails
  └─ Human Gates: phase-6.4, phase-6.7, phase-6.9, phase-6.11
```

## Technical Decisions (Already Made)

| Decision          | Choice                     | Rationale                 |
| ----------------- | -------------------------- | ------------------------- |
| Video player      | Coursebuilder's Mux player | Not xstate complexity     |
| Progress tracking | Build new in CB            | Clean break, migrate data |
| Search            | Same Typesense, new UI     | Port InstantSearch        |
| Instructor pages  | One dynamic route          | Not 20+ hardcoded         |
| Team features     | Defer post-launch          | Complex, few users        |
| State management  | React state                | Not xstate                |

## Design Principles

- **shadcn/ui centric** - Use shadcn components, not complex egghead-next patterns
- **Cut the cruft** - Don't port complexity, rebuild with simplicity
- **No 404s** - Every legacy URL gets a redirect
- **Sitemap preservation** - SEO is critical

## Files Created During POC

```
investigation/
├── src/lib/migration-utils.ts          # Logging, progress, ID generation
├── poc-migrate-modern-course.ts        # Sanity→CB migration
├── poc-migrate-legacy-course.ts        # Rails→CB migration
└── find-legacy-course-candidate.ts     # Helper script

course-builder/apps/egghead/src/
├── lib/courses-query.ts                # Fixed schema validation
├── lib/lessons-query.ts                # Lesson data fetching
├── app/(content)/courses/[slug]/page.tsx  # Course page
└── app/(content)/lessons/[slug]/page.tsx  # Lesson page

reports/
├── CONTENT_DATA_SOURCES.md             # Field mappings (737 lines)
├── POC_LEARNINGS.md                    # Synthesis
└── COURSEBUILDER_SCHEMA_ANALYSIS.md    # Schema mapping
```

## What's Next

**Docker Compose test infrastructure** - a "very useful" simulation of the distributed system:

- PostgreSQL container (Rails source) with seed data
- MySQL container (Coursebuilder/PlanetScale target)
- Mock Sanity API (GraphQL server or test account)
- SQLite volume mount for Mux video tracker

Joel said: _"Use k8s if you want lol, go nutz"_

---

**The goal:** RAILS IS DEAD. One database. One platform. No more Sanity. No more egghead-next. Just Coursebuilder.

---

## Dec 15, 2025 - Duplicate Content Cleanup (Part 2)

### Problem: Build Still Failing After Lesson Cleanup

After deleting 261 duplicate lessons, Vercel build still failed:
```
Error occurred prerendering page "/claude-code-tools-deep-dive~e58tr"
Error: Invalid post data: currentVersionId expected string, received null
```

### Root Cause Analysis

Investigation revealed multiple issues:

1. **Migration ran twice** - Created 874 courses when we should have 436
2. **Course/Post collisions** - 27 courses duplicated existing CB-published posts
3. **All migrated content has `currentVersionId: null`** - Expected, but causes Zod validation failures when routes collide

### Database State Before Cleanup

| Type | Count | Issue |
|------|-------|-------|
| courses | 874 | 2x expected (migration ran twice) |
| course/post collisions | 27 | Same slug, different types |
| lesson/post collisions | 3 | Remaining from earlier cleanup |

### Cleanup Actions

1. **Deleted 438 duplicate courses** - Kept one per slug (MIN(id))
2. **Deleted 13 courses that duplicated posts** - CB-published content takes precedence
3. **Deleted 3 remaining lesson/post duplicates**

### Database State After Cleanup

| Type | Count | Status |
|------|-------|--------|
| courses | 423 | ✅ Close to expected ~420 |
| lessons | 11,004 | ✅ No post collisions |
| course/post collisions | 0 | ✅ Clean |
| lesson/post collisions | 0 | ✅ Clean |

### Scripts Updated for Idempotency

**`migrate-courses.ts`**:
- Added `checkIfCourseExistsBySlug()` - Prevents duplicate courses
- Added `checkForDuplicatePost()` - Skips if CB post exists with same slug
- Added stats tracking for `skippedDuplicateCourse` and `skippedDuplicatePost`

**`migrate-lessons.ts`**:
- Added `checkForExistingLesson()` - Prevents duplicate lessons (IDs are random cuid2)
- Already had `checkForDuplicatePost()` from earlier fix

### Key Learning

`ON DUPLICATE KEY UPDATE` only works when IDs match. Since we use `cuid2` for random IDs, running migration twice creates duplicates with different IDs but same slugs. **Must check by slug before insert.**

### Backup Branch

Pre-migration state preserved at:
```
MIGRATION_PRE_DATABASE_URL in migration/.env
```
- 1,175 total records (vs 22,474 post-cleanup)
- Can be used to verify migration delta

### Scripts Created

- `scripts/validate-backup.ts` - Validate backup branch state
- `scripts/compare-dbs.ts` - Compare backup vs production
- `scripts/check-null-versions.ts` - Find null currentVersionId issues
- `scripts/investigate-courses.ts` - Debug course count discrepancy
- `scripts/delete-duplicate-courses.ts` - Delete duplicate courses
- `scripts/delete-course-post-dupes.ts` - Delete course/post collisions
- `scripts/final-validation.ts` - Verify cleanup success

### Hash-Based Slug Collisions (Additional Discovery)

After fixing the obvious duplicates, build still failed on `/install-mock-service-worker-msw~fefi6`.

**Root Cause**: The `get-post.ts` query uses `LIKE %${hash}` pattern matching:
```sql
WHERE id LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(fields, '$.slug')) LIKE ?
-- with params: [`%fefi6`, `%fefi6`]
```

This matched BOTH:
- `post_fefi6` with slug `install-mock-service-worker-msw~fefi6` (CB-published, valid)
- `p4yk1tjd3fkqymsewrxhnve0` with slug `install-mock-service-worker-msw-fefi6` (migration, null currentVersionId)

**The Pattern**: Migration created lessons with slightly different slugs:
- Different separator: `~fefi6` vs `-fefi6`
- Different casing: `Mongo DB` vs `MongoDB`
- But same hash suffix, so `LIKE %hash` matches both

**Found 3 such collisions**:
| Post Slug | Lesson Slug | Hash |
|-----------|-------------|------|
| `access-mongo-databases-from-mongo-db-compass~cb5n2` | `access-mongo-databases-from-mongodb-compass-cb5n2` | cb5n2 |
| `install-mock-service-worker-msw~fefi6` | `install-mock-service-worker-msw-fefi6` | fefi6 |
| `delete-documents-in-mongo-db-collections-using-delete-one-and-delete-many~vu2o7` | `delete-documents-in-mongodb-collections-using-deleteone-and-deletemany-vu2o7` | vu2o7 |

**ID Pattern Recognition**:
- `post_xxxxx` = CB-published (Coursebuilder native)
- Random 24-char cuid = Migration-created

**Resolution**: Deleted the 3 migration lessons. CB-published content always takes precedence.

**Script Created**: `scripts/find-hash-collisions.ts` - Finds lessons that would match posts via LIKE %hash

### Key Learnings Summary

1. **Three types of duplicates found**:
   - Same slug, different types (lesson vs post) - 264 total
   - Same slug, same type (migration ran twice) - 438 courses
   - Different slug, same hash suffix (LIKE %hash matches both) - 3 lessons

2. **ID patterns reveal origin**:
   - `post_xxxxx` = CB-published
   - Random cuid = Migration-created
   - This is the quickest way to identify what to delete

3. **Query patterns matter**:
   - `LIKE %hash` is dangerous - matches more than expected
   - Exact slug match would be safer but breaks existing URL patterns

4. **Migration script fixes needed**:
   - Check for existing records BY SLUG before insert (not just ON DUPLICATE KEY)
   - Check for posts with same hash suffix, not just exact slug match
   - IDs are random (cuid2), so can't rely on ID-based deduplication

### Query Fix: get-post.ts Type Filter

**Problem**: After migration, `get-post.ts` queries were matching migrated lessons via `LIKE %hash`.

Example: Slug `create-a-custom-type-based-of-an-object-with-typescript-keyof-operator` extracts `operator` as the "hash" (last segment after `-`). The query `LIKE %operator` then matches hundreds of migrated lessons that have "operator" in their slug.

**Root Cause**: The query didn't filter by `type='post'`. Before migration, only posts existed so it worked. After migration, 11K lessons exist that can match.

**Fix**: Added `WHERE cr_lesson.type = 'post'` to both queries in `get-post.ts`.

**Note**: `get-course-builder-metadata.ts` intentionally uses `type IN ('post', 'lesson')` because it's designed to find both CB posts and migrated lessons. The `get-post.ts` file is specifically for the `[post].tsx` page which should only render CB-published posts.

**Migration Implication**: When building lesson routes later, we'll need separate queries that filter by `type='lesson'` and handle the `currentVersionId: null` case (either by making the schema nullable or by not requiring it for lessons).
