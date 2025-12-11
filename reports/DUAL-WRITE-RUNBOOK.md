# Dual-Write Runbook

## Overview

Configure Stripe webhooks to send to both Rails and Coursebuilder during shadow mode.

## Prerequisites

- [ ] CB webhook endpoint deployed and tested
- [ ] Redis configured for event logging
- [ ] Monitoring dashboard ready
- [ ] Slack alerts configured

## Phase 1: Shadow Mode Setup (Day 0)

### Step 1: Configure Stripe Webhook Endpoints

1. Log into Stripe Dashboard
2. Go to Developers → Webhooks
3. Add new endpoint: `https://egghead.io/api/webhooks/stripe` (CB)
4. Select events: checkout.session.completed, customer.subscription._, invoice._, charge.\*
5. Keep existing Rails endpoint as PRIMARY

### Step 2: Deploy CB Webhook Handler

1. Deploy CB with dual-write handler enabled
2. Verify handler logs to Redis: `XADD webhook:events * ...`
3. Verify handler does NOT mutate DB (shadow mode)

### Step 3: Start Monitoring

1. Open monitoring dashboard
2. Verify events appearing in both systems
3. Set up Slack alerts for divergence > 0.1%

## Phase 2: Shadow Mode (Days 1-7)

### Daily Checks

- [ ] Check divergence rate (target: < 0.1%)
- [ ] Review any divergent events
- [ ] Fix any CB bugs found
- [ ] Document issues in #egghead-migration

### Divergence Investigation

1. Query Redis: `XRANGE webhook:events - +`
2. Compare Rails vs CB results
3. Categorize: timing issue, bug, expected difference
4. Fix bugs, document expected differences

## Phase 3: Flip Preparation (Day 7)

### Pre-Flip Checklist

- [ ] 7 days of shadow data collected
- [ ] Divergence rate < 0.1% for 48h
- [ ] All divergences understood and documented
- [ ] Rollback procedure tested
- [ ] Support team briefed
- [ ] Joel approval obtained

## Rollback Procedure

### If Issues During Shadow Mode

1. Disable CB webhook endpoint in Stripe
2. CB continues to receive but ignores
3. Investigate and fix
4. Re-enable when ready

### If Issues After Flip

See [ROLLBACK-RUNBOOK.md](./ROLLBACK-RUNBOOK.md)

## Key Decisions

### Idempotency Strategy

- **Primary**: `stripe_event_id` unique constraint in PlanetScale
- **Secondary**: Redis dedup cache (24h TTL) for early rejection
- **Pattern**: Check Redis → Process → Insert with UPSERT semantics

### Event Selection

Only subscribe to events that affect subscription state:

- `checkout.session.completed` - new subscriptions
- `customer.subscription.created` - subscription created
- `customer.subscription.updated` - changes (pause, resume, upgrade)
- `customer.subscription.deleted` - cancellations
- `invoice.payment_succeeded` - renewals
- `invoice.payment_failed` - payment issues
- `charge.refunded` - refunds

### Monitoring Metrics

- **Divergence Rate**: % of events where CB result != Rails result
- **Processing Time**: p50, p95, p99 latency
- **Error Rate**: % of events that fail processing
- **Dedup Hit Rate**: % of events caught by Redis cache

## Troubleshooting

### CB Not Receiving Events

1. Check Stripe webhook logs in dashboard
2. Verify endpoint URL is correct
3. Check CB application logs
4. Verify webhook secret matches

### High Divergence Rate

1. Export last 100 divergent events
2. Group by event type and outcome difference
3. Identify common patterns
4. Fix systematic issues first

### Redis Connection Issues

1. Check Redis health: `redis-cli PING`
2. Verify connection string
3. Check firewall rules
4. Fallback: Process without dedup (rely on DB constraint)
