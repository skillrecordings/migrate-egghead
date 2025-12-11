# Migration Gap Analysis - December 11, 2025

> **Context**: Deep analysis against rubric (7.2/10) with subagent exploration of all codebases.
> **Decision maker**: Joel Hooks
> **Next session**: Use this document to continue bead refinement.

---

## Rubric Scores (Before → Target)

| Dimension             | Score | Issues                                   | Target |
| --------------------- | ----- | ---------------------------------------- | ------ |
| Data Integrity        | 6/10  | Missing CDC, idempotency, reconciliation | 9/10   |
| Operational Safety    | 7/10  | Good dual-write, untested rollback       | 9/10   |
| Scope Completeness    | 5/10  | 17 cron jobs, Customer.io late           | 8/10   |
| Technical Feasibility | 8/10  | Schema mapping solid                     | 9/10   |
| Risk Management       | 6/10  | SEO risks identified, weak mitigation    | 8/10   |
| Timeline Realism      | 5/10  | 8-week aggressive                        | 7/10   |

**Joel's note**: Opus 4.5 makes 8-week timeline achievable.

---

## Joel's Decisions (Dec 11)

### 1. Progress Migration: FULL FIDELITY

- Migrate all 2.9M records
- Use Inngest background jobs to backfill
- Not a blocker for launch - can run async

### 2. Revenue Share (MonthlyReportWorker): P0 CRITICAL

- Must be captured in plan
- Instructor payouts depend on this
- Complex SQL with weighted factors - needs careful migration

### 3. Video Player: SIMPLE REBUILD

- Do NOT port xstate complexity (14-state machine)
- Build super simple version with React state
- Use Coursebuilder's existing player + overlay examples
- No bullshit

### 4. Sanity CMS: ELIMINATE

- "Fuck Sanity" - Joel
- ~100 references to remove
- All content moves to ContentResource/PlanetScale
- Single database architecture

### 5. Team Features: NOT DEFERRED

- 266 teams, 1,619 seats = significant revenue
- Build basics: dashboard, invite, seat management
- Defer: ownership transfer, SAML SSO

### 6. Duplicate Epics: CONSOLIDATE

- Close `migrate-egghead-qqu` (Phase 3 cron jobs)
- Keep `migrate-egghead-tkd` (Essential Cron Jobs)
- Ensure nothing lost in consolidation

---

## Critical Findings from Subagent Analysis

### Rails Cron Jobs (17 scheduled + 84 event-driven)

**CRITICAL (must port)**:
| Job | Schedule | Purpose |
|-----|----------|---------|
| StripeReconciler | Daily 11pm | Catches missed webhooks, processes 5K txns |
| MonthlyReportWorker | 1st of month | **REVENUE SHARE** - instructor payouts |
| LessonPublishWorker | Every 10min | Scheduled content publishing |
| GiftExpirationWorker | Daily | Gift subscription lifecycle |
| RefreshSitemap | Every 4h | SEO critical |

**HIGH (should port)**:
| Job | Schedule | Purpose |
|-----|----------|---------|
| AccountSubscriptionRenewalWorker | Daily | Renewal reminder emails |
| PlaylistRanker | 2x daily | Course ranking algorithm |
| TagRanker | Daily | Tag popularity for navigation |
| SignInTokenCleaner | Every minute | Magic link cleanup |

**CAN SKIP**:

- WeeklyReportWorker (empty - dead code)
- DailyReportWorker (admin convenience)
- SyncPodcastsWorker (low priority)
- ConvertkitSyncSubscriptionWorker (appears disabled)

### Coursebuilder Readiness: 65%

**Ready**:

- ✅ checkout.session.completed (FULLY implemented)
- ✅ Progress tracking schema (indexes ready for 3M records)
- ✅ Entitlement queries (fully implemented)
- ✅ Organizations schema (ready for 94K accounts)

**STUBS ONLY** (must implement):

- ⚠️ subscription.created - TODO comments only
- ⚠️ subscription.updated - TODO comments only
- ⚠️ subscription.deleted - MISSING entirely
- ⚠️ invoice.payment_succeeded - TODO comments only

**MISSING ENTIRELY**:

- ❌ Customer.io integration (zero code)
- ❌ Entitlement auto-creation on purchase/subscription
- ❌ Team invitation workflow

### egghead-next Systems (16+ integrations)

**High Migration Effort**:
| System | Files | Notes |
|--------|-------|-------|
| Customer.io | 12+ files | Deep email marketing integration |
| Stripe | 7+ files | Core payments, Inngest handlers |
| Sanity CMS | 50+ files | Primary CMS - ELIMINATING |
| Inngest | 40+ functions | Background job infrastructure |
| xstate player | 6+ files | 14-state machine - REBUILDING SIMPLE |

**Medium Migration Effort**:
| System | Notes |
|--------|-------|
| Typesense | Same provider, port InstantSearch UI |
| Discord OAuth | Community access, role management |
| Deepgram | Transcription pipeline |
| tRPC | 20+ routers - need to map to CB |

**Low/Skip**:
| System | Notes |
|--------|-------|
| Slack | Internal notifications only |
| SCORM Cloud | Single endpoint, may be legacy |
| Transloadit | Legacy video pipeline, Mux replaces |
| Airtable | Single API endpoint |

### Data Integrity Gaps

1. **No concurrent write handling** during migration window
   - Rails still live while migrating
   - Need strategy for: new subs, progress updates, profile changes
   - Recommendation: Queue-based sync or short read-only window

2. **Legacy ID mapping** not specified
   - Need bidirectional mapping: rails_id ↔ coursebuilder_id
   - Essential for debugging and support
   - Create lookup tables for: users, courses, lessons, orgs

3. **Stripe webhook deduplication** needs implementation
   - Store stripe_event_id as unique key
   - Check before processing
   - Handle replay attacks

### Operational Safety Gaps

1. **Rollback not tested** in staging
   - Procedure documented but never executed
   - Must test before production cutover
   - Include: webhook flip, DNS revert, data reconciliation

2. **No load testing plan**
   - Test with production-scale: 3,335 subs, 699K users, 2.9M progress
   - Simulate: 100 concurrent video streams, 50 subs/hour, 1000 searches/min

3. **No incident response plan**
   - Who gets paged?
   - Escalation path?
   - When rollback vs fix forward?
   - User communication plan?

### SEO Risk Gaps

1. **Topic combination sitemap** - massive SEO value
   - /q/react, /q/react-typescript, /q/react-resources-by-kent-c-dodds
   - Must generate same URLs as current site
   - Validate against production sitemap

2. **Video playback failures** not covered
   - Test: Mux failures, CDN issues, mobile playback, subtitles
   - Need graceful degradation

---

## Bead Structure Recommendations

### Epics to CLOSE (duplicates)

1. `migrate-egghead-qqu` (Phase 3: Cron Jobs Migration)
   - Superseded by `migrate-egghead-tkd` (Essential Cron Jobs)
   - Verify all tasks captured before closing

### Tasks to ADD

**To `migrate-egghead-tkd` (Essential Cron Jobs)**:

- [ ] Port MonthlyReportWorker (revenue share) - **P0 CRITICAL**
- [ ] Port PlaylistRanker (course ranking)
- [ ] Port TagRanker (tag popularity)

**To `migrate-egghead-5bk` (Webhook Handlers)**:

- [ ] Implement entitlement auto-creation on subscription
- [ ] Implement entitlement revocation on cancellation

**To `migrate-egghead-341` (Data Integrity)**:

- [ ] Build legacy ID mapping tables
- [ ] Implement concurrent write handling strategy
- [ ] Test rollback procedure in staging

**To `migrate-egghead-r52` (UI Components)**:

- [ ] Build simple video player (NOT xstate)
- [ ] Port tRPC routers to Coursebuilder patterns

**New Epic Needed: Load Testing & Incident Response**:

- [ ] Build load testing infrastructure
- [ ] Create incident response runbook
- [ ] Test with production-scale data

---

## Priority Order for Next Session

1. **Close duplicate epic** `migrate-egghead-qqu` after verifying tasks captured
2. **Add MonthlyReportWorker** to `migrate-egghead-tkd` as P0
3. **Update `migrate-egghead-r52`** with simple player approach
4. **Add load testing epic** or tasks to Phase 0
5. **Verify Sanity elimination** scope in `migrate-egghead-mnn`

---

## Key Files Reference

### Rails (to migrate FROM)

- `config/schedule.yml` - All 17 cron jobs
- `app/workers/stripe_reconciler.rb` - Financial reconciliation
- `app/workers/monthly_report_worker.rb` - Revenue share (CRITICAL)
- `app/services/revenue_share_calculator.rb` - Complex calculation logic

### Coursebuilder (to migrate TO)

- `packages/core/src/inngest/stripe/` - Webhook handlers (STUBS)
- `packages/adapter-drizzle/src/lib/mysql/schemas/` - All schemas
- `apps/egghead/` - Target application

### egghead-next (to KILL)

- `src/machines/lesson-machine.ts` - xstate player (DON'T PORT)
- `src/lib/customer-io.ts` - Customer.io integration
- `src/server/routers/` - tRPC routers (20+)
- `studio/` - Sanity Studio (ELIMINATING)

---

## Metrics to Track

| Metric                       | Current | Target                          |
| ---------------------------- | ------- | ------------------------------- |
| Users migrated               | 0       | 699,318                         |
| Subscriptions migrated       | 0       | 3,335                           |
| Progress records migrated    | 0       | 2,957,917                       |
| Webhook handlers implemented | 1/5     | 5/5                             |
| Cron jobs ported             | 0/17    | 8/17 (essential)                |
| Customer.io events           | 0       | 3 (subscribed, billed, removed) |
| E2E tests passing            | TBD     | 100%                            |
| Sanity references removed    | 0       | ~100                            |

---

## Next Session Checklist

- [ ] Read this document first
- [ ] Close `migrate-egghead-qqu` after task verification
- [ ] Add MonthlyReportWorker to essential cron jobs
- [ ] Create load testing tasks
- [ ] Update video player approach in UI epic
- [ ] Verify team features scope
- [ ] Start Phase 0 infrastructure if not started

---

_Generated by swarm analysis on Dec 11, 2025. Subagents: archaeologist (4x), pdf-brain search (2x)._
