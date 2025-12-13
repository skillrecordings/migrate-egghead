# Beads Holistic Analysis - December 12, 2025

> **Analysis by**: Swarm coordinator (PinkCastle) with 5 parallel subagents
> **Scope**: All 199 beads across 20+ epics
> **Purpose**: Gaps, sequencing, feasibility, redundancy, enhancements

---

## Executive Summary

The migration plan is **ambitious but achievable** with significant cleanup needed. Key findings:

| Dimension       | Status                      | Action Required                         |
| --------------- | --------------------------- | --------------------------------------- |
| **Gaps**        | 50+ gaps identified         | 7 critical, 18 high priority            |
| **Sequencing**  | Missing dependencies        | 8 cross-epic dependencies to add        |
| **Redundancy**  | 46 tasks to eliminate/defer | 50% scope reduction possible            |
| **Feasibility** | 14-16 weeks realistic       | With aggressive parallelization         |
| **Risk**        | HIGH                        | Webhook stubs, 3M records, auth cutover |

**Bottom line**: Focus on core migration (users, subscriptions, webhooks, UI). Defer ambitious features (support automation, team features) to post-launch.

---

## Part 1: Critical Gaps

### Blockers (Must Fix Before Launch)

| Gap                              | Epic                | Impact              | Fix                      |
| -------------------------------- | ------------------- | ------------------- | ------------------------ |
| **Webhook handlers are STUBS**   | migrate-egghead-5bk | Subscriptions break | Implement all 3 handlers |
| **Customer.io missing entirely** | migrate-egghead-ifz | No email automation | Build from scratch       |
| **No CDC mechanism specified**   | migrate-egghead-341 | Data loss risk      | Choose: trigger-based    |
| **Testing infrastructure empty** | migrate-egghead-6y2 | No confidence       | Build basic E2E          |
| **Control plane doesn't exist**  | migrate-egghead-6pv | No orchestration    | Build minimal version    |
| **Cron job coverage incomplete** | migrate-egghead-tkd | Site breaks         | Port 4-5 essential jobs  |
| **Auth cutover runbook empty**   | migrate-egghead-04y | Users locked out    | Fill in all subtasks     |

### High Priority Gaps

| Gap                                                 | Epic                | Impact                           |
| --------------------------------------------------- | ------------------- | -------------------------------- |
| Mailer migration incomplete (14 of 17 undocumented) | migrate-egghead-qk0 | Users don't get emails           |
| Gift subscription system not in plan                | -                   | Holiday sales break              |
| Referral/affiliate system not in plan               | -                   | Affiliate payouts break          |
| Team features scope unclear                         | migrate-egghead-dxh | Revenue impact                   |
| Instructor revenue share not documented             | migrate-egghead-tkd | Instructor payouts break         |
| Support automation scope creep                      | migrate-egghead-1rx | 17 subtasks, unclear if in-scope |
| SEO safety plan incomplete                          | migrate-egghead-34t | 404s = SEO penalty               |

### Tasks Needing Detail (40+ empty descriptions)

**Most critical empty tasks:**

- `migrate-egghead-39p.2` - User/Account migration (699K users)
- `migrate-egghead-39p.3` - Subscription migration (3,335 active)
- `migrate-egghead-39p.4` - Progress migration (3M records)
- `migrate-egghead-04y.1-7` - All auth cutover subtasks
- `migrate-egghead-34t.1-8` - All SEO safety subtasks
- `migrate-egghead-koh.1-10` - All data migration scripts

---

## Part 2: Sequencing & Dependencies

### Critical Path

```
Phase 0 (2 weeks) → Phase 1 (3 weeks) → Phase 2 (1 week) → Phase 3 (1 week) → Phase 4 (2 weeks) → Phase 5 (3 weeks) → Phase 6 (4 weeks)
```

**Total: 16 weeks (~4 months)** with aggressive parallelization

### Missing Dependencies (MUST ADD)

| Task                                         | Should Depend On                               | Reason                    |
| -------------------------------------------- | ---------------------------------------------- | ------------------------- |
| `migrate-egghead-koh.1` (user migration)     | `migrate-egghead-341` (data integrity)         | CDC must be ready first   |
| `migrate-egghead-koh.6` (content migration)  | `migrate-egghead-mnn.1` (Sanity audit)         | Need mapping first        |
| `migrate-egghead-dxh.6` (team data)          | `migrate-egghead-koh.2` (org migration)        | Orgs must exist           |
| `migrate-egghead-ifz.3` (Customer.io events) | `migrate-egghead-5bk.1` (subscription handler) | Events come from handlers |
| `migrate-egghead-1rx.3` (diagnostic engine)  | `migrate-egghead-koh.1` (user migration)       | Need user data            |
| `migrate-egghead-r52.7` (URL redirects)      | `migrate-egghead-34t.8` (redirect map)         | Need map first            |
| `migrate-egghead-axl.6` (auth cutover)       | `migrate-egghead-04y` (auth runbook)           | Runbook must be complete  |
| `migrate-egghead-2gb` (Front plugin)         | `migrate-egghead-r52.1` (APIs ready)           | APIs must exist           |

### Priority Inversions (FIX)

| Task                                    | Current | Should Be | Reason                |
| --------------------------------------- | ------- | --------- | --------------------- |
| `migrate-egghead-6pv.10` (Vector DB)    | P1      | P0        | Agents need context   |
| `migrate-egghead-koh.7` (Instructors)   | P1      | P0        | Content depends on it |
| `migrate-egghead-r52.11` (Video player) | P1      | P0        | Critical UI component |
| `migrate-egghead-mnn.9` (Sanity docs)   | P2      | P0        | Must document first   |

### Missing Human Checkpoints

| Location       | Checkpoint Needed                                                |
| -------------- | ---------------------------------------------------------------- |
| Before Phase 2 | `[HUMAN] Approve webhook handler design`                         |
| Before Phase 3 | `[HUMAN] Decide which cron jobs to port` (exists in closed epic) |
| Before Phase 4 | `[HUMAN] Approve Customer.io + email strategy`                   |
| Before Phase 5 | `[HUMAN] Approve UI architecture`                                |

### Parallelization Opportunities

**Can run simultaneously:**

- Phase 0 infrastructure: `6pv.9`, `6pv.10`, `6pv.11`
- Phase 1 data migration: `koh.1`, `koh.2`, `koh.3` (with idempotency)
- Phase 2 webhook handlers: `5bk.1`, `5bk.2`, `5bk.3`
- Cross-phase: `341`, `mnn`, `34t` can start immediately

---

## Part 3: Redundancy & Bullshit

### DELETE ENTIRE EPICS

| Epic                                           | Reason                                               | Tasks Removed |
| ---------------------------------------------- | ---------------------------------------------------- | ------------- |
| **`migrate-egghead-1rx`** (Support Automation) | Multi-tenant support platform is post-launch feature | **17 tasks**  |
| **`migrate-egghead-qqu`** (Phase 3 Cron Jobs)  | Duplicate of `migrate-egghead-tkd`                   | **8 tasks**   |

### DEFER ENTIRE EPICS

| Epic                                           | Reason                                            | Tasks Deferred |
| ---------------------------------------------- | ------------------------------------------------- | -------------- |
| **`migrate-egghead-6y2`** (Testing Pyramid)    | Full pyramid is ideal but not required for launch | **7 tasks**    |
| **`migrate-egghead-mnn`** (Sanity Elimination) | Sanity works fine, eliminate post-launch          | **9 tasks**    |
| **`migrate-egghead-dxh`** (Team Features UI)   | Keep data migration, defer UI                     | **5 tasks**    |

### DELETE SPECIFIC TASKS

| Task                     | Reason                                   |
| ------------------------ | ---------------------------------------- |
| `migrate-egghead-tkd.12` | Duplicate of `tkd.6`                     |
| `migrate-egghead-6pv.10` | Vector DB not needed (agents read files) |
| `migrate-egghead-6pv.11` | Inngest orchestrator not needed          |
| `migrate-egghead-6pv.12` | Slack bot not needed                     |
| `migrate-egghead-6pv.13` | Dashboard not needed                     |
| `migrate-egghead-6pv.15` | Phase contracts not needed               |

### Scope Reduction Summary

| Category             | Tasks         |
| -------------------- | ------------- |
| Deleted epics        | -25 tasks     |
| Deferred epics       | -21 tasks     |
| Deleted tasks        | -6 tasks      |
| **Total eliminated** | **-52 tasks** |
| **Remaining**        | **~90 tasks** |

**This is a 50% reduction in scope** while keeping everything that blocks launch.

---

## Part 4: Feasibility & Effort

### Epic Effort Estimates

| Epic                                   | Effort (days) | Risk     | Notes                   |
| -------------------------------------- | ------------- | -------- | ----------------------- |
| `migrate-egghead-6pv` (Phase 0)        | 10-15         | MEDIUM   | Trimmed to essentials   |
| `migrate-egghead-koh` (Phase 1)        | 30-40         | HIGH     | 699K users, 3M progress |
| `migrate-egghead-5bk` (Phase 2)        | 15-20         | MEDIUM   | 3 stub handlers         |
| `migrate-egghead-tkd` (Phase 3)        | 15-20         | MEDIUM   | 4-5 essential jobs      |
| `migrate-egghead-qk0` (Phase 4)        | 20-25         | HIGH     | Customer.io missing     |
| `migrate-egghead-r52` (Phase 5)        | 30-40         | MEDIUM   | Video player, search    |
| `migrate-egghead-axl` (Phase 6)        | 15-20         | HIGH     | Dual-write, cutover     |
| `migrate-egghead-341` (Data Integrity) | 15-20         | CRITICAL | Must complete first     |
| `migrate-egghead-34t` (SEO Safety)     | 10-15         | MEDIUM   | Redirects, monitoring   |
| `migrate-egghead-04y` (Auth Cutover)   | 10-15         | HIGH     | OAuth re-linking        |

### Hidden Complexity

| Task                            | Looks Like | Actually Is                    | Real Effort |
| ------------------------------- | ---------- | ------------------------------ | ----------- |
| Progress migration (3M records) | 5 days     | Batch processing at scale      | 10-15 days  |
| Video player                    | 5 days     | 14 xstate states to understand | 15-20 days  |
| Sanity elimination              | 10 days    | 100+ references scattered      | 25-35 days  |
| Team features                   | 15 days    | Revenue impact, edge cases     | 25-30 days  |

### Technical Blockers

| Blocker                    | Impact                | Mitigation                  |
| -------------------------- | --------------------- | --------------------------- |
| No CDC mechanism           | Data loss risk        | Choose trigger-based        |
| Webhook handlers are stubs | Subscriptions break   | Implement before dual-write |
| Customer.io missing        | No email automation   | Build from scratch          |
| 17 cron jobs undocumented  | Site breaks           | Audit and decide            |
| xstate complexity          | Player rebuild needed | Don't port, build simpler   |

### Timeline Estimates

| Scenario        | Duration | Assumptions                         |
| --------------- | -------- | ----------------------------------- |
| **Optimistic**  | 12 weeks | No blockers, scripts work first try |
| **Realistic**   | 16 weeks | Testing, debugging, rework          |
| **Pessimistic** | 24 weeks | Major data issues, scope creep      |

---

## Part 5: Enhancement Ideas

### Quick Wins (1-3 hours each)

1. Add reconciliation job to Phase 0
2. Create migration status CLI
3. Document all 17 cron jobs
4. Build webhook replay tool
5. Create data migration dry-run reports
6. Add Customer.io event monitoring
7. Build maintenance page
8. Create user communication timeline
9. Document OAuth re-linking flow
10. Add phase contracts to beads

### Strategic Improvements (8-20 hours each)

1. **Local migration testing environment** - Docker Compose with Rails, PlanetScale, Stripe
2. **Webhook shadow testing tool** - Replay production webhooks, compare outcomes
3. **Automated rollback testing** - Nightly test of flip back to Rails
4. **Migration dashboard enhancement** - Real-time metrics, phase progress
5. **Chaos engineering for webhooks** - Test out-of-order, duplicate, delayed

### Monitoring Additions

| What to Monitor         | Why                  | Tool                      |
| ----------------------- | -------------------- | ------------------------- |
| Webhook processing rate | Catch slowdowns      | Inngest dashboard         |
| Data divergence         | Rails vs PlanetScale | Custom reconciliation job |
| Auth success rate       | Catch cutover issues | Custom dashboard          |
| 404 rate                | SEO protection       | Vercel analytics          |
| Customer.io events      | Email delivery       | Customer.io dashboard     |

---

## Part 6: Recommended Actions

### Immediate (This Week)

1. **DELETE** `migrate-egghead-1rx` (Support Automation) - 17 tasks, post-launch feature
2. **DELETE** `migrate-egghead-qqu` (Phase 3 duplicate) - 8 tasks, consolidated into tkd
3. **DEFER** `migrate-egghead-6y2` (Testing Pyramid) - 7 tasks, manual testing for now
4. **DEFER** `migrate-egghead-mnn` (Sanity Elimination) - 9 tasks, post-launch
5. **DEFER** `migrate-egghead-dxh.1-5` (Team UI) - 5 tasks, keep data migration only

### Before Phase 1

1. **IMPLEMENT** all 3 webhook handlers (currently stubs)
2. **CHOOSE** CDC mechanism (recommend trigger-based)
3. **AUDIT** all 17 cron jobs - decide which to port
4. **COMPLETE** Sanity audit - list all 100+ references
5. **FILL IN** all empty task descriptions in Phase 1

### Add Missing Dependencies

```
migrate-egghead-koh.1 → depends_on migrate-egghead-341
migrate-egghead-koh.6 → depends_on migrate-egghead-mnn.1
migrate-egghead-dxh.6 → depends_on migrate-egghead-koh.2
migrate-egghead-ifz.3 → depends_on migrate-egghead-5bk.1
migrate-egghead-r52.7 → depends_on migrate-egghead-34t.8
migrate-egghead-axl.6 → depends_on migrate-egghead-04y
```

### Add Missing Human Checkpoints

1. `migrate-egghead-5bk.0` - [HUMAN] Approve webhook design
2. `migrate-egghead-qk0.0` - [HUMAN] Approve Customer.io strategy
3. `migrate-egghead-r52.0` - [HUMAN] Approve UI architecture

---

## Part 7: Revised Execution Plan

### What You're Actually Shipping

| Phase     | Epic                    | Tasks         | Duration     |
| --------- | ----------------------- | ------------- | ------------ |
| 0         | Pre-Migration (trimmed) | 5             | 1 week       |
| 1         | Data Migration          | 10            | 3 weeks      |
| 2         | Webhook Handlers        | 8             | 1 week       |
| 3         | Essential Cron Jobs     | 10            | 1 week       |
| 4         | Customer.io + Mailers   | 7             | 2 weeks      |
| 5         | UI Components           | 11            | 3 weeks      |
| 6         | Cutover                 | 10            | 4 weeks      |
| -         | Data Integrity          | 7             | Parallel     |
| -         | SEO Safety              | 8             | Parallel     |
| -         | Auth Cutover            | 7             | Parallel     |
| **Total** |                         | **~90 tasks** | **16 weeks** |

### What You're NOT Shipping (Deferred)

| Epic               | Tasks | When        |
| ------------------ | ----- | ----------- |
| Support Automation | 17    | Post-launch |
| Testing Pyramid    | 7     | Post-launch |
| Sanity Elimination | 9     | Post-launch |
| Team Features UI   | 5     | Post-launch |
| SAML/SSO           | -     | Post-launch |
| Affiliate System   | -     | Post-launch |

---

## Appendix: Bead Statistics

### By Status

| Status    | Count   |
| --------- | ------- |
| Open      | 165     |
| Closed    | 34      |
| **Total** | **199** |

### By Type

| Type | Count |
| ---- | ----- |
| Epic | 20    |
| Task | 179   |

### By Priority

| Priority      | Count |
| ------------- | ----- |
| P0 (Critical) | 45    |
| P1 (High)     | 89    |
| P2 (Medium)   | 65    |

### Epics Overview

| Epic ID             | Name                                | Status     | Subtasks |
| ------------------- | ----------------------------------- | ---------- | -------- |
| migrate-egghead-39p | Kill egghead-rails and egghead-next | Open       | 10       |
| migrate-egghead-6pv | Phase 0: Pre-Migration Safety       | Open       | 17       |
| migrate-egghead-koh | Phase 1: Data Migration             | Open       | 10       |
| migrate-egghead-5bk | Phase 2: Webhook Handlers           | Open       | 8        |
| migrate-egghead-qqu | Phase 3: Cron Jobs (DUPLICATE)      | **Closed** | 8        |
| migrate-egghead-tkd | Essential Cron Jobs                 | Open       | 12       |
| migrate-egghead-qk0 | Phase 4: External Integrations      | Open       | 7        |
| migrate-egghead-r52 | Phase 5: UI Components              | Open       | 11       |
| migrate-egghead-axl | Phase 6: Cutover                    | Open       | 10       |
| migrate-egghead-341 | Data Integrity & Safety             | Open       | 7        |
| migrate-egghead-34t | SEO Safety                          | Open       | 8        |
| migrate-egghead-04y | Auth Cutover Runbook                | Open       | 7        |
| migrate-egghead-1rx | Support Automation (DEFER)          | Open       | 17       |
| migrate-egghead-mnn | Sanity Elimination (DEFER)          | Open       | 9        |
| migrate-egghead-dxh | Team Features                       | Open       | 6        |
| migrate-egghead-ifz | Customer.io Integration             | Open       | 6        |
| migrate-egghead-6y2 | Testing Infrastructure (DEFER)      | Open       | 7        |
| migrate-egghead-2gb | Front.com Plugin                    | Open       | 1        |
| migrate-egghead-5vc | Stripe Webhook Documentation        | **Closed** | 6        |
| migrate-egghead-u6b | UI Migration Exploration            | **Closed** | 6        |
| migrate-egghead-h14 | Gap Analysis                        | **Closed** | 5        |

---

## Part 8: Beads Restructure Plan (Added Dec 12, 2025)

### Problem: Epic Sprawl & Cryptic IDs

The current 26 epics have significant overlap and cryptic hash IDs:

```
Video Migration:
  - 30z, brp, ddl → 3 epics for same work

Phase 0:
  - 6pv, 341 → 2 epics for same phase

Phase 1:
  - koh, 39p → 2 epics for same phase

Phase 4:
  - qk0, ifz, 1p8 → 3 epics for same phase

Phase 6:
  - axl, 04y → 2 epics for same phase
```

**Nobody can remember what `koh` means without looking it up.**

### Solution: Human-Readable Phase-Aligned IDs

New structure with custom IDs matching README phases:

```
migrate-egghead-phase-0          # Minimum Viable Safety
├── phase-0.e2e-test             # ONE E2E test working
├── phase-0.inngest-dev          # Inngest dev server running
├── phase-0.idempotency          # stripe_event_id columns added
└── phase-0.gate                 # [HUMAN] Approve control plane

migrate-egghead-phase-1          # Data Migration
├── phase-1.users                # 699K users migration
├── phase-1.orgs                 # 94K organizations migration
├── phase-1.subscriptions        # 3,335 subscriptions migration
├── phase-1.progress             # 3M progress records migration
├── phase-1.content              # Courses, lessons, tags migration
├── phase-1.gifts                # Gift subscriptions migration
├── phase-1.teams                # 266 teams migration
├── phase-1.validation           # Reconciliation queries
└── phase-1.gate                 # [HUMAN] Approve migration

migrate-egghead-phase-2          # Webhook Handlers
├── phase-2.sub-created          # subscription.created handler
├── phase-2.sub-updated          # subscription.updated handler
├── phase-2.sub-deleted          # subscription.deleted handler
├── phase-2.invoice-paid         # invoice.payment_succeeded handler
├── phase-2.unit-tests           # Handler unit tests
├── phase-2.e2e-checkout         # E2E checkout flow
├── phase-2.e2e-cancel           # E2E cancel flow
└── phase-2.gate                 # [HUMAN] Approve handlers

migrate-egghead-phase-3          # Cron Jobs
├── phase-3.stripe-reconciler    # Daily Stripe reconciliation
├── phase-3.gift-expiration      # Daily gift expiration
├── phase-3.sitemap-refresh      # 4-hour sitemap refresh
├── phase-3.token-cleaner        # 1-minute magic link cleanup
├── phase-3.lesson-publish       # 10-minute scheduled publish
├── phase-3.renewal-reminder     # Daily renewal reminders
└── phase-3.revenue-share        # Monthly instructor payments

migrate-egghead-phase-4          # External Integrations
├── phase-4.customerio-client    # Customer.io API client
├── phase-4.customerio-events    # Subscription event tracking
├── phase-4.magic-link-email     # Magic link via Resend
├── phase-4.renewal-email        # Renewal/welcome emails
├── phase-4.transactional        # 17 mailers to Resend
├── phase-4.e2e-email            # E2E email flow test
└── phase-4.gate                 # [HUMAN] Approve email strategy

migrate-egghead-phase-5          # UI Components
├── phase-5.video-player         # Mux player component
├── phase-5.lesson-view          # Lesson page with player
├── phase-5.course-view          # Course page with progress
├── phase-5.search-ui            # Typesense + InstantSearch
├── phase-5.pricing-page         # Stripe checkout integration
├── phase-5.subscription-mgmt    # Subscription management
├── phase-5.redirects            # URL redirect map
├── phase-5.e2e-matrix           # Full click-test matrix
└── phase-5.gate                 # [HUMAN] Approve UI

migrate-egghead-phase-6          # Cutover
├── phase-6.dual-write           # Deploy dual-write config
├── phase-6.shadow-compare       # Shadow traffic comparison
├── phase-6.shadow-e2e           # E2E against shadow mode
├── phase-6.shadow-gate          # [HUMAN] Shadow mode review (7+ days)
├── phase-6.flip-primary         # Execute flip to CB primary
├── phase-6.auth-cutover         # Auth + password reset campaign
├── phase-6.auth-gate            # [HUMAN] Auth cutover approval
├── phase-6.post-flip-e2e        # Post-flip regression suite
├── phase-6.dns-gate             # [HUMAN] DNS cutover authorization
├── phase-6.dns-cutover          # Execute DNS cutover
└── phase-6.kill-gate            # [HUMAN] Kill Rails authorization
```

### Old ID → New ID Mapping

| Old ID   | New ID                | Notes                 |
| -------- | --------------------- | --------------------- |
| `6pv`    | `phase-0`             | Control plane         |
| `6pv.17` | `phase-0.gate`        | Human gate            |
| `koh`    | `phase-1`             | Data migration        |
| `koh.17` | `phase-1.gate`        | Human gate            |
| `5bk`    | `phase-2`             | Webhooks              |
| `15v`    | `phase-2.gate`        | Human gate            |
| `tkd`    | `phase-3`             | Cron jobs             |
| `qk0`    | `phase-4`             | External integrations |
| `esr`    | `phase-4.gate`        | Human gate            |
| `r52`    | `phase-5`             | UI components         |
| `sr4`    | `phase-5.gate`        | Human gate            |
| `axl`    | `phase-6`             | Cutover               |
| `axl.4`  | `phase-6.shadow-gate` | Shadow review         |
| `dwa`    | `phase-6.auth-gate`   | Auth approval         |
| `axl.8`  | `phase-6.dns-gate`    | DNS approval          |
| `axl.10` | `phase-6.kill-gate`   | Kill Rails            |

### Migration Steps

1. **Archive complete** - See `reports/BEADS_ARCHIVE.md` (263 beads, 739 lines)
2. **Close completed work** - brp.\*, 6pv.1-8, koh.1-8
3. **Create new phase-aligned structure** - Using `beads_create_epic` with custom IDs
4. **Update README** - Replace old bead references with new IDs

---

_Generated by swarm analysis on Dec 12, 2025. Coordinator: PinkCastle. Subagents: 5 parallel explorers._
_Restructure plan added Dec 12, 2025._
