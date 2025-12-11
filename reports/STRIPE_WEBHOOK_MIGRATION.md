# Stripe Webhook Migration: Rails to Next.js

> **Audience**: Engineers familiar with egghead systems but rusty on details  
> **Scope**: Subscription lifecycle only (not one-off purchases)  
> **Updated**: December 11, 2025

---

## Executive Summary

**Good news: The hard part is done.** All subscriptions already use the modern `account_subscriptions` model. No data migration needed.

| What                                  | Status                 |
| ------------------------------------- | ---------------------- |
| Legacy `subscriptions` active         | **0** (all NULL state) |
| Modern `account_subscriptions` active | **3,335**              |
| New subs going to legacy              | **0** since Dec 2022   |
| Multi-tenant usage                    | **95%+ egghead.io**    |

**What we're actually migrating**: Webhook handlers from Rails/Sidekiq to Next.js/Inngest. The data model is already correct.

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT STATE                                      │
└─────────────────────────────────────────────────────────────────────────────┘

                              Stripe Webhook
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Rails /stripe_events        │
                    │   (what we're replacing)      │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌─────────────────────┐       ┌─────────────────────┐
        │  Legacy Model       │       │  Modern Model       │
        │  (DEAD)             │       │  (ACTIVE)           │
        ├─────────────────────┤       ├─────────────────────┤
        │  subscriptions      │       │  accounts           │
        │  • 68K records      │       │  • 95K records      │
        │  • 0 active         │       │                     │
        │  • All state=NULL   │       │  account_subscriptions│
        │  • No writes since  │       │  • 55K records      │
        │    Dec 2022         │       │  • 3,335 active     │
        └─────────────────────┘       └─────────────────────┘
                 ❌                            ✅
           IGNORE THIS                   TARGET THIS
```

---

## Data Model (Modern Only)

```
┌──────────────────┐         ┌──────────────────────┐
│     Account      │         │  AccountSubscription │
├──────────────────┤         ├──────────────────────┤
│ id               │◄────────│ account_id           │
│ stripe_customer_id│   1:N  │ stripe_subscription_id│
│ slug             │         │ status               │
│ name             │         │ quantity (-1=unlimited)│
│ guid             │         │ interval (month/year)│
└────────┬─────────┘         │ price (cents)        │
         │                   │ current_period_end   │
         │ 1:N               │ cancel_at_period_end │
         ▼                   └──────────────────────┘
┌──────────────────┐
│   AccountUser    │         ┌──────────────────────┐
├──────────────────┤         │        User          │
│ account_id       │────────►├──────────────────────┤
│ user_id          │    N:1  │ id, email            │
│ roles            │         │ roles: [:pro, :account_owner, ...]│
└──────────────────┘         └──────────────────────┘
```

### Key Numbers

| Table                 | Total   | Active | Notes                       |
| --------------------- | ------- | ------ | --------------------------- |
| accounts              | 94,679  | -      | All have stripe_customer_id |
| account_subscriptions | 54,853  | 3,335  | 77% canceled (historical)   |
| users                 | 699,318 | -      |                             |

### Subscription Status Values

```typescript
// Enable access
const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

// Disable access
const INACTIVE_STATUSES = [
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
];

// Seat count
const UNLIMITED_SEATS = -1;
```

---

## Webhook Events to Handle

| Event                           | Delay     | What It Does                         |
| ------------------------------- | --------- | ------------------------------------ |
| `checkout.session.completed`    | None      | Create user + account + subscription |
| `customer.subscription.created` | None      | Create account, send magic link      |
| `customer.subscription.updated` | **5 sec** | Update subscription, sync access     |
| `customer.subscription.deleted` | None      | Cancel subscription, revoke access   |
| `invoice.payment_succeeded`     | **1 min** | Record transaction, extend period    |
| `invoice.payment_failed`        | None      | Log only (Stripe handles dunning)    |

### Why the Delays?

**5-second delay on `subscription.updated`**: Race condition. `checkout.session.completed` and `subscription.updated` fire nearly simultaneously. The checkout handler creates the Account, but if `subscription.updated` runs first, there's no Account to update.

```
WITHOUT DELAY (BROKEN):
  0ms:   checkout.session.completed → queues account creation
  10ms:  subscription.updated → runs immediately → NO ACCOUNT EXISTS → 💥

WITH DELAY (CORRECT):
  0ms:   checkout.session.completed → queues account creation
  100ms: account created
  5000ms: subscription.updated → account exists → ✅
```

**1-minute delay on `invoice.payment_succeeded`**: Wait for Stripe to finalize the charge before recording the transaction.

---

## Subscription Lifecycle Flows

### New Subscription

```
User clicks Subscribe
        │
        ▼
┌─────────────────────────────┐
│  Stripe Checkout Session    │
└─────────────┬───────────────┘
              │ Payment succeeds
              ▼
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ checkout.session.completed  │     │ subscription.created        │
│ • Find/create User          │     │ • Find/create User          │
│ • Create Account            │     │ • Create Account            │
│ • Create AccountSubscription│     │ • Send magic sign-in link   │
│ • Grant :pro role           │     │ • Grant :pro role           │
│ • ConvertKit: add paid_member│    │ • ConvertKit sync           │
│ • Customer.io: track        │     └─────────────────────────────┘
└─────────────────────────────┘
              │
              │ 5 sec delay
              ▼
┌─────────────────────────────┐
│ subscription.updated        │
│ • Update AccountSubscription│
│ • Sync access levels        │
│ • Customer.io: sync plan    │
└─────────────────────────────┘
```

### Renewal

```
Stripe charges card
        │
        ▼
┌─────────────────────────────┐
│ invoice.payment_succeeded   │
└─────────────┬───────────────┘
              │ 1 min delay
              ▼
┌─────────────────────────────┐
│ • Update current_period_end │
│ • Record Transaction        │
│ • Customer.io: track 'billed'│
└─────────────────────────────┘
```

### Cancellation

```
User cancels OR subscription expires
        │
        ▼
┌─────────────────────────────┐
│ subscription.deleted        │
│ • Update status to canceled │
│ • account.review_access!    │
│   └─ Remove :pro if no other│
│      active subs/gifts      │
│ • ConvertKit: remove tag    │
│ • Discourse: force logout   │
│ • Track 'subscription removed'│
└─────────────────────────────┘
```

---

## External Integrations

### ConvertKit (Email Marketing)

| Trigger   | Action                                   |
| --------- | ---------------------------------------- |
| Subscribe | Tag `paid_member`, set `is_pro=true`     |
| Cancel    | Remove `paid_member`, set `is_pro=false` |

Respects `user.opted_out?` - skip if true.

### Customer.io (Transactional + Analytics)

| Event                  | Trigger          |
| ---------------------- | ---------------- |
| `subscribed`           | New subscription |
| `billed`               | Renewal payment  |
| `subscription removed` | Cancellation     |

Also syncs user attributes: `is_pro`, `Plan_Interval`, etc.

### Discourse (Forum)

On cancel (if user loses pro): Force logout via API.

### Mixpanel

Same events as Customer.io. **Consider deprecating** - redundant.

---

## Migration Checklist

### Phase 1: Foundation

- [ ] Single webhook endpoint: `/api/stripe/webhook`
- [ ] Stripe signature verification (drop the legacy API key auth)
- [ ] Event deduplication (check if already processed)
- [ ] Error tracking (Sentry)

### Phase 2: Event Handlers

- [ ] `checkout.session.completed`
- [ ] `customer.subscription.created`
- [ ] `customer.subscription.updated` (with 5-sec delay via Inngest)
- [ ] `customer.subscription.deleted`
- [ ] `invoice.payment_succeeded` (with 1-min delay)
- [ ] `invoice.payment_failed` (logging only)

### Phase 3: Background Jobs (Inngest)

- [ ] Account creation flow
- [ ] Subscription update flow
- [ ] Access level review (`review_access_levels!` logic)
- [ ] Race condition handling

### Phase 4: External Integrations

- [ ] ConvertKit tagging
- [ ] Customer.io identify + track
- [ ] Discourse logout on cancel
- [ ] Deprecate Mixpanel (or keep, your call)

### Phase 5: Cutover

- [ ] Run both systems in parallel
- [ ] Compare results
- [ ] Switch Stripe webhook URL
- [ ] Deprecate Rails endpoints

---

## What We're NOT Migrating

1. **Legacy `subscriptions` table** - Dead. 0 active. Ignore it.
2. **Multi-tenant logic** - 95%+ is egghead.io. Build single-tenant.
3. **Dual-write code** - Only write to `account_subscriptions`.
4. **Bot user auth** - Use Stripe signature verification only.
5. **stripe_events history** - Start fresh in Next.js.

---

## Key Patterns to Keep

1. **Idempotency** - Check if event already processed before handling
2. **Delayed processing** - 5 sec for updates, 1 min for invoices
3. **Access review** - Multiple paths to :pro (subscription, gift, lifetime, team)

---

## Appendix: Account Access Logic

The `:pro` role can come from multiple sources. When checking access:

```typescript
function hasProAccess(user: User): boolean {
  return (
    hasActiveSubscription(user) ||
    hasActiveGift(user) ||
    isLifetimeSubscriber(user) ||
    isTeamMember(user) ||
    hasSpecialRole(user) // instructor, etc.
  );
}
```

On subscription cancel, don't just remove `:pro` - check if they have access through another path first.

---

## Document History

- **December 2024**: Initial analysis
- **December 11, 2025**: Updated with data verification - confirmed modern model is sole source of truth, legacy model is dead
