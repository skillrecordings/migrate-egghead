# Schema Mapping: Rails → Coursebuilder

> **Purpose**: Complete schema mapping for egghead migration  
> **Status**: In progress (bead migrate-egghead-39p.1)  
> **Updated**: December 11, 2025

---

## Executive Summary

Coursebuilder uses a **fundamentally different architecture** than Rails egghead:

| Concept              | Rails egghead                   | Coursebuilder                           |
| -------------------- | ------------------------------- | --------------------------------------- |
| Customer container   | `Account`                       | `Organization`                          |
| User membership      | `AccountUser`                   | `OrganizationMembership`                |
| Subscription record  | `AccountSubscription`           | `Subscription` + `MerchantSubscription` |
| Access control       | `:pro` role on User             | `Entitlement` records                   |
| Stripe customer link | `stripe_customer_id` on Account | `MerchantCustomer.identifier`           |

**Key insight**: Coursebuilder's Entitlement system is more flexible than Rails' role-based access. This is an upgrade, not a compromise.

---

## Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     COURSEBUILDER DATA MODEL                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   Organization   │
                    ├──────────────────┤
                    │ id               │
                    │ name             │
                    │ fields (json)    │
                    │ image            │
                    └────────┬─────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ OrganizationMembership│ │ Subscription │ │    Purchase      │
├──────────────────┤ ├──────────────┤ ├──────────────────┤
│ organizationId   │ │ organizationId│ │ organizationId   │
│ userId           │ │ productId    │ │ productId        │
│ role             │ │ merchantSubId│ │ merchantChargeId │
│ invitedById      │ │ status       │ │ totalAmount      │
│ fields           │ │ fields       │ │ status           │
└────────┬─────────┘ └──────┬───────┘ └──────────────────┘
         │                  │
         │                  │ 1:1
         ▼                  ▼
┌──────────────────┐ ┌──────────────────────┐
│      User        │ │ MerchantSubscription │
├──────────────────┤ ├──────────────────────┤
│ id               │ │ id                   │
│ email            │ │ identifier (sub_xxx) │
│ name             │ │ merchantCustomerId   │
│ role             │ │ merchantProductId    │
│ fields           │ │ merchantAccountId    │
└──────────────────┘ │ status               │
         ▲           └──────────────────────┘
         │
         │ userId
┌────────┴─────────┐
│   Entitlement    │
├──────────────────┤
│ id               │
│ entitlementType  │
│ userId           │
│ organizationId   │
│ sourceType       │
│ sourceId         │
│ expiresAt        │
│ metadata         │
└──────────────────┘
```

---

## Core Tables

### Organization (replaces Rails `accounts`)

```typescript
{
  id: varchar(255),
  name: varchar(255),
  fields: json,           // Flexible metadata
  image: varchar(255),
  createdAt: timestamp,
}
```

**Key difference**: No `stripe_customer_id` directly on Organization. Stripe link is via `MerchantCustomer`.

### OrganizationMembership (replaces Rails `account_users`)

```typescript
{
  id: varchar(255),
  organizationId: varchar(191),
  userId: varchar(255),
  role: varchar(191),      // 'user', 'admin', etc.
  invitedById: varchar(255),
  fields: json,
  createdAt: timestamp,
}
```

**Key difference**: Has `invitedById` for tracking who added the member. More audit-friendly.

### Subscription (business-level subscription)

```typescript
{
  id: varchar(191),
  organizationId: varchar(191),
  productId: varchar(191),
  merchantSubscriptionId: varchar(191),  // Links to MerchantSubscription
  status: varchar(191),                   // 'active', 'canceled', etc.
  fields: json,                           // Renewal date, etc.
  createdAt: timestamp,
}
```

**Key difference**: Separated from Stripe details. Business logic lives here.

### MerchantSubscription (Stripe-level subscription)

```typescript
{
  id: varchar(191),
  organizationId: varchar(191),
  merchantAccountId: varchar(191),
  merchantCustomerId: varchar(191),
  merchantProductId: varchar(191),
  identifier: varchar(191),    // Stripe subscription ID (sub_xxx)
  label: varchar(191),
  status: int,
  createdAt: timestamp,
}
```

**Key difference**: This is the Stripe mirror. `identifier` = `stripe_subscription_id`.

### MerchantCustomer (Stripe customer link)

```typescript
{
  id: varchar(191),
  organizationId: varchar(191),
  userId: varchar(191),
  merchantAccountId: varchar(191),
  identifier: varchar(191),    // Stripe customer ID (cus_xxx)
  status: int,
  createdAt: timestamp,
}
```

**Key difference**: Explicit table for Stripe customers instead of a column on Account.

### MerchantCharge (Stripe charge/payment)

```typescript
{
  id: varchar(191),
  organizationId: varchar(191),
  userId: varchar(191),
  merchantAccountId: varchar(191),
  merchantProductId: varchar(191),
  merchantCustomerId: varchar(191),
  merchantSubscriptionId: varchar(191),  // For subscription payments
  identifier: varchar(191),               // Stripe charge ID (ch_xxx)
  status: int,
  createdAt: timestamp,
}
```

---

## Entitlement System

This is the **key architectural difference**. Instead of roles on User, Coursebuilder uses Entitlement records.

### Entitlement Table

```typescript
{
  id: varchar(191),
  entitlementType: varchar(255),     // 'pro_access', 'course_access', etc.
  userId: varchar(191),               // Individual entitlement
  organizationId: varchar(191),       // OR org-level entitlement
  organizationMembershipId: varchar(191),
  sourceType: varchar(255),           // 'PURCHASE', 'SUBSCRIPTION', 'MANUAL'
  sourceId: varchar(191),             // ID of the source record
  metadata: json,
  expiresAt: timestamp,               // null = never expires while source active
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp,               // Soft delete
}
```

### EntitlementType Table

```typescript
{
  id: varchar(191),
  name: varchar(255),        // 'pro', 'course_access', etc.
  description: text,
}
```

### Why Entitlements > Roles

| Feature               | Rails Roles       | Coursebuilder Entitlements   |
| --------------------- | ----------------- | ---------------------------- |
| Multiple access types | Array on User     | Separate records             |
| Expiration            | Manual check      | Built-in `expiresAt`         |
| Source tracking       | None              | `sourceType` + `sourceId`    |
| Org vs Individual     | Implicit          | Explicit fields              |
| Revocation            | Remove from array | Soft delete with `deletedAt` |
| Audit trail           | None              | Full timestamps              |

### Access Check Comparison

**Rails**:

```ruby
user.roles.include?(:pro)
```

**Coursebuilder**:

```typescript
const hasAccess = await db.query.entitlements.findFirst({
  where: and(
    eq(entitlements.userId, userId),
    eq(entitlements.entitlementType, "pro"),
    isNull(entitlements.deletedAt),
    or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, new Date())),
  ),
});
```

More verbose but **much more powerful**:

- Can check expiration
- Can trace why they have access
- Can revoke specific entitlements without affecting others

---

## Webhook Handling Status

Coursebuilder has webhook scaffolding in `packages/core/src/lib/pricing/process-stripe-webhook.ts`:

### Currently Implemented

| Event                        | Status     | Action                  |
| ---------------------------- | ---------- | ----------------------- |
| `checkout.session.completed` | ✅ Working | Sends to Inngest        |
| `charge.refunded`            | ✅ Working | Updates purchase status |
| `charge.dispute.created`     | ✅ Working | Updates purchase status |
| `charge.succeeded`           | ⚠️ Logged  | No action               |
| `customer.updated`           | ⚠️ Logged  | No action               |

### Subscription Events (Need Implementation)

| Event                           | Status  | Current Code                  |
| ------------------------------- | ------- | ----------------------------- |
| `customer.subscription.created` | ❌ Stub | `console.log` + TODO comments |
| `customer.subscription.updated` | ❌ Stub | `console.log` + TODO comments |
| `customer.subscription.deleted` | ❌ Stub | `console.log` + TODO comments |

### Inngest Handlers

Located in `packages/core/src/inngest/stripe/`:

```typescript
// event-customer-subscription-created.ts
export const stripeCustomerSubscriptionCreatedHandler = async ({
  event,
  step,
  db,
}) => {
  const subscription = event.data.stripeEvent.data.object;

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return;
  }

  // TODO: Update subscription status in our database
  // TODO: Handle any necessary side effects (notifications, etc.)
};
```

**These TODOs are what we need to implement.**

---

## Migration Mapping

### Data Tables

| Rails Table                         | →   | Coursebuilder Table      |
| ----------------------------------- | --- | ------------------------ |
| `accounts`                          | →   | `Organization`           |
| `account_users`                     | →   | `OrganizationMembership` |
| `account_subscriptions`             | →   | `Subscription`           |
| (derived)                           | →   | `MerchantSubscription`   |
| (derived from `stripe_customer_id`) | →   | `MerchantCustomer`       |
| `users`                             | →   | `User`                   |
| (derived from `:pro` role)          | →   | `Entitlement`            |

### Field Mapping: accounts → Organization

| Rails `accounts`     | →   | Coursebuilder `Organization`     |
| -------------------- | --- | -------------------------------- |
| `id`                 | →   | `id` (generate new UUID)         |
| `name`               | →   | `name`                           |
| `slug`               | →   | `fields.slug`                    |
| `stripe_customer_id` | →   | Create `MerchantCustomer` record |
| `guid`               | →   | `fields.legacyGuid`              |
| `created_at`         | →   | `createdAt`                      |

### Field Mapping: account_subscriptions → Subscription + MerchantSubscription

| Rails `account_subscriptions` | →   | Coursebuilder                           |
| ----------------------------- | --- | --------------------------------------- |
| `id`                          | →   | `Subscription.id` (new UUID)            |
| `account_id`                  | →   | `Subscription.organizationId`           |
| `stripe_subscription_id`      | →   | `MerchantSubscription.identifier`       |
| `status`                      | →   | `Subscription.status`                   |
| `quantity`                    | →   | `Subscription.fields.quantity`          |
| `interval`                    | →   | `Subscription.fields.interval`          |
| `price`                       | →   | `Subscription.fields.price`             |
| `current_period_end`          | →   | `Subscription.fields.currentPeriodEnd`  |
| `cancel_at_period_end`        | →   | `Subscription.fields.cancelAtPeriodEnd` |

### Creating Entitlements

For each user with `:pro` role OR active subscription:

```typescript
{
  id: generateId(),
  entitlementType: 'pro',
  userId: user.id,
  organizationId: user.organizationId,  // if team member
  sourceType: 'SUBSCRIPTION',
  sourceId: subscription.id,
  expiresAt: null,  // Active subscription = no expiry
  createdAt: new Date(),
}
```

---

## Target Database State

Current PlanetScale database (from `ping-mysql`):

```
Tables: 43 (all prefixed with egghead_)
Users: 48
Accounts: 43 (NextAuth OAuth accounts, not subscription accounts)
Purchases: 0
```

This is a fresh Coursebuilder instance. We need to:

1. **Migrate users** - 699K from Rails
2. **Create Organizations** - From 94K Rails accounts
3. **Create OrganizationMemberships** - Link users to orgs
4. **Create Subscriptions** - From 55K account_subscriptions
5. **Create MerchantSubscriptions** - Stripe subscription mirrors
6. **Create MerchantCustomers** - Stripe customer mirrors
7. **Create Entitlements** - For all pro access

---

---

## Content Migration Mapping

### Rails Content Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RAILS CONTENT HIERARCHY                              │
└─────────────────────────────────────────────────────────────────────────────┘

    Instructor (134)
        │
        ├── Series (420 courses)
        │       │
        │       └── Lessons (5,132)
        │               │
        │               └── lesson_views (progress)
        │
        └── Playlists (curated collections)
                │
                └── Tracklists (polymorphic join)
                        │
                        └── Lessons, Series, other Playlists
```

### Coursebuilder Content Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     COURSEBUILDER CONTENT HIERARCHY                          │
└─────────────────────────────────────────────────────────────────────────────┘

    User (as contributor)
        │
        └── ContentContribution
                │
                └── ContentResource (type: 'course', 'lesson', 'section', etc.)
                        │
                        └── ContentResourceResource (hierarchical join)
                                │
                                └── Child ContentResources
```

### Content Table Mapping

| Rails               | →   | Coursebuilder                       | Notes                                                       |
| ------------------- | --- | ----------------------------------- | ----------------------------------------------------------- |
| `instructors`       | →   | `User` + `ContentContribution`      | Instructor becomes user with 'instructor' contribution type |
| `series`            | →   | `ContentResource` (type='course')   | Course metadata in `fields` JSON                            |
| `lessons`           | →   | `ContentResource` (type='lesson')   | Lesson metadata in `fields` JSON                            |
| `playlists`         | →   | `ContentResource` (type='playlist') | Or skip - redirect to courses                               |
| `tracklists`        | →   | `ContentResourceResource`           | Hierarchical join with `position`                           |
| `lesson_views`      | →   | `ResourceProgress`                  | Progress tracking                                           |
| `series_progresses` | →   | `ResourceProgress`                  | Course-level progress                                       |
| `tags`              | →   | `Tag` + `ContentResourceTag`        | Same pattern                                                |

### ContentResource Fields Mapping

For a **lesson**:

```typescript
// Rails lesson
{
  id: 123,
  guid: 'abc123',
  slug: 'intro-to-react',
  title: 'Introduction to React',
  summary: 'Learn the basics...',
  duration: 342,
  state: 'published',
  visibility_state: 'indexed',
  is_pro_content: true,
  wistia_id: 'xyz789',
  current_video_hls_url: 'https://...',
  instructor_id: 45,
  series_id: 67,
}

// Coursebuilder ContentResource
{
  id: 'cr_newuuid',
  type: 'lesson',
  createdById: 'user_instructor45',
  fields: {
    slug: 'intro-to-react',
    title: 'Introduction to React',
    description: 'Learn the basics...',
    state: 'published',
    visibility: 'public',
    duration: 342,
    legacyId: 123,
    legacyGuid: 'abc123',
    muxPlaybackId: 'mux_playback_id',  // From Mux migration
    muxAssetId: 'mux_asset_id',
    access: 'pro',  // is_pro_content → access field
  },
}
```

For a **course** (series):

```typescript
// Rails series
{
  id: 67,
  slug: 'react-fundamentals',
  title: 'React Fundamentals',
  description: 'Complete course...',
  state: 'published',
  is_complete: true,
  instructor_id: 45,
}

// Coursebuilder ContentResource
{
  id: 'cr_courseuuid',
  type: 'course',
  createdById: 'user_instructor45',
  fields: {
    slug: 'react-fundamentals',
    title: 'React Fundamentals',
    description: 'Complete course...',
    state: 'published',
    legacyId: 67,
    access: 'pro',
  },
}

// Plus ContentResourceResource joins for lessons
{
  resourceOfId: 'cr_courseuuid',  // parent (course)
  resourceId: 'cr_lessonuuid',    // child (lesson)
  position: 1,
}
```

---

## Progress Tracking Migration

### Rails Progress Model

```
lesson_views (2.9M records)
├── user_id
├── lesson_id
├── segments (30-second increments watched)
├── did_complete (boolean)
├── collection_type, collection_id (polymorphic - course context)
└── series_progress_id (FK)

series_progresses
├── user_id
├── progressable_type, progressable_id (Series or Playlist)
├── is_complete
└── completed_at
```

### Coursebuilder Progress Model

```
ResourceProgress (composite PK: userId + resourceId)
├── userId
├── resourceId (ContentResource.id)
├── completedAt (datetime, null = not complete)
└── fields (json - for segments, etc.)

LessonProgress (more granular)
├── userId
├── lessonId
├── lessonSlug
├── sectionId, moduleId (context)
├── completedAt
└── timestamps
```

### Progress Migration Strategy

**Option A: Minimal (recommended for launch)**

- Migrate only `did_complete=true` records
- ~500K records instead of 2.9M
- Faster migration, simpler

**Option B: Full fidelity**

- Migrate all lesson_views with segments
- Store segments in `fields.segments`
- Preserve partial progress

```typescript
// Migration transform
const migrateProgress = (lessonView: RailsLessonView) => ({
  userId: userIdMap[lessonView.user_id],
  resourceId: contentIdMap[lessonView.lesson_id],
  completedAt: lessonView.did_complete ? lessonView.updated_at : null,
  fields: {
    segments: lessonView.segments,
    legacyId: lessonView.id,
  },
});
```

---

## Gaps Requiring New Tables/Columns

### 1. Instructor Profile Data

Rails `instructors` table has fields not in Coursebuilder:

| Field                    | Solution                        |
| ------------------------ | ------------------------------- |
| `bio_short`              | Store in `User.fields.bio`      |
| `twitter`, `website`     | Store in `User.fields.social`   |
| `percentage` (rev share) | Store in `User.fields.revShare` |
| `profile_picture_url`    | Store in `User.image`           |

### 2. Content Metadata

Some Rails fields need mapping to `ContentResource.fields`:

| Rails Field               | Coursebuilder Location                    |
| ------------------------- | ----------------------------------------- |
| `wistia_id`               | `fields.legacyWistiaId` (reference only)  |
| `current_video_hls_url`   | `fields.muxPlaybackId` (Mux handles this) |
| `plays_count`             | `fields.playCount` or skip (analytics)    |
| `popularity_order`        | `fields.popularityOrder` or compute fresh |
| `code_url`, `github_repo` | `fields.codeUrl`, `fields.githubRepo`     |
| `transcript`              | `fields.transcript` or separate table     |

### 3. Team Subscription Seats

Rails tracks `quantity` on `account_subscriptions`. Coursebuilder needs:

```typescript
// In Subscription.fields
{
  quantity: 5,           // Number of seats
  interval: 'year',      // Billing interval
  currentPeriodEnd: '2025-12-31T00:00:00Z',
}
```

### 4. Legacy ID Mapping

Need to preserve Rails IDs for:

- URL redirects (lesson/course slugs should work)
- Analytics continuity
- Support debugging

Store in `fields.legacyId` on all migrated records.

---

## Migration Order

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MIGRATION DEPENDENCY ORDER                           │
└─────────────────────────────────────────────────────────────────────────────┘

Phase 1: Foundation (no dependencies)
├── Users (699K)
├── EntitlementTypes (create 'pro' type)
└── Products (create egghead subscription product)

Phase 2: Organizations (depends on Users)
├── Organizations (from accounts, 94K)
├── OrganizationMemberships (from account_users)
└── MerchantCustomers (from accounts.stripe_customer_id)

Phase 3: Subscriptions (depends on Orgs, Products)
├── MerchantSubscriptions (from account_subscriptions)
├── Subscriptions (from account_subscriptions)
└── Entitlements (derived from active subscriptions)

Phase 4: Content (depends on Users)
├── ContentResources - Instructors as Users
├── ContentResources - Courses (from series)
├── ContentResources - Lessons
├── ContentResourceResource (course→lesson joins)
├── ContentContributions (instructor→content links)
└── Tags + ContentResourceTag

Phase 5: Progress (depends on Users, Content)
├── ResourceProgress (from lesson_views)
└── LessonProgress (optional, more granular)

Phase 6: Commerce History (optional, for records)
├── MerchantCharges (from transactions)
└── Purchases (from sellable_purchases)
```

---

## Appendix: Full Schema Files

### Commerce Schemas

- `commerce/subscription.ts` - Business subscription
- `commerce/merchant-subscription.ts` - Stripe subscription mirror
- `commerce/merchant-customer.ts` - Stripe customer mirror
- `commerce/merchant-charge.ts` - Stripe charge mirror
- `commerce/purchase.ts` - One-time purchases
- `commerce/product.ts` - Products
- `commerce/price.ts` - Pricing
- `commerce/coupon.ts` - Coupons

### Entitlement Schemas

- `entitlements/entitlement.ts` - Access grants
- `entitlements/entitlement-type.ts` - Access type definitions

### Organization Schemas

- `org/organizations.ts` - Customer containers
- `org/organization-memberships.ts` - User memberships
- `org/organization-membership-roles.ts` - Role definitions

### Auth Schemas

- `auth/users.ts` - User accounts
- `auth/accounts.ts` - OAuth provider accounts (NextAuth)
- `auth/sessions.ts` - Login sessions

### Content Schemas

- `content/content-resource.ts` - Polymorphic content (lessons, courses, etc.)
- `content/content-resource-resource.ts` - Hierarchical joins
- `content/content-contribution.ts` - Creator/instructor links
- `content/content-resource-tag.ts` - Tag associations

### Progress Schemas

- `progress/resource-progress.ts` - Completion tracking
- `progress/lesson-progress.ts` - Granular lesson progress
