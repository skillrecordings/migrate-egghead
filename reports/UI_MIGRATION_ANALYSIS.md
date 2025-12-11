# UI Migration Analysis: egghead-next → Coursebuilder

> **Generated**: December 11, 2025  
> **Epic**: migrate-egghead-u6b  
> **Status**: Research complete, ready for implementation planning

---

## Design Philosophy

### CLEAN AND SIMPLE

- **shadcn/ui centric** - Use shadcn components as the foundation
- **Cut the cruft** - Don't port complexity, rebuild with simplicity
- **Art/design carries over** - Illustrations, brand elements stay
- **CRISP UI** - Modern, minimal, fast

### SEO Non-Negotiables

- **No 404s** - Every legacy URL gets a redirect
- **Sitemap preservation** - Topic combination pages must stay (massive sitemap)
- **Canonical URLs** - Clean URL structure with proper redirects

### Simplicity Over Feature Parity

- Special-case pages (instructor pages, curated search) need evaluation
- If it's hard to maintain, find a simpler pattern
- Data-driven over hardcoded

---

## Executive Summary

The Coursebuilder egghead app (`course-builder/apps/egghead`) already has **significant infrastructure** in place. The migration is less "build from scratch" and more "wire up existing capabilities + port specific UI patterns."

### What Coursebuilder Already Has

- Full auth system (NextAuth v5 + CASL RBAC)
- Content resource model (posts, lessons, courses, tips)
- Video pipeline (Mux encoding, Deepgram transcription)
- Inngest background jobs
- Typesense search integration
- 27+ shared packages
- Egghead API integration (bi-directional sync)

### What Needs Migration

- Team management UI (complex multi-tenancy)
- Subscription management UI (Stripe portal integration)
- Search UI (InstantSearch components, curated pages)
- Video player state machine (xstate → simpler pattern?)
- Progress tracking UI
- Content gating patterns

---

## Gap Analysis

### 1. User & Account Management

| Feature            | egghead-next            | Coursebuilder   | Gap                 |
| ------------------ | ----------------------- | --------------- | ------------------- |
| User profile       | Full (App Router)       | Basic           | Port profile tabs   |
| Email change       | XState machine          | Not implemented | Build flow          |
| Avatar upload      | Yes                     | Not implemented | Add to profile      |
| Account deletion   | tRPC mutation           | Not implemented | Add mutation        |
| GitHub OAuth       | Connect/disconnect      | Auth only       | Add link management |
| Team dashboard     | Full (members, billing) | Not implemented | **Major work**      |
| Team invites       | Token-based flow        | Not implemented | **Major work**      |
| Ownership transfer | Yes                     | Not implemented | Build flow          |

**Effort**: HIGH - Team management is complex

### 2. Subscription & Payment

| Feature              | egghead-next        | Coursebuilder   | Gap                 |
| -------------------- | ------------------- | --------------- | ------------------- |
| Pricing page         | Full with intervals | Partial         | Port UI components  |
| Stripe Checkout      | Redirect flow       | Exists          | Wire up             |
| Customer Portal      | Via billing session | Not wired       | Add API route       |
| Subscription display | Full details        | Basic           | Port component      |
| Invoice list         | Yes                 | Not implemented | Build               |
| Invoice detail       | Print-friendly      | Not implemented | Build               |
| PPP discounts        | Auto-detect         | Not implemented | Port logic          |
| Gift redemption      | Full flow           | Not implemented | Build               |
| Content gating       | `is_pro` checks     | Entitlements    | **Different model** |

**Effort**: MEDIUM - Stripe integration exists, need UI

### 3. Search

| Feature          | egghead-next                      | Coursebuilder   | Gap              |
| ---------------- | --------------------------------- | --------------- | ---------------- |
| Provider         | Typesense                         | Typesense       | Same!            |
| InstantSearch    | Full integration                  | Not implemented | Port components  |
| Search box       | Debounced                         | Basic           | Port component   |
| Filters          | Topics, instructors, type, access | Not implemented | Build            |
| Pagination       | Algolia-style                     | Not implemented | Build            |
| Curated pages    | 35+ topic pages                   | Not implemented | **SEO CRITICAL** |
| Instructor pages | 20+ hardcoded                     | Not implemented | **SIMPLIFY**     |
| URL structure    | SEO-friendly slugs                | Not implemented | **PRESERVE**     |
| Topic sitemap    | Massive combinations              | Not implemented | **MUST KEEP**    |

**Effort**: MEDIUM - Same provider, but SEO complexity

#### Search SEO Deep Dive

**The Problem**: egghead-next generates a massive sitemap from topic combinations:

- `/q/react`
- `/q/react-typescript`
- `/q/react-resources-by-kent-c-dodds`
- etc.

These pages rank well and drive organic traffic. **Cannot break these URLs.**

**Curated Pages** (35+): Hardcoded topic landing pages with custom content

- Decision: Keep URLs, but make data-driven (not hardcoded components)

**Instructor Pages** (20+): Hardcoded per-instructor with custom queries

- Decision: **SIMPLIFY** - One dynamic `/instructors/[slug]` route
- Redirect old `/i/[slug]` URLs to new pattern

### 4. Content Types

| Feature           | egghead-next            | Coursebuilder   | Gap            |
| ----------------- | ----------------------- | --------------- | -------------- |
| Lessons           | Full with player        | ContentResource | Wire up player |
| Courses           | 4+ layouts              | ContentResource | Build layouts  |
| Posts/Articles    | MDX + Sanity            | ContentResource | Already works  |
| Playlists         | Redirect to courses     | Not needed      | Skip           |
| Instructor pages  | Search-based            | Not implemented | Build          |
| Video player      | @skillrecordings/player | Mux player      | Evaluate reuse |
| Progress tracking | GraphQL backend         | Not implemented | **Major work** |
| Course ratings    | Yes                     | Not implemented | Build          |

**Effort**: HIGH - Progress tracking is critical

### 5. Data Architecture

| Aspect           | egghead-next          | Coursebuilder     | Migration Path    |
| ---------------- | --------------------- | ----------------- | ----------------- |
| Primary DB       | Rails PostgreSQL      | PlanetScale MySQL | Data migration    |
| Content source   | GraphQL + Sanity + CB | ContentResource   | Consolidate to CB |
| Auth             | Rails OAuth           | NextAuth v5       | Already done      |
| State management | XState heavy          | React state       | Simplify          |
| API layer        | GraphQL + tRPC + REST | tRPC              | Consolidate       |

---

## Priority Matrix

### P0 - Critical Path (Must Have for Launch)

1. **Content pages** - Lessons and courses must render
2. **Video player** - Core product functionality
3. **Auth flow** - Login/logout working
4. **Pro/free gating** - Entitlements must work
5. **Progress tracking** - User retention critical

### P1 - High Priority (Soon After Launch)

6. **Search UI** - Discovery is important
7. **Subscription management** - Users need to manage billing
8. **User profile** - Basic settings
9. **Pricing page** - New signups

### P2 - Medium Priority (Can Defer)

10. **Team management** - Complex, fewer users
11. **Invoices** - Nice to have
12. **Gift redemption** - Low volume
13. **Curated search pages** - SEO value but not critical

### P3 - Low Priority (Maybe Never)

14. **SAML SSO** - Currently disabled anyway
15. **Instructor pages** - Can use search
16. **Course ratings** - Nice to have

---

## Recommended Migration Approach

### Phase 1: Content Viewing (Week 1-2)

```
┌─────────────────────────────────────────────────────────────────┐
│ Goal: Users can watch lessons and courses                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Wire up Mux player to ContentResource lessons               │
│  2. Build course page layout (use simplest of 4 layouts)        │
│  3. Implement lesson navigation (prev/next)                     │
│  4. Add basic progress tracking (mark complete)                 │
│  5. Implement pro/free gating via Entitlements                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 2: Discovery (Week 3-4)

```
┌─────────────────────────────────────────────────────────────────┐
│ Goal: Users can find content                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Port InstantSearch components from egghead-next             │
│  2. Build search results page with filters                      │
│  3. Add topic/instructor filtering                              │
│  4. Implement search box in header                              │
│  5. Skip curated pages for now (use search instead)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 3: Commerce (Week 5-6)

```
┌─────────────────────────────────────────────────────────────────┐
│ Goal: Users can subscribe and manage billing                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Build pricing page with interval selection                  │
│  2. Wire up Stripe Checkout redirect                            │
│  3. Add Stripe Customer Portal link                             │
│  4. Build subscription status display                           │
│  5. Implement PPP discount detection                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 4: User Management (Week 7-8)

```
┌─────────────────────────────────────────────────────────────────┐
│ Goal: Users can manage their account                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Build user profile page with tabs                           │
│  2. Add email change flow                                       │
│  3. Add account deletion                                        │
│  4. Build basic team management (if needed)                     │
│  5. Add invoice history                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Decisions Needed

### 1. Video Player Strategy

**Option A**: Reuse `@skillrecordings/player` package

- Pros: Already works, xstate integration
- Cons: Complex, may have egghead-specific assumptions

**Option B**: Use Coursebuilder's Mux player directly

- Pros: Simpler, already integrated
- Cons: May need to add features (keyboard shortcuts, etc.)

**Recommendation**: Start with Option B, add features as needed

### 2. Progress Tracking

**Option A**: Port GraphQL backend calls

- Pros: Works with existing Rails data
- Cons: Maintains Rails dependency

**Option B**: Build new progress system in Coursebuilder

- Pros: Clean break, uses Entitlements model
- Cons: Need to migrate 3M progress records

**Recommendation**: Option B with data migration

### 3. Search Architecture

**Decision**: Preserve SEO, simplify implementation

```
URL Structure (PRESERVE):
/q/[topic]                    → Topic search
/q/[topic]-[topic2]           → Combined topics
/q/[topic]-resources-by-[instructor] → Filtered search

Implementation (SIMPLIFY):
- One dynamic route: /q/[[...all]]/page.tsx
- Parse URL segments into Typesense filters
- Generate sitemap from topic/instructor combinations
- NO hardcoded curated pages - data-driven only
```

### 4. Instructor Pages

**Current State** (egghead-next):

- 20+ hardcoded components in `search/instructors/`
- Custom Sanity queries per instructor
- Special layouts for Kent C. Dodds, Kyle Shevlin, etc.

**New Approach** (SIMPLIFY):

```
/instructors/[slug]/page.tsx  → One dynamic route
- Fetch instructor from DB
- Show their courses/lessons via search
- Same layout for everyone
- Custom bio/avatar from instructor record

Redirects:
/i/[slug] → /instructors/[slug]  (301)
```

### 5. Team Management

**Option A**: Full port of team features

- Pros: Feature parity
- Cons: Complex, affects few users

**Option B**: Defer team features, handle manually

- Pros: Faster launch
- Cons: Some users affected

**Recommendation**: Option B - defer to post-launch

### 6. UI Component Strategy

**shadcn/ui First**:

```typescript
// DON'T port complex egghead-next components
// DO use shadcn primitives

// Example: Pricing card
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// NOT: import { PricingWidget } from "egghead-next/components/pricing"
```

**What to Carry Over**:

- Illustrations and artwork
- Brand colors (as CSS variables)
- Typography scale
- Logo/icons

**What to Leave Behind**:

- Complex component hierarchies
- XState machines (use React state)
- Multiple layout variants (pick one)
- Hardcoded special cases

---

## Files to Create/Modify

### New Pages Needed

```
course-builder/apps/egghead/src/app/
├── (content)/
│   ├── lessons/[slug]/page.tsx      # Lesson player
│   ├── courses/[slug]/page.tsx      # Course page
│   └── instructors/[slug]/page.tsx  # Instructor profile
├── (commerce)/
│   ├── pricing/page.tsx             # Pricing page
│   └── checkout/success/page.tsx    # Post-checkout
├── (user)/
│   ├── profile/page.tsx             # User profile
│   ├── membership/page.tsx          # Subscription status
│   └── invoices/page.tsx            # Invoice history
└── q/[[...all]]/page.tsx            # Search results
```

### Components to Port

```
From egghead-next:
├── search/
│   ├── search-box.tsx
│   ├── hits.tsx
│   ├── refinement-list.tsx
│   └── pagination.tsx
├── pricing/
│   ├── pricing-widget/
│   └── select-plan-new/
└── pages/user/components/
    ├── subscription-details.tsx
    └── profile tabs
```

### API Routes Needed

```
course-builder/apps/egghead/src/app/api/
├── stripe/
│   ├── checkout/route.ts            # Create checkout session
│   ├── billing/session/route.ts     # Customer portal
│   └── webhook/route.ts             # Already exists
├── progress/route.ts                # Track lesson progress
└── search/route.ts                  # Search API (if needed)
```

---

## Redirect Strategy (SEO Critical)

### URL Mapping

```
LESSONS (high traffic)
/lessons/[slug]           → /lessons/[slug]     (same, no redirect needed)

COURSES (high traffic)
/courses/[slug]           → /courses/[slug]     (same)
/playlists/[slug]         → /courses/[slug]     (301 redirect)

SEARCH (SEO critical - massive sitemap)
/q/[...params]            → /q/[...params]      (same structure, MUST preserve)

INSTRUCTORS
/i/[slug]                 → /instructors/[slug] (301)
/i/[slug]/rss.xml         → /instructors/[slug]/rss (301)

USER
/user                     → /profile            (301)
/user/membership          → /profile/membership (301)
/user/activity            → /profile/activity   (301)

LEGACY
/browse/[topic]           → /q/[topic]          (301)
/s/[slug]                 → /courses/[slug]     (301, old series URLs)
```

### Implementation

```typescript
// next.config.ts
export default {
  async redirects() {
    return [
      // Instructor pages
      {
        source: "/i/:slug",
        destination: "/instructors/:slug",
        permanent: true,
      },
      {
        source: "/i/:slug/rss.xml",
        destination: "/instructors/:slug/rss",
        permanent: true,
      },

      // Legacy URLs
      {
        source: "/playlists/:slug",
        destination: "/courses/:slug",
        permanent: true,
      },
      { source: "/s/:slug", destination: "/courses/:slug", permanent: true },
      { source: "/browse/:topic", destination: "/q/:topic", permanent: true },

      // User routes
      { source: "/user", destination: "/profile", permanent: true },
      {
        source: "/user/:path*",
        destination: "/profile/:path*",
        permanent: true,
      },
    ];
  },
};
```

### Sitemap Strategy

**Current**: egghead-next generates sitemap from topic combinations
**New**: Must replicate this exactly

```typescript
// Generate sitemap entries for all topic combinations
// This is what drives organic traffic

const topics = await getTopics(); // from Typesense or DB
const instructors = await getInstructors();

const searchPages = [
  // Single topics
  ...topics.map((t) => `/q/${t.slug}`),

  // Topic combinations (top pairs only, not all permutations)
  ...getTopicPairs(topics).map(([a, b]) => `/q/${a.slug}-${b.slug}`),

  // Topic + instructor
  ...topics.flatMap((t) =>
    instructors.map((i) => `/q/${t.slug}-resources-by-${i.slug}`),
  ),
];
```

---

## Risk Assessment

| Risk                    | Likelihood | Impact   | Mitigation                          |
| ----------------------- | ---------- | -------- | ----------------------------------- |
| Progress data loss      | Medium     | High     | Thorough migration testing          |
| Search regression       | Low        | Medium   | Same provider (Typesense)           |
| Auth issues             | Low        | High     | NextAuth already working            |
| Stripe integration bugs | Medium     | High     | Extensive testing, shadow mode      |
| Team feature gaps       | High       | Low      | Few users, handle manually          |
| Video player issues     | Medium     | High     | Test all lesson types               |
| **SEO ranking drop**    | **Medium** | **High** | **Preserve URLs, proper redirects** |
| **404 errors**          | **Low**    | **High** | **Comprehensive redirect map**      |

---

## Success Metrics

### Launch Criteria

- [ ] All published lessons playable
- [ ] All published courses accessible
- [ ] Pro/free gating working
- [ ] Search returns relevant results
- [ ] New subscriptions work
- [ ] Existing subscribers can access content

### Post-Launch Monitoring

- Video play success rate
- Search conversion rate
- Subscription completion rate
- Support ticket volume
- Error rates in Sentry

---

## Appendix: Component Inventory

### egghead-next Components Worth Porting

| Component           | Location                       | Complexity | Priority |
| ------------------- | ------------------------------ | ---------- | -------- |
| SearchBox           | search/search-box.tsx          | Low        | P1       |
| Hits                | search/hits.tsx                | Medium     | P1       |
| RefinementList      | search/refinement-list.tsx     | Medium     | P1       |
| PricingWidget       | pricing/pricing-widget/        | High       | P1       |
| SelectPlanNew       | pricing/select-plan-new/       | Medium     | P1       |
| SubscriptionDetails | user/components/               | Medium     | P1       |
| LessonPlayer        | (uses @skillrecordings/player) | High       | P0       |
| CourseLayout        | layouts/collection-page-layout | High       | P0       |

### egghead-next Components to Skip

| Component               | Reason                           |
| ----------------------- | -------------------------------- |
| XState machines         | Overcomplicated, use React state |
| SAML SSO                | Currently disabled               |
| Curated search pages    | Build with search instead        |
| Multiple course layouts | Start with one, add later        |
| Team billing section    | Defer team features              |
