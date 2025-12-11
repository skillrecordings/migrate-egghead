# Rollback Runbook

## Overview

Emergency procedure to roll back from Coursebuilder to Rails.

## When to Rollback

**Immediately rollback if ANY of:**

- Error rate > 1% for 5 minutes
- Login success < 95%
- Webhook processing < 99%
- Critical support tickets > 10
- Data loss detected
- Joel says so

## Decision Authority

- **Joel Hooks**: Final decision on rollback
- **On-call engineer**: Can initiate rollback if Joel unavailable and abort criteria met

## Rollback Steps

### Step 1: Re-enable Rails Webhook (2 min)

1. Log into Stripe Dashboard
2. Go to Developers → Webhooks
3. **Enable Rails endpoint**
4. **Disable CB endpoint**
5. Verify Rails receiving webhooks in Stripe logs

### Step 2: Remove Rails Read-Only Flag (5 min)

1. Deploy Rails without read-only flag:
   ```bash
   heroku config:unset READ_ONLY_MODE -a egghead-rails
   ```
2. Verify Rails accepting writes (test POST request)
3. Verify webhook processing in Rails logs

### Step 3: Verify Rails Processing (10 min)

1. Create test subscription in Stripe test mode
2. Verify Rails processes webhook
3. Verify subscription created in PostgreSQL:
   ```sql
   SELECT * FROM account_subscriptions WHERE stripe_subscription_id = 'sub_test...';
   ```
4. Verify user has access

### Step 4: Communicate (5 min)

1. Post in #egghead-migration: "Rollback executed at [time]. Reason: [reason]"
2. Notify support team: "System rolled back to Rails, stable now"
3. Send user communication if needed (if outage was visible)

### Step 5: Investigate (async)

1. Collect logs from CB (Vercel/hosting logs)
2. Export monitoring data for cutover window
3. Identify root cause
4. Create incident report
5. Fix issues
6. Plan re-cutover

## Post-Rollback

### Immediate (T+0 to T+1h)

- CB remains deployed but inactive
- Rails is primary again
- Monitor Rails stability
- Verify all systems normal

### Short-term (T+1h to T+24h)

- Schedule post-mortem within 24h
- Document root cause
- Create fix plan
- Estimate re-cutover timeline

### Long-term (T+24h+)

- Implement fixes
- Re-test in shadow mode
- Plan re-cutover (minimum 7 days shadow mode again)

## Data Reconciliation

**If rollback happens after data written to CB:**

### Step 1: Identify Cutover Window

- Note exact time of flip: `T_flip`
- Note exact time of rollback: `T_rollback`
- Window: `[T_flip, T_rollback]`

### Step 2: Export CB Data

```sql
-- Export subscriptions created during window
SELECT * FROM MerchantSubscription
WHERE createdAt BETWEEN 'T_flip' AND 'T_rollback';

-- Export progress records created during window
SELECT * FROM LessonProgress
WHERE updatedAt BETWEEN 'T_flip' AND 'T_rollback';
```

### Step 3: Compare with Rails

1. Query Rails for same entities
2. Identify differences
3. Categorize:
   - **Data only in CB**: Need to migrate to Rails
   - **Data only in Rails**: Normal (webhook went to Rails after rollback)
   - **Data in both, different**: Need to reconcile

### Step 4: Reconcile

- For subscription data: Rails is source of truth post-rollback
- For progress data: Use most recent timestamp
- For conflicts: Manual review with Joel

### Step 5: Document

- Create `ROLLBACK_DATA_RECONCILIATION_[date].md`
- Document all reconciled entities
- Note any data loss (should be none)

## Timeline Expectations

- **Rollback execution**: 15-20 minutes
- **Full stability**: 1 hour
- **Post-mortem**: within 24 hours
- **Re-cutover**: TBD based on root cause (minimum 7 days)

## Rollback Verification Checklist

### T+15min: Initial Verification

- [ ] Rails webhook receiving events
- [ ] CB webhook disabled
- [ ] Rails accepting writes
- [ ] Error rate < 0.1%

### T+1h: Stability Verification

- [ ] Login success > 99%
- [ ] Webhook processing 100%
- [ ] No critical support tickets
- [ ] All critical paths working

### T+24h: Post-Rollback Review

- [ ] Post-mortem completed
- [ ] Root cause identified
- [ ] Fix plan documented
- [ ] Re-cutover timeline estimated

## Common Rollback Scenarios

### Scenario 1: Webhook Processing Failure

**Symptoms:** CB failing to process webhooks, subscriptions not created
**Rollback Reason:** Cannot process new subscriptions
**Data Impact:** Minimal (failed events will retry to Rails)

### Scenario 2: Authentication Issues

**Symptoms:** Users cannot log in, error rate spiking
**Rollback Reason:** Core functionality broken
**Data Impact:** None (no data writes if users can't log in)

### Scenario 3: Database Performance

**Symptoms:** PlanetScale queries timing out, p99 > 5s
**Rollback Reason:** Unacceptable user experience
**Data Impact:** Depends on duration before rollback

### Scenario 4: Data Loss Detected

**Symptoms:** Data missing in CB that exists in Rails
**Rollback Reason:** Data integrity issue
**Data Impact:** HIGH - requires full reconciliation

## Escalation Path

1. **On-call engineer** detects issue or receives alert
2. **Check abort criteria** - if met, initiate rollback
3. **Execute Steps 1-4** (rollback procedure)
4. **Notify Joel** via Slack/text
5. **Begin Step 5** (investigation)

## Contact List

- **Joel Hooks**: [contact info]
- **On-call engineer**: Check PagerDuty
- **Support team lead**: [contact info]
- **Stripe support**: support@stripe.com (if escalated)

## Post-Mortem Template

```markdown
# Rollback Post-Mortem: [Date]

## Timeline

- T-0: Cutover initiated
- T+Xmin: Issue detected
- T+Ymin: Rollback initiated
- T+Zmin: Rollback complete

## Root Cause

[Technical explanation]

## Impact

- Users affected: X
- Duration: Y minutes
- Data lost: None/[details]

## What Went Wrong

1. [Primary cause]
2. [Contributing factors]

## What Went Right

1. Rollback executed in X minutes (target: 20 min)
2. [Other successes]

## Action Items

- [ ] Fix [issue 1] (Owner: X, Due: Y)
- [ ] Fix [issue 2] (Owner: X, Due: Y)
- [ ] Re-test in shadow mode (Owner: X, Due: Y)
- [ ] Plan re-cutover (Owner: Joel, Due: Y)

## Lessons Learned

[Key takeaways]
```

## Testing the Rollback Procedure

**Recommended:** Test rollback in staging environment before cutover

1. Set up staging environment with both Rails and CB
2. Execute cutover steps
3. Simulate failure
4. Execute rollback steps
5. Verify rollback success
6. Document timing and any issues

**Estimated Duration:** 2-3 hours for full test
