# Agent Instructions for migrate-egghead

> **Read this first.** This file contains critical context and rules for AI agents working on this migration.

---

## Project Context

We're killing **egghead-rails** AND **egghead-next**, consolidating everything onto **Coursebuilder**.

### The Three Systems

| System            | Role                                               | Fate     |
| ----------------- | -------------------------------------------------- | -------- |
| `egghead-rails/`  | PostgreSQL backend, Stripe webhooks, subscriptions | **KILL** |
| `egghead-next/`   | Next.js frontend, video player, search             | **KILL** |
| `course-builder/` | Target platform (PlanetScale, Inngest, Mux)        | **KEEP** |

### Key Numbers

- **699K users** to migrate
- **3,335 active subscriptions** (all in modern `account_subscriptions` table)
- **2.9M progress records** to migrate
- **427 official courses** (playlists with `visibility_state='indexed'`)
- **~5,025 lessons in courses** + **1,650 standalone lessons**
- **97.5% of videos already on Mux**

> ⚠️ **CRITICAL SCHEMA NOTE**: See `reports/RAILS_SCHEMA_REFERENCE.md` for the authoritative Rails schema documentation.
>
> - Playlists table has 1.37M rows but only 437 are official courses (`visibility_state='indexed'`)
> - Join table is `tracklists` (polymorphic), NOT `playlist_lessons`
> - `series_id` on lessons is DEPRECATED - do not use

### Current Phase

> **🚨 PRIORITY: Complete Phased Content Migration (Phases 3-5) BEFORE anything else.**
>
> We have a logarithmic test scaling approach:
>
> - Phase 1: 5 courses ✅ (curated, tested)
> - Phase 2: 20 courses ✅ (curated, tested)
> - Phase 3: 80 courses ⏳ (algorithmic - IN PROGRESS)
> - Phase 4: 200 courses ⏳ (algorithmic)
> - Phase 5: 420 courses ⏳ (full production)
>
> **DO NOT work on other beads until Phases 3-5 are complete and E2E tests pass.**

**POC complete.** Content migration validated. Now executing Phased Content Migration (Phases 3-5).

### POC Learnings (December 2025)

Key discoveries from migrating 2 courses (Claude Code Essentials + Fix Common Git Mistakes):

| Finding                | Impact               | Resolution                                                         |
| ---------------------- | -------------------- | ------------------------------------------------------------------ |
| Type mismatch          | Queries failed       | Support both `type='course'` AND `type='post' + postType='course'` |
| `'use server'` exports | Schema exports broke | Remove `'use server'` from query files with type exports           |
| Schema strictness      | Validation failed    | Add `.passthrough()` to allow migration metadata fields            |
| `createdById` NOT NULL | Inserts failed       | Use system user ID for migrations                                  |
| 97.5% Mux coverage     | 193 lessons missing  | Mark as retired or backfill                                        |

**Files created during POC:**

- `investigation/poc-migrate-modern-course.ts` - Sanity→CB migration
- `investigation/poc-migrate-legacy-course.ts` - Rails→CB migration
- `investigation/src/lib/migration-utils.ts` - Shared utilities
- `reports/POC_LEARNINGS.md` - Full synthesis

---

## CRITICAL: README.md IS THE SOURCE OF TRUTH

**The README.md defines the migration phases and their order.** Always check it before starting work.

### Phase Execution Order (from README)

```
Phase 0: Minimum Viable Safety     ← CURRENT (epic: phase-0)
  └─ E2E test, Inngest dev server, idempotency columns
  └─ Human Gate: phase-0.4

Phase 1: Data Migration            (epic: phase-1)
  └─ Users, Orgs, Subscriptions, Progress, Content
  └─ Human Gate: phase-1.9

Phase 2: Webhook Handlers          (epic: phase-2)
  └─ Stripe webhooks → Inngest
  └─ Human Gate: phase-2.8

Phase 3: Cron Jobs                 (epic: phase-3)
  └─ Sidekiq → Inngest

Phase 4: External Integrations     (epic: phase-4)
  └─ Customer.io, emails
  └─ Human Gate: phase-4.7

Phase 5: UI Components             (epic: phase-5)
  └─ Video player, search, pricing
  └─ Human Gate: phase-5.9

Phase 6: Cutover                   (epic: phase-6)
  └─ Shadow mode, DNS flip, kill Rails
  └─ Human Gates: phase-6.4, phase-6.7, phase-6.9, phase-6.11
```

**DO NOT skip phases.** Each phase has dependencies and human gates.

---

## CRITICAL RULES

### 1. Follow the Phase Order

**Always check README.md for the current phase.** Work on beads within the current phase only.

- ✅ Check README.md to confirm current phase
- ✅ Work on beads within that phase's epic
- ✅ Wait for human gates before proceeding to next phase
- ❌ **DO NOT** skip ahead to later phases
- ❌ **DO NOT** work on Phase 1 beads while Phase 0 is incomplete

### 2. Beads: Create OK, Auto-Start NOT OK

Agents **can create beads** to track discovered work. Agents **should not auto-start** beads without user direction.

- ✅ Create beads for discovered issues, gaps, or tasks
- ✅ Use `beads_ready()` to see what's available
- ✅ Close beads when work is complete
- ✅ Present options and let user choose what to work on
- ❌ **DO NOT** auto-start beads - wait for user to say "work on X"
- ❌ **DO NOT** use `/swarm` or spawn parallel agents without permission

### 3. Ask Before Major Actions

Before doing any of these, **ask the user first**:

- Creating migration scripts that touch production data
- Modifying Coursebuilder schemas
- Creating new database tables
- Running any destructive operations
- Spawning multiple agents or using swarm

### 3. Investigation vs Execution

**Investigation is safe** - read files, query databases (read-only), analyze schemas.

**Execution requires approval** - writing migration scripts, modifying code, creating PRs.

---

## Repository Layout

```
migrate-egghead/
├── AGENTS.md                 # THIS FILE - read first
├── README.md                 # Project overview and plan
├── LORE.md                   # Project context and history
├── .beads/                   # Issue tracking
├── course-builder/           # Target platform (submodule)
├── download-egghead/         # Media migration toolkit (SQLite DBs)
├── egghead-next/             # Legacy frontend (submodule) - reference only
├── egghead-rails/            # Legacy backend (submodule) - reference only
├── investigation/            # Read-only analysis toolkit (Effect-TS)
├── migration/                # Migration scripts (bun) - THE EXECUTION LAYER
└── reports/                  # Analysis documents
    ├── COURSEBUILDER_SCHEMA_ANALYSIS.md  # Schema mapping (START HERE)
    ├── STRIPE_WEBHOOK_MIGRATION.md
    ├── MIGRATION_DATA_REPORT.md
    └── UI_MIGRATION_ANALYSIS.md
```

---

## The `migration/` Directory (Control Plane)

**This is where the actual migration happens.** Everything else is analysis. This is action.

### Philosophy

> "If we can get the DATA locked down and pristine, the UI is easy af."

Focus on data correctness. The UI (course-builder/apps/egghead) comes later.

### Structure

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
│   │   ├── *-mapper.ts       # Field mapping (Rails → CB)
│   │   └── event-types.ts    # Migration event types
│   └── tui/                  # Terminal UI for monitoring
├── tests/
│   └── e2e.test.ts           # End-to-end migration test
└── docker/                   # Generated SQL for Docker
```

### Docker Stack

```bash
bun docker:reset     # Start/reset all containers (uses cache)
bun docker:reset --live  # Re-export from production
```

| Service     | Port | Purpose                    |
| ----------- | ---- | -------------------------- |
| PostgreSQL  | 5433 | Rails source (read-only)   |
| MySQL       | 3307 | Coursebuilder target       |
| Sanity Mock | 4000 | GraphQL for modern courses |

### Migration Scripts

Each script has:

- `--dry-run` flag for preview
- `--stream` flag for TUI integration
- Unit tests in same directory

```bash
# Always dry-run first!
bun scripts/migrate-tags.ts --dry-run
bun scripts/migrate-courses.ts --dry-run
bun scripts/migrate-lessons.ts --dry-run

# Then execute
bun scripts/migrate-tags.ts
bun scripts/migrate-courses.ts
bun scripts/migrate-lessons.ts
```

### Database Connections in migration/

```typescript
// Rails PostgreSQL (source)
import { railsDb, closeAll } from "./src/lib/db";
const lessons = await railsDb`SELECT * FROM lessons LIMIT 10`;

// MySQL (target) - use mysql2, NOT @planetscale/database
import mysql from "mysql2/promise";
const conn = await mysql.createConnection({
  host: "localhost",
  port: 3307,
  user: "root",
  password: "root",
  database: "coursebuilder_test",
});
```

**Important**: Use `mysql2` for Docker compatibility. The `@planetscale/database` client only works with PlanetScale's HTTP API.

### Test Commands

```bash
bun test              # All tests (98 passing)
bun test:unit         # Unit tests only (fast)
bun test:integration  # Integration tests (needs Docker)
bun test:e2e          # E2E migration verification
```

---

## Tooling: Use Bun

**All migration scripts use bun.** Not tsx, not node, not pnpm.

```bash
# In migration/ directory
bun add <package>           # Add dependencies
bun run scripts/foo.ts      # Run scripts
bun test                    # Run tests
```

When creating new packages or scripts:

- Use `bun init` to initialize
- Use `bun add` to install dependencies
- Never manually write package.json - let bun manage it
- Use the `postgres` package for database access (simpler than Effect SQL for scripts)

---

## Key Documents

Read these before starting work:

1. **README.md** - Overall plan, phases, key decisions
2. **reports/COURSEBUILDER_SCHEMA_ANALYSIS.md** - Rails→Coursebuilder schema mapping
3. **reports/UI_MIGRATION_ANALYSIS.md** - UI gaps and redirect strategy

---

## Design Principles

From the README - follow these:

- **shadcn/ui centric** - Use shadcn components, not complex egghead-next patterns
- **Cut the cruft** - Don't port complexity, rebuild with simplicity
- **No 404s** - Every legacy URL gets a redirect
- **Sitemap preservation** - SEO is critical

---

## Technical Decisions (Already Made)

| Decision          | Choice                     | Rationale                 |
| ----------------- | -------------------------- | ------------------------- |
| Video player      | Coursebuilder's Mux player | Not xstate complexity     |
| Progress tracking | Build new in CB            | Clean break, migrate data |
| Search            | Same Typesense, new UI     | Port InstantSearch        |
| Instructor pages  | One dynamic route          | Not 20+ hardcoded         |
| Team features     | Defer post-launch          | Complex, few users        |
| State management  | React state                | Not xstate                |

---

## Beads Workflow

The migration uses **human-readable phase-aligned IDs**: `phase-0`, `phase-1`, etc.

```bash
# See what's ready to work on
beads_ready()

# Start working on a task
beads_start(id="migrate-egghead-phase-0.1")

# When done
beads_close(id="migrate-egghead-phase-0.1", reason="E2E test passing")

# Sync changes
beads_sync()
```

**Bead ID Format**: `migrate-egghead-phase-{N}.{subtask-number}`

Examples:

- `migrate-egghead-phase-0` - Phase 0 epic
- `migrate-egghead-phase-0.1` - First subtask of Phase 0
- `migrate-egghead-phase-1.9` - Human gate for Phase 1

---

## Database Access

### Three Databases

| Database                                      | Connection                                 | Purpose                                           |
| --------------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| Rails PostgreSQL                              | `DATABASE_URL` in `investigation/.env`     | Source of truth for users, subscriptions, lessons |
| Coursebuilder PlanetScale                     | `NEW_DATABASE_URL` in `investigation/.env` | Target database, tables prefixed `egghead_`       |
| SQLite (`download-egghead/egghead_videos.db`) | Direct file access                         | Mux video migration tracker                       |

### Rails PostgreSQL (read-only for analysis)

```bash
cd investigation
pnpm tsx src/queries/subscriptions.ts
pnpm tsx src/queries/content-structure.ts
```

Uses Effect-TS SQL client. See `investigation/src/lib/db.ts`.

### Coursebuilder PlanetScale

```bash
cd investigation
pnpm tsx src/queries/ping-mysql.ts
```

Uses Effect-TS SQL client. See `investigation/src/lib/mysql.ts`.

**Important**: Tables are prefixed with `egghead_` (e.g., `egghead_ContentResource`, `egghead_User`).

Current state:

- 391 `videoResource` records (new uploads via Coursebuilder)
- 369 `post` records (lessons created in CB)
- No `lesson` type yet - lessons are `post` type in CB

### download-egghead SQLite (Mux Migration Tracker)

```bash
cd download-egghead
sqlite3 egghead_videos.db "SELECT COUNT(*) FROM videos WHERE mux_asset_id IS NOT NULL"
```

**This is canonical for OLD video migrations** (lesson ID ≤ 10388).

Tables:

- `videos` - 7,634 records, 7,441 with `mux_asset_id`
- `lessons` - 5,132 records (links to videos via `video_id`)
- `courses` - 420 records
- `instructors` - 134 records
- `tags` - 627 records

**Video Migration Status**:
| State | Count | Notes |
|-------|-------|-------|
| `updated` | 6,764 | Has `mux_asset_id` ✅ |
| `no_srt` | 677 | On Mux but missing subtitles |
| `missing_video` | 193 | Source file not found |

### Video Source Timeline

| Era                    | Lesson IDs    | Video Source           | Mux Status                 |
| ---------------------- | ------------- | ---------------------- | -------------------------- |
| Ancient (Wistia)       | 1 - ~4425     | Wistia                 | Migrated to Mux via SQLite |
| Middle (CloudFront)    | ~4426 - 10388 | Homebrew S3/CloudFront | Partially in SQLite        |
| Modern (Coursebuilder) | 10685+        | Direct Mux upload      | Already on Mux             |

**Cutoff**: Around October 2024 (ID ~10685), new lessons started going directly to Mux via Coursebuilder.

### Querying Tips

```typescript
// Rails PostgreSQL
import { runWithDb } from "./src/lib/db.js";

// Coursebuilder MySQL
import { runWithMysql } from "./src/lib/mysql.js";

// SQLite (direct)
import sqlite3 from "sqlite3";
const db = new sqlite3.Database("./egghead_videos.db");
```

---

## Testing Strategy (TDD for Migrations)

### The Control Plane Concept

A proper migration control plane has three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                     MIGRATION CONTROL PLANE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Unit Tests (fast, run always)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • Schema validation (Zod parsing)                          │ │
│  │ • Field mapping functions                                  │ │
│  │ • ID generation                                            │ │
│  │ • Portable text → markdown conversion                      │ │
│  │ Run: pnpm test (< 5 seconds)                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Layer 2: Integration Tests (Docker, run before migration)      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • Rails PostgreSQL container (source)                      │ │
│  │ • MySQL container (target, simulates PlanetScale)          │ │
│  │ • SQLite (Mux video tracker)                               │ │
│  │ • Full migration dry-run against containers                │ │
│  │ Run: pnpm test:integration (< 2 minutes)                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Layer 3: E2E Verification (post-migration)                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • UI routes render (browser automation)                    │ │
│  │ • Video playback works (Mux HLS)                           │ │
│  │ • Course→lesson navigation                                 │ │
│  │ • Count reconciliation (Rails vs CB)                       │ │
│  │ Run: pnpm test:e2e (against dev server)                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Docker Compose for Integration Tests

```yaml
# docker-compose.test.yml (TO BE CREATED)
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: egghead_test
    volumes:
      - ./test-fixtures/rails-seed.sql:/docker-entrypoint-initdb.d/seed.sql

  mysql:
    image: mysql:8
    environment:
      MYSQL_DATABASE: coursebuilder_test
    volumes:
      - ./test-fixtures/cb-schema.sql:/docker-entrypoint-initdb.d/schema.sql
```

### Test-First Migration Pattern

Before migrating any entity type:

1. **Write the test first** - Define expected output for known input
2. **Run against containers** - Verify with isolated test data
3. **Run against dev** - Verify with real data subset
4. **Run against prod** - Full migration with rollback plan

### Current Test Coverage

| Layer             | Status    | Location                                            |
| ----------------- | --------- | --------------------------------------------------- |
| Unit tests        | ❌ TODO   | `investigation/src/__tests__/`                      |
| Integration tests | ❌ TODO   | `investigation/docker-compose.test.yml`             |
| E2E verification  | ✅ Manual | Browser automation via `next-devtools_browser_eval` |

**Next bead to create**: `ntu.0` - Set up migration test infrastructure

---

## What You CAN Do Without Asking

- Read and analyze code in any submodule
- Query databases (read-only)
- Update documentation and reports
- Work on the current in-progress bead
- Close completed beads
- Run the investigation toolkit

## What You MUST Ask Before Doing

- Creating new beads or epics
- Spawning swarm agents
- Writing migration scripts
- Modifying Coursebuilder code
- Creating database migrations
- Any destructive operations
- Creating PRs

---

## Migration Patterns (From the Lore)

These patterns come from the indexed PDF library. **Query pdf-brain when you hit these situations.**

### Strangler Fig Pattern (Newman - Building Microservices)

> "Inspired by a type of plant, the pattern describes the process of wrapping an old system with the new system over time, allowing the new system to take over more and more features of the old system incrementally."

**When to use**: We're doing this. Rails is the fig tree being strangled. Coursebuilder wraps it.

**Key insight**: Route by route, feature by feature. Never big bang.

```
pdf-brain_search(query="strangler fig pattern incremental migration")
```

### Expand/Contract Pattern (Ambler - Refactoring Databases)

> "The transition period is the time during which both the old and new schema exist simultaneously."

**The three phases**:

1. **Expand**: Add new column/table, keep old one
2. **Migrate**: Copy data, run both in parallel with sync triggers
3. **Contract**: Remove old column/table after transition period

**When to use**: Any schema change. We're doing this with the mapping tables (`_migration_*_map`).

```
pdf-brain_search(query="transition period deprecation synchronization trigger")
```

### Synchronization Triggers (Ambler)

> "Prefer triggers over views or batch synchronization... triggers run in production during the transition period to keep the two columns in sync."

**When to use**: CDC (Change Data Capture) from Rails → Coursebuilder. Already planned in bead `5qr`.

```sql
-- Example from Ambler
CREATE TRIGGER SynchronizeFirstName
BEFORE INSERT OR UPDATE ON Customer
FOR EACH ROW
BEGIN
  IF :NEW.FirstName != :OLD.FirstName THEN
    :NEW.FName := :NEW.FirstName;
  END IF;
END;
```

### Parallel Run (Newman)

> "When switching from functionality provided by an existing tried and tested application architecture to a fancy new microservice-based one, there may be some nervousness..."

**The pattern**: Run both systems, compare outputs, alert on divergence.

**When to use**: Phase 6 (Cutover). Shadow mode before DNS flip.

```
pdf-brain_search(query="parallel run shadow mode verification")
```

### Circuit Breaker (Nygard - Release It!)

> "Circuit Breaker is the fundamental pattern for protecting your system from all manner of Integration Points problems."

**States**: Closed (normal) → Open (failing, fast-fail) → Half-Open (testing recovery)

**When to use**: Any integration point. Stripe webhooks, Customer.io, external APIs.

```typescript
// Inngest has this built-in via retries + backoff
// But for direct calls, implement circuit breaker
```

```
pdf-brain_search(query="circuit breaker integration point cascade failure")
```

### Timeouts + Cascading Failures (Nygard)

> "Integration Points without Timeouts is a surefire way to create Cascading Failures."

**Rule**: Every external call needs a timeout. Every. Single. One.

**When to use**: Always. Especially Rails→CB sync, Stripe API, Mux API.

```
pdf-brain_search(query="timeout integration point cascade failure recovery")
```

### Bulkheads (Nygard)

> "Partitioning servers, with Bulkheads, can prevent Chain Reactions from taking out the entire service."

**When to use**: Isolate migration workloads from production traffic. Don't let a migration batch job starve the API.

### Idempotency + Retry with Backoff (Kleppmann - DDIA)

> "Use exponential backoff, and handle load-related errors differently from other errors."

**Pattern**:

```typescript
const backoff = (attempt: number) =>
  Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
```

**When to use**: All migration scripts. All webhook handlers. All async jobs.

```
pdf-brain_search(query="idempotent retry backoff exponential jitter")
```

### Four Golden Signals (Google SRE)

> "The four golden signals of monitoring are latency, traffic, errors, and saturation."

**During migration, monitor**:

1. **Latency**: Migration script batch time
2. **Traffic**: Records/second migrated
3. **Errors**: Failed records, rollback triggers
4. **Saturation**: DB connection pool, memory usage

```
pdf-brain_search(query="monitoring alerting SLI SLO golden signals")
```

### Feature Toggles / Dark Launching (Newman)

> "You can use feature toggles in a more fine-grained manner, perhaps allowing a flag to be set for specific users."

**When to use**: Phase 6. Route some users to CB while others stay on Rails.

```
pdf-brain_search(query="feature toggle dark launching canary release")
```

---

## Pattern Triggers (For Agents)

When you encounter these situations, **query pdf-brain for deeper guidance**:

| Situation                   | Pattern to Query                            |
| --------------------------- | ------------------------------------------- |
| Adding new column/table     | `expand contract pattern database schema`   |
| Keeping two systems in sync | `synchronization trigger transition period` |
| External API integration    | `circuit breaker timeout cascade failure`   |
| Batch job design            | `idempotent retry backoff exponential`      |
| Cutover planning            | `parallel run shadow mode canary`           |
| Schema evolution            | `schema evolution backward compatible`      |
| Monitoring setup            | `golden signals SLI SLO alerting`           |
| Failure handling            | `bulkhead circuit breaker fail fast`        |

---

## Database Refactoring Catalog (Ambler)

Reference these when making schema changes. Each has a transition period pattern.

### Structural Refactorings

| Refactoring          | When to Use                   | Query                                   |
| -------------------- | ----------------------------- | --------------------------------------- |
| **Introduce Column** | Adding new field              | `introduce column transition period`    |
| **Rename Column**    | Fixing naming                 | `rename column synchronization trigger` |
| **Drop Column**      | Removing unused               | `drop column deprecation period`        |
| **Move Column**      | Denormalization/normalization | `move column foreign key`               |
| **Split Column**     | Breaking apart composite      | `split column synchronization`          |
| **Merge Columns**    | Combining related             | `merge columns transition`              |
| **Split Table**      | Breaking monolith table       | `split table foreign key`               |
| **Merge Tables**     | Combining related             | `merge tables transition`               |
| **Introduce Table**  | New entity                    | `introduce table`                       |
| **Drop Table**       | Removing unused               | `drop table deprecation`                |

### Data Quality Refactorings

| Refactoring                       | When to Use             | Query                        |
| --------------------------------- | ----------------------- | ---------------------------- |
| **Introduce Surrogate Key**       | Adding synthetic PK     | `introduce surrogate key`    |
| **Add Foreign Key**               | Enforcing relationships | `add foreign key constraint` |
| **Introduce Soft Delete**         | Audit trail             | `introduce soft delete`      |
| **Introduce Trigger For History** | Change tracking         | `trigger history audit`      |

### Key Principle: Transition Period

Every refactoring has three phases:

1. **Start**: Add new structure, keep old
2. **Transition**: Both exist, sync via triggers
3. **End**: Remove old structure

**Never skip the transition period.** External apps need time to migrate.

---

## Communication Style

Be direct. This is a complex migration with real production data. When in doubt:

1. State what you understand
2. State what you're unsure about
3. Ask for clarification before proceeding

Don't assume. Don't create work without approval.
