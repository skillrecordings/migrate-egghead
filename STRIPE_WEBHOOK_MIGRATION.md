# Stripe Webhook Migration: Rails to Next.js

> **Audience**: Engineers familiar with egghead systems but rusty on details  
> **Scope**: Subscription lifecycle only (not one-off purchases)  
> **Generated**: December 2024

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Request Lifecycle](#request-lifecycle)
4. [Data Models](#data-models)
5. [Subscription Event Handlers](#subscription-event-handlers)
6. [Background Workers](#background-workers)
7. [External Integrations](#external-integrations)
8. [Multi-Tenant Architecture](#multi-tenant-architecture)
9. [Migration Recommendations](#migration-recommendations)
10. [Appendix: Full Event Handler Reference](#appendix-full-event-handler-reference)

---

## Executive Summary

The Rails app (`egghead-rails`) handles Stripe webhooks through **two parallel systems**:

1. **Legacy Controller**: `StripeEventsController` at `/stripe_events`
2. **StripeEvent Gem**: Mounted at `/webhooks/stripe`

Both systems maintain **dual subscription models**:

- **Legacy**: `Subscription`, `ManagedSubscription` (user-centric)
- **Modern**: `Account`, `AccountSubscription` (account-centric, Next.js compatible)

**Key Complexity Drivers**:

- Multi-tenant architecture (egghead.io + partner products)
- Race condition mitigation via delayed workers
- 11+ background workers for async processing
- 4 external integrations (ConvertKit, Customer.io, Mixpanel, Discourse)

**Recommendation**: Migrate to single-tenant architecture in Next.js. Multi-tenancy was built for a white-label business model that no longer exists.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STRIPE WEBHOOKS                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
        ┌───────────────────────┐           ┌───────────────────────┐
        │   /stripe_events      │           │   /webhooks/stripe    │
        │   (Legacy Controller) │           │   (StripeEvent Gem)   │
        └───────────┬───────────┘           └───────────┬───────────┘
                    │                                   │
                    ▼                                   ▼
        ┌───────────────────────┐           ┌───────────────────────┐
        │ StripeEventsController│           │ Stripe::Receivers::*  │
        │ • API key validation  │           │ • Signature validation│
        │ • Tenant resolution   │           │ • Tenant resolution   │
        │ • Event deduplication │           │ • Event logging       │
        └───────────┬───────────┘           └───────────┬───────────┘
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      ▼
                    ┌─────────────────────────────────────┐
                    │         StripeWebhookEvent          │
                    │  (Deduplication & Status Tracking)  │
                    │  received → processing → processed  │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
        ┌───────────────────────┐           ┌───────────────────────┐
        │   Legacy Models       │           │   Modern Models       │
        │   • Subscription      │           │   • Account           │
        │   • ManagedSubscription│          │   • AccountSubscription│
        │   • User              │           │   • AccountUser       │
        └───────────────────────┘           └───────────────────────┘
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      ▼
                    ┌─────────────────────────────────────┐
                    │         Background Workers          │
                    │  (Sidekiq - 11+ subscription jobs)  │
                    └─────────────────┬───────────────────┘
                                      │
            ┌─────────────┬───────────┼───────────┬─────────────┐
            ▼             ▼           ▼           ▼             ▼
      ┌──────────┐  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
      │ConvertKit│  │Customer.io│ │ Mixpanel │ │ Discourse│ │  Stripe  │
      │  (Email) │  │(Analytics)│ │(Analytics)│ │ (Forum)  │ │  (API)   │
      └──────────┘  └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## Request Lifecycle

### Webhook Request Flow (13 Steps)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. HTTP POST arrives at /stripe_events                                       │
│    └─ Query params: ?api_key=xxx&site_name=egghead.io                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ 2. WebhookBaseController#authenticate_bot_user!                              │
│    └─ Validates API key OR bot user OAuth token                              │
│    └─ Signs in stripe+bot@egghead.io user                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ 3. StripeWebhookTenant resolves tenant                                       │
│    └─ Try 1: metadata.client_id → SiteTenant                                 │
│    └─ Try 2: product_id → client_id mapping                                  │
│    └─ Try 3: site_name param → SiteTenant                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ 4. ActsAsTenant.with_tenant(tenant) { ... }                                  │
│    └─ All DB queries scoped to this tenant                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ 5. Deduplication check                                                       │
│    └─ StripeWebhookEvent.already_processed?(event_id)                        │
│    └─ If true → return 200 immediately                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ 6. Create/find StripeWebhookEvent record                                     │
│    └─ Status: received (0)                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ 7. Dynamic method dispatch                                                   │
│    └─ event_method = "stripe_#{event_type.gsub('.', '_')}"                   │
│    └─ e.g., customer.subscription.updated → stripe_customer_subscription_updated│
├──────────────────────────────────────────────────────────────────────────────┤
│ 8. Check if handler exists                                                   │
│    └─ self.class.private_method_defined?(event_method)                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ 9. Execute handler (if exists)                                               │
│    └─ @event.processing!                                                     │
│    └─ self.send(event_method, @event.event_object)                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ 10. Mark as processed                                                        │
│     └─ @event.mark_as_processed                                              │
│     └─ Sets: status=processed, error_identifier=nil                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ 11. Return HTTP response                                                     │
│     └─ 200: Processed successfully                                           │
│     └─ 400: No handler defined (logged but no-op)                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ 12. Error handling (rescue block)                                            │
│     └─ @event.record_error(exception)                                        │
│     └─ Logs to Honeybadger, sets error_identifier                            │
│     └─ Status stays "processing"                                             │
│     └─ Returns 500 (Stripe will retry)                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ 13. Idempotency on retry                                                     │
│     └─ already_processed? returns false if error_identifier present          │
│     └─ Allows retry after manual intervention                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Event Status State Machine

```
                    ┌─────────────┐
                    │  received   │ ← Default on creation
                    │    (0)      │
                    └──────┬──────┘
                           │ @event.processing!
                           ▼
                    ┌─────────────┐
              ┌─────│ processing  │─────┐
              │     │    (1)      │     │
              │     └─────────────┘     │
              │                         │
    Exception │                         │ Success
              │                         │
              ▼                         ▼
    ┌─────────────────┐       ┌─────────────┐
    │   processing    │       │  processed  │
    │ error_identifier│       │    (2)      │
    │   = UUID        │       │ error = nil │
    └─────────────────┘       └─────────────┘
              │
              │ Manual fix + retry
              ▼
    ┌─────────────────┐
    │  processed (2)  │
    │ error = nil     │
    └─────────────────┘
```

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MODERN SYSTEM (Target)                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────────┐
│     Account      │         │  AccountSubscription │
├──────────────────┤         ├──────────────────────┤
│ id               │◄────────│ account_id           │
│ slug             │    1:N  │ stripe_subscription_id│
│ name             │         │ quantity             │
│ stripe_customer_id│        │ status               │
│ guid             │         │ current_period_end   │
│ team_invite_id   │         │ current_period_start │
└────────┬─────────┘         │ cancel_at_period_end │
         │                   │ interval             │
         │ 1:N               │ price                │
         ▼                   └──────────────────────┘
┌──────────────────┐
│   AccountUser    │
├──────────────────┤         ┌──────────────────────┐
│ account_id       │         │        User          │
│ user_id          │────────►├──────────────────────┤
│ roles            │    N:1  │ id                   │
│ created_at       │         │ email                │
└──────────────────┘         │ roles (array)        │
                             │ • :pro               │
                             │ • :account_owner     │
                             │ • :account_member    │
                             └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           LEGACY SYSTEM (Deprecated)                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────────┐
│   Subscription   │         │  ManagedSubscription │
├──────────────────┤         ├──────────────────────┤
│ id               │◄────────│ subscription_id      │
│ user_id          │    1:1  │ user_limit           │
│ plan_id          │         │ organization_name    │
│ stripe_id (cust) │         └──────────────────────┘
│ stripe_subscription_id│
│ state            │
│ current_price    │
│ currentPeriodEnd │
│ cancelled_on     │
│ willCancelAfterPeriod│
│ is_managed       │
└──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           WEBHOOK TRACKING                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────┐
│  StripeWebhookEvent  │         │    SiteTenant    │
├──────────────────────┤         ├──────────────────┤
│ id                   │         │ id               │
│ stripe_id (event)    │────────►│ name             │
│ stripe_type          │    N:1  │ application_id   │
│ status (enum 0-2)    │         │ (Doorkeeper app) │
│ error_identifier     │         └──────────────────┘
│ site_tenant_id       │
│ created_at           │
└──────────────────────┘
```

### Key Schema Details

#### stripe_events (StripeWebhookEvent)

```sql
CREATE TABLE stripe_events (
  id BIGSERIAL PRIMARY KEY,
  stripe_id VARCHAR,           -- Unique Stripe event ID (evt_xxx)
  stripe_type VARCHAR,         -- e.g., "customer.subscription.updated"
  status INTEGER DEFAULT 0,    -- 0=received, 1=processing, 2=processed
  error_identifier VARCHAR,    -- Honeybadger UUID on failure
  site_tenant_id BIGINT,       -- FK to site_tenants
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Unique constraint on stripe_id (via model validation)
```

#### account_subscriptions

```sql
CREATE TABLE account_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT,
  stripe_subscription_id VARCHAR UNIQUE,
  quantity INTEGER NOT NULL,           -- Seat count (-1 = unlimited)
  status VARCHAR,                      -- active, trialing, canceled, etc.
  current_period_end INTEGER,          -- Unix timestamp
  current_period_start INTEGER,        -- Unix timestamp
  cancel_at_period_end BOOLEAN,
  interval VARCHAR,                    -- "month" or "year"
  interval_count INTEGER,
  price INTEGER,                       -- Cents
  subscribable_id BIGINT,              -- Polymorphic (SubscriptionPlan)
  subscribable_type VARCHAR,
  coupon_id BIGINT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### Subscription Status Constants

```ruby
# AccountSubscription
STATUSES_FOR_ENABLED_ACCOUNT = %w[trialing active past_due]
STATUSES_FOR_DISABLED_ACCOUNT = %w[incomplete incomplete_expired canceled unpaid]
UNLIMITED_SEATS = -1
```

---

## Subscription Event Handlers

### Event Handler Summary

| Event Type                      | Handler Method                         | Delay     | Primary Action                  |
| ------------------------------- | -------------------------------------- | --------- | ------------------------------- |
| `checkout.session.completed`    | `stripe_checkout_session_completed`    | None      | Create user + account           |
| `customer.subscription.created` | `stripe_customer_subscription_created` | None      | Create account, send magic link |
| `customer.subscription.updated` | `stripe_customer_subscription_updated` | **5 sec** | Update subscription state       |
| `customer.subscription.deleted` | `stripe_customer_subscription_deleted` | None      | Cancel subscription             |
| `invoice.payment_succeeded`     | `stripe_invoice_payment_succeeded`     | **1 min** | Record transaction              |
| `invoice.payment_failed`        | `stripe_invoice_payment_failed`        | None      | Log only (no-op)                |

### Subscription Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEW SUBSCRIPTION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Subscribe" on pricing page
            │
            ▼
┌───────────────────────────────────────┐
│     Stripe Checkout Session           │
│     (hosted payment page)             │
└───────────────────┬───────────────────┘
                    │ Payment succeeds
                    ▼
┌───────────────────────────────────────┐     ┌───────────────────────────────┐
│  checkout.session.completed           │     │  customer.subscription.created │
│  (fires first, usually)               │     │  (fires ~same time)            │
└───────────────────┬───────────────────┘     └───────────────────┬───────────┘
                    │                                             │
                    ▼                                             ▼
┌───────────────────────────────────────┐     ┌───────────────────────────────┐
│  StripeCheckoutSubscriptionService    │     │  StripeCreateSubscriptionService│
│  • Find/create User                   │     │  • Find/create User            │
│  • Queue EggheadNextAccountCreator    │     │  • Queue EggheadNextAccountCreator│
│  • Track 'subscribed' analytics       │     │  • Add :pro role directly      │
│  • Credit referrer ($20)              │     │  • Send magic sign-in link     │
└───────────────────┬───────────────────┘     └───────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  EggheadNextAccountCreatorWorker      │
│  • Create Account                     │
│  • Create AccountSubscription         │
│  • Add :account_owner role            │
│  • Add :account_member role           │
│  • Add :pro role                      │
└───────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  customer.subscription.updated        │
│  (fires after subscription created)   │
└───────────────────┬───────────────────┘
                    │
                    │ 5 SECOND DELAY (race condition mitigation)
                    ▼
┌───────────────────────────────────────┐
│  CustomerSubscriptionUpdaterWorker    │
│  • Check if Account exists            │
│  │  └─ If not: reschedule 5 sec       │
│  • Update AccountSubscription         │
│  • Update legacy Subscription         │
│  • Review user access levels          │
│  • Sync plan to Customer.io           │
└───────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         RENEWAL FLOW                                         │
└─────────────────────────────────────────────────────────────────────────────┘

Stripe charges card on renewal date
            │
            ▼
┌───────────────────────────────────────┐
│  invoice.payment_succeeded            │
└───────────────────┬───────────────────┘
                    │
                    │ 1 MINUTE DELAY (wait for charge finalization)
                    ▼
┌───────────────────────────────────────┐
│  StripeInvoicePaymentSucceededWorker  │
│  • Update Subscription.currentPeriodEnd│
│  • Activate disabled ManagedSubscription│
│  • Queue RecordTransactionWorker      │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  RecordTransactionWorker              │
│  • Create Transaction record          │
│  • Send receipt email                 │
└───────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         CANCELLATION FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

User cancels OR subscription expires
            │
            ▼
┌───────────────────────────────────────┐
│  customer.subscription.deleted        │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  stripe_customer_subscription_deleted │
│  • If subscription_manager:           │
│  │  └─ subscription.hard_cancel!      │
│  • Update AccountSubscription status  │
│  • account.review_access_levels!      │
│  │  └─ Remove :pro role (if no other  │
│  │     active subs, gifts, etc.)      │
│  • Queue ConvertkitTagWorker          │
│  │  └─ Remove 'paid_member' tag       │
│  • Queue CommunityRemoveOnCancelWorker│
│  │  └─ Log out from Discourse forum   │
│  • Track 'subscription removed'       │
└───────────────────────────────────────┘
```

### Race Condition: Why the 5-Second Delay?

```
WITHOUT DELAY (BROKEN):
═══════════════════════

Time 0ms:   checkout.session.completed fires
            └─ Queues EggheadNextAccountCreatorWorker

Time 10ms:  customer.subscription.updated fires
            └─ CustomerSubscriptionUpdaterWorker runs IMMEDIATELY
            └─ Account doesn't exist yet!
            └─ FAILS or creates duplicate

Time 100ms: EggheadNextAccountCreatorWorker runs
            └─ Creates Account (too late!)


WITH 5-SECOND DELAY (CORRECT):
══════════════════════════════

Time 0ms:   checkout.session.completed fires
            └─ Queues EggheadNextAccountCreatorWorker

Time 10ms:  customer.subscription.updated fires
            └─ Schedules CustomerSubscriptionUpdaterWorker for T+5000ms

Time 100ms: EggheadNextAccountCreatorWorker runs
            └─ Creates Account + AccountSubscription

Time 5000ms: CustomerSubscriptionUpdaterWorker runs
             └─ Account exists!
             └─ Updates AccountSubscription successfully
```

**Fallback**: If account still missing after 5 seconds, worker reschedules itself ONCE with `postponed: true` flag. If still missing after second attempt, sends Honeybadger alert.

---

## Background Workers

### Worker Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WEBHOOK EVENT HANDLERS                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ checkout.     │     │ subscription.   │     │ subscription.   │
│ session.      │     │ updated         │     │ deleted         │
│ completed     │     │                 │     │                 │
└───────┬───────┘     └────────┬────────┘     └────────┬────────┘
        │                      │                       │
        │                      │ 5 sec delay           │
        ▼                      ▼                       │
┌───────────────────┐  ┌───────────────────┐          │
│ EggheadNext       │  │ CustomerSub       │          │
│ AccountCreator    │  │ UpdaterWorker     │          │
│ Worker            │  └─────────┬─────────┘          │
└─────────┬─────────┘            │                    │
          │                      │                    │
          │              ┌───────┴───────┐            │
          │              ▼               ▼            │
          │    ┌─────────────┐  ┌─────────────┐       │
          │    │ CIOSync     │  │ Stripe      │       │
          │    │ UserWorker  │  │ Postpone    │       │
          │    └─────────────┘  │ Worker      │       │
          │                     └─────────────┘       │
          │                                           │
          └───────────────────────────────────────────┤
                                                      │
                    ┌─────────────────────────────────┤
                    │                                 │
                    ▼                                 ▼
          ┌─────────────────┐               ┌─────────────────┐
          │ TrackAnalytics  │               │ ConvertkitTag   │
          │ Worker          │               │ Worker          │
          └─────────────────┘               └────────┬────────┘
                    │                                │
          ┌────────┴────────┐                        │
          ▼                 ▼                        │
    ┌──────────┐      ┌──────────┐                   │
    │Customer.io│     │ Mixpanel │                   │
    └──────────┘      └──────────┘                   │
                                                     │
                                                     ▼
                                          ┌─────────────────┐
                                          │ CommunityRemove │
                                          │ OnCancelWorker  │
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                            ┌──────────┐
                                            │ Discourse│
                                            └──────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                    INVOICE PAYMENT FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────┐
│ invoice.payment   │
│ _succeeded        │
└─────────┬─────────┘
          │
          │ 1 min delay
          ▼
┌───────────────────┐
│ StripeInvoice     │
│ PaymentSucceeded  │
│ Worker            │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌────────┐  ┌────────────┐
│Subscr. │  │ Record     │
│Update  │  │ Transaction│
│Worker  │  │ Worker     │
└────────┘  └────────────┘
```

### Worker Reference Table

| Worker                                            | Triggered By                               | Delay | External Calls        | Queue   |
| ------------------------------------------------- | ------------------------------------------ | ----- | --------------------- | ------- |
| `CustomerSubscriptionUpdaterWorker`               | subscription.updated                       | 5 sec | Stripe API            | default |
| `StripePostponeCustomerSubscriptionUpdaterWorker` | CustomerSubscriptionUpdater                | 5 sec | Stripe API            | default |
| `StripeInvoicePaymentSucceededWorker`             | invoice.payment_succeeded                  | 1 min | Stripe API            | default |
| `SubscriptionUpdateWorker`                        | StripeInvoicePaymentSucceeded              | None  | Stripe API            | default |
| `RecordTransactionWorker`                         | StripeInvoicePaymentSucceeded              | None  | Stripe API            | default |
| `EggheadNextAccountCreatorWorker`                 | checkout.completed, subscription.created   | None  | None                  | default |
| `TrackAnalyticsWorker`                            | Multiple events                            | None  | Customer.io, Mixpanel | default |
| `ConvertkitTagWorker`                             | subscription.created, subscription.deleted | None  | ConvertKit API        | default |
| `CommunityRemoveOnCancelWorker`                   | subscription.deleted                       | None  | Discourse API         | default |
| `CIOSyncUserWorker`                               | CustomerSubscriptionUpdater                | None  | Customer.io           | low     |
| `CreditReferrerWorker`                            | checkout.completed                         | None  | Stripe API            | default |

---

## External Integrations

### Integration Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SERVICES                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  CONVERTKIT (Email Marketing)                                                │
│  Worker: ConvertkitTagWorker                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ON SUBSCRIBE:                                                               │
│  • Tag with "paid_member" (ID: 724175)                                       │
│  • Add to newsletter form (ID: 319670)                                       │
│  • Trigger NewMemberSequence (welcome emails)                                │
│  • Set custom fields: is_pro=true, is_instructor, favorite_topic            │
│                                                                              │
│  ON CANCEL:                                                                  │
│  • Remove "paid_member" tag                                                  │
│  • Set is_pro=false                                                          │
│                                                                              │
│  RESPECTS: user.restricted_marketing? || user.opted_out?                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  CUSTOMER.IO (Transactional Email + Analytics)                               │
│  Workers: TrackAnalyticsWorker, CIOSyncUserWorker                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  IDENTIFY (user attributes):                                                 │
│  • email, is_pro, is_instructor, timezone, Plan_Interval                     │
│                                                                              │
│  TRACK (events):                                                             │
│  • 'subscribed' - new subscription                                           │
│  • 'billed' - renewal payment                                                │
│  • 'subscription removed' - cancellation                                     │
│                                                                              │
│  SUPPRESS: opted-out users (not deleted, just suppressed)                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  MIXPANEL (Product Analytics)                                                │
│  Worker: TrackAnalyticsWorker                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  TRACK (same events as Customer.io):                                         │
│  • 'subscribed', 'billed', 'subscription removed'                            │
│                                                                              │
│  Token: ENV['MIXPANEL_TOKEN']                                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DISCOURSE (Community Forum)                                                 │
│  Worker: CommunityRemoveOnCancelWorker                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ON CANCEL (if user loses pro status):                                       │
│  • Fetch forum user by external_id: "egh_#{user.id}"                         │
│  • POST /admin/users/{id}/log_out (force logout)                             │
│  • Mark user as removed in egghead DB                                        │
│                                                                              │
│  GUARDS: user.may_remove? && !user.pro?                                      │
│  Auth: DISCOURSE_API_KEY, DISCOURSE_ADMIN_USERNAME                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenant Architecture

### Tenant Resolution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TENANT RESOLUTION                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Incoming Webhook
      │
      ▼
┌─────────────────────────────────────────┐
│ 1. Try metadata.client_id               │
│    event.data.object.metadata.client_id │
│    └─ SiteTenant.find_by_client_id(id)  │
└─────────────────┬───────────────────────┘
                  │
                  │ Not found?
                  ▼
┌─────────────────────────────────────────┐
│ 2. Try product_id → client_id mapping   │
│    Stripe::ClientIdFinder.call(object)  │
│    └─ Searches: object.product,         │
│       invoice.lines[].price.product,    │
│       subscription.items[].price.product│
│    └─ Maps via config/settings.yml      │
└─────────────────┬───────────────────────┘
                  │
                  │ Not found?
                  ▼
┌─────────────────────────────────────────┐
│ 3. Try site_name query param            │
│    params[:site_name]                   │
│    └─ SiteTenant.find_by(name: name)    │
└─────────────────┬───────────────────────┘
                  │
                  │ Not found?
                  ▼
┌─────────────────────────────────────────┐
│ 4. Raise SiteTenant::MissingError       │
│    └─ Returns 500 to Stripe             │
└─────────────────────────────────────────┘
```

### Known Tenants

| Tenant            | Status     | Notes                               |
| ----------------- | ---------- | ----------------------------------- |
| `egghead.io`      | **Active** | Primary platform                    |
| `app.egghead.io`  | Active     | Unclear distinction from egghead.io |
| `epic_react`      | Active     | Kent C. Dodds partnership           |
| `pro_testing`     | Active     | Kent C. Dodds - Testing JavaScript  |
| `pure_react`      | Inactive?  | Dave Ceddia partnership             |
| `just_javascript` | Inactive?  | Dan Abramov partnership             |
| `tech_interviews` | Inactive?  | Unknown                             |
| `break_into_tech` | Inactive?  | Unknown                             |

### Security Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THREE-LAYER SECURITY                                 │
└─────────────────────────────────────────────────────────────────────────────┘

Layer 1: Stripe Signature Verification (StripeEvent Gem)
═══════════════════════════════════════════════════════
• Validates Stripe-Signature header
• Checks against ALL tenant signing secrets
• Happens BEFORE controller code runs
• Invalid signature → 401 Unauthorized

Layer 2: Bot User API Key (Legacy Controller)
═════════════════════════════════════════════
• URL: /stripe_events?api_key=xxx&site_name=egghead.io
• Validates against tenant's stripe_webhook_api_key
• Bot user: stripe+bot@egghead.io
• Invalid key → 401 Unauthorized

Layer 3: Tenant Isolation (ActsAsTenant)
════════════════════════════════════════
• All queries scoped to current tenant
• stripe_events.site_tenant_id FK constraint
• Prevents cross-tenant data leakage
```

---

## Migration Recommendations

### Decision: Single-Tenant vs Multi-Tenant

**Recommendation: SINGLE-TENANT**

| Factor         | Multi-Tenant (Rails)         | Single-Tenant (Next.js) |
| -------------- | ---------------------------- | ----------------------- |
| Complexity     | High (10x code)              | Low                     |
| Active tenants | 2-3 (egghead.io, epic_react) | 1 (egghead.io)          |
| Business model | White-label (deprecated)     | Direct platform         |
| Maintenance    | High                         | Low                     |
| Testing        | Complex                      | Simple                  |

**Action Items**:

1. Audit revenue by tenant (confirm egghead.io is >95%)
2. Migrate Kent's products to dedicated Skill Recordings infrastructure
3. Build Next.js webhooks for egghead.io only

### Migration Checklist

#### Phase 1: Foundation

- [ ] Create `stripe_events` table in Next.js DB (Prisma schema)
- [ ] Implement event deduplication (`already_processed?`)
- [ ] Implement status state machine (received → processing → processed)
- [ ] Set up Stripe webhook signature verification
- [ ] Configure error tracking (Sentry/Honeybadger equivalent)

#### Phase 2: Event Handlers

- [ ] `checkout.session.completed` (subscription mode)
- [ ] `customer.subscription.created`
- [ ] `customer.subscription.updated` (with 5-sec delay)
- [ ] `customer.subscription.deleted`
- [ ] `invoice.payment_succeeded` (with 1-min delay)
- [ ] `invoice.payment_failed` (logging only)

#### Phase 3: Background Jobs

- [ ] Set up job queue (Inngest, Trigger.dev, or similar)
- [ ] Migrate `EggheadNextAccountCreatorWorker` logic
- [ ] Migrate `CustomerSubscriptionUpdater` logic
- [ ] Implement race condition handling (delays or idempotency keys)

#### Phase 4: External Integrations

- [ ] ConvertKit tagging (subscribe/cancel)
- [ ] Customer.io identify + track
- [ ] Mixpanel tracking (or deprecate)
- [ ] Discourse logout on cancel (or deprecate)

#### Phase 5: Data Model

- [ ] Decide: Keep dual models or consolidate?
- [ ] If consolidating: migrate legacy `Subscription` → `AccountSubscription`
- [ ] Implement `review_access_levels!` logic for :pro role
- [ ] Handle seat management (quantity, capacity)

#### Phase 6: Cutover

- [ ] Run both systems in parallel (Rails + Next.js)
- [ ] Compare event processing results
- [ ] Gradually shift traffic to Next.js
- [ ] Deprecate Rails webhook endpoints

### Key Patterns to Replicate

1. **Idempotency**: Check `already_processed?` before handling
2. **Status Tracking**: Log event state for debugging
3. **Error Recovery**: Allow retries after manual intervention
4. **Delayed Processing**: 5-sec for subscription.updated, 1-min for invoice.payment_succeeded
5. **Dual Writes**: Update both legacy and modern models during transition
6. **Pro Role Logic**: Multiple pathways (subscription, gift, lifetime, team, special roles)

### Patterns to Simplify

1. **Remove multi-tenancy**: Single Stripe account, single signing secret
2. **Remove legacy models**: Only `Account` + `AccountSubscription`
3. **Remove bot user auth**: Rely solely on Stripe signature
4. **Consolidate webhook endpoints**: Single `/api/stripe/webhook`
5. **Simplify analytics**: Pick one (Customer.io OR Mixpanel, not both)

---

## Appendix: Full Event Handler Reference

### checkout.session.completed (subscription mode)

```ruby
def stripe_checkout_session_completed(checkout_session)
  return unless checkout_session.payment_status == 'paid'
  return unless checkout_session.mode == 'subscription'
  return unless checkout_session.metadata[:site].present?

  StripeCheckoutSubscriptionService.call(checkout_session.id)
end
```

**Service Flow**:

1. Retrieve checkout session from Stripe (expand line_items, payment_intent)
2. Retrieve Stripe customer
3. Find Doorkeeper application by client_id
4. Extract email (metadata.email || customer.email)
5. Find or create User via `StripeCustomerUser`
6. Queue `EggheadNextAccountCreatorWorker`
7. Track 'subscribed' analytics event
8. Credit referrer if referral_token present

**Data Modified**: User, Account, AccountSubscription, Contact, SubscriptionReferral

**Side Effects**: Magic sign-in email, ConvertKit sync, Customer.io identify, referrer credit

---

### customer.subscription.created

```ruby
def stripe_customer_subscription_created(stripe_subscription)
  StripeCreateSubscriptionService.call(stripe_subscription.id)

  # Legacy: update currentPeriodEnd
  subscription = Subscription.find_by_stripe_customer_id(stripe_subscription.customer)
  if subscription && stripe_subscription.current_period_end
    subscription.update_attribute(:currentPeriodEnd, Time.at(stripe_subscription.current_period_end))
  end
end
```

**Service Flow**:

1. Retrieve subscription and customer from Stripe
2. Check if Account exists (indicates existing user)
3. Find or create User
4. Queue `EggheadNextAccountCreatorWorker`
5. Send magic sign-in link via `MagicSignInTokenService`
6. Add :pro role directly
7. Sync to ConvertKit and Customer.io

**Data Modified**: User, Account, AccountSubscription, Subscription (legacy)

**Side Effects**: Magic sign-in email, ConvertKit sync, Customer.io identify

---

### customer.subscription.updated

```ruby
def stripe_customer_subscription_updated(stripe_subscription)
  CustomerSubscriptionUpdaterWorker.perform_in(5.seconds, stripe_subscription.id)
end
```

**Worker Flow** (`Stripe::CustomerSubscriptionUpdater`):

1. Retrieve subscription from Stripe
2. Find legacy Subscription and modern Account
3. `ensure_migrated_account`:
   - If no Account: queue `EggheadNextAccountCreatorWorker`
   - If neither exists and not postponed: reschedule 5 sec
   - If neither exists and already postponed: Honeybadger alert
4. `handle_update_for_legacy_subscription`:
   - Detect cancellation (willCancelAfterPeriod)
   - Detect plan changes
   - Detect quantity changes (managed subscriptions)
5. `handle_update_for_account_subscription`:
   - Update AccountSubscription fields
   - Detect capacity changes (upgrade/downgrade)
   - Send over-capacity alert if needed
6. `update_pro_access_for_users`:
   - `account.review_access_levels!`
   - Grant/revoke :pro role
7. `sync_customer_io`:
   - Update Plan_Interval field

**Data Modified**: Subscription, ManagedSubscription, AccountSubscription, User roles

**Side Effects**: Customer.io sync, capacity alert email

---

### customer.subscription.deleted

```ruby
def stripe_customer_subscription_deleted(stripe_subscription)
  subscription = Subscription.find_by_stripe_customer_id(stripe_subscription.customer)
  account = Account.find_by(stripe_customer_id: stripe_subscription.customer)

  if subscription && subscription.user.is_subscription_manager?
    subscription.hard_cancel!
    TrackAnalyticsWorker.perform_async(tenant_name, user.id, 'subscription removed', {...})
    ConvertkitTagWorker.perform_async(user.id, 'cancelled_subscription')
    CommunityRemoveOnCancelWorker.perform_async(user.id)
  else
    # Update subscription fields without hard cancel
    subscription.update(cancelled_on: Date.today, expires_on: Date.today, ...)
  end

  if account
    # Update or create AccountSubscription with deleted status
    account_subscription.update(status: stripe_subscription.status, ...)
    ConvertkitTagWorker.perform_async(account.owner.id, 'cancelled_subscription')
    CommunityRemoveOnCancelWorker.perform_async(account.owner.id)
    account.review_access_levels!
  end
end
```

**Data Modified**: Subscription, AccountSubscription, User roles

**Side Effects**: Analytics tracking, ConvertKit tag removal, Discourse logout

---

### invoice.payment_succeeded

```ruby
def stripe_invoice_payment_succeeded(invoice)
  if invoice.charge
    account = Account.find_by(stripe_customer_id: invoice.customer)
    if account
      TrackAnalyticsWorker.perform_async(tenant_name, account.owner.id, 'billed')
    end
    StripeInvoicePaymentSucceededWorker.perform_in(1.minute, @event.stripe_id, invoice.id)
  else
    # Log: invoice with no charge (e.g., $0 trial)
  end
end
```

**Worker Flow**:

1. Retrieve invoice, charge, subscription from Stripe
2. Queue `SubscriptionUpdateWorker` (updates currentPeriodEnd)
3. Queue `RecordTransactionWorker` (creates Transaction record)

**Data Modified**: Subscription, ManagedSubscription, Transaction

**Side Effects**: Analytics tracking, receipt email

---

### invoice.payment_failed

```ruby
def stripe_invoice_payment_failed(invoice)
  subscription = Subscription.find_by_stripe_customer_id(invoice.customer)
  if subscription
    # Currently no-op, relies on Stripe dunning
  else
    logger.error "No subscription for customer: #{invoice.customer}"
  end
end
```

**Data Modified**: None

**Side Effects**: Logging only

---

## Document History

- **December 2024**: Initial analysis for Rails → Next.js migration
- **Scope**: Subscription lifecycle (excludes one-off purchases)
- **Source**: egghead-rails codebase analysis + test suite mining
