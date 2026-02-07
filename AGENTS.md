# LOAD THE `migrate-egghead` SKILL NOW

Every session. No exceptions.

Skill path: `.agents/skills/migrate-egghead`

Prime directive: **IMPROVE THE CLI** for agents (`tools/me.ts`). It is agent-only. Period.

---

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

> **✅ CONTENT MIGRATION COMPLETE** (Dec 15, 2025)
>
> All courses and lessons migrated to Coursebuilder:
>
> - **423 courses** migrated
> - **11,001 lessons** migrated
> - **10,337 videoResources** linked
> - **369 CB-published posts** preserved (take precedence)
> - **Vercel build passing** - 751 static pages
>
> Migration scripts are now **idempotent** - safe to re-run.

**Next:** Human gate review, then proceed to user/subscription migration.

### Interim Strategy: Direct Postgres Access from egghead-next (Feb 2026)

> **See [migrate-egghead#17](https://github.com/skillrecordings/migrate-egghead/issues/17) for the full plan.**

While the Coursebuilder migration progresses phase-by-phase, we have a faster strangler fig play: **egghead-next can bypass Rails entirely and hit Postgres directly.** This kills massive chunks of Rails traffic immediately without waiting for the full CB migration.

**The math:**
- `getLessonComments` + `getLesson` = **88.5% of all GraphQL traffic** (166K ops/day)
- `UsersController#current` = **55% of all REST traffic** (18K reqs/day)
- All are pure DB reads — no complex business logic preventing direct access

**How it works:**
```typescript
// egghead-next already has this in src/db/index.ts
import { pgQuery } from '@/db'

// Instead of: GraphQL → Rails → ActiveRecord → Postgres → back through Rails
// Do this:    pgQuery → Postgres → done
export async function getLessonComments(slug: string) {
  const { rows } = await pgQuery(`
    SELECT c.id, c.comment, c.created_at, c.reply_to_id,
           CONCAT(u.first_name, ' ', u.last_name) as user_name, u.avatar_url
    FROM comments c
    JOIN lessons l ON l.id = c.commentable_id AND c.commentable_type = 'Lesson'
    JOIN users u ON u.id = c.user_id
    WHERE l.slug = $1 AND c.state = 'published'
    ORDER BY c.created_at ASC
  `, [slug])
  return rows
}
```

**Rules:** Raw parameterized SQL, no ORM. Wrap with `unstable_cache` for Next.js caching. Use the `/code-path-migrator` skill for the full workflow.

**Priority queue (from Axiom, Feb 5 2026):**

| # | Code Path | Traffic/Day | Kill Impact |
|---|-----------|------------|-------------|
| 1 | `getLessonComments` (GraphQL) | 83,688 | 44.6% of all GraphQL |
| 2 | `getLesson` (GraphQL) | 82,372 | 43.9% of all GraphQL |
| 3 | `UsersController#current` (REST) | 18,005 | 55% of all REST |
| 4 | `LessonsController#transcript` (REST) | 5,836 | Content delivery |
| 5 | `LessonsController#subtitles` (REST) | 4,105 | Content delivery |

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

### Dec 15, 2025 Incident: Duplicate Content

**Problem:** Vercel builds failed with route conflicts after content migration.

**Three types of duplicates found:**

1. **Same slug, different types** (lesson vs post) - 264 records
2. **Same slug, same type** (migration ran twice) - 438 courses
3. **Different slug, same hash suffix** (LIKE %hash matches both) - 3 lessons

**Resolution:**

- Deleted duplicates (CB-published content takes precedence)
- Updated `migrate-courses.ts` and `migrate-lessons.ts` with idempotency checks
- Fixed `get-post.ts` query to filter by `type='post'`

**Key Insight:** ID patterns reveal origin:

- `post_xxxxx` = CB-published (Coursebuilder native)
- Random 24-char cuid = Migration-created

See `LORE.md` for full incident documentation.

---

## Production Reality (from Axiom, Feb 5 2026)

The instrumentation in egghead-rails tells us exactly what the app does. **It does 4 things:**

### 1. Lesson Viewer (88.5% of GraphQL)
- `getLessonComments`: 83,688 ops/day (44.6%)
- `getLesson`: 82,372 ops/day (43.9%)
- Both are pure Postgres reads. No business logic. Direct DB access kills them.

### 2. Auth Check (55% of REST)
- `UsersController#current`: 18,005 reqs/day
- Checks `authentication_token`, returns user profile. Cookie/token based.

### 3. Pricing Engine (~1K/day REST)
- PPP (Purchasing Power Parity) checks via CDN geo headers + Stripe coupon lookups
- 8,053 Stripe API calls/day (down from 17K — coupon caching at 93.9% hit rate)
- 17 PPP coupon errors/day (down from 63 — still Stripe InvalidRequestError residual)

### 4. Content Pipeline (3 workers, ~2,400 events/day)
- `SyncLessonEnhancedTranscriptFromGithubWorker`: 2,158/day
- `LessonPublishWorker`: 129/day
- `SyncPodcastsWorker`: 129/day

**Everything else is long tail.** 21 of 96 workers are alive. The other 75 are dead code.

### Key Metrics (Updated Feb 6, 2026)
- **618K total events/day** (331K structured)
- **GraphQL:REST ratio:** 5.7:1
- **Error rate:** ~66 real incidents/day (PPP down 73%, Stripe caching live)
- **Active workers:** 21 of 96 (~22%)
- **Stripe coupon cache hit rate:** 93.9%

> See `egghead-rails/MEMORIES.md` for full baselines and institutional memory.

---

## Frontend Reality (from Axiom Vercel dataset, Feb 6 2026)

The Vercel `vercel` dataset contains egghead-next frontend logs. Filter: `request.host startswith "egghead.io"`.

**21K frontend requests/day generate 618K backend events — an 80x amplification factor.**

### The Cache Catastrophe

**80% of all Vercel requests are cache MISSes.** Core pages have zero cache hits:

| Route | Traffic/2h | Cache HIT | Avg Latency | P95 Latency |
|-------|-----------|-----------|-------------|-------------|
| `/courses/[course]` | 4,450 | **0** | **3,828ms** | **7,046ms** |
| `/q/[[...all]]` (search) | 5,944 | 10 | — | — |
| `/lessons/[slug]` | 1,766 | **0** | 642ms | 1,391ms |
| `/api/trpc/[trpc]` | 1,389 | **0** | — | — |
| `/api/pricing` | 862 | **0** | 442ms | 668ms |

Course pages are **3.8 seconds average, 7 seconds at p95**. Every page view generates cold lambda → Rails API → Stripe API waterfall.

### The 5 Things the Frontend Does

1. **Search & Browse** — `/q/[[...all]]` is #1 route (5,944/2h), all uncached
2. **Course Pages** — `/courses/[course]` #2 (4,450/2h), 3.8s avg, 500ing (16/2h)
3. **Lesson Pages** — `/lessons/[slug]` #3 (1,766/2h), 642ms avg
4. **tRPC Batches** — Feature flag checks + data fetches (1,389/2h)
5. **CIO Subscriber Sync** — `/api/cio-subscriber` (927/2h), **11% error rate**

### tRPC Feature Flag Tax

Every page load fires a batched tRPC call with **6 duplicate feature flag checks**:
- `featureFlagLifetimeSale`, `featureFlagCursorWorkshopSale` ×3, `featureFlagClaudeCodeWorkshopSale` ×2
- 46% of all tRPC calls are JUST these flags with no other data
- Flags come from Vercel Edge Config (`src/lib/feature-flags.ts`)

### `/api/cio-subscriber` is Broken

100 of 927 requests return 500 in 2h (**11% error rate**). Endpoint:
- Fetches egghead user from Rails (`/api/v1/users/current?minimal=true`)
- Updates Customer.io tracking API
- Retrieves CIO attributes + sets cookie
- **File:** `src/pages/api/cio-subscriber.ts`

### Frontend Error Budget (2h sample)

| Route | 500s | Notes |
|-------|------|-------|
| `/api/cio-subscriber` | 100 | CIO API or Rails auth failure |
| `/courses/[course]` | 16 | Rails API timeout? |
| `/api/trpc/[trpc]` | 16 | Various tRPC failures |
| `/blog/*` | 6 | ISR revalidation failures |
| `/api/pricing` | 4 | Rails pricing + Stripe cascade |

### Frontend Architecture (egghead-next key files)

| Purpose | Path |
|---------|------|
| tRPC router | `src/server/routers/_app.ts` |
| tRPC endpoint | `src/app/api/trpc/[trpc]/route.ts` |
| CIO subscriber | `src/pages/api/cio-subscriber.ts` |
| Pricing proxy | `src/app/api/pricing/route.ts` |
| Feature flags | `src/lib/feature-flags.ts` |
| Feature flag router | `src/server/routers/feature-flag.ts` |
| Next.js config | `next.config.mjs` |

### Traffic Regions

Singapore 37% > Frankfurt 21% > Virginia 19%. Asia-Pacific dominates — cross-region latency to US Rails backend on every uncached request.

> **Tracking:** [migrate-egghead#21](https://github.com/skillrecordings/migrate-egghead/issues/21)

---

## Axiom Observability Tooling

Production logs flow: Rails → CloudWatch → Axiom (`egghead-rails` dataset).

### log-beast CLI

Quick Axiom queries via `~/Code/skillrecordings/log-beast` (Bun-based). Repo: https://github.com/skillrecordings/log-beast (private).

```bash
alias log-beast='bun run ~/Code/skillrecordings/log-beast/src/cli.ts'

# Backend (egghead-rails dataset)
log-beast dashboard        # Full health overview
log-beast overview         # Event breakdown
log-beast errors -h 24     # Errors over 24 hours
log-beast workers -h 720   # Worker activity over 30 days
log-beast stripe           # Stripe API call breakdown
log-beast traffic -h 24    # 24h traffic histogram
log-beast health           # Worker success/failure rates
log-beast live             # Real-time errors (last 15 min)

# Frontend (vercel dataset, egghead.io)
log-beast frontend         # Full frontend dashboard (routes, cache, errors)
log-beast frontend-errors  # 500 errors by route
log-beast frontend-cache   # Cache HIT/MISS/STALE by route
log-beast frontend-perf    # Lambda duration (avg, p95) by route
log-beast frontend-regions # Traffic by Vercel edge region

# Custom
log-beast raw '<APL>'      # Custom APL query
```

**Agent-first prime directive:** keep `log-beast` optimized for agents, not humans. If new structured events land in production, add/refresh `log-beast` commands in the same PR so agents can query them directly without hand-writing APL every time.

### Structured Log Story Query Pack (24h)

Use this pack whenever evaluating frontend/backend performance stories after a deploy:

```bash
# Core baseline (frontend + backend)
log-beast frontend
log-beast dashboard

# Drill into structured event families (replace EVENT_NAME)
log-beast raw '["vercel"] | where ["request.host"] startswith "egghead.io" and ["vercel.source"] == "lambda" and ["message"] startswith "{" | extend msg=parse_json(["message"]) | where tostring(msg.event) == "EVENT_NAME" | extend duration_ms=todouble(msg.duration_ms) | extend is_error=isnotnull(msg.error_message) or isnotnull(msg.error) or tostring(msg.ok) == "false" | summarize calls=count(), avg_ms=avg(duration_ms), p95_ms=percentile(duration_ms, 95), errors=countif(is_error)'

# Confirm search cache efficacy
log-beast raw '["vercel"] | where ["request.host"] startswith "egghead.io" and ["vercel.source"] == "lambda" and ["message"] startswith "{" | extend msg=parse_json(["message"]) | where tostring(msg.event) == "search_ssr_cache" | summarize hits=countif(tostring(msg.status) == "hit"), misses=countif(tostring(msg.status) == "miss"), total=count() | extend hit_rate=100.0 * todouble(hits) / todouble(total)'
```

Event names worth tracking continuously:
- `lesson.loadLesson.summary`
- `lesson.loadLessonMetadataFromGraphQL.graphql`
- `lesson.loadLessonComments.graphql`
- `course.loadPlaylist.summary`
- `course.loadResourcesForCourse.summary`
- `trpc.call`
- `lesson.trpc.getLessonbySlug.result`
- `search_ssr_cache`

When you find a new hot path:
1. Add/verify structured fields in app code.
2. Add or update a `log-beast` command to expose it.
3. Open/update GitHub issues with exact event names and 24h metrics.

Requires `AGENT_AXIOM_TOKEN` env var.

### Two Axiom Datasets

| Dataset | Source | Filter | Content |
|---------|--------|--------|---------|
| `egghead-rails` | CloudWatch | Fields prefixed `unknown.*` | Rails backend (API, workers, Stripe) |
| `vercel` | Vercel integration | `request.host startswith "egghead.io"` | Next.js frontend (routes, cache, vitals) |

### Raw APL Queries

```bash
curl -s -X POST "https://api.axiom.co/v1/datasets/_apl?format=legacy" \
  -H "Authorization: Bearer $AGENT_AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apl": "[\"egghead-rails\"] | where [\"unknown.event\"] == \"graphql.execute\" | summarize count() by [\"unknown.operation_name\"]",
    "startTime": "2026-02-04T00:00:00Z",
    "endTime": "2026-02-05T00:00:00Z"
  }'
```

**APL gotchas:**
- Fields prefixed with `unknown.*` (CloudWatch integration artifact)
- Use bracket notation: `['unknown.event']`, `['unknown.operation_name']`
- Duration fields are strings — can't aggregate avg/p95

### Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `AGENT_AXIOM_TOKEN` | `~/.zshrc` | Axiom API access |
| `AGENT_AXIOM_DATASET` | `~/.zshrc` | Dataset name (`egghead-rails`) |

### Vercel CLI

egghead-next deploys to Vercel under the **eggheadio** org (NOT skillrecordings).

```bash
# Link the project (one-time, creates .vercel/)
cd egghead-next && vercel link
# Scope: eggheadio, Project: egghead-io-nextjs

# All commands need --scope eggheadio (or run from linked dir)
vercel ls --scope eggheadio              # List recent deployments
vercel inspect <url> --scope eggheadio   # Deployment details (status, build time, aliases)
vercel logs <url> --scope eggheadio      # Build + runtime logs
vercel env ls --scope eggheadio          # List env vars
vercel env add <KEY> preview             # Add env var to preview deployments
vercel redeploy <url> --scope eggheadio  # Retrigger a deployment
```

**Gotchas:**
- **NEVER use `gh api repos/.../deployments` to check deploy status** — GitHub Deployments API labels Vercel deploys incorrectly (shows "Preview" for production). Always use `vercel ls --prod --scope eggheadio` as the source of truth.
- The org uses SAML — you may need to re-authenticate periodically (`vercel login --scope eggheadio`)
- Deployment URLs use the format `egghead-io-nextjs-<hash>-eggheadio1.vercel.app`
- Deployment IDs use `dpl_` prefix but CLI accepts the URL hostname too
- `CYPRESS_INSTALL_BINARY=0` is set on preview env to skip Cypress binary download (ancient 6.9.1 dep, flaky CDN)
- The `.vercel` directory is gitignored
- `Previous build caches not available` on preview deploys is normal — Vercel only caches production builds

### agent-browser (Browser Automation)

Use `agent-browser` for smoke testing deploys, verifying UI state, and checking response headers.

```bash
# Navigate and get interactive elements (prefer -i to reduce context)
agent-browser open <url>
agent-browser snapshot -i              # Interactive elements only — ALWAYS prefer this

# Check cache headers
agent-browser eval "await fetch(window.location.href).then(r => Object.fromEntries(r.headers))"

# Verify page renders
agent-browser screenshot path.png      # Save screenshot
agent-browser get title                # Page title
agent-browser get text @e1             # Element text by ref

# Console errors (pre-existing noise is expected)
agent-browser console                  # View console messages
agent-browser errors                   # View page errors
```

**Rules:**
- **Always use `snapshot -i`** (interactive elements only) — full snapshots dump massive DOM trees and burn context
- Use `snapshot -s "#selector"` to scope to specific sections when needed
- Close the browser when done: `agent-browser close`

### Preview Deploy Smoke Test SOP

Run this after every preview deploy to catch regressions before merging. Uses `agent-browser` + `curl`.

#### 1. Confirm deploy is ready

```bash
vercel ls --scope eggheadio | head -5   # Look for ● Ready on your branch
```

If still building, wait. Don't smoke test a build in progress.

#### 2. Critical pages (render check)

Open each page, verify it doesn't white-screen or throw a client-side error.

```bash
PREVIEW="https://egghead-io-nextjs-<hash>-eggheadio1.vercel.app"

agent-browser open "$PREVIEW"
agent-browser snapshot -i                              # Homepage renders?
agent-browser open "$PREVIEW/courses/the-beginner-s-guide-to-react"
agent-browser snapshot -i                              # Course page renders?
agent-browser open "$PREVIEW/lessons/react-a-beginners-guide-to-react-introduction"
agent-browser snapshot -i                              # Lesson page + video player?
agent-browser open "$PREVIEW/q/react"
agent-browser snapshot -i                              # Search results + facets?
```

**Pages to hit:**

| Page | Route | What to check |
|------|-------|---------------|
| Homepage | `/` | Hero, course cards load |
| Course | `/courses/<slug>` | Title, lesson list, instructor |
| Lesson | `/lessons/<slug>` | Video player present, title |
| Search | `/q/<term>` | Facets sidebar, result cards |
| Pricing | `/pricing` | Plans render (needs Stripe env var) |

#### 3. Cache headers (CDN validation)

Hit the same page twice — second request should be a cache HIT.

```bash
# First request warms the cache
curl -sI "$PREVIEW/courses/the-beginner-s-guide-to-react" | grep -i 'x-vercel-cache'
# → x-vercel-cache: MISS (expected)

# Second request should HIT
curl -sI "$PREVIEW/courses/the-beginner-s-guide-to-react" | grep -i 'x-vercel-cache'
# → x-vercel-cache: HIT (confirms s-maxage is working)
```

If second request is still MISS: check `Cache-Control` header — `s-maxage=0` or `private` means no CDN caching.

#### 4. Console errors

```bash
agent-browser console
agent-browser errors
```

**Known noise (ignore):**
- `course undefined` logs — pre-existing, harmless
- Algolia `userToken` warning — cosmetic
- Hydration mismatches on timestamps — SSR/client time skew

**Red flags (investigate):**
- Uncaught TypeError / ReferenceError — broken component
- 500 responses in network — API route crashing
- `ChunkLoadError` — build artifact mismatch
- `NEXT_REDIRECT` in console — broken redirect loop

#### 5. API spot-check

```bash
# cio-subscriber (was 11% error rate, should be fixed)
curl -s "$PREVIEW/api/cio-subscriber" | head -20

# tRPC health (should respond, not 500)
curl -sI "$PREVIEW/api/trpc/healthcheck" | head -5
```

#### 6. Cleanup

```bash
agent-browser close
```

#### Pass/Fail Criteria

| Check | Pass | Fail |
|-------|------|------|
| All 4 pages render | Content visible, no white screen | Blank page, error boundary, hydration crash |
| Cache headers | `x-vercel-cache: HIT` on second request | Persistent MISS or `s-maxage=0` |
| Console errors | Only known noise | New uncaught exceptions or 500s |
| API routes | 200 or expected 4xx | 500 or timeout |

If any check fails: don't merge. Debug with `/vercel-debug`, check `vercel logs <url> --scope eggheadio`.

---

## Linear Integration (skill-cli)

The EGG team in Linear tracks user-reported bugs and support tickets.

```bash
skill-cli linear issues --team EGG --status "In Progress"
skill-cli linear issues --team EGG --status "Backlog" --priority urgent
skill-cli linear issues --team EGG --status "Todo"
```

**Key clusters (Feb 2026):** Auth/login failures (EGG-413, EGG-412), payment/paywall bugs (EGG-415, EGG-387), and PPP errors.

### Where to File What

| Tracker | Purpose | Example |
|---------|---------|---------|
| **Linear EGG** | User-reported bugs, support tickets | "Can't log in", "Paywall bug" |
| **GitHub egghead-rails** | Security CVEs, internal bugs | "#5295 security gem upgrades" |
| **GitHub migrate-egghead** | Migration discoveries, strategy | "#17 Direct Postgres strategy" |

---

## Available Skills

### In this repo (`migrate-egghead/.claude/skills/`)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/code-path-migrator` | "migrate endpoint", "port resolver", "rawdog postgres" | Trace Rails code path → generate raw SQL TS function for egghead-next |
| `/vercel-deploy` | "deploy", "vercel", "build failed", "redeploy" | Manage Vercel deployments, debug build failures, env vars (eggheadio org) |

### Global (`~/.claude/skills/`)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/vercel-debug` | "build failed", "500 on vercel", "cache miss", "why is this slow" | General Vercel debugging: triage tree, build/runtime/cache diagnostics |
| `/agent-browser` | "smoke test", "check the page", "browser test" | Browser automation for testing deploys, checking UI, verifying headers |

### In egghead-rails (`egghead-rails/.claude/skills/`)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/axiom-patrol` | "health check", "what's happening in prod" | Session-start production health briefing |
| `/dead-code-hunter` | "dead code", "what can we delete" | Cross-reference Axiom vs codebase for zero-traffic paths |
| `/migration-triage` | "triage issues", "audit issues" | Cross-platform issue audit (Linear + GitHub) |

### GitHub Issues (Active)

| Repo | # | Title | Priority |
|------|---|-------|----------|
| migrate-egghead | #21 | Frontend 80% cache miss + 152 errors/2h | **HIGH** |
| migrate-egghead | #17 | Direct Postgres strategy (strangler fig) | HIGH |
| migrate-egghead | #15 | Auth drop-off signal (10:1 REST:GraphQL) | HIGH |
| migrate-egghead | #16 | PPP coupon failures deep dive | MEDIUM |
| migrate-egghead | #12 | Stripe coupon caching (deployed, 93.9% hit) | DONE |

---

## Issue Triage + Project Workflow

Keep issues consistent across repos so agents can filter quickly.

### Agent CLI (`tools/me.ts`)

This repo includes an agent-first Bun CLI that wraps `gh` + `log-beast` into a few idempotent commands.

Sources for CLI conventions:
- `Building Modern CLI Applications in Go` (p.59) for standard flags/subcommand conventions.
- `Building Modern CLI Applications in Go` (p.240) for machine-readable output guidance when not writing to a TTY.

```bash
# Verify environment (gh scopes, log-beast path, AGENT_AXIOM_TOKEN)
bun tools/me.ts check

# Full investigation pack (frontend + backend + structured story)
# Uses a cursor by default so agents analyze "since last time" without guessing.
bun tools/me.ts analysis full --json | jq .

# Include deltas vs the previous same-length window
bun tools/me.ts analysis full --json --compare | jq .

# Cursor ops (optional)
bun tools/me.ts cursor show --json | jq .
bun tools/me.ts cursor clear

# Ensure labels + add the mapped perf/observability issues into org project #4
bun tools/me.ts sync

# Structured-log story pack (agent-readable JSON)
bun tools/me.ts logs story -h 24 --json | jq .

# Add individual items to project #4 (use : not #)
bun tools/me.ts project add egghead-next:1561 migrate-egghead:21

# List org project items (optionally filter by Status)
bun tools/me.ts project list --json | jq '.items[] | {status, url, title}'
bun tools/me.ts project list "Todo"

# Move an item across project Status
bun tools/me.ts project status egghead-next:1561 "In Progress"

# Trace a request end-to-end (frontend + backend) by request_id
bun tools/me.ts logs trace d3124e21-3c5c-4117-a11d-f824884ccfae -h 24
```

### Label Taxonomy (required)

**`migrate-egghead` (coordination repo)**
- Areas: `area:frontend`, `area:backend`, `area:observability`, `area:auth`, `area:pricing`
- Types: `type:discovery`, `type:perf`, `type:bug`, `type:strategy`
- Priority: `priority:critical`, `priority:high`
- Execution: `agent/ready`

**`egghead-next` (implementation repo)**
- `perf`, `refactor`, `search`, `observability`, `agent/ready`

**`egghead-rails` (legacy backend repo)**
- `bug 🐛`, `api`, `payments`, `auth`, `search` (as applicable)

### Triage SOP

```bash
# Review open issues with labels
gh issue list -R skillrecordings/migrate-egghead --state open --json number,title,labels,url
gh issue list -R skillrecordings/egghead-next --state open --json number,title,labels,url
gh issue list -R skillrecordings/egghead-rails --state open --json number,title,labels,url

# Apply labels
gh issue edit <num> -R <owner/repo> --add-label <label>
```

### Org Project #4 (`skillrecordings/projects/4`)

All cross-repo perf/observability issues should be added to Project #4.

```bash
# One-time auth scope fix for project commands
gh auth refresh -s read:project -s project

# Add issue to org project
gh project item-add 4 --owner skillrecordings --url https://github.com/skillrecordings/<repo>/issues/<num>
```

If `gh` says missing `read:project`, stop and refresh auth before continuing. Do not silently skip project updates.

---

## CRITICAL: README.md IS THE SOURCE OF TRUTH

**The README.md defines the migration phases and their order.** Always check it before starting work.

### Phase Execution Order (from README)

```
Phase 0: Minimum Viable Safety     ✅ COMPLETE
  └─ E2E test, Inngest dev server, idempotency columns

Phase 1A: Content Migration        ✅ COMPLETE (Dec 15, 2025)
  └─ 423 courses, 11,001 lessons, 10,337 videoResources

Phase 1B: User/Subscription Migration  ← NEXT (epic: phase-1)
  └─ Users, Orgs, Subscriptions, Progress
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

### egghead-next Direct Postgres (Strangler Fig)

egghead-next already has a configured Postgres pool in `egghead-next/src/db/index.ts`:

```typescript
import { pgQuery } from '@/db'  // Pool with SSL, connected to Rails Postgres

// Raw parameterized SQL — no ORM needed
const { rows } = await pgQuery<LessonComment>(`
  SELECT ... FROM comments c
  JOIN lessons l ON l.id = c.commentable_id
  WHERE l.slug = $1 AND c.state = 'published'
`, [slug])
```

This is the **interim strangler fig** — bypass Rails entirely for read-heavy paths while the full CB migration progresses. See `/code-path-migrator` skill for the workflow.

### Three Databases (Migration)

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

## Verifying Work (Assessment Evidence)

From Understanding by Design:

> "What would count as evidence of successful learning?"

Applied to migrations:

> **"What would count as evidence that the migration worked?"**

### The Twin Sins to Avoid

Borrowed from UbD's framework for avoiding shallow work:

#### 1. Activity-Oriented (Busy Work Without Outcomes)

The agent runs scripts but doesn't verify results.

**BAD Examples:**

- "I ran the migration script" ❌
- "Script completed successfully" ❌
- "Deployed the webhook handler" ❌
- "Tests pass" ❌ (What do the tests actually verify?)

**GOOD Examples:**

- "Migration complete: 423 courses in CB, matches Rails count of 423" ✅
- "Webhook handler tested: subscription.created event → DB row created with correct stripe_id" ✅
- "Test suite verifies: count reconciliation (Rails vs CB), sample data integrity (10 random records), foreign key relationships" ✅

#### 2. Coverage-Oriented (Scope Creep)

The agent expands beyond the scoped work, adding "improvements" not in the bead.

**BAD Examples:**

- "Also refactored the auth system while migrating users" ❌
- "Added 5 new features to the video player during migration" ❌
- "Rewrote the entire query layer for better performance" ❌

**GOOD Examples:**

- "Migrated exactly 699K users as scoped. Found performance issue, created bead `perf-x` for later" ✅
- "Webhook handler implements spec, no extras. Logged enhancement ideas in bead `enh-y`" ✅
- "Video player ported as-is. Modernization deferred to bead `mod-z`" ✅

### The Mantra

**"Not 'it runs' but 'it produces correct results'"**

Every completed bead should include evidence that the work **achieved its intended outcome**, not just that code executed without errors.

---

### Assessment Evidence Patterns

Use these patterns to verify your work. Include evidence in the bead close reason.

#### For Data Migrations

**Evidence Required:**

1. **Count reconciliation** - Source count = Target count
2. **Sample verification** - 10 random records match field-by-field
3. **Relationship integrity** - Foreign keys resolve correctly
4. **Idempotency check** - Re-running doesn't duplicate or break

**Verification Queries:**

```sql
-- 1. Count Reconciliation
SELECT
  (SELECT COUNT(*) FROM rails_source_table) as source_count,
  (SELECT COUNT(*) FROM cb_target_table) as target_count,
  (SELECT COUNT(*) FROM rails_source_table) = (SELECT COUNT(*) FROM cb_target_table) as counts_match;

-- 2. Sample Verification (spot check 10 random records)
SELECT
  s.id as source_id,
  t.id as target_id,
  s.name = t.name as name_matches,
  s.email = t.email as email_matches,
  s.created_at as source_created,
  t.createdAt as target_created
FROM rails_source_table s
JOIN cb_target_table t ON s.id = t.rails_id
ORDER BY RANDOM()
LIMIT 10;

-- 3. Relationship Integrity (e.g., lessons → courses)
SELECT
  COUNT(*) as orphaned_lessons
FROM cb_lessons l
LEFT JOIN cb_courses c ON l.courseId = c.id
WHERE l.courseId IS NOT NULL AND c.id IS NULL;
-- Should return 0

-- 4. Idempotency Check (run migration twice, count shouldn't double)
SELECT COUNT(*) FROM cb_target_table;
-- Run migration again
SELECT COUNT(*) FROM cb_target_table;
-- Counts should be identical
```

**Bead Close Example:**

```
beads_close(
  id="migrate-egghead-phase-1.2",
  reason="User migration complete. Evidence: 699,234 users migrated (matches Rails count), 10 random samples verified (name, email, created_at match), 0 orphaned records, idempotent (re-run produced no duplicates)"
)
```

#### For Webhook Handlers

**Evidence Required:**

1. **Event processing** - Handler receives event and processes it
2. **Database effect** - Correct DB row created/updated
3. **Idempotency** - Duplicate events don't cause duplicate records
4. **Error handling** - Invalid events return appropriate errors

**Verification Code:**

```typescript
// 1. Event Processing
const testEvent = createTestStripeEvent("customer.subscription.created", {
  id: "sub_test123",
  customer: "cus_test456",
  status: "active",
});

const result = await handler(testEvent);
expect(result.status).toBe("processed");

// 2. Database Effect
const subscription = await db.subscription.findByStripeId("sub_test123");
expect(subscription).toBeDefined();
expect(subscription.customerId).toBe("cus_test456");
expect(subscription.status).toBe("active");

// 3. Idempotency
await handler(testEvent); // Process again
const subCount = await db.subscription.count({
  where: { stripeId: "sub_test123" },
});
expect(subCount).toBe(1); // Still only 1 record

// 4. Error Handling
const invalidEvent = createTestStripeEvent("invalid.event", {});
await expect(handler(invalidEvent)).rejects.toThrow("Unhandled event type");
```

**Bead Close Example:**

```
beads_close(
  id="migrate-egghead-phase-2.3",
  reason="Stripe subscription.created handler complete. Evidence: test event processed successfully, DB row created with correct stripe_id and status, idempotent (duplicate event didn't create duplicate row), invalid events return 400 error"
)
```

#### For UI Components

**Evidence Required:**

1. **Visual rendering** - Component displays correctly
2. **User interaction** - Click/type/navigation works
3. **Data loading** - Correct data fetched and displayed
4. **Error states** - Graceful handling of failures

**Verification Code:**

```typescript
// 1. Visual Rendering
await page.goto("/courses/test-course-slug");
await expect(page.locator("h1")).toContainText("Test Course Title");
await expect(page.locator('[data-testid="course-lessons"]')).toBeVisible();

// 2. User Interaction
await page.click('[data-testid="lesson-1"]');
await expect(page).toHaveURL("/lessons/lesson-1-slug");
await page.click('[data-testid="play-button"]');
await expect(page.locator("video")).toHaveAttribute("data-playing", "true");

// 3. Data Loading
const lessonCount = await page.locator('[data-testid="lesson-item"]').count();
expect(lessonCount).toBe(12); // Expected lesson count for this course

// 4. Error States
await page.goto("/courses/nonexistent-slug");
await expect(page.locator('[data-testid="error-message"]')).toContainText(
  "Course not found",
);
```

**Bead Close Example:**

```
beads_close(
  id="migrate-egghead-phase-5.1",
  reason="Video player component complete. Evidence: player renders on /lessons/:slug, play/pause buttons work, video HLS stream loads from Mux, progress tracking updates on pause, error state shows for invalid lesson IDs"
)
```

#### For Inngest Functions (Cron Jobs)

**Evidence Required:**

1. **Scheduled execution** - Function runs on schedule
2. **Batch processing** - Processes expected number of records
3. **Retry behavior** - Failures retry with backoff
4. **Completion tracking** - Success/failure logged

**Verification Code:**

```typescript
// 1. Scheduled Execution
const result = await inngest.send({
  name: "scheduled/sync-subscriptions",
  data: {},
});
expect(result.status).toBe("success");

// 2. Batch Processing
const processedCount = await db.subscription.count({
  where: { lastSyncedAt: { gte: new Date(Date.now() - 60000) } },
});
expect(processedCount).toBe(3335); // Expected active subscription count

// 3. Retry Behavior (simulate failure)
// Mock external API to fail
mockStripeAPI.mockRejectedValueOnce(new Error("Network error"));
const retryResult = await inngest.send({
  name: "scheduled/sync-subscriptions",
  data: {},
});
// Check retry was scheduled
expect(retryResult.retryCount).toBe(1);

// 4. Completion Tracking
const logs = await db.jobLog.findMany({
  where: { jobName: "sync-subscriptions" },
  orderBy: { createdAt: "desc" },
  take: 1,
});
expect(logs[0].status).toBe("completed");
expect(logs[0].processedCount).toBe(3335);
```

**Bead Close Example:**

```
beads_close(
  id="migrate-egghead-phase-3.2",
  reason="Subscription sync cron job complete. Evidence: runs every 5min (tested with manual trigger), processes 3,335 active subscriptions, retries 3x on failure with exponential backoff, logs success/failure to job_logs table"
)
```

---

### Verification Checklist

Before closing ANY bead, ask:

- [ ] **Did I verify the outcome?** Not "script ran" but "correct data exists"
- [ ] **Did I check counts?** Source vs target reconciliation
- [ ] **Did I spot-check samples?** 10 random records field-by-field
- [ ] **Did I test idempotency?** Re-running doesn't break things
- [ ] **Did I include evidence in close reason?** Specific numbers, not vague statements
- [ ] **Did I stay in scope?** No feature creep, defer enhancements to new beads

### Red Flags (DON'T Do This)

❌ Closing with "Done" or "Completed" (no evidence)  
❌ "Tests pass" without saying what they verify  
❌ "Migration successful" without count reconciliation  
❌ "No errors" as the only evidence  
❌ Adding features not in the bead scope  
❌ Refactoring unrelated code "while you're in there"

### Green Flags (DO This)

✅ Close reason includes specific counts and verification queries  
✅ Evidence shows source/target reconciliation  
✅ Idempotency verified by re-running  
✅ Sample spot-checks included (10 random records)  
✅ Scope strictly adhered to, enhancements deferred to new beads  
✅ Verification queries saved in comments for future reference

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
