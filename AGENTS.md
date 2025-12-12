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
- **420 courses**, **5,132 lessons**
- **97.5% of videos already on Mux**

### Current Phase

Schema design complete. Next: User/Account migration pipeline.

---

## CRITICAL RULES

### 1. DO NOT Create Beads Without Permission

**NEVER** autonomously create new beads, epics, or subtasks. The migration plan is already defined in `migrate-egghead-39p`.

- ✅ Work on existing beads when asked
- ✅ Use `beads_ready()` to see what's next
- ✅ Close beads when work is complete
- ❌ **DO NOT** create new beads without explicit user approval
- ❌ **DO NOT** decompose tasks into subtasks without asking first
- ❌ **DO NOT** use `/swarm` or spawn parallel agents without permission

### 2. Ask Before Major Actions

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
├── .beads/                   # Issue tracking - DO NOT CREATE NEW BEADS
├── course-builder/           # Target platform (submodule)
├── download-egghead/         # Media migration toolkit (SQLite DBs)
├── egghead-next/             # Legacy frontend (submodule) - reference only
├── egghead-rails/            # Legacy backend (submodule) - reference only
├── investigation/            # Effect-TS analysis toolkit
└── reports/                  # Analysis documents
    ├── COURSEBUILDER_SCHEMA_ANALYSIS.md  # Schema mapping (START HERE)
    ├── STRIPE_WEBHOOK_MIGRATION.md
    ├── MIGRATION_DATA_REPORT.md
    └── UI_MIGRATION_ANALYSIS.md
```

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

The migration epic is `migrate-egghead-39p` with 10 subtasks already defined.

```bash
# See what's ready to work on
beads_ready()

# Start working on a task
beads_start(id="migrate-egghead-39p.2")

# When done
beads_close(id="migrate-egghead-39p.2", reason="Completed user migration pipeline")

# Sync changes
beads_sync()
```

**DO NOT** create new beads. Work within the existing structure.

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

## Communication Style

Be direct. This is a complex migration with real production data. When in doubt:

1. State what you understand
2. State what you're unsure about
3. Ask for clarification before proceeding

Don't assume. Don't create work without approval.
