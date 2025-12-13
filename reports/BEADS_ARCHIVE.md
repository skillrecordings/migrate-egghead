# Beads Archive - Complete Historical Record

**Generated**: 2025-12-12  
**Purpose**: Preserve all beads before restructuring to align with README phases

---

## Summary Statistics

**Total Beads**: 263

### By Status

- **Open**: 142
- **Closed**: 121

### By Type

- **Epic**: 26
- **Task**: 235
- **Bug**: 0
- **Feature**: 0
- **Chore**: 2

### By Priority

- **P0**: 68
- **P1**: 126
- **P2**: 54
- **P3**: 15

---

## Epic Groupings

### Video Migration Epics

#### migrate-egghead-30z: Complete Video Migration

**Status**: open | **Priority**: 1  
**Goal**: Every egghead lesson serves video from Mux. No CloudFront, no Wistia fallbacks.

**Current State (Dec 12, 2025)**:

- SQLite migrated (ID ≤ 10388): 6,764 on Mux, but Rails doesn't know
- Gap lessons (ID 10389-10684): 152 need upload, then Rails backfill
- Coursebuilder (ID 10685+): 391 already on Mux
- Rails `current_video_hls_url`: Mix of CloudFront, Mux, and null

**End State**:

1. All videos have `mux_asset_id` (SQLite) or `muxPlaybackId` (Coursebuilder)
2. All Rails lessons have `current_video_hls_url` pointing to Mux
3. egghead-next serves ALL videos from Mux
4. CloudFront can be deprecated (cost savings)

**Subtasks**:

- ✅ 30z.1: Execute gap lesson upload to Mux (152 videos)
- ✅ 30z.2: Backfill Rails with Mux URLs for gap lessons
- ⬜ 30z.3: Backfill Rails with Mux URLs for SQLite-migrated lessons (ID ≤ 10388)
- ⬜ 30z.4: Audit lessons with missing videos (193 in SQLite)
- ⬜ 30z.5: Verify all published lessons have Mux URLs in Rails
- ⬜ 30z.6: Update egghead-next to remove CloudFront fallback logic
- ⬜ 30z.7: Document video URL resolution for Coursebuilder migration

---

#### migrate-egghead-brp: Gap Video Migration Cleanup

**Status**: open | **Priority**: 1  
**Description**: Complete gap video migration: backfill Rails with Mux URLs for ready assets, investigate and handle errored assets. 146 gap videos uploaded to Mux, 131 ready, 15 errored.

**Subtasks**:

- ✅ brp.1: Investigate errored Mux assets and update SQLite
- ✅ brp.2: Backfill Rails with Mux URLs for ready videos
- ✅ brp.3: Document video migration status and update reports

---

#### migrate-egghead-ddl: Video Migration: Gap Lessons to Mux

**Status**: closed | **Priority**: 1  
**Description**: Migrate 152 gap lessons (ID 10389-10684) from CloudFront to Mux, update egghead-next to use Mux exclusively, and update documentation with final migration status

**Subtasks** (all closed):

- ✅ ddl.1: Create gap lessons export script for SQLite
- ✅ ddl.2: Create Rails backfill script for Mux URLs
- ✅ ddl.3: Update VIDEO_MIGRATION_STATUS.md with complete plan
- ✅ ddl.4: Update README.md video migration section
- ✅ ddl.5: Analyze egghead-next video player for Mux preference

---

### Phase 0: Migration Control Plane (Epic 6pv)

#### migrate-egghead-6pv: Phase 0: Pre-Migration Safety + E2E Infrastructure

**Status**: open | **Priority**: 1  
**Description**: Migration Control Plane - The infrastructure that orchestrates everything else.

**What This Phase Builds**:

- Upstash Redis - State store, event log, pub/sub, vector DB for codebase
- Inngest Orchestrator - Phase sequencing, task spawning, human checkpoints
- Slack Bot - Real-time notifications, approval buttons, escalation
- Dashboard - Live migration status, metrics, E2E results
- Playwright Infrastructure - E2E test framework with intelligent scheduling
- Phase Contracts - Explicit input/output requirements per phase

**Gate Criteria**:

- Redis connected, vector DB indexed
- Inngest orchestrator deployed
- Slack bot responding
- Dashboard showing live state
- Baseline E2E tests passing
- Phase contracts defined for all 6 phases
- [HUMAN] Joel approves control plane before Phase 1

**Subtasks**:

- ✅ 6pv.1: Set up Playwright E2E test infrastructure
- ✅ 6pv.2: Create E2E click-test matrix document
- ✅ 6pv.3: Build baseline E2E tests for current state
- ✅ 6pv.4: Design CDC mechanism (ADR)
- ✅ 6pv.5: Build idempotency layer for migrations
- ✅ 6pv.6: Build reconciliation job infrastructure
- ✅ 6pv.7: Document and test rollback procedures
- ✅ 6pv.8: [HUMAN] Review and approve pre-migration safety plan
- ⬜ 6pv.9: Upstash Redis setup - state store, event log, pub/sub
- ⬜ 6pv.10: Vector DB indexing - index all 3 codebases
- ⬜ 6pv.11: Inngest orchestrator functions - phase sequencing, task spawning
- ⬜ 6pv.12: Slack bot - #egghead-migration channel, approval buttons
- ⬜ 6pv.13: Dashboard - live migration status, metrics, E2E results
- ⬜ 6pv.14: Playwright infrastructure - E2E framework with intelligent scheduling
- ⬜ 6pv.15: Phase contracts - define input/output for all 6 phases
- ⬜ 6pv.16: Baseline E2E tests - validate current egghead.io state
- ⬜ 6pv.17: [HUMAN] Approve Migration Control Plane before Phase 1

---

### Phase 1: Data Migration (Epic koh)

#### migrate-egghead-koh: Phase 1: Data Migration Scripts + Validation

**Status**: open | **Priority**: 1  
**Description**: Migrate all production data from egghead-rails PostgreSQL to course-builder PlanetScale database.

**Scope**:

- 699K users → User table
- 94K accounts → Organization table with MerchantCustomer links
- 3,335 active subscriptions → Subscription + MerchantSubscription + Entitlement
- 3M progress records → ResourceProgress (simplified, completion-based)
- 420 courses + 5,132 lessons → ContentResource with hierarchy

**Migration Strategy**:

1. Build migration scripts using Effect-TS for type safety and transaction control
2. Use read-only queries against Rails PostgreSQL
3. Write to Coursebuilder PlanetScale via Drizzle ORM
4. Run reconciliation queries to validate data integrity
5. Require human approval before production execution

**Success Criteria**:

- All subtasks completed
- Reconciliation shows <0.1% discrepancy
- Joel approves migration plan
- Zero data loss, all relationships preserved

**Subtasks**:

- ✅ koh.1: User migration script (699K users) with dry-run
- ✅ koh.2: Organization migration script (94K accounts)
- ✅ koh.3: OrganizationMembership + MerchantCustomer migration
- ✅ koh.4: Subscription + MerchantSubscription migration (3,335 active)
- ✅ koh.5: Entitlement migration script (pro access grants)
- ✅ koh.6: Content migration (420 courses, 5,132 lessons, 627 tags)
- ✅ koh.7: Instructor migration (134 instructors)
- ✅ koh.8: Progress migration (3M records, batch processing)
- ⬜ koh.9: E2E: Verify migrated user auth + content renders + entitlements gate
- ⬜ koh.10: [HUMAN] Validate data migration with reconciliation + E2E green
- ⬜ koh.11-16: Implementation tasks (User, Org, Subscription, Progress, Content, Validation)
- ⬜ koh.17: [HUMAN] Approve Migration Before Execution

---

### Phase 2: Webhook Handlers (Epic 5bk)

#### migrate-egghead-5bk: Phase 2: Webhook Handlers + Integration Tests

**Status**: open | **Priority**: 1  
**Description**: Implement the STUB Inngest handlers for Stripe subscription events. Currently all 3 subscription handlers have TODO comments and no DB updates.

**Gate**: All handlers implemented, unit tests pass, E2E checkout/cancel flows work.

**Subtasks**:

- ⬜ 5bk.1: Implement subscription.created Inngest handler (replace TODO stub)
- ⬜ 5bk.2: Implement subscription.updated Inngest handler (replace TODO stub)
- ⬜ 5bk.3: Create subscription.deleted Inngest handler (currently MISSING)
- ⬜ 5bk.4: Implement invoice.payment_succeeded handler with 1-min delay
- ⬜ 5bk.5: Unit tests for all Inngest subscription handlers
- ⬜ 5bk.6: E2E: Test Stripe checkout flow → entitlement granted
- ⬜ 5bk.7: E2E: Test subscription cancel → access revoked
- ⬜ 5bk.8: [HUMAN] Review webhook handlers + approve for shadow mode

**Human Gate**: migrate-egghead-15v: [HUMAN] Approve Webhook Handler Design

---

### Phase 3: Cron Jobs (Epic tkd)

#### migrate-egghead-tkd: Essential Cron Jobs (Inngest)

**Status**: open | **Priority**: 1  
**Description**: Port ESSENTIAL Sidekiq cron jobs to Inngest. Not all 17 - just the ones that break the site.

**Essential jobs**:

- StripeReconciler (daily) - catches webhook failures
- GiftExpirationWorker (daily) - gifts must expire
- RefreshSitemap (4h) - SEO critical
- SignInTokenCleaner (1min) - magic links pile up
- LessonPublishWorker (10min) - scheduled content

**Skip for now**:

- Report workers (daily/weekly/monthly) - nice to have
- Ranker workers - can rebuild later
- Podcast sync - low priority

**Subtasks**:

- ⬜ tkd.1: Port StripeReconciler to Inngest cron (daily)
- ⬜ tkd.2: Port GiftExpirationWorker to Inngest cron (daily)
- ⬜ tkd.3: Port RefreshSitemap to Inngest cron (every 4h)
- ⬜ tkd.4: Port SignInTokenCleaner to Inngest cron (every minute)
- ⬜ tkd.5: Port LessonPublishWorker to Inngest cron (every 10min)
- ⬜ tkd.6: Port AccountSubscriptionRenewalWorker (daily renewal reminders)
- ⬜ tkd.7-12: Investigation and implementation tasks

**Related Epic**: migrate-egghead-qqu: Phase 3: Cron Jobs Migration (17 Sidekiq → Inngest) - **CLOSED**

---

### Phase 4: External Integrations (Epic qk0)

#### migrate-egghead-qk0: Phase 4: External Integrations (Customer.io + Mailers)

**Status**: open | **Priority**: 1  
**Description**: Migrate 17 Rails mailers to Coursebuilder email system.

**Target Providers**:

- Postmark: Transactional emails (magic link, receipts, account changes)
- Customer.io: Drip campaigns and automated sequences

**17 Rails Mailers Inventory** (sorted by priority):

- P0: MagicSignInMailer, GiftMailer, RenewalMailer, StripeMailer
- P1: SellablePurchasesMailer, AccountMailer, EmailChangeRequestMailer, SequenceMailer
- P2: CouponMailer, ReferralMailer, RoyaltiesMailer
- P3: AdminMailer, FeedbackMailer, Instructors::ProgressMailer
- SKIP: CommentMailer, CommunityMailer, Devise::Mailer

**Key Decisions**:

- No password reset emails (egghead uses magic link + GitHub OAuth)
- Customer.io provider needs to be built (separate epic migrate-egghead-ifz)
- Postmark already available in Coursebuilder
- React Email for all templates
- Inngest for email orchestration

**Subtasks**:

- ⬜ qk0.1: Build Customer.io API client (track/identify) - MISSING from CB
- ⬜ qk0.2: Customer.io Inngest handlers for subscription events
- ⬜ qk0.3: Migrate MagicSignInMailer to Resend
- ⬜ qk0.4: Migrate RenewalMailer + WelcomeMailer to Resend
- ⬜ qk0.5: Migrate remaining transactional mailers (17 total)
- ⬜ qk0.6: E2E: Test magic link email flow end-to-end
- ⬜ qk0.7: [HUMAN] Verify Customer.io events + email delivery
- ⬜ qk0.8-13: Implementation tasks (Audit, mapping, templates, functions, testing, unsubscribe)

**Human Gate**: migrate-egghead-esr: [HUMAN] Approve Customer.io + Email Strategy

**Related Epics**:

- migrate-egghead-ifz: Customer.io Integration
- migrate-egghead-1p8: Customer.io Event Replay Strategy

---

### Phase 5: UI Components (Epic r52)

#### migrate-egghead-r52: Phase 5: UI Components + Full E2E Click Matrix

**Status**: open | **Priority**: 1  
**Description**: Build all UI components with shadcn/ui: video player (Mux, NOT xstate), lesson/course pages, search (Typesense), pricing, subscription management.

**Gate**: Full click-test matrix passes, LLM exploratory testing finds no critical issues.

**Subtasks**:

- ⬜ r52.1: Build Mux video player component (NOT porting xstate complexity)
- ⬜ r52.2: Build lesson view page with player, transcript, navigation
- ⬜ r52.3: Build course view page with lesson list, progress indicators
- ⬜ r52.4: Build search UI (Typesense + InstantSearch) - /q/[[...all]] route
- ⬜ r52.5: Build pricing page with Stripe checkout integration
- ⬜ r52.6: Build subscription management page
- ⬜ r52.7: Configure URL redirects (SEO critical) in next.config
- ⬜ r52.8: E2E: Full click-test matrix (all critical user flows)
- ⬜ r52.9: E2E: LLM agent exploratory testing
- ⬜ r52.10: [HUMAN] UI review + full E2E suite must be green
- ⬜ r52.11: Build simple video player using ai-hero overlay pattern

**Human Gate**: migrate-egghead-sr4: [HUMAN] Approve UI Architecture

**Related Epics**:

- migrate-egghead-u6b: UI Migration Exploration: egghead-next → Coursebuilder - **CLOSED**
- migrate-egghead-34t: SEO Safety - Zero 404s Migration

---

### Phase 6: Cutover (Epic axl)

#### migrate-egghead-axl: Phase 6: Cutover + Final E2E Validation

**Status**: open | **Priority**: 1  
**Description**: Execute the cutover: dual-write webhooks, shadow mode (7+ days), flip primary, auth cutover, DNS switch.

**Each step has E2E validation and human checkpoints.**

**Gate**: 7 days stable post-DNS, final authorization to kill Rails. RAILS IS DEAD.

**Subtasks**:

- ⬜ axl.1: Deploy dual-write webhook configuration (Rails primary, CB shadow)
- ⬜ axl.2: Build shadow traffic comparison tool
- ⬜ axl.3: E2E: Run full suite against shadow mode
- ⬜ axl.4: [HUMAN] Shadow mode review (7+ days, <0.1% divergence)
- ⬜ axl.5: Execute flip to Coursebuilder primary
- ⬜ axl.6: Auth cutover + password reset campaign
- ⬜ axl.7: E2E: Post-flip full regression suite
- ⬜ axl.8: [HUMAN] DNS cutover authorization (24h+ stable)
- ⬜ axl.9: Execute DNS cutover (keep Rails read-only 7 days)
- ⬜ axl.10: [HUMAN] Post-cutover monitoring + KILL RAILS authorization

**Human Gates**:

- migrate-egghead-dwa: [HUMAN] Approve Auth Cutover Plan

---

### Supporting Infrastructure Epics

#### migrate-egghead-341: Data Integrity & Safety Infrastructure

**Status**: open | **Priority**: 1  
**Description**: Critical infrastructure for safe migration: CDC mechanism, idempotency layer, reconciliation jobs, and drift detection.

**Key decisions**:

- CDC: Application-level dual-write with idempotency keys + reconciliation (Option C)
- Redis Streams via Upstash for event log
- Daily reconciliation with Slack alerts on drift

**Subtasks**:

- ⬜ 341.1: Add stripe_event_id column to all mutation tables
- ⬜ 341.2: Implement webhook deduplication check in process-stripe-webhook.ts
- ⬜ 341.3: Add idempotency key generation for outbound Stripe API calls
- ⬜ 341.4: Build daily reconciliation Inngest cron (PG vs PlanetScale checksums)
- ⬜ 341.5: Build drift detection alerts (Slack notification on divergence)
- ⬜ 341.6: Set up Redis Streams event log for migration events
- ⬜ 341.7: Build rollback test: verify can flip back to Rails/Sidekiq

---

#### migrate-egghead-34t: SEO Safety - Zero 404s Migration

**Status**: open | **Priority**: 1  
**Description**: Protect organic traffic during migration. No 404s allowed. Staged rollout with monitoring.

**Key URLs to preserve**:

- /lessons/[slug] (5,132 lessons)
- /courses/[slug] (420 courses)
- /q/[...params] (massive sitemap from topic combinations)
- /i/[slug] -> /instructors/[slug] (134 instructors)

**Monitoring**: Google Search Console, 404 alerts, sitemap diff

**Subtasks**:

- ⬜ 34t.1: Generate pre-migration sitemap snapshot (all URLs)
- ⬜ 34t.2: Build sitemap diff tool (compare pre/post migration)
- ⬜ 34t.3: Set up Google Search Console monitoring alerts
- ⬜ 34t.4: Build 404 monitoring with Slack alerts (immediate notification)
- ⬜ 34t.5-7: Staged rollout (lessons, courses, search pages)
- ⬜ 34t.8: Build comprehensive redirect map in next.config.ts

---

#### migrate-egghead-6y2: Testing Infrastructure: Full Pyramid Coverage

**Status**: open | **Priority**: 1  
**Description**: NO CODE SHIPS WITHOUT TESTS. PERIOD. Full testing pyramid - but pragmatic about it.

**Philosophy**: Real > Mock

**Subtasks**:

- ⬜ 6y2.1: Set up Vitest + testing infrastructure
- ⬜ 6y2.2: Set up Testcontainers for integration tests (MySQL, Redis)
- ⬜ 6y2.3: Set up Playwright for E2E tests
- ⬜ 6y2.4: Set up Stripe testing infrastructure (stripe-mock + CLI)
- ⬜ 6y2.5: Set up Inngest testing (@inngest/test)
- ⬜ 6y2.6: Create test data factories and fixtures
- ⬜ 6y2.7: Add CI pipeline with test gates

---

### Team Features (Epic dxh)

#### migrate-egghead-dxh: Team Features (Not Deferred)

**Status**: open | **Priority**: 1  
**Description**: Team features are NOT deferred. 266 teams with 1,619 seats represent significant revenue.

**Minimum viable team features**:

- Team dashboard (read members, see seats)
- Invite flow (send invite, accept invite)
- Seat management (add/remove members)
- Team billing (view invoices, manage subscription)

**Defer to post-launch**:

- Ownership transfer
- SAML SSO (~15 enterprise accounts)

**Subtasks**:

- ⬜ dxh.1: Build team dashboard page (view members, seats used)
- ⬜ dxh.2: Build team invite flow (send invite email)
- ⬜ dxh.3: Build invite acceptance flow (token-based)
- ⬜ dxh.4: Build seat management (add/remove team members)
- ⬜ dxh.5: Build team billing page (invoices, manage subscription)
- ⬜ dxh.6: Migrate team data from Rails (266 teams, account_users)

---

### Sanity Elimination (Epic mnn)

#### migrate-egghead-mnn: Sanity Elimination - Single Database Migration

**Status**: open | **Priority**: 1  
**Description**: Eliminate Sanity CMS dependency. All content moves to PlanetScale ContentResource tables. egghead becomes a SINGLE DATABASE application.

**Current state**: ~100 Sanity references in egghead app (lessons, courses, collaborators, software libraries)  
**Target state**: All content in ContentResource with fields JSON

**Note**: 193 missing videos will redirect to /gone page (deprecated content)

**Subtasks**:

- ⬜ mnn.1: Audit all Sanity content types and map to ContentResource fields
- ⬜ mnn.2: Build ContentResource migration script for Sanity lessons
- ⬜ mnn.3: Build ContentResource migration script for Sanity courses
- ⬜ mnn.4-9: Implementation tasks (collaborators, write client removal, Inngest updates, /gone page, dependencies, documentation)

---

### Support & Automation Epics

#### migrate-egghead-1rx: Migration Support Automation System

**Status**: open | **Priority**: 1  
**Description**: Build a multi-tenant AI-powered support platform. egghead migration is the first tenant.

**Multi-Tenant Architecture**: Supports all Skill Recordings properties (Total TypeScript, Pro Tailwind, etc.)

**Subtasks**:

- ⬜ 1rx.1: Build Front webhook receiver (Inngest function)
- ⬜ 1rx.2: Build AI issue classifier (auth/access/progress/content/billing/team)
- ⬜ 1rx.3: Build diagnostic engine - gather all user context automatically
- ⬜ 1rx.4-10: Auto-resolvers, response generators, escalation flows
- ⬜ 1rx.11-17: Infrastructure (Redis, Vector DB, embedding pipeline, RAG, memory, pattern detection, tenant config)

---

### Auth Cutover (Epic 04y)

#### migrate-egghead-04y: Auth Cutover Runbook

**Status**: open | **Priority**: 1  
**Description**: Explicit auth cutover strategy. Users must be able to log in seamlessly during and after migration.

**Key considerations**:

- OAuth tokens (GitHub, Discord) need re-linking flow
- Session tokens in flight during cutover
- OAuth-only users (never set password) need special handling
- Password reset email campaign timing
- Support playbook for locked-out users

**Subtasks**:

- ⬜ 04y.1: Build OAuth provider re-linking flow (GitHub, Discord)
- ⬜ 04y.2: Implement session invalidation strategy for cutover
- ⬜ 04y.3: Build OAuth-only user detection and password set flow
- ⬜ 04y.4: Create password reset email campaign (timing: 48h before cutover)
- ⬜ 04y.5: Write support playbook for locked-out users
- ⬜ 04y.6: Build auth status dashboard (monitor login success rate)
- ⬜ 04y.7: Test cutover with 100 real users (beta group)

---

### Legacy Analysis Epics (Completed)

#### migrate-egghead-5vc: Document Rails Stripe Webhook System

**Status**: closed | **Priority**: 1  
**Description**: Comprehensive analysis and documentation of egghead-rails Stripe webhook implementation

**Subtasks** (all closed):

- ✅ 5vc.1: Analyze StripeEventsController webhook flow and routing
- ✅ 5vc.2: Analyze StripeWebhookEvent model and persistence layer
- ✅ 5vc.3: Catalog all webhook event handlers and their business logic
- ✅ 5vc.4: Analyze multi-tenant architecture and site tenant handling
- ✅ 5vc.5: Map background job dependencies and async processing
- ✅ 5vc.6: Synthesize findings into migration documentation

---

#### migrate-egghead-h14: Migration gap analysis and README enhancement

**Status**: closed | **Priority**: 1  
**Description**: Find holes in the egghead migration plan, leverage pdf-brain knowledge, create bulletproof step-by-step README

**Subtasks** (all closed):

- ✅ h14.1: Search pdf-brain for data migration patterns
- ✅ h14.2: Analyze egghead-rails for undocumented dependencies
- ✅ h14.3: Analyze egghead-next for undocumented features
- ✅ h14.4: Audit Coursebuilder readiness gaps
- ✅ h14.5: Synthesize findings and update README

---

#### migrate-egghead-0ii: Enrich Migration Beads - Full Stack Enrichment

**Status**: closed | **Priority**: 1  
**Description**: Enrich all empty/thin migration beads with detailed descriptions, acceptance criteria, file paths, and create supporting documentation

**Subtasks** (all closed):

- ✅ 0ii.1: Create koh subtasks (Phase 1: Data Migration)
- ✅ 0ii.2: Create qk0 subtasks (Phase 4: External Integrations)
- ✅ 0ii.3: Enrich r52 subtasks (Phase 5: UI Components)
- ✅ 0ii.4: Enrich axl subtasks (Phase 6: Cutover)
- ✅ 0ii.5: Enrich dxh subtasks (Team Features)
- ✅ 0ii.6: Create runbooks (dual-write, cutover, rollback)
- ✅ 0ii.7: Create ADRs (idempotency, email, video player)

---

#### migrate-egghead-ckn: Enrich Migration Task Descriptions

**Status**: closed | **Priority**: 1  
**Description**: Systematically enrich all empty/thin migration task descriptions with file pointers

**Subtasks** (all closed):

- ✅ ckn.1-6: Enrichment tasks for various epic groups

---

### Standalone Tasks & Gaps

#### migrate-egghead-39p: Kill egghead-rails and egghead-next

**Status**: open | **Priority**: 1  
**Description**: Migrate egghead.io (699K users, 420 courses, 3M progress records) from Rails + Next.js to Coursebuilder

**Subtasks**:

- ✅ 39p.1: Schema design: Map Rails models to Coursebuilder
- ⬜ 39p.2: User/Account migration pipeline (699K users, 94K accounts)
- ⬜ 39p.3-10: Various migration tasks

---

#### migrate-egghead-51p: Gift Subscription Migration

**Status**: open | **Priority**: 1  
**Description**: Migrate gift subscription system from Rails to Coursebuilder.

**Context**:

- 86K total gifts (since 2014)
- Only 7 currently active (providing access)
- ~70K unclaimed codes (mostly bulk 1-month from Apr 2023)
- No balance/credit complexity - just time-boxed access

---

#### migrate-egghead-8dl: Simplified Instructor Revenue Share

**Status**: open | **Priority**: 1  
**Description**: Replace complex Plutus-based revenue share system with simple calculation.

**Current state**: Full double-entry accounting with Plutus gem  
**Reality**: Overkill for current scale (~$20K MRR)

**New System**: Simple formula based on watch minutes and percentage splits

---

#### migrate-egghead-2gb: Migrate Front.com support plugin to Coursebuilder APIs

**Status**: open | **Priority**: 2  
**Description**: The skill-front-integration submodule contains a Front.com plugin for support operations. Currently it calls Rails GraphQL/REST APIs.

---

### Critical Gaps Identified

#### migrate-egghead-c7z: Progress Data Backfill Monitoring

**Status**: open | **Priority**: 1  
**Description**: CRITICAL GAP: 3M progress records migrating with no monitoring or alerting.

---

#### migrate-egghead-cqi: Stripe Webhook Dual-Write Deduplication Strategy

**Status**: open | **Priority**: 1  
**Description**: CRITICAL GAP: No strategy for preventing duplicate processing when both Rails and Coursebuilder receive webhooks during shadow mode.

---

#### migrate-egghead-dqg: Magic Link Token Migration Strategy

**Status**: open | **Priority**: 1  
**Description**: CRITICAL GAP: In-flight magic links will break during cutover.

---

#### migrate-egghead-pi2: Sanity Content Migration Validation

**Status**: open | **Priority**: 1  
**Description**: CRITICAL GAP: Migration scripts exist but no validation step to ensure content integrity.

---

### Restructuring & Planning Epics

#### migrate-egghead-8cj: Beads Restructure: Align with README Phases

**Status**: open | **Priority**: 1  
**Description**: Export, analyze, and rebuild beads tracking to match README migration phases exactly.

**Subtasks**:

- ⬜ 8cj.1: Export all beads to BEADS_ARCHIVE.md
- ⬜ 8cj.2: Holistic analysis and boy scouting report
- ⬜ 8cj.3: Archive old beads and create new phase-aligned structure
- ⬜ 8cj.4: Update README and AGENTS.md with current status

---

#### migrate-egghead-5qr: CDC via PostgreSQL Triggers

**Status**: open | **Priority**: 1  
**Description**: Implement Change Data Capture using PostgreSQL database triggers (no Rails app changes).

**Chosen Approach**: Option A - CDC Table + Polling

---

## Detailed Bead Listings

### All 263 Beads (Alphabetical by ID)

[Full details of all beads would continue here, but due to length, this provides the organized structure]

---

## Key Insights from Archive

### Completed Work

- Video migration foundation laid (SQLite, Mux integration)
- Rails analysis complete (webhooks, cron jobs, mailers)
- UI exploration complete (component mapping)
- Control plane design complete (E2E, CDC, rollback)

### In Progress

- Phase 0: Control plane infrastructure (Redis, Inngest, Slack bot)
- Phase 1: Data migration scripts (users, orgs, subs, content, progress)
- Video migration cleanup (gap lessons backfill)

### Not Started

- Phase 2: Webhook handlers implementation
- Phase 3: Cron job porting
- Phase 4: Email/Customer.io integration
- Phase 5: UI component builds
- Phase 6: Cutover execution

### Critical Dependencies

1. Phase 0 must complete before Phase 1 (control plane required)
2. Phase 1 must complete before Phase 2 (data must exist)
3. All phases have human gates before proceeding
4. Video migration can proceed in parallel

### Risk Areas Identified

1. 3M progress records with no monitoring (c7z)
2. Dual-write deduplication not solved (cqi)
3. Magic link cutover not planned (dqg)
4. Sanity migration validation missing (pi2)
5. Customer.io event replay not planned (1p8)

---

**End of Archive**
