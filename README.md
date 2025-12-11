# Kill egghead-rails and egghead-next

> **Mission**: Consolidate egghead.io onto Coursebuilder  
> **Status**: Planning complete, ready for execution  
> **Updated**: December 11, 2025

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
- **Zero downtime** - Gradual cutover with rollback at each step

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

### Phase 0: Safety Infrastructure

**Epic**: `6y2` (Testing) + `341` (Data Integrity) + `5qr` (CDC)

Before touching production data, we need:

| Task                                 | Bead      | Purpose                              |
| ------------------------------------ | --------- | ------------------------------------ |
| Testing pyramid (Vitest, Playwright) | `6y2`     | No code ships without tests          |
| CDC via PostgreSQL triggers          | `5qr`     | Sync changes during migration window |
| Idempotency layer                    | `341.1-2` | Prevent duplicate Stripe processing  |
| Reconciliation job                   | `341.4`   | Daily PG ↔ PlanetScale checksums     |
| Webhook deduplication                | `cqi`     | Handle dual-write race conditions    |

**Human Gate**: `6pv.17` - Approve migration control plane

---

### Phase 1: Data Migration

**Epic**: `koh` + `39p.2-5`

Migrate all data from Rails PostgreSQL to Coursebuilder PlanetScale:

| Data                       | Records      | Bead     | Status       |
| -------------------------- | ------------ | -------- | ------------ |
| Users                      | 699,318      | `koh.11` | Ready        |
| Organizations (accounts)   | 94,679       | `koh.12` | Ready        |
| Subscriptions              | 3,335 active | `koh.13` | Ready        |
| Progress                   | 2,957,917    | `koh.14` | Ready        |
| Content (courses, lessons) | 420 + 5,132  | `koh.15` | 97.5% on Mux |
| Gifts                      | ~500         | `51p`    | Ready        |
| Teams                      | 266          | `dxh.6`  | Ready        |

**Monitoring**: `c7z` - Progress backfill dashboard with stall detection

**Human Gate**: `koh.17` - Approve migration before execution

---

### Phase 2: Webhook Handlers

**Epic**: `5bk`

Replace Rails Sidekiq handlers with Coursebuilder Inngest:

| Event                           | Rails Delay | Bead    | Status      |
| ------------------------------- | ----------- | ------- | ----------- |
| `checkout.session.completed`    | None        | ✅      | Working     |
| `customer.subscription.created` | None        | `5bk.1` | **STUB**    |
| `customer.subscription.updated` | 5 sec       | `5bk.2` | **STUB**    |
| `customer.subscription.deleted` | None        | `5bk.3` | **MISSING** |
| `invoice.payment_succeeded`     | 1 min       | `5bk.4` | **STUB**    |

**Why the delays?**

- 5-sec on `subscription.updated`: Race condition with `checkout.session.completed`
- 1-min on `invoice.payment_succeeded`: Wait for Stripe to finalize charge

**Human Gate**: `15v` - Approve webhook handler design

---

### Phase 3: Cron Jobs

**Epic**: `tkd`

Port 17 Sidekiq-Cron jobs to Inngest:

| Job                       | Frequency  | Bead     | Impact if Missing       |
| ------------------------- | ---------- | -------- | ----------------------- |
| StripeReconciler          | Daily      | `tkd.1`  | Missed transactions     |
| GiftExpirationWorker      | Daily      | `tkd.2`  | Gifts never expire      |
| RefreshSitemap            | 4 hours    | `tkd.3`  | SEO degrades            |
| SignInTokenCleaner        | 1 minute   | `tkd.4`  | Magic links pile up     |
| LessonPublishWorker       | 10 minutes | `tkd.5`  | Scheduled content stuck |
| RenewalReminder           | Daily      | `tkd.6`  | No renewal emails       |
| Revenue share calculation | Monthly    | `tkd.11` | Instructors not paid    |

---

### Phase 4: External Integrations

**Epic**: `qk0` + `ifz`

| Integration              | Beads                   | Notes                                    |
| ------------------------ | ----------------------- | ---------------------------------------- |
| Customer.io              | `ifz`, `qk0.1-2`, `1p8` | Track subscribed/cancelled/billed events |
| Magic link email         | `qk0.3`                 | **PRIMARY auth method**                  |
| Renewal/Welcome emails   | `qk0.4`                 | Revenue-affecting                        |
| 17 transactional mailers | `qk0.5`                 | Port to Resend                           |

**Human Gate**: `esr` - Approve Customer.io + email strategy

---

### Phase 5: UI Components

**Epic**: `r52`

| Component     | Bead              | Notes                                      |
| ------------- | ----------------- | ------------------------------------------ |
| Video player  | `r52.1`, `r52.11` | Mux player, NOT xstate complexity          |
| Lesson view   | `r52.2`           | Player + transcript + navigation           |
| Course view   | `r52.3`           | Lesson list + progress indicators          |
| Search UI     | `r52.4`           | Typesense + InstantSearch, `/q/[[...all]]` |
| Pricing page  | `r52.5`           | Stripe checkout integration                |
| URL redirects | `r52.7`           | **SEO critical**                           |

**Human Gate**: `sr4` - Approve UI architecture

---

### Phase 6: Cutover

**Epic**: `axl` + `04y`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CUTOVER SEQUENCE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Week 1-2: Shadow Mode                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Stripe ──┬──► Rails (PRIMARY) ──► PostgreSQL                       │   │
│  │           │                              │                          │   │
│  │           │                              │ Compare                  │   │
│  │           │                              ▼                          │   │
│  │           └──► Coursebuilder (SHADOW) ─► PlanetScale                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  Target: 7+ days, <0.1% divergence                                         │
│                                                                             │
│  Week 3: Flip Primary                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Stripe ──┬──► Rails (SHADOW) ────► PostgreSQL (read-only)          │   │
│  │           │                              │                          │   │
│  │           │                              │ Verify                   │   │
│  │           │                              ▼                          │   │
│  │           └──► Coursebuilder (PRIMARY) ► PlanetScale                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  Auth cutover: Password reset campaign 48h before                          │
│                                                                             │
│  Week 4: Kill Rails                                                         │
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

- `axl.4` - Shadow mode review (7+ days stable)
- `dwa` - Auth cutover plan approval
- `axl.8` - DNS cutover authorization
- `axl.10` - Kill Rails authorization

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

### Video Migration Status

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MUX VIDEO MIGRATION: 97.5%                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ████████████████████████████████████████████████████░░  7,441 / 7,634    │
│                                                                             │
│   ✅ updated (with mux_asset_id): 6,764                                     │
│   ⚠️  no_srt (missing subtitles): 677                                       │
│   ❌ missing_video (source gone): 193                                       │
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

| Gap                        | Risk                 | Mitigation                          |
| -------------------------- | -------------------- | ----------------------------------- |
| Dual-write race conditions | Double-charges       | Webhook deduplication (`cqi`)       |
| Missing idempotency        | Duplicate processing | Store `stripe_event_id` (`341.1-2`) |
| Post-cutover drift         | Data inconsistency   | Daily reconciliation job (`341.4`)  |
| No rollback test           | Can't recover        | Test flip back to Rails (`341.7`)   |

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
beads_start(id="migrate-egghead-39p.2")

# Close when done
beads_close(id="migrate-egghead-39p.2", reason="Completed user migration")

# Sync to git
beads_sync()
```

### Current Status

```bash
# Next ready task:
migrate-egghead-39p.2 - User/Account migration pipeline (699K users)
```

---

## Human Approval Gates

These beads require explicit human approval before proceeding:

| Gate     | Phase | What Needs Review            |
| -------- | ----- | ---------------------------- |
| `6pv.17` | 0     | Migration control plane      |
| `koh.17` | 1     | Data migration plan          |
| `15v`    | 2     | Webhook handler design       |
| `esr`    | 4     | Customer.io + email strategy |
| `sr4`    | 5     | UI architecture              |
| `axl.4`  | 6     | Shadow mode results          |
| `dwa`    | 6     | Auth cutover plan            |
| `axl.8`  | 6     | DNS cutover                  |
| `axl.10` | 6     | Kill Rails authorization     |

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
