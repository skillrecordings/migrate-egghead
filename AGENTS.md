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

### Rails PostgreSQL (read-only for analysis)

```bash
cd investigation
pnpm tsx src/queries/subscriptions.ts
```

### Coursebuilder PlanetScale

- Schema in `course-builder/packages/adapter-drizzle/src/lib/mysql/schemas/`

### download-egghead SQLite

- `egghead_videos.db` - courses, lessons, videos, instructors
- Already 97.5% migrated to Mux

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
