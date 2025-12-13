# Migration Control Plane

**The execution layer for egghead Rails → Coursebuilder migration.**

This is where the actual migration happens. Everything else (investigation/, reports/) is analysis. This is action.

## Philosophy

> "If we can get the DATA locked down and pristine, the UI is easy af."

The UI is just rendering data. The hard part is:

1. **Data correctness** - Every field maps correctly
2. **Data completeness** - Nothing missing
3. **Data relationships** - Course→Lesson links intact
4. **Data verification** - Automated checks that catch drift

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MIGRATION CONTROL PLANE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SOURCES (read-only)                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Rails PG    │  │ Sanity Mock │  │ SQLite      │              │
│  │ :5433       │  │ :4000       │  │ (Mux IDs)   │              │
│  │ Legacy data │  │ Modern data │  │ Video URLs  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    MIGRATION SCRIPTS                         ││
│  │  migrate-tags.ts → migrate-courses.ts → migrate-lessons.ts  ││
│  │                                                              ││
│  │  Features:                                                   ││
│  │  - Idempotent (safe to re-run)                              ││
│  │  - Dry-run mode (--dry-run)                                 ││
│  │  - Progress streaming (--stream)                            ││
│  │  - ID mapping tables for redirects                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                          │                                       │
│                          ▼                                       │
│  TARGET                                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ MySQL :3307 (Docker) or PlanetScale (prod)                  ││
│  │                                                              ││
│  │ Tables:                                                      ││
│  │ - egghead_ContentResource (lessons, courses, tags)          ││
│  │ - egghead_ContentResourceResource (relationships)           ││
│  │ - _migration_*_map (ID mappings for redirects)              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  MONITORING                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ TUI (src/tui/)                                              ││
│  │ - Real-time progress bars                                   ││
│  │ - Error log with scroll                                     ││
│  │ - Stream reconnection                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
bun install

# Start Docker stack (Rails PG + MySQL + Sanity mock)
bun docker:reset

# Run tests
bun test

# Run migration (dry-run first!)
bun scripts/migrate-tags.ts --dry-run
bun scripts/migrate-courses.ts --dry-run
bun scripts/migrate-lessons.ts --dry-run

# Run for real
bun scripts/migrate-tags.ts
bun scripts/migrate-courses.ts
bun scripts/migrate-lessons.ts
```

## Scripts

| Command                   | Description                              |
| ------------------------- | ---------------------------------------- |
| `bun docker:reset`        | Reset Docker with cached POC data (fast) |
| `bun docker:reset --live` | Re-export from production (scrubs PII)   |
| `bun docker:up`           | Start Docker containers                  |
| `bun docker:down`         | Stop and remove containers               |
| `bun docker:logs`         | Tail container logs                      |
| `bun test`                | Run all tests                            |
| `bun test:unit`           | Unit tests only                          |
| `bun test:integration`    | Integration tests (requires Docker)      |

## Docker Stack

| Service     | Port | Purpose                        | Credentials       |
| ----------- | ---- | ------------------------------ | ----------------- |
| PostgreSQL  | 5433 | Rails source data              | postgres:postgres |
| MySQL       | 3307 | Coursebuilder target           | root:root         |
| Sanity Mock | 4000 | GraphQL API for modern courses | -                 |

### Curated Test Data

The Docker stack includes a curated subset of production data covering edge cases:

| Course                                  | Lessons | Edge Case                         |
| --------------------------------------- | ------- | --------------------------------- |
| `fix-common-git-mistakes`               | 20      | Standard Rails course             |
| `use-d3-v3-to-build-interactive-charts` | 16      | Ancient Wistia era (lesson ID 66) |
| `the-beginner-s-guide-to-react`         | 30      | Special characters in title       |
| `form-validation-in-elm`                | 18      | Retired course (state='removed')  |
| `claude-code-essentials-6d87`           | 8       | Sanity-only (modern, no Rails)    |

**Totals:** 4 Rails courses, 84 lessons, 7 tags + 1 Sanity course with 8 lessons

Use `bun docker:reset --live` to re-export from production (scrubs PII).

## Directory Structure

```
migration/
├── scripts/
│   ├── docker-reset.ts       # Docker setup with cached data
│   ├── migrate-tags.ts       # Tag migration (627 tags)
│   ├── migrate-courses.ts    # Course migration (420 courses)
│   └── migrate-lessons.ts    # Lesson migration (5,132 lessons)
├── src/
│   ├── lib/
│   │   ├── db.ts             # Database connections
│   │   ├── sql-gen.ts        # SQL generation utilities
│   │   ├── tag-mapper.ts     # Rails tag → CB ContentResource
│   │   ├── course-mapper.ts  # Rails/Sanity course → CB
│   │   ├── lesson-mapper.ts  # Rails lesson → CB
│   │   ├── event-types.ts    # Migration event types
│   │   └── migration-stream.ts # Durable Streams client
│   └── tui/
│       ├── index.ts          # TUI entry point
│       ├── state.ts          # Reactive state store
│       └── components/       # UI components
├── docker/
│   └── postgres/             # Generated SQL for Docker
├── tests/
│   └── e2e.test.ts           # End-to-end migration test
└── .cache/                   # Cached exports (gitignored)
```

## Data Sources

### Rails PostgreSQL (ALL content)

- 5,132 lessons
- 420 courses (series)
- 627 tags
- 134 instructors
- Canonical for: slugs, titles, durations, states

### Sanity CMS (Modern content only, ~30 courses)

- Rich descriptions (Portable Text → Markdown)
- Collaborators (instructor + guests)
- Software libraries (versioned deps)
- Accessed via GraphQL mock in Docker

### SQLite (Video migration tracker)

- 7,441 videos with Mux playback IDs
- Located at `download-egghead/egghead_videos.db`
- 97.5% coverage (193 gap lessons missing)

## Migration Scripts

### migrate-tags.ts

Migrates 627 tags from Rails to ContentResource type='tag'.

```bash
bun scripts/migrate-tags.ts --dry-run  # Preview
bun scripts/migrate-tags.ts            # Execute
bun scripts/migrate-tags.ts --stream   # With TUI streaming
```

### migrate-courses.ts

Migrates 420 courses, merging Rails + Sanity data.

```bash
bun scripts/migrate-courses.ts --dry-run
bun scripts/migrate-courses.ts
```

### migrate-lessons.ts

Migrates 5,132 lessons with Mux playback IDs from SQLite.

```bash
bun scripts/migrate-lessons.ts --dry-run
bun scripts/migrate-lessons.ts
```

## TUI (Terminal UI)

Real-time migration monitoring via Durable Streams.

```bash
# Start TUI (waits for stream)
bun src/tui/index.ts --run-id my-migration

# In another terminal, run migration with streaming
MIGRATION_RUN_ID=my-migration bun scripts/migrate-tags.ts --stream
```

**Keyboard shortcuts:**

- `q` - Quit
- `Tab` - Switch views (dashboard / errors)

**Note:** TUI requires Durable Streams server on port 8787. Currently a placeholder - streams not yet implemented.

## ID Mapping Tables

For URL redirects (`/lessons/123` → `/posts/xyz`):

```sql
CREATE TABLE _migration_lesson_map (
  rails_id INT PRIMARY KEY,
  cb_id VARCHAR(255) NOT NULL,
  rails_slug VARCHAR(255),
  INDEX idx_cb_id (cb_id),
  INDEX idx_slug (rails_slug)
);

-- Similar for courses, instructors, tags
```

## Testing Strategy

### Unit Tests (fast, always run)

```bash
bun test:unit
```

- Schema validation (Zod parsing)
- Field mapping functions
- ID generation
- Portable text → markdown

### Integration Tests (Docker required)

```bash
bun docker:reset
bun test:integration
```

- Full migration dry-run
- Data verification queries
- Relationship integrity

### E2E Test

```bash
bun test:e2e
```

- Run all migrations
- Verify counts match source
- Verify Mux playback IDs present
- Verify relationships intact

## Environment Variables

```bash
# Rails PostgreSQL (source)
DATABASE_URL=postgres://user:pass@host:5432/egghead

# For Docker development
DATABASE_URL=postgres://postgres:postgres@localhost:5433/egghead_test

# MySQL target (Docker)
MYSQL_URL=mysql://root:root@localhost:3307/coursebuilder_test

# MySQL target (Production - PlanetScale)
# Note: Can use mysql2 driver, don't need @planetscale/database
NEW_DATABASE_URL=mysql://...@aws.connect.psdb.cloud/egghead
```

## Key Decisions

1. **Bun, not Node** - Faster, simpler, built-in test runner
2. **mysql2, not @planetscale/database** - Works with Docker MySQL
3. **Idempotent scripts** - Safe to re-run, uses upsert patterns
4. **ID mapping tables** - Enable URL redirects without changing app code
5. **Dry-run first** - Always preview before executing

## What's NOT Here

- User migration (Phase 1B)
- Entitlements/subscriptions (Phase 1B)
- Stripe webhooks (Phase 2)
- UI components (Phase 5)

This is **content migration only**. Users come after content is verified.
