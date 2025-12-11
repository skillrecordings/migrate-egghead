# Kill the Rails App (and egghead-next too)

> **Mission**: Consolidate egghead.io onto Coursebuilder - kill both Rails AND Next.js  
> **Status**: Schema design in progress  
> **Updated**: December 11, 2025

---

## Design Philosophy

- **shadcn/ui centric** - Use shadcn components as the foundation
- **Cut the cruft** - Don't port complexity, rebuild with simplicity
- **Art/design carries over** - Illustrations, brand elements stay
- **No 404s** - Every legacy URL gets a redirect
- **Sitemap preservation** - Topic combination pages must stay (massive SEO value)

---

## The Good News

**The hard part is already done.** All subscriptions already use the modern data model.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CURRENT STATE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Legacy subscriptions table          Modern account_subscriptions table    │
│   ┌─────────────────────────┐         ┌─────────────────────────┐           │
│   │  68,000 records         │         │  55,000 records         │           │
│   │  0 active               │         │  3,335 active           │           │
│   │  All state = NULL       │         │  All new subs go here   │           │
│   │  Last write: Dec 2022   │         │  Last write: today      │           │
│   └─────────────────────────┘         └─────────────────────────┘           │
│              ❌                                    ✅                         │
│         DEAD CODE                            SOURCE OF TRUTH                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What we're actually doing**:

1. Moving webhook handlers from Rails/Sidekiq to Coursebuilder/Inngest
2. Migrating all content (courses, lessons, videos) to Coursebuilder
3. Replacing egghead-next frontend with Coursebuilder
4. Killing both legacy systems

---

## The Expanded Scope

This isn't just "kill Rails" anymore. We're consolidating **three systems** into one:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   egghead-rails (PostgreSQL)     egghead-next (Next.js)    Coursebuilder    │
│   ┌─────────────────────────┐    ┌─────────────────────┐   ┌─────────────┐  │
│   │ • Subscriptions         │    │ • Course pages      │   │ • New site  │  │
│   │ • User accounts         │    │ • Lesson player     │   │ • PlanetScale│ │
│   │ • Stripe webhooks       │◄───│ • Progress tracking │   │ • Inngest   │  │
│   │ • Progress data         │    │ • Search            │   │ • Mux       │  │
│   │ • Content API           │    │ • User profiles     │   │             │  │
│   └─────────────────────────┘    └─────────────────────┘   └─────────────┘  │
│              ▲                            │                       │          │
│              │         GraphQL            │                       │          │
│              └────────────────────────────┘                       │          │
│                                                                   │          │
│   KILL ────────────────────────────────────────────────► KEEP    │          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Murder Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 0: NOW                                       │
│                     Rails handles everything                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Stripe Webhooks
                                    ▼
                    ┌───────────────────────────────┐
                    │   Rails /stripe_events        │
                    │   PostgreSQL                  │
                    │   Sidekiq background jobs     │
                    └───────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            ConvertKit                      Customer.io
            Discourse                       Mixpanel


┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 1: DATA MIGRATION                            │
│                     Copy data to Coursebuilder                               │
└─────────────────────────────────────────────────────────────────────────────┘

    Rails PostgreSQL                         Coursebuilder PlanetScale
    ┌─────────────────┐                      ┌─────────────────────────┐
    │ accounts        │ ─────────────────▶   │ Organization            │
    │ account_users   │ ─────────────────▶   │ OrganizationMembership  │
    │ account_subs    │ ─────────────────▶   │ Subscription            │
    │                 │ ─────────────────▶   │ MerchantSubscription    │
    │                 │ ─────────────────▶   │ MerchantCustomer        │
    │ users           │ ─────────────────▶   │ User                    │
    │ (roles: [:pro]) │ ─────────────────▶   │ Entitlement             │
    └─────────────────┘                      └─────────────────────────┘

    Key transformations:
    • stripe_customer_id → MerchantCustomer.identifier
    • stripe_subscription_id → MerchantSubscription.identifier
    • :pro role → Entitlement record with sourceType='SUBSCRIPTION'


┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 2: DUAL WRITE                                │
│                     Both systems receive webhooks                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              Stripe Webhooks
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐
    │   Rails /stripe_events    │   │   Next.js /api/stripe     │
    │   (PRIMARY)               │   │   (SHADOW)                │
    │   • Handles business logic│   │   • Logs everything       │
    │   • Updates PostgreSQL    │   │   • Updates PlanetScale   │
    └───────────────────────────┘   │   • Compare results       │
                                    └───────────────────────────┘

    Validation:
    • Every webhook processed by both
    • Compare outcomes
    • Alert on divergence
    • Build confidence


┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 3: FLIP                                      │
│                     Next.js becomes primary                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                              Stripe Webhooks
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐
    │   Rails /stripe_events    │   │   Next.js /api/stripe     │
    │   (SHADOW)                │   │   (PRIMARY)               │
    │   • Read-only logging     │   │   • Handles business logic│
    │   • Comparison only       │   │   • Updates PlanetScale   │
    └───────────────────────────┘   │   • Inngest background    │
                                    └───────────────────────────┘

    Auth cutover:
    • Users log in via Coursebuilder
    • Session tokens from PlanetScale
    • Rails becomes read-only


┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 4: KILL                                      │
│                     Rails is dead                                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              Stripe Webhooks
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Next.js /api/stripe         │
                    │   PlanetScale                 │
                    │   Inngest background jobs     │
                    └───────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            ConvertKit                      Customer.io
            Discourse                       (Mixpanel deprecated)

    🎉 Rails PostgreSQL archived
    🎉 Sidekiq shut down
    🎉 Heroku dyno count: 0
```

---

## Key Numbers

### Subscription Data (Rails PostgreSQL)

| Metric               | Value     | Notes                            |
| -------------------- | --------- | -------------------------------- |
| Active subscriptions | 3,335     | All in modern model              |
| Legacy subscriptions | 0         | Dead since Dec 2022              |
| Total users          | 699,318   | Need to migrate                  |
| Total accounts       | 94,679    | → Organizations                  |
| Monthly new subs     | ~93       | All go to modern model           |
| Progress records     | 2,957,917 | series_progresses - MUST MIGRATE |

### Content Data (download-egghead SQLite)

| Content     | Count | Status                    |
| ----------- | ----- | ------------------------- |
| Courses     | 420   | 330 pro, 90 free          |
| Lessons     | 5,132 | 5,051 published           |
| Videos      | 7,634 | **97.5% migrated to Mux** |
| Instructors | 134   |                           |
| Tags        | 627   |                           |

### Video Migration Status

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MUX VIDEO MIGRATION: 97.5%                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ████████████████████████████████████████████████████░░  7,441 / 7,634     │
│                                                                              │
│   ✅ updated (with mux_asset_id): 6,764                                      │
│   ⚠️  no_srt (missing subtitles): 677                                        │
│   ❌ missing_video (source gone): 193                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What We're NOT Migrating

- `session_activations` - Users can re-login, password reset OK
- Legacy `subscriptions` table - Dead code since Dec 2022
- `stripe_events` history - Start fresh
- Multi-tenant support - 95%+ is egghead.io

---

## Schema Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RAILS → COURSEBUILDER                                │
└─────────────────────────────────────────────────────────────────────────────┘

    RAILS                                    COURSEBUILDER
    ═════                                    ═════════════

    ┌─────────────────┐                      ┌─────────────────────────┐
    │    accounts     │                      │     Organization        │
    ├─────────────────┤                      ├─────────────────────────┤
    │ id              │ ──────────────────▶  │ id (new UUID)           │
    │ name            │ ──────────────────▶  │ name                    │
    │ slug            │ ──────────────────▶  │ fields.slug             │
    │ stripe_customer │ ──┐                  │                         │
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
    │ quantity        │ ──────────────────▶  │ fields.quantity         │
    │ interval        │ ──────────────────▶  │ fields.interval         │
    │ stripe_sub_id   │ ──┐                  │ merchantSubscriptionId  │
    └─────────────────┘   │                  └─────────────────────────┘
                          │
                          │                  ┌─────────────────────────┐
                          └────────────────▶ │  MerchantSubscription   │
                                             │  identifier = sub_xxx   │
                                             └─────────────────────────┘

    ┌─────────────────┐                      ┌─────────────────────────┐
    │     users       │                      │     Entitlement         │
    ├─────────────────┤                      ├─────────────────────────┤
    │ roles: [:pro]   │ ──────────────────▶  │ entitlementType = 'pro' │
    │                 │                      │ sourceType = 'SUB'      │
    │                 │                      │ sourceId = sub.id       │
    └─────────────────┘                      └─────────────────────────┘
```

---

## Webhook Events

| Event                           | Rails Delay | Action                             |
| ------------------------------- | ----------- | ---------------------------------- |
| `checkout.session.completed`    | None        | Create user + org + subscription   |
| `customer.subscription.created` | None        | Create org, send magic link        |
| `customer.subscription.updated` | **5 sec**   | Update subscription, sync access   |
| `customer.subscription.deleted` | None        | Cancel subscription, revoke access |
| `invoice.payment_succeeded`     | **1 min**   | Record transaction, extend period  |
| `invoice.payment_failed`        | None        | Log only (Stripe handles dunning)  |

### Why the delays?

**5-second delay on `subscription.updated`**: Race condition. `checkout.session.completed` and `subscription.updated` fire nearly simultaneously. The checkout handler creates the Organization, but if `subscription.updated` runs first, there's no Organization to update.

**1-minute delay on `invoice.payment_succeeded`**: Wait for Stripe to finalize the charge before recording the transaction.

---

## Coursebuilder Webhook Status

| Event                           | Status      | Notes                   |
| ------------------------------- | ----------- | ----------------------- |
| `checkout.session.completed`    | ✅ Working  | Sends to Inngest        |
| `charge.refunded`               | ✅ Working  | Updates purchase status |
| `customer.subscription.created` | ❌ **TODO** | Stub with console.log   |
| `customer.subscription.updated` | ❌ **TODO** | Stub with console.log   |
| `customer.subscription.deleted` | ❌ **TODO** | Stub with console.log   |

**The subscription handlers are the main work.**

---

## External Integrations

| Service     | On Subscribe                     | On Cancel                    |
| ----------- | -------------------------------- | ---------------------------- |
| ConvertKit  | Tag `paid_member`, `is_pro=true` | Remove tag, `is_pro=false`   |
| Customer.io | Track `subscribed`, sync attrs   | Track `subscription removed` |
| Discourse   | -                                | Force logout if loses pro    |
| Mixpanel    | Same as Customer.io              | **Consider deprecating**     |

---

## Repository Structure

```
migrate-egghead/
├── README.md                    # This file
├── .beads/                      # Issue tracking (git-backed)
├── course-builder/              # Coursebuilder submodule (TARGET)
├── download-egghead/            # Media migration toolkit
│   ├── egghead_videos.db        # SQLite: courses, lessons, videos, instructors
│   ├── send-to-mux.mjs          # Mux video migration script
│   ├── load-egghead-courses.mjs # Course data fetcher
│   └── egghead-sql/             # SQL exports for direct import
├── egghead-next/                # Next.js frontend (submodule) - KILL
├── egghead-rails/               # Rails backend (submodule) - KILL
├── investigation/               # Effect-TS analysis toolkit
│   └── src/
│       ├── lib/
│       │   ├── db.ts            # PostgreSQL connection (Rails)
│       │   ├── mysql.ts         # PlanetScale connection (Coursebuilder)
│       │   └── sqlite.ts        # SQLite connection (download-egghead)
│       └── queries/
│           ├── subscriptions.ts # Subscription analysis
│           ├── table-activity.ts # Rails DB write activity
│           └── sqlite-explore.ts # Media DB exploration
└── reports/
    ├── STRIPE_WEBHOOK_MIGRATION.md      # Webhook migration guide
    ├── COURSEBUILDER_SCHEMA_ANALYSIS.md # Target schema analysis
    ├── MIGRATION_DATA_REPORT.md         # Full data analysis
    └── UI_MIGRATION_ANALYSIS.md         # Detailed UI gap analysis
```

---

## Beads (Issue Tracking)

Epic: `migrate-egghead-39p` - Kill egghead-rails and egghead-next

| ID  | Task                                             | Priority | Status |
| --- | ------------------------------------------------ | -------- | ------ |
| .1  | Schema design: Map Rails models to Coursebuilder | P0       | open   |
| .2  | User/Account migration pipeline (699K users)     | P0       | open   |
| .3  | Subscription data migration (3,335 active)       | P0       | open   |
| .4  | Progress data migration (3M records)             | P0       | open   |
| .5  | Content migration: Courses, lessons, videos      | P0       | open   |
| .6  | Stripe webhook handlers (Inngest)                | P1       | open   |
| .7  | Video player + lesson view + search              | P1       | open   |
| .8  | User profiles + instructor pages                 | P2       | open   |
| .9  | Auth cutover: NextAuth + OAuth migration         | P1       | open   |
| .10 | DNS + traffic cutover runbook                    | P1       | open   |

```bash
# Check current status
bd ready

# Start a task
bd start migrate-egghead-39p.1

# Close when done
bd done migrate-egghead-39p.1 "Completed schema mapping"
```

---

## Zero-Downtime Strategy

Based on patterns from **Designing Data-Intensive Applications** and **Building Event-Driven Microservices**:

### Phase 1: Shadow Mode (Data Migration)

```
Rails (PRIMARY) ──────────────────────────────────────────────────────────────►

Coursebuilder   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                │
                └─ Bulk import users, accounts, subscriptions, progress
                   (one-time, can run multiple times to catch up)
```

### Phase 2: Dual Write (Webhooks)

```
Stripe ─────┬─────► Rails (PRIMARY) ─────► PostgreSQL
            │                                  │
            │                                  │ Compare
            │                                  ▼
            └─────► Coursebuilder (SHADOW) ─► PlanetScale
                    Logs divergence, builds confidence
```

### Phase 3: Flip Primary

```
Stripe ─────┬─────► Rails (SHADOW) ──────► PostgreSQL (read-only)
            │                                  │
            │                                  │ Verify
            │                                  ▼
            └─────► Coursebuilder (PRIMARY) ► PlanetScale
                    Quick rollback if issues
```

### Phase 4: Kill

```
Stripe ──────────► Coursebuilder ──────────► PlanetScale

Rails ─────────────────────────────────────► ARCHIVED
egghead-next ──────────────────────────────► ARCHIVED
```

### Key Principles

- **No big bang** - Gradual cutover with rollback at each step
- **Stripe webhooks as source of truth** - Event-driven sync
- **Users can re-login** - No session migration needed
- **Password reset flow** - Clean auth cutover

---

## Running the Investigation Toolkit

```bash
cd investigation

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Add DATABASE_URL (Rails Postgres) and NEW_DATABASE_URL (PlanetScale)

# Run queries
pnpm tsx src/queries/subscriptions.ts
pnpm tsx src/queries/tenants.ts
pnpm tsx src/queries/migration-status.ts
```

---

## Key Files in Rails

| File                                          | Purpose                   |
| --------------------------------------------- | ------------------------- |
| `app/controllers/stripe_events_controller.rb` | Webhook entry point       |
| `app/models/stripe_webhook_event.rb`          | Event persistence         |
| `app/models/account_subscription.rb`          | Modern subscription model |
| `app/models/account.rb`                       | Customer container        |
| `app/workers/stripe/`                         | Sidekiq background jobs   |

## Key Files in Coursebuilder

| File                                                           | Purpose             |
| -------------------------------------------------------------- | ------------------- |
| `packages/core/src/lib/pricing/process-stripe-webhook.ts`      | Webhook router      |
| `packages/core/src/inngest/stripe/`                            | Inngest handlers    |
| `packages/adapter-drizzle/src/lib/mysql/schemas/commerce/`     | Commerce schemas    |
| `packages/adapter-drizzle/src/lib/mysql/schemas/entitlements/` | Entitlement schemas |

---

## UI Migration: What Coursebuilder Already Has

The egghead app in Coursebuilder (`course-builder/apps/egghead`) already has **significant infrastructure**:

| Feature             | Status  | Notes                                     |
| ------------------- | ------- | ----------------------------------------- |
| Auth system         | ✅ Done | NextAuth v5 + CASL RBAC                   |
| Content model       | ✅ Done | ContentResource (posts, lessons, courses) |
| Video pipeline      | ✅ Done | Mux encoding, Deepgram transcription      |
| Background jobs     | ✅ Done | Inngest                                   |
| Search provider     | ✅ Done | Typesense (same as egghead-next!)         |
| Egghead API sync    | ✅ Done | Bi-directional                            |
| 27+ shared packages | ✅ Done |                                           |

### What Needs Building

| Feature                 | Priority | Effort | Notes                                      |
| ----------------------- | -------- | ------ | ------------------------------------------ |
| Video player            | P0       | Medium | Use CB's Mux player, not xstate complexity |
| Progress tracking       | P0       | High   | 3M records to migrate                      |
| Pro/free gating         | P0       | Low    | Wire up Entitlements                       |
| Search UI               | P1       | Medium | Port InstantSearch components              |
| Subscription management | P1       | Medium | Stripe portal integration                  |
| Pricing page            | P1       | Medium | Port with shadcn                           |
| User profile            | P2       | Low    | Basic settings                             |
| Team management         | P3       | High   | Defer to post-launch                       |

---

## URL Redirect Strategy (SEO Critical)

```typescript
// next.config.ts
export default {
  async redirects() {
    return [
      // Instructors: ONE dynamic route, not 20+ hardcoded
      {
        source: "/i/:slug",
        destination: "/instructors/:slug",
        permanent: true,
      },
      {
        source: "/i/:slug/rss.xml",
        destination: "/instructors/:slug/rss",
        permanent: true,
      },

      // Legacy content URLs
      {
        source: "/playlists/:slug",
        destination: "/courses/:slug",
        permanent: true,
      },
      { source: "/s/:slug", destination: "/courses/:slug", permanent: true },
      { source: "/browse/:topic", destination: "/q/:topic", permanent: true },

      // User routes
      { source: "/user", destination: "/profile", permanent: true },
      {
        source: "/user/:path*",
        destination: "/profile/:path*",
        permanent: true,
      },
    ];
  },
};
```

### Search URLs (MUST PRESERVE)

These drive organic traffic - massive sitemap from topic combinations:

```
/q/react                              → Topic search
/q/react-typescript                   → Combined topics
/q/react-resources-by-kent-c-dodds    → Filtered by instructor
```

**Implementation**: One dynamic route `/q/[[...all]]/page.tsx` that parses URL segments into Typesense filters.

---

## Technical Decisions

| Decision          | Choice                     | Rationale                              |
| ----------------- | -------------------------- | -------------------------------------- |
| Video player      | Coursebuilder's Mux player | Simpler than porting xstate complexity |
| Progress tracking | Build new in CB            | Clean break, migrate 3M records        |
| Search            | Same Typesense, new UI     | Port InstantSearch components          |
| Instructor pages  | One dynamic route          | Not 20+ hardcoded components           |
| Team features     | Defer post-launch          | Complex, few users                     |
| State management  | React state                | Not xstate machines                    |

---

## The End State

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         🎉 RAILS IS DEAD 🎉                                  │
│                                                                              │
│   • All subscriptions managed by Coursebuilder                              │
│   • All webhooks handled by Next.js + Inngest                               │
│   • All users authenticated via Coursebuilder                               │
│   • PostgreSQL archived (read-only backup)                                  │
│   • Heroku bill: $0                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
