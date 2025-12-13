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
