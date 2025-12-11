# ADR: Idempotency Strategy for Webhook Processing

## Status

Accepted

## Context

Stripe webhooks can be delivered multiple times due to retries, network issues, or Stripe's at-least-once delivery guarantee. We need to ensure webhook handlers are idempotent to prevent:

- Duplicate subscription creations
- Double-charging users
- Incorrect entitlement grants

## Decision

Implement two-layer idempotency:

### Layer 1: stripe_event_id Column

Add `stripeEventId` column to mutation tables:

- `Subscription.stripeEventId`
- `MerchantCharge.stripeEventId`
- `Entitlement.stripeEventId`

Before processing, check if event already processed:

```typescript
const existing = await db.query.subscriptions.findFirst({
  where: eq(subscriptions.stripeEventId, event.id),
});
if (existing) return { status: "duplicate", existing };
```

### Layer 2: Redis Dedup (Short-Lived)

For non-mutation operations (logging, analytics), use Redis with 24h TTL:

```typescript
const key = `webhook:processed:${event.id}`;
const exists = await redis.get(key);
if (exists) return { status: "duplicate" };
await redis.set(key, "1", { ex: 86400 }); // 24h TTL
```

## Consequences

### Positive

- Prevents duplicate processing
- Database-level idempotency survives Redis failures
- Redis layer catches duplicates before DB query
- 24h TTL keeps Redis memory bounded

### Negative

- Adds column to multiple tables (migration required)
- Redis dependency for optimal performance
- Need to handle race conditions (use transactions)

## Implementation

### Database Migration

```sql
ALTER TABLE Subscription ADD COLUMN stripeEventId VARCHAR(255);
ALTER TABLE MerchantCharge ADD COLUMN stripeEventId VARCHAR(255);
ALTER TABLE Entitlement ADD COLUMN stripeEventId VARCHAR(255);
CREATE INDEX idx_subscription_stripe_event ON Subscription(stripeEventId);
```

### Webhook Handler Pattern

```typescript
async function handleWebhook(event: Stripe.Event) {
  // Layer 2: Redis check (fast path)
  const redisKey = `webhook:processed:${event.id}`;
  if (await redis.get(redisKey)) {
    return { status: "duplicate", source: "redis" };
  }

  // Layer 1: Database check (authoritative)
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeEventId, event.id),
  });
  if (existing) {
    await redis.set(redisKey, "1", { ex: 86400 });
    return { status: "duplicate", source: "db" };
  }

  // Process event
  await db.transaction(async (tx) => {
    await tx.insert(subscriptions).values({
      ...subscriptionData,
      stripeEventId: event.id,
    });
  });

  // Mark as processed
  await redis.set(redisKey, "1", { ex: 86400 });
  return { status: "processed" };
}
```

## Alternatives Considered

### Alternative 1: Redis Only

- Pros: Simpler, no DB migration
- Cons: Data loss if Redis fails, TTL means old events could reprocess
- Rejected: Not durable enough for financial operations

### Alternative 2: Database Only

- Pros: Durable, no Redis dependency
- Cons: Slower (DB query on every webhook), more DB load
- Rejected: Performance impact too high at scale

### Alternative 3: Stripe Idempotency Keys

- Pros: Stripe-native solution
- Cons: Only works for API calls we make, not incoming webhooks
- Rejected: Doesn't solve our problem
