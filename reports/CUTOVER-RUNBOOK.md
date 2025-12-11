# Cutover Runbook

## Overview

Step-by-step procedure to flip primary from Rails to Coursebuilder.

## Prerequisites

- [ ] 7 days shadow mode complete
- [ ] Divergence < 0.1% for 48h
- [ ] All E2E tests passing
- [ ] Joel approval obtained
- [ ] Support team briefed
- [ ] Maintenance window scheduled

## Timeline

- **T-24h**: Final checks, team briefing
- **T-1h**: Lower DNS TTL
- **T-0**: Execute flip
- **T+1h**: Verify stable
- **T+24h**: First checkpoint
- **T+7d**: Kill Rails

## Execution Steps

### T-24h: Final Preparation

1. Run full E2E suite against CB
2. Verify all critical paths pass:
   - [ ] User login (magic link + GitHub OAuth)
   - [ ] Course viewing (video player, progress)
   - [ ] Subscription purchase (test mode)
   - [ ] Webhook processing (test event)
   - [ ] Search functionality
3. Brief support team on escalation path
4. Send user communication (if any)
5. Confirm maintenance window

### T-1h: DNS Preparation

1. Lower DNS TTL to 60 seconds for egghead.io
2. Wait for propagation (check with `dig egghead.io`)
3. Verify both systems healthy:
   - Rails: Check `/healthz` endpoint
   - CB: Check `/api/health` endpoint

### T-0: Execute Flip

#### Step 1: Flip Stripe Webhook Priority (5 min)

1. Log into Stripe Dashboard
2. Go to Developers → Webhooks
3. Disable Rails endpoint (don't delete)
4. Verify CB endpoint is receiving
5. Monitor for errors in Stripe webhook logs

#### Step 2: Verify CB Processing (15 min)

1. Create test subscription (Stripe test mode)
2. Verify CB processes webhook
3. Verify subscription created in PlanetScale:
   ```sql
   SELECT * FROM MerchantSubscription WHERE userId = 'test-user-id';
   ```
4. Verify entitlement granted

#### Step 3: Mark Rails Read-Only (5 min)

1. Deploy Rails with read-only flag:
   ```bash
   heroku config:set READ_ONLY_MODE=true -a egghead-rails
   ```
2. Verify Rails rejects writes (test a POST request)
3. Verify Rails still serves reads (test a GET request)

#### Step 4: Monitor (1 hour)

1. Watch error rates in Datadog/monitoring
2. Watch login success rate
3. Watch webhook processing rate
4. Respond to any alerts

### T+1h: First Checkpoint

- [ ] Error rate < 0.1%
- [ ] Login success > 99%
- [ ] Webhook processing 100%
- [ ] No critical support tickets

### T+24h: Second Checkpoint

- [ ] All metrics stable
- [ ] No rollback needed
- [ ] Support tickets normal
- [ ] Review any minor issues

### T+7d: Kill Rails

See [POST-CUTOVER-MONITORING.md](./POST-CUTOVER-MONITORING.md)

**Steps:**

1. Verify CB stable for 7 days
2. Export final Rails data backup
3. Scale Rails to 0 dynos
4. Delete Stripe webhook endpoint
5. Archive Rails codebase

## Abort Criteria

**Rollback immediately if ANY of:**

- Error rate > 1% for 5 minutes
- Login success < 95%
- Webhook processing < 99%
- Critical support tickets > 10
- Data loss detected
- Joel says so

## Rollback Procedure

See [ROLLBACK-RUNBOOK.md](./ROLLBACK-RUNBOOK.md)

## Critical Paths to Verify

### Authentication

- Magic link login flow
- GitHub OAuth login flow
- Session persistence
- Logout

### Video Player

- Lesson video loads
- Progress tracking saves
- Resume from last position
- Next lesson navigation

### Subscriptions

- Checkout flow
- Webhook creates subscription
- User sees "Pro" badge
- Access granted to pro content

### Search

- Typesense returns results
- Filters work
- Pagination works
- Results link to correct pages

## Communication Plan

### T-24h: Pre-Cutover

- Post in #egghead-migration: "Cutover planned for [time]"
- Email support team with escalation path
- Optional: Tweet about maintenance window

### T-0: During Cutover

- Post in #egghead-migration: "Cutover in progress"
- Monitor #egghead-support for user reports

### T+1h: Post-Cutover

- Post in #egghead-migration: "Cutover complete, monitoring"
- Thank support team

### T+24h: Stability Confirmed

- Post in #egghead-migration: "System stable, cutover successful"
- Optional: Tweet success

## Rollback Decision Tree

```
Error detected
├── Error rate > 1% for 5 min? → ROLLBACK
├── Login success < 95%? → ROLLBACK
├── Webhook processing < 99%? → ROLLBACK
├── Data loss detected? → ROLLBACK
└── Minor issue? → Monitor, fix forward
```

## Contact List

- **Joel Hooks**: Primary decision maker
- **Support Team**: First line of user reports
- **DevOps**: Infrastructure issues
- **Stripe Support**: Webhook issues (if escalated)
