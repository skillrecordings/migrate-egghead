---
name: code-path-migrator
description: >
  Trace a Rails code path (GraphQL operation or REST endpoint) to its Postgres queries, then
  generate the equivalent raw SQL TypeScript function for egghead-next's direct DB access.
  Uses Axiom traffic data to prioritize by impact. The generated function replaces a Rails
  round-trip with a direct Postgres query + Next.js caching. Use when migrating a specific
  endpoint, porting a GraphQL resolver, building the egghead-next data layer, or planning
  which code paths to migrate next.
  Triggers: "migrate endpoint", "port resolver", "code path", "direct DB", "replace GraphQL",
  "what should we migrate next", "trace this endpoint", "rawdog postgres".
---

# Code Path Migrator

Trace Rails code paths → generate raw SQL TypeScript functions for egghead-next direct Postgres access.

## The Loop

```
1. Pick highest-traffic Rails code path (from Axiom)
2. Trace: resolver/controller → models → SQL queries
3. Generate: typed TS function with raw pg query
4. Ship to egghead-next, wrap in cache
5. Watch Axiom traffic for that path drop to zero
6. /dead-code-hunter picks it up → delete Rails code
7. Repeat
```

## Priority Queue (from Axiom, Feb 5 2026)

| Priority | Code Path | Traffic/Day | Kill Impact |
|----------|-----------|------------|-------------|
| **1** | `getLessonComments` (GraphQL) | 83,688 | 44.6% of all GraphQL |
| **2** | `getLesson` (GraphQL) | 82,372 | 43.9% of all GraphQL |
| **3** | `UsersController#current` (REST) | 18,005 | 55% of all REST |
| **4** | `LessonsController#transcript` (REST) | 5,836 | Content delivery |
| **5** | `LessonsController#subtitles` (REST) | 4,105 | Content delivery |
| **6** | `LessonsController#show` (REST) | 2,762 | Overlaps with #2 |
| **7** | Pricing/PPP (REST) | 1,012 | Stripe API calls |

**Phase 1 (#1 + #2) kills 88.5% of GraphQL.** Phase 2 (#3) kills 55% of REST.

## Workflow

### Step 1: Identify the Rails Code Path

Read the source for the target path:

**For GraphQL operations:**
```
egghead-rails/app/graphql/types/query_type.rb    # Entry point, find the field
egghead-rails/app/graphql/types/*_type.rb         # Type definitions with field resolvers
```

**For REST endpoints:**
```
egghead-rails/app/controllers/api/v1/*_controller.rb  # Controller action
egghead-rails/app/views/api/v1/**/*.json.jbuilder     # JSON serialization
egghead-rails/app/presenters/*_presenter.rb            # Complex serialization
```

### Step 2: Trace to SQL

Follow the chain: resolver/controller → ActiveRecord model → associations → scopes → SQL.

**What to extract:**
- Tables queried (FROM/JOIN)
- Columns selected (what the response actually uses)
- WHERE conditions (filters, scopes, authorization)
- JOINs (associations, polymorphic, through)
- ORDER BY, LIMIT
- Computed fields (anything calculated in Ruby, not from DB)
- Authorization gates (CanCan abilities — what can be simplified)

**Key ActiveRecord patterns to translate:**

| Rails | SQL |
|-------|-----|
| `find_by(slug: slug)` | `WHERE slug = $1` |
| `includes(:instructor)` | `JOIN instructors ON ...` |
| `.viewable` scope | `WHERE state IN ('published', 'approved', ...)` |
| `.accessible_by(ability)` | Usually just `WHERE state = 'published'` for anon |
| `acts_as_commentable :public` | `WHERE state = 'published'` on comments |
| `acts_as_taggable` | JOIN through `taggings` table |
| `friendly_id` | `WHERE slug = $1 OR id = $1::int` |

### Step 3: Generate the TS Function

Use egghead-next's existing `pgQuery` from `src/db/index.ts`:

```typescript
import { pgQuery } from '@/db'

interface LessonComment {
  id: number
  comment: string
  created_at: string
  reply_to_id: number | null
  user_name: string
  avatar_url: string | null
}

export async function getLessonComments(slug: string): Promise<LessonComment[]> {
  const { rows } = await pgQuery<LessonComment>(`
    SELECT c.id, c.comment, c.created_at, c.reply_to_id,
           CONCAT(u.first_name, ' ', u.last_name) as user_name,
           u.avatar_url
    FROM comments c
    JOIN lessons l ON l.id = c.commentable_id AND c.commentable_type = 'Lesson'
    JOIN users u ON u.id = c.user_id
    WHERE l.slug = $1 AND c.state = 'published'
    ORDER BY c.created_at ASC
  `, [slug])
  return rows
}
```

**Rules for generated functions:**
- Raw SQL, no ORM. Use parameterized queries ($1, $2, etc.)
- Type the return value with a TypeScript interface
- Keep the SQL readable — one column per line for complex queries
- Include ONLY the columns the frontend actually uses (check egghead-next consumption)
- Handle NULL cases in SQL (COALESCE, LEFT JOIN) not in TS
- Add JSDoc with the Rails source path for traceability

### Step 4: Add Caching

Wrap with Next.js caching appropriate to the data:

```typescript
import { unstable_cache } from 'next/cache'

// Static-ish content: cache aggressively
export const getCachedLesson = unstable_cache(
  async (slug: string) => getLesson(slug),
  ['lesson'],
  { revalidate: 60 } // 1 minute
)

// User-specific: no cache or short cache with user key
export const getCachedUserProfile = unstable_cache(
  async (userId: number) => getUserProfile(userId),
  ['user-profile'],
  { revalidate: 10, tags: [`user-${userId}`] }
)

// Comments: moderate cache (new comments aren't instant anyway)
export const getCachedLessonComments = unstable_cache(
  async (slug: string) => getLessonComments(slug),
  ['lesson-comments'],
  { revalidate: 30 }
)
```

**Caching strategy by data type:**

| Data | Revalidate | Rationale |
|------|-----------|-----------|
| Lesson content | 60s | Changes rarely, high traffic |
| Comments | 30s | Acceptable delay on new comments |
| User profile | 10s | Needs freshness, but 18K/day is brutal |
| Transcripts | 3600s | Almost never changes |
| Subtitles | 3600s | Never changes |
| Tags | 3600s | Static |

### Step 5: Replace the GraphQL/REST Call

In egghead-next, find where the old call lives:

```typescript
// BEFORE (GraphQL round-trip through Rails)
const { data } = await client.request(GET_LESSON_COMMENTS, { slug })

// AFTER (direct Postgres, cached)
const comments = await getCachedLessonComments(slug)
```

Typical locations:
- `src/pages/**/index.tsx` → `getServerSideProps`
- `src/lib/*.ts` → data fetching functions
- `src/utils/configured-graphql-client.ts` → GraphQL client (eventually delete)

### Step 6: Verify with Axiom

After deploying, watch Axiom for the old code path's traffic:

```bash
log-beast raw '["egghead-rails"] | where ["unknown.event"] == "graphql.execute" and ["unknown.operation_name"] == "getLessonComments" | summarize count() by bin(_time, 1h)'
```

Traffic should drop to zero. If it doesn't, something is still calling the old path — check for:
- Mobile apps hitting Rails directly
- Other consumers of the GraphQL API
- SSR pages you missed

### Step 7: File for Deletion

Once traffic hits zero, use `/dead-code-hunter` to generate the deletion PR.

## Reference: Key Tables

### lessons (66 columns, core entity)
- Core: `id`, `slug`, `title`, `summary`, `duration`, `state`, `published_at`
- Media: `wistia_id`, `hls_url`, `dash_url`, `aws_filename`, `srt`, `transcript`
- Access: `is_pro_content`, `free_forever`, `visibility_state`
- Relations: `instructor_id`, `series_id`, `creator_id`

### comments (polymorphic)
- `commentable_id`, `commentable_type` ('Lesson'), `comment` (text), `state` ('published'), `user_id`, `reply_to_id`

### users (42 columns)
- Auth: `email`, `authentication_token`, `provider`, `uid`
- Profile: `first_name`, `last_name`, `avatar_url`
- Access: roles via `users_roles` join table

### enhanced_transcripts
- `lesson_id`, `markdown` (text), `title`

### taggings (polymorphic, acts-as-taggable)
- `tag_id`, `taggable_id`, `taggable_type`, `context` (library/language/framework/tool)

### instructors
- `id`, `slug`, `full_name`, `user_id`, `avatar`

## Gotchas

- **Authorization:** Most CanCan gates simplify to `WHERE state = 'published'` for anonymous users. For authenticated users, the main gate is `is_pro_content` + subscription check.
- **FriendlyId:** Lessons use slug-based lookup. The slug column IS the lookup key.
- **Polymorphic associations:** Comments and taggings use `*_type` columns. Always include the type filter.
- **Computed fields:** `did_complete?` and `is_favorited?` require user context and additional queries. Handle these separately from the main content query.
- **N+1 prevention:** Rails uses `includes()` to eager-load. In raw SQL, do JOINs or batch queries.
- **egghead-next Postgres pool:** Already configured in `src/db/index.ts` with SSL for production. Just import `pgQuery`.
