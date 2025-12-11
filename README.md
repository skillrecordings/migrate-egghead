# Kill the Rails App

> **Mission**: Migrate egghead subscription handling from Rails to Coursebuilder  
> **Status**: Investigation complete, ready to execute  
> **Updated**: December 11, 2025

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

**What we're actually doing**: Moving webhook handlers from Rails/Sidekiq to Next.js/Inngest. The data model migration happened 3 years ago.

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

| Metric               | Value           | Notes                   |
| -------------------- | --------------- | ----------------------- |
| Active subscriptions | 3,335           | All in modern model     |
| Legacy subscriptions | 0               | Dead since Dec 2022     |
| Total users          | 699,318         | Need to migrate         |
| Total accounts       | 94,679          | → Organizations         |
| Monthly new subs     | ~93             | All go to modern model  |
| Multi-tenant usage   | 95%+ egghead.io | Can ignore multi-tenant |

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
├── course-builder/              # Coursebuilder submodule
├── egghead-next/                # Next.js frontend (submodule)
├── egghead-rails/               # Rails backend (submodule) - THE TARGET
├── investigation/               # Effect-TS analysis toolkit
│   └── src/
│       ├── lib/
│       │   ├── db.ts            # PostgreSQL connection (Rails)
│       │   └── mysql.ts         # PlanetScale connection (Coursebuilder)
│       └── queries/
│           ├── subscriptions.ts # Subscription analysis
│           ├── tenants.ts       # Multi-tenant analysis
│           └── migration-status.ts
└── reports/
    ├── STRIPE_WEBHOOK_MIGRATION.md    # Detailed webhook migration guide
    ├── COURSEBUILDER_SCHEMA_ANALYSIS.md # Target schema analysis
    └── MIGRATION_DATA_REPORT.md       # Full data analysis
```

---

## What We're NOT Doing

1. **Migrating legacy `subscriptions` table** - Dead. 0 active. Ignore it.
2. **Multi-tenant support** - 95%+ is egghead.io. Build single-tenant.
3. **Dual-write to legacy** - Only write to modern model.
4. **Migrating `stripe_events` history** - Start fresh in Next.js.

---

## Next Steps

### Phase 1: Data Migration Script

- [ ] Write Effect-TS migration script
- [ ] Map Rails accounts → Coursebuilder Organizations
- [ ] Map account_subscriptions → Subscription + MerchantSubscription
- [ ] Create MerchantCustomer records from stripe_customer_id
- [ ] Create Entitlement records from :pro roles
- [ ] Dry run with subset
- [ ] Full migration

### Phase 2: Webhook Handlers

- [ ] Implement `customer.subscription.created` in Coursebuilder
- [ ] Implement `customer.subscription.updated` with 5-sec delay
- [ ] Implement `customer.subscription.deleted`
- [ ] Implement `invoice.payment_succeeded` with 1-min delay
- [ ] Add ConvertKit integration
- [ ] Add Customer.io integration
- [ ] Add Discourse logout on cancel

### Phase 3: Dual Write

- [ ] Configure Stripe to send webhooks to both endpoints
- [ ] Add comparison logging
- [ ] Monitor for divergence
- [ ] Build confidence

### Phase 4: Cutover

- [ ] Switch Stripe webhook URL to Next.js only
- [ ] Migrate auth to Coursebuilder
- [ ] Archive Rails PostgreSQL
- [ ] Shut down Heroku

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
