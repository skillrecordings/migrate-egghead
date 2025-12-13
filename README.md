# Kill egghead-rails and egghead-next

> **Mission**: Consolidate egghead.io onto Coursebuilder  
> **Status**: Video migration complete, Content migration next (before users)  
> **Updated**: December 13, 2025

**For AI agents**: Read [AGENTS.md](./AGENTS.md) first - contains critical rules and context.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Three Systems](#the-three-systems)
3. [Migration Phases](#migration-phases)
4. [Phase Details](#phase-details)
5. [Key Numbers](#key-numbers)
6. [Schema Mapping](#schema-mapping)
7. [Critical Gaps & Safety](#critical-gaps--safety)
8. [Repository Structure](#repository-structure)
9. [Running the Toolkit](#running-the-toolkit)

---

## Executive Summary

We're killing **two legacy systems** and consolidating onto Coursebuilder:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   egghead-rails          egghead-next           Coursebuilder              │
│   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐            │
│   │ PostgreSQL  │        │ Next.js     │        │ PlanetScale │            │
│   │ Sidekiq     │   +    │ GraphQL     │   →    │ Inngest     │            │
│   │ 699K users  │        │ Video player│        │ Mux         │            │
│   └─────────────┘        └─────────────┘        └─────────────┘            │
│        KILL                   KILL                   KEEP                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Good News

**The hard part is already done.** All 3,335 active subscriptions use the modern `account_subscriptions` table. The legacy `subscriptions` table has been dead since December 2022.

### Design Philosophy

- **shadcn/ui centric** - Use shadcn components, not complex egghead-next patterns
- **Cut the cruft** - Don't port complexity, rebuild with simplicity
- **No 404s** - Every legacy URL gets a redirect (SEO critical)
- **Minimal downtime** - 5-15 minute cutover window, timed for low traffic
- **Build tests as you go** - No speculative infrastructure

---

## The Three Systems

| System            | Role                                     | Database           | Fate     |
| ----------------- | ---------------------------------------- | ------------------ | -------- |
| `egghead-rails/`  | Subscriptions, webhooks, users, progress | PostgreSQL         | **KILL** |
| `egghead-next/`   | Frontend, video player, search           | Sanity + Rails API | **KILL** |
| `course-builder/` | Target platform                          | PlanetScale        | **KEEP** |

---

## Migration Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MIGRATION ROADMAP                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 0          Phase 1          Phase 2          Phase 3                │
│  ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐             │
│  │ SAFETY │  →    │  DATA  │  →    │WEBHOOKS│  →    │  CRON  │             │
│  │ INFRA  │       │MIGRATE │       │HANDLERS│       │  JOBS  │             │
│  └────────┘       └────────┘       └────────┘       └────────┘             │
│      │                │                │                │                   │
│      ▼                ▼                ▼                ▼                   │
│  Testing          699K users       Stripe          17 Sidekiq              │
│  CDC setup        3M progress      Inngest         → Inngest               │
│  Monitoring       Content          Dual-write                              │
│                                                                             │
│  Phase 4          Phase 5          Phase 6                                 │
│  ┌────────┐       ┌────────┐       ┌────────┐                              │
│  │EXTERNAL│  →    │   UI   │  →    │CUTOVER │                              │
│  │INTEGR. │       │COMPNTS │       │  KILL  │                              │
│  └────────┘       └────────┘       └────────┘                              │
│      │                │                │                                    │
│      ▼                ▼                ▼                                    │
│  Customer.io      Video player     DNS flip                                │
│  17 mailers       Search UI        Auth cutover                            │
│  Resend           Pricing          🎉 Rails dead                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Details

### Phase 0: Minimum Viable Safety

**Epic**: `phase-0`

**Goal**: Prove the happy path works, then build safety as we go.

| Task                       | Bead        | Purpose                                            |
| -------------------------- | ----------- | -------------------------------------------------- |
| ONE E2E test working       | `phase-0.1` | User signs up → gets entitlement → can watch video |
| Inngest dev server running | `phase-0.2` | Can test webhook handlers locally                  |
| Idempotency column added   | `phase-0.3` | `stripe_event_id` on relevant tables               |

**Not in Phase 0** (build when needed):

- Full testing pyramid - write tests for what you're building
- CDC triggers - sequential cutover eliminates need
- Reconciliation jobs - add post-cutover if drift detected
- Webhook deduplication - shadow mode is read-only, no dual-write

**Human Gate**: `phase-0.4` - Approve migration control plane

---

### Phase 1A: Content Migration (FIRST)

**Epic**: `ntu`

Content has no user dependencies - migrate first to enable testing.

| Data              | Records | Bead    | Notes                              |
| ----------------- | ------- | ------- | ---------------------------------- |
| ID mapping tables | -       | `ntu.1` | Enable legacy lookups              |
| Tags              | 627     | `ntu.2` | → egghead_Tag                      |
| Courses (series)  | 420     | `ntu.3` | → ContentResource type='course'    |
| Lessons           | 5,132   | `ntu.4` | → ContentResource type='lesson'    |
| Relationships     | 15K+    | `ntu.5` | ContentResourceResource + taggings |
| Sanity merge      | -       | `ntu.6` | 3-way: Rails > Sanity > defaults   |
| Validation        | -       | `ntu.7` | Verify counts and integrity        |

**Human Gate**: `ntu.8` - Review content migration before users

**Research**: See `reports/CONTENT_MIGRATION_RESEARCH.md` for full schema mappings.

---

### Phase 1B: User Migration

**Epic**: `phase-1`

Migrate users/accounts after content is in place:

| Data                     | Records      | Bead        | Status                                      |
| ------------------------ | ------------ | ----------- | ------------------------------------------- |
| Users                    | 699,318      | `phase-1.1` | Ready                                       |
| Organizations (accounts) | 94,679       | `phase-1.2` | Ready                                       |
| Instructors              | 134          | `phase-1.3` | Links users→content via ContentContribution |
| Subscriptions            | 3,335 active | `phase-1.4` | Ready                                       |
| Progress                 | 2,957,917    | `phase-1.5` | Needs users + content                       |
| Gifts                    | ~500         | `phase-1.6` | Ready                                       |
| Teams                    | 266          | `phase-1.7` | Ready                                       |

**Validation**: `phase-1.8` - Reconciliation queries

**Human Gate**: `phase-1.9` - Approve user migration before execution

---

### Phase 2: Webhook Handlers

**Epic**: `phase-2`

Replace Rails Sidekiq handlers with Coursebuilder Inngest:

| Event                           | Rails Delay | Bead        | Status      |
| ------------------------------- | ----------- | ----------- | ----------- |
| `checkout.session.completed`    | None        | ✅          | Working     |
| `customer.subscription.created` | None        | `phase-2.1` | **STUB**    |
| `customer.subscription.updated` | 5 sec       | `phase-2.2` | **STUB**    |
| `customer.subscription.deleted` | None        | `phase-2.3` | **MISSING** |
| `invoice.payment_succeeded`     | 1 min       | `phase-2.4` | **STUB**    |

**Why the delays?**

- 5-sec on `subscription.updated`: Race condition with `checkout.session.completed`
- 1-min on `invoice.payment_succeeded`: Wait for Stripe to finalize charge

**Human Gate**: `phase-2.8` - Approve webhook handler design

---

### Phase 3: Cron Jobs

**Epic**: `phase-3`

Port essential Sidekiq-Cron jobs to Inngest:

| Job                       | Frequency  | Bead        | Impact if Missing       |
| ------------------------- | ---------- | ----------- | ----------------------- |
| StripeReconciler          | Daily      | `phase-3.1` | Missed transactions     |
| GiftExpirationWorker      | Daily      | `phase-3.2` | Gifts never expire      |
| RefreshSitemap            | 4 hours    | `phase-3.3` | SEO degrades            |
| SignInTokenCleaner        | 1 minute   | `phase-3.4` | Magic links pile up     |
| LessonPublishWorker       | 10 minutes | `phase-3.5` | Scheduled content stuck |
| RenewalReminder           | Daily      | `phase-3.6` | No renewal emails       |
| Revenue share calculation | Monthly    | `phase-3.7` | Instructors not paid    |

---

### Phase 4: External Integrations

**Epic**: `phase-4`

| Integration              | Bead        | Notes                                    |
| ------------------------ | ----------- | ---------------------------------------- |
| Customer.io API client   | `phase-4.1` | Track subscribed/cancelled/billed events |
| Customer.io events       | `phase-4.2` | Subscription event tracking              |
| Magic link email         | `phase-4.3` | **PRIMARY auth method**                  |
| Renewal/Welcome emails   | `phase-4.4` | Revenue-affecting                        |
| 17 transactional mailers | `phase-4.5` | Port to Resend                           |

**Human Gate**: `phase-4.7` - Approve Customer.io + email strategy

---

### Phase 5: UI Components

**Epic**: `phase-5`

| Component     | Bead        | Notes                                      |
| ------------- | ----------- | ------------------------------------------ |
| Video player  | `phase-5.1` | Mux player, NOT xstate complexity          |
| Lesson view   | `phase-5.2` | Player + transcript + navigation           |
| Course view   | `phase-5.3` | Lesson list + progress indicators          |
| Search UI     | `phase-5.4` | Typesense + InstantSearch, `/q/[[...all]]` |
| Pricing page  | `phase-5.5` | Stripe checkout integration                |
| URL redirects | `phase-5.7` | **SEO critical**                           |

**Human Gate**: `phase-5.9` - Approve UI architecture

---

### Phase 6: Cutover

**Epic**: `axl` + `04y`

**Target: 5-15 minutes of degraded service, not zero downtime.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CUTOVER SEQUENCE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Week 1-2: Shadow Mode (READ-ONLY observation)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Stripe ──┬──► Rails (PRIMARY) ──► PostgreSQL ──► PROCESSES         │   │
│  │           │                              │                          │   │
│  │           │                              │ Compare                  │   │
│  │           │                              ▼                          │   │
│  │           └──► Coursebuilder (SHADOW) ─► LOGS ONLY (no mutations)   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  CB receives webhooks but only logs "would have done X"                    │
│  Target: 7+ days, fix any divergences                                      │
│                                                                             │
│  Cutover Day: The Flip (~5 minutes)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  T-48h:  Lower DNS TTL to 60s                                       │   │
│  │  T-1h:   Announce maintenance window                                │   │
│  │  T-0:    Remove Rails webhook from Stripe (30 sec)                  │   │
│  │          Enable CB webhook in Stripe (30 sec)                       │   │
│  │          Update DNS to Vercel (instant, propagation varies)         │   │
│  │          Rails goes read-only                                       │   │
│  │  T+5m:   Verify CB processing webhooks                              │   │
│  │  T+15m:  DNS propagated for most users                              │   │
│  │  T+1h:   DNS fully propagated globally                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Who gets sad during the 5-minute window:                                  │
│  • Magic link clicks → "We just upgraded! Click for new link" (auto-send) │
│  • Mid-checkout users → Stripe handles gracefully (they retry)            │
│  • Stale DNS cache → Works within 1 hour                                  │
│                                                                             │
│  Week after: Kill Rails                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Stripe ────────► Coursebuilder ────────► PlanetScale               │   │
│  │                                                                     │   │
│  │  Rails ─────────────────────────────────► ARCHIVED                  │   │
│  │  egghead-next ──────────────────────────► ARCHIVED                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  🎉 Heroku bill: $0                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Human Gates**:

- `phase-6.4` - Shadow mode review (7+ days stable)
- `phase-6.7` - Auth cutover plan approval
- `phase-6.9` - DNS cutover authorization
- `phase-6.11` - Kill Rails authorization

---

## Key Numbers

### Users & Subscriptions

| Metric               | Value     | Notes                  |
| -------------------- | --------- | ---------------------- |
| Total users          | 699,318   | All need migration     |
| Total accounts       | 94,679    | → Organizations        |
| Active subscriptions | 3,335     | All in modern model    |
| Monthly new subs     | ~93       | All go to modern model |
| Progress records     | 2,957,917 | Largest migration      |
| Teams                | 266       | With 1,200+ members    |

### Content

| Content     | Count | Status           |
| ----------- | ----- | ---------------- |
| Courses     | 420   | 330 pro, 90 free |
| Lessons     | 5,132 | 5,051 published  |
| Videos      | 7,634 | **97.5% on Mux** |
| Instructors | 134   |                  |
| Tags        | 627   |                  |

### Video Migration Status ✅ COMPLETE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MUX VIDEO MIGRATION: 81.7% RAILS COVERAGE           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ████████████████████████████████████████░░░░░░░░░░░░  8,233 / 10,082     │
│                                                                             │
│   ✅ Bulk Rails update applied: 6,764 lessons updated                       │
│   ✅ Gap videos on Mux: 131/146 (15 errored - missing S3 sources)           │
│   ✅ SQLite has mux_playback_id for all 6,895 videos                        │
│                                                                             │
│   Remaining ~1,849 without Mux URLs:                                        │
│   • Lessons without videos (text-only, retired)                             │
│   • Missing S3 source files (193 identified)                                │
│   • Draft/unpublished lessons                                               │
│   • Coursebuilder-native lessons (served via CB, not Rails)                 │
│                                                                             │
│   See: reports/VIDEO_MIGRATION_STATUS.md                                    │
│   See: reports/ERRORED_MUX_ASSETS_INVESTIGATION.md (15 failed)              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Schema Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RAILS → COURSEBUILDER                               │
└─────────────────────────────────────────────────────────────────────────────┘

    RAILS                                    COURSEBUILDER
    ═════                                    ═════════════

    ┌─────────────────┐                      ┌─────────────────────────┐
    │    accounts     │                      │     Organization        │
    ├─────────────────┤                      ├─────────────────────────┤
    │ id              │ ──────────────────▶  │ id (new CUID)           │
    │ name            │ ──────────────────▶  │ name                    │
    │ slug            │ ──────────────────▶  │ fields.slug             │
    │ stripe_customer │ ──┐                  │ fields.legacyId         │
    └─────────────────┘   │                  └─────────────────────────┘
                          │
                          │                  ┌─────────────────────────┐
                          └────────────────▶ │   MerchantCustomer      │
                                             │   identifier = cus_xxx  │
                                             └─────────────────────────┘

    ┌─────────────────┐                      ┌─────────────────────────┐
    │ account_users   │                      │ OrganizationMembership  │
    ├─────────────────┤                      ├─────────────────────────┤
    │ account_id      │ ──────────────────▶  │ organizationId          │
    │ user_id         │ ──────────────────▶  │ userId                  │
    │ roles           │ ──────────────────▶  │ role                    │
    └─────────────────┘                      └─────────────────────────┘

    ┌─────────────────┐                      ┌─────────────────────────┐
    │ account_subs    │                      │     Subscription        │
    ├─────────────────┤                      ├─────────────────────────┤
    │ account_id      │ ──────────────────▶  │ organizationId          │
    │ status          │ ──────────────────▶  │ status                  │
    │ stripe_sub_id   │ ──┐                  │ merchantSubscriptionId  │
    └─────────────────┘   │                  └─────────────────────────┘
                          │
                          │                  ┌─────────────────────────┐
                          └────────────────▶ │  MerchantSubscription   │
                                             │  identifier = sub_xxx   │
                                             └─────────────────────────┘

    ┌─────────────────┐                      ┌─────────────────────────┐
    │     users       │                      │       User              │
    ├─────────────────┤                      ├─────────────────────────┤
    │ id              │ ──────────────────▶  │ fields.legacyId         │
    │ email           │ ──────────────────▶  │ email                   │
    │ first + last    │ ──────────────────▶  │ name                    │
    │ roles: [:pro]   │ ──────────────────▶  │ → Entitlement           │
    └─────────────────┘                      └─────────────────────────┘
```

---

## Critical Gaps & Safety

### Data Integrity (Bead: `341`)

| Gap                 | Risk                 | Mitigation                           |
| ------------------- | -------------------- | ------------------------------------ |
| Missing idempotency | Duplicate processing | Store `stripe_event_id` (`341.1-2`)  |
| Post-cutover drift  | Data inconsistency   | Add reconciliation if drift detected |
| No rollback test    | Can't recover        | Test flip back to Rails (`341.7`)    |

**Note**: Dual-write race conditions are avoided by design - shadow mode is read-only observation, not dual processing. Only ONE system processes webhooks at any time.

### SEO Safety (Bead: `34t`)

| Gap               | Risk         | Mitigation                               |
| ----------------- | ------------ | ---------------------------------------- |
| Broken URLs       | Traffic loss | Pre-migration sitemap snapshot (`34t.1`) |
| Missing redirects | 404 errors   | Comprehensive redirect map (`34t.8`)     |
| Sitemap changes   | Ranking drop | Sitemap diff tool (`34t.2`)              |

### Auth Safety (Bead: `04y`)

| Gap                     | Risk             | Mitigation                    |
| ----------------------- | ---------------- | ----------------------------- |
| OAuth re-linking        | Users locked out | Re-link flow (`04y.1`)        |
| OAuth-only users (~45K) | Can't sign in    | Password set flow (`04y.3-4`) |
| Support overload        | Slow resolution  | Support playbook (`04y.5`)    |

---

## Repository Structure

```
migrate-egghead/
├── AGENTS.md                    # AI agent instructions - READ FIRST
├── README.md                    # This file
├── .beads/                      # Issue tracking (git-backed)
│
├── course-builder/              # TARGET - Coursebuilder submodule
│   └── apps/egghead/            # egghead app in Coursebuilder
│
├── egghead-rails/               # KILL - Rails backend submodule
│   ├── app/controllers/stripe_events_controller.rb
│   ├── app/models/account_subscription.rb
│   └── app/workers/stripe/      # Sidekiq jobs to port
│
├── egghead-next/                # KILL - Next.js frontend submodule
│   └── src/                     # UI components to reference
│
├── download-egghead/            # Media migration toolkit
│   ├── egghead_videos.db        # SQLite: courses, lessons, videos
│   └── send-to-mux.mjs          # Mux migration script
│
├── investigation/               # Effect-TS analysis toolkit
│   └── src/queries/             # Database exploration scripts
│
└── reports/                     # Analysis documents
    ├── COURSEBUILDER_SCHEMA_ANALYSIS.md
    ├── STRIPE_WEBHOOK_MIGRATION.md
    ├── UI_MIGRATION_ANALYSIS.md
    ├── CUTOVER-RUNBOOK.md
    ├── DUAL-WRITE-RUNBOOK.md
    └── ROLLBACK-RUNBOOK.md
```

---

## Running the Toolkit

### Investigation Queries

```bash
cd investigation
pnpm install
cp .env.example .env
# Add DATABASE_URL (Rails) and NEW_DATABASE_URL (PlanetScale)

pnpm tsx src/queries/subscriptions.ts
pnpm tsx src/queries/table-activity.ts
```

### Beads (Issue Tracking)

```bash
# See what's ready to work on
beads_ready()

# Start a task
beads_start(id="migrate-egghead-phase-0.1")

# Close when done
beads_close(id="migrate-egghead-phase-0.1", reason="E2E test passing")

# Sync to git
beads_sync()
```

### Current Status

**Completed:**

- ✅ Video migration - 81.7% Rails coverage (8,233/10,082 lessons with Mux URLs)
- ✅ Gap video upload - 131/146 on Mux
- ✅ SQLite playback IDs - 6,895 videos tracked
- ✅ Beads restructure - Human-readable phase-aligned IDs

**Current Phase: 1A (Content Migration)**

```bash
# Next ready tasks:
migrate-egghead-ntu.1 - Create ID mapping tables in PlanetScale
migrate-egghead-ntu.2 - Migrate tags (627 records)
migrate-egghead-ntu.3 - Migrate courses (420 series)
migrate-egghead-ntu.4 - Migrate lessons (5,132 records)
```

---

## Human Approval Gates

These beads require explicit human approval before proceeding:

| Gate         | Phase | What Needs Review            |
| ------------ | ----- | ---------------------------- |
| `phase-0.4`  | 0     | Migration control plane      |
| `phase-1.9`  | 1     | Data migration plan          |
| `phase-2.8`  | 2     | Webhook handler design       |
| `phase-4.7`  | 4     | Customer.io + email strategy |
| `phase-5.9`  | 5     | UI architecture              |
| `phase-6.4`  | 6     | Shadow mode results          |
| `phase-6.7`  | 6     | Auth cutover plan            |
| `phase-6.9`  | 6     | DNS cutover                  |
| `phase-6.11` | 6     | Kill Rails authorization     |

---

## The End State

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         🎉 RAILS IS DEAD 🎉                                 │
│                                                                             │
│   • All subscriptions managed by Coursebuilder                              │
│   • All webhooks handled by Next.js + Inngest                               │
│   • All users authenticated via Coursebuilder                               │
│   • All content served from PlanetScale                                     │
│   • PostgreSQL archived (read-only backup)                                  │
│   • Heroku bill: $0                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
