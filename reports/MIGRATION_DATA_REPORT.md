# Subscription Migration Data Report

> **Generated**: December 11, 2025  
> **Scope**: Account and subscription data analysis for Rails → Next.js migration  
> **Key Finding**: ✅ Already fully migrated to modern `account_subscriptions` model

---

## Executive Summary

The egghead subscription system has **already completed migration** from the legacy `subscriptions` table to the modern `account_subscriptions` model. No action required for subscription data migration.

| Metric                           | Value        | Status         |
| -------------------------------- | ------------ | -------------- |
| Legacy active subscriptions      | 0            | ✅ None        |
| Modern active subscriptions      | 3,335        | ✅ All here    |
| New subs going to legacy (30d)   | 0            | ✅ Confirmed   |
| New subs going to modern (30d)   | 93           | ✅ Working     |
| Last legacy subscription created | Dec 16, 2022 | ✅ 3 years ago |

---

## Current State Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SUBSCRIPTION DATA FLOW (CURRENT)                      │
└─────────────────────────────────────────────────────────────────────────────┘

                              Stripe Webhook
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Rails Webhook Handler       │
                    │   /stripe_events              │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌─────────────────────┐       ┌─────────────────────┐
        │  Legacy Model       │       │  Modern Model       │
        │  (DEPRECATED)       │       │  (ACTIVE)           │
        ├─────────────────────┤       ├─────────────────────┤
        │  subscriptions      │       │  accounts           │
        │  • 68,095 records   │       │  • 94,679 records   │
        │  • 0 active         │       │                     │
        │  • All state=NULL   │       │  account_subscriptions│
        │  • No new since     │       │  • 54,853 records   │
        │    Dec 2022         │       │  • 3,335 active     │
        │                     │       │  • 93 new (30d)     │
        └─────────────────────┘       └─────────────────────┘
                 ❌                            ✅
           NOT USED                      ALL NEW SUBS
```

---

## Data Model Status

### Legacy `subscriptions` Table (DEPRECATED)

| Field                   | Value                               |
| ----------------------- | ----------------------------------- |
| Total records           | 68,095                              |
| Active (state='active') | **0**                               |
| State distribution      | 100% NULL                           |
| Last created            | Dec 16, 2022                        |
| Last updated            | Dec 11, 2025 (updates still happen) |
| Created in last 30 days | 0                                   |

**Conclusion**: Legacy table is no longer receiving new subscriptions. The NULL state values indicate these records were migrated/deprecated. Updates still occur (332 in last 30 days) likely from webhook handlers that still touch both models.

### Modern `account_subscriptions` Table (ACTIVE)

| Status             | Count      | Percentage |
| ------------------ | ---------- | ---------- |
| canceled           | 42,649     | 77.75%     |
| incomplete_expired | 7,786      | 14.19%     |
| **active**         | **3,191**  | **5.82%**  |
| unpaid             | 1,065      | 1.94%      |
| past_due           | 144        | 0.26%      |
| cancelled          | 15         | 0.03%      |
| incomplete         | 3          | 0.01%      |
| **Total**          | **54,853** | 100%       |

**Active subscriptions** (active + trialing + past_due): **3,335**

### Subscription Intervals (Active Only)

| Interval | Count | Notes         |
| -------- | ----- | ------------- |
| year     | 2,946 | 88% of active |
| month    | 389   | 12% of active |

### Team vs Individual

| Type               | Count | Total Seats |
| ------------------ | ----- | ----------- |
| Individual (qty=1) | 3,060 | 3,060       |
| Team (qty>1)       | 266   | 1,619       |
| Unknown            | 9     | -           |

---

## Account Model Status

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ACCOUNT HIERARCHY                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────────┐
│     Account      │         │  AccountSubscription │
├──────────────────┤         ├──────────────────────┤
│ 94,679 total     │◄────────│ 54,853 total         │
│ 94,679 w/stripe  │    1:N  │ 3,335 active         │
│ 48,412 w/subs    │         │                      │
└────────┬─────────┘         └──────────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐         ┌──────────────────────┐
│   AccountUser    │         │        User          │
├──────────────────┤         ├──────────────────────┤
│ Links accounts   │────────►│ 699,318 total        │
│ to users         │    N:1  │                      │
│ with roles       │         │                      │
└──────────────────┘         └──────────────────────┘
```

| Metric                             | Count         |
| ---------------------------------- | ------------- |
| Total accounts                     | 94,679        |
| Accounts with Stripe customer ID   | 94,679 (100%) |
| Accounts with subscription records | 48,412 (51%)  |
| Accounts without subscriptions     | 46,267        |

**Note**: ~46K accounts without subscriptions are likely from:

- Canceled subscriptions (account persists)
- Free tier / trial accounts
- OAuth-only accounts

---

## New Subscription Verification

**Critical Question**: Are new subscriptions going to the modern model only?

### Answer: ✅ YES

| Metric (Last 30 Days)   | Count         |
| ----------------------- | ------------- |
| New in modern model     | 93            |
| Also have legacy record | 0             |
| Modern-only             | **93 (100%)** |

### Sample of Recent Subscriptions

| Stripe Subscription ID | Created    | Status | Has Legacy? |
| ---------------------- | ---------- | ------ | ----------- |
| sub_1SdB09...          | 2025-12-11 | active | NO          |
| sub_1Sd5fk...          | 2025-12-11 | active | NO          |
| sub_1Scssl...          | 2025-12-11 | active | NO          |
| sub_1Scd4z...          | 2025-12-10 | active | NO          |

---

## Multi-Tenant Analysis

### Webhook Events by Tenant (Last 30 Days)

| Tenant          | Events | Processed | Errors |
| --------------- | ------ | --------- | ------ |
| egghead.io      | 2,798  | 2,718     | 7      |
| just_javascript | 126    | 126       | 0      |
| pure_react      | 6      | 6         | 0      |
| tech_interviews | 3      | 3         | 0      |

**Conclusion**: 95%+ of webhook activity is egghead.io. Single-tenant migration is viable.

### Tenant List

| Tenant          | Status       | Notes                                      |
| --------------- | ------------ | ------------------------------------------ |
| egghead.io      | **Active**   | Primary platform                           |
| app.egghead.io  | Active       | Same as egghead.io                         |
| epic_react      | Active       | Kent C. Dodds (moving to Skill Recordings) |
| just_javascript | Low activity | Dan Abramov                                |
| pro_testing     | Inactive     | Kent C. Dodds                              |
| pure_react      | Inactive     | Dave Ceddia                                |
| tech_interviews | Inactive     | -                                          |
| break_into_tech | Inactive     | -                                          |
| kcdbundle       | Inactive     | -                                          |

---

## Webhook Processing Health

### Last 30 Days

| Event Type                    | Total | Processed | Errors |
| ----------------------------- | ----- | --------- | ------ |
| customer.subscription.updated | 941   | 941       | 0      |
| charge.succeeded              | 602   | 602       | 0      |
| invoice.payment_succeeded     | 509   | 509       | 0      |
| invoice.payment_failed        | 411   | 411       | 0      |
| customer.subscription.deleted | 151   | 151       | 0      |
| checkout.session.completed    | 125   | 45        | 7      |
| customer.subscription.created | 92    | 92        | 0      |

**Note**: 80 checkout.session.completed events stuck in "processing" status - may need investigation.

### Last 7 Days

| Metric                 | Value         |
| ---------------------- | ------------- |
| Total events           | 1,063         |
| Successfully processed | 1,046 (98.4%) |
| Stuck in processing    | 17            |
| With errors            | 0             |

---

## Cancellation Trends (Last 90 Days)

| Week         | Cancellations |
| ------------ | ------------- |
| Dec 8, 2025  | 26            |
| Dec 1, 2025  | 50            |
| Nov 24, 2025 | 34            |
| Nov 17, 2025 | 22            |
| Nov 10, 2025 | 22            |
| Nov 3, 2025  | 27            |
| Oct 27, 2025 | 26            |
| Oct 20, 2025 | 30            |

**Average**: ~30 cancellations/week

---

## Migration Recommendations

### What's Already Done ✅

1. **Subscription model migration** - Complete. All new subscriptions use `account_subscriptions`
2. **Account model** - In use. 94K accounts with Stripe customer IDs
3. **Dual-write** - Working. Webhooks update both models (legacy updates are no-ops)

### What Needs Migration

1. **Webhook handlers** - Move from Rails to Next.js
2. **Background workers** - Replace Sidekiq with Inngest/Trigger.dev
3. **External integrations** - ConvertKit, Customer.io, Discourse

### What Can Be Dropped

1. **Legacy `subscriptions` table** - No active records, not receiving new data
2. **Multi-tenant logic** - 95%+ is egghead.io
3. **Dual-write code** - Once Next.js webhooks are live

---

## Data Integrity Summary

| Check                                   | Status    | Notes                     |
| --------------------------------------- | --------- | ------------------------- |
| Orphaned subscriptions (no account)     | ✅ 0      | Clean                     |
| Active legacy subs without account_user | ✅ 0      | Clean                     |
| Accounts without subscriptions          | ⚠️ 46,267 | Expected (canceled, free) |

---

## Next Steps

1. **No subscription data migration needed** - Already on modern model
2. **Build Next.js webhook handlers** - Target `account_subscriptions` only
3. **Migrate external integrations** - ConvertKit, Customer.io
4. **Deprecate legacy code paths** - Remove dual-write after cutover
5. **Consider cleanup** - Archive legacy `subscriptions` table

---

## Appendix: Raw Data Queries

All queries available in `/investigation/src/queries/`:

- `verify-schema.ts` - Database connectivity test
- `subscriptions.ts` - Subscription analysis
- `tenants.ts` - Multi-tenant analysis
- `migration-status.ts` - Migration verification

Run with: `cd investigation && pnpm tsx src/queries/<script>.ts`
