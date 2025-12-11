# ADR: Email Strategy for egghead Migration

## Status

Accepted

## Context

egghead-rails has 17 mailers. We need to migrate email functionality to Coursebuilder while:

- Maintaining transactional email reliability
- Enabling marketing automation
- Supporting unsubscribe/preferences
- Not breaking existing user expectations

## Decision

Split email responsibilities between two providers:

### Postmark (Transactional)

- Magic link login emails
- Purchase receipts
- Subscription confirmations
- Gift notifications
- Account changes

### Customer.io (Campaigns)

- Renewal reminders
- Gift expiration warnings
- Onboarding sequences
- Re-engagement campaigns
- Instructor notifications

## Email Inventory

| Mailer                      | Provider    | Priority | Notes                |
| --------------------------- | ----------- | -------- | -------------------- |
| MagicSignInMailer           | Postmark    | P0       | Auth critical        |
| StripeMailer                | Postmark    | P0       | Receipts             |
| GiftMailer                  | Customer.io | P0       | Expiration reminders |
| RenewalMailer               | Customer.io | P0       | 3-day reminder       |
| SellablePurchasesMailer     | Postmark    | P1       | Course receipts      |
| AccountMailer               | Postmark    | P1       | Ownership transfer   |
| EmailChangeRequestMailer    | Postmark    | P1       | Confirmation         |
| SequenceMailer              | Customer.io | P1       | 8 drip sequences     |
| CouponMailer                | Postmark    | P2       | Bulk coupons         |
| RoyaltiesMailer             | Postmark    | P2       | Instructor payouts   |
| AdminMailer                 | Postmark    | P3       | Internal alerts      |
| FeedbackMailer              | Postmark    | P3       | User feedback        |
| Instructors::ProgressMailer | Postmark    | P3       | Milestones           |
| Devise::Mailer              | SKIP        | -        | No passwords         |
| CommentMailer               | SKIP        | -        | Deprecated           |
| CommunityMailer             | SKIP        | -        | Deprecated           |
| ReferralMailer              | DEFER       | -        | Post-launch          |

## Consequences

### Positive

- Postmark: High deliverability, fast, reliable
- Customer.io: Powerful automation, user profiles, analytics
- Clear separation of concerns
- Can iterate on campaigns without code deploys

### Negative

- Two systems to maintain
- Customer.io has learning curve
- Need to sync user data to Customer.io

## Implementation

### Postmark (existing in CB)

```typescript
// packages/core/src/lib/send-server-email.ts
await sendServerEmail({
  to: user.email,
  subject: "Your magic link",
  template: "magic-link",
  data: { url: magicLinkUrl },
});
```

### Customer.io (new)

```typescript
// lib/customer-io.ts
import { TrackClient } from "customerio-node";

const cio = new TrackClient(siteId, apiKey);

// Identify user
await cio.identify(userId, {
  email: user.email,
  name: user.name,
  is_pro: hasProAccess,
  subscription_status: subscription?.status,
});

// Track event
await cio.track(userId, {
  name: "subscription_renewed",
  data: { plan: "pro", interval: "year" },
});
```

### Inngest Integration

```typescript
// inngest/functions/email/renewal-reminder.ts
export const renewalReminder = inngest.createFunction(
  { id: "renewal-reminder" },
  { cron: "0 9 * * *" }, // Daily at 9am
  async ({ step }) => {
    const renewingSoon = await step.run("get-renewing", () =>
      db.query.subscriptions.findMany({
        where: and(
          eq(subscriptions.status, "active"),
          between(
            subscriptions.currentPeriodEnd,
            addDays(new Date(), 2),
            addDays(new Date(), 4),
          ),
        ),
      }),
    );

    for (const sub of renewingSoon) {
      await step.run(`remind-${sub.id}`, () =>
        cio.track(sub.userId, {
          name: "renewal_reminder",
          data: { renewalDate: sub.currentPeriodEnd },
        }),
      );
    }
  },
);
```

## Alternatives Considered

### Alternative 1: Postmark Only

- Pros: Single provider, simpler
- Cons: No automation, manual campaign management
- Rejected: Need automation for renewal reminders, sequences

### Alternative 2: Customer.io Only

- Pros: Single provider, powerful
- Cons: Transactional email less reliable, more expensive
- Rejected: Postmark better for transactional

### Alternative 3: Resend

- Pros: Modern, React Email native
- Cons: Less mature, no automation
- Rejected: Need Customer.io for campaigns anyway
