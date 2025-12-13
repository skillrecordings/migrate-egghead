# POC Modern Course Migration Results

**Date**: 2025-12-13
**Course**: Claude Code Essentials (`claude-code-essentials~jc0n6`)
**Script**: `investigation/poc-migrate-modern-course.ts`

## ✅ Migration Successful

### Summary

- **Course**: 1 created
- **Lessons**: 17 created
- **Videos**: 17 created
- **Course→Lesson Links**: 17 created
- **Lesson→Video Links**: 17 created

### Course Details

- **ID**: `mj4jfo6gb3te4w2rb3b`
- **Title**: Claude Code Essentials
- **Slug**: `claude-code-essentials~jc0n6`
- **Source**: Sanity (`6rf51A5U9rIFQPrVYoc2Ws`)

### Lessons Migrated

All 17 lessons successfully migrated in correct order:

| Position | Rails ID | Title |
|----------|----------|-------|
| 0 | 10993 | Combine Claude Code and Your Favorite IDE |
| 1 | 10994 | The Essential Claude Code Shortcuts |
| 2 | 10995 | Targeting the Proper Context with Claude Code |
| 3 | 10996 | Automate Tasks in Claude Code with Slash Commands |
| 4 | 10997 | The Cost of Context in Claude Code |
| 5 | 10998 | Protect Secrets from Being Read by Claude Code |
| 6 | 10999 | Organizing Personal and Project Settings in Claude Code |
| 7 | 11000 | Customize Global User Settings and the Status Line in Claude Code |
| 8 | 11001 | CLAUDE.md Initialization and Best Practices in Claude Code |
| 9 | 11002 | Type-Safe Claude Code Hooks with Bun and TypeScript |
| 10 | 11003 | Rewrite Prompts on the Fly with UserPromptSubmit Hooks |
| 11 | 11004 | Inject Live Data with Custom Hook Functions |
| 12 | 11005 | Generate Multiple Solutions with Template-Driven Hooks |
| 13 | 11006 | Block Prompts with Hook Guardrails |
| 14 | 11007 | Block Tool Commands Before Execution with PreToolUse Hooks |
| 15 | 11008 | Guide Claude Code with Rich PreToolUse Feedback |
| 16 | 11009 | Enforce Global Rules with User-Level PreToolUse Hooks |

### Video Migration

**100% coverage** - All 17 lessons have Mux playback IDs extracted from Rails `current_video_hls_url`.

Sample Mux playback IDs:
- Lesson 10993: `x9E9hjfco01sido2i2tfxNA6gkscUv02rIxbkv00WEscog`
- Lesson 10994: `tTVEwNYt91HMaFInGk3MaeXej8Ox02Cpn00ha5NT8017q8`
- Lesson 10995: `l5aDWrCOF5QhlssGf9YXbOIUjqf9b01figD01V6w02tpjA`

### Data Sources

| Data Point | Source |
|------------|--------|
| Course metadata | Sanity |
| Lesson metadata | Sanity |
| Video URLs | Rails PostgreSQL (`current_video_hls_url`) |
| Mux playback IDs | Extracted from HLS URLs |

### Schema Compliance

All records include required Coursebuilder fields:

- `id` - Generated CUID
- `type` - 'course', 'lesson', 'videoResource'
- `createdById` - Joel's user ID (`c903e890-0970-4d13-bdee-ea535aaaf69b`)
- `fields` - JSON with legacy IDs, migration metadata, rich content
- `createdAt` - Preserved from Sanity `_createdAt`
- `updatedAt` - Set to NOW()

### Migration Metadata

Each record includes:

```json
{
  "legacyRailsId": 10993,
  "legacySanityId": "lesson-10993",
  "migratedAt": "2025-12-13T...",
  "migratedFrom": "sanity"
}
```

Video resources include:

```json
{
  "muxPlaybackId": "x9E9hjfco...",
  "state": "ready",
  "migratedAt": "2025-12-13T...",
  "migratedFrom": "rails_url",
  "legacyRailsLessonId": 10993
}
```

## Issues Fixed

### 1. better-sqlite3 Native Binding

**Problem**: Native module not compiled for Node v22.17.0 (arm64).

**Solution**: Made SQLite optional - modern courses use Rails URLs directly, SQLite fallback only needed for legacy videos (lesson ID ≤ 10388).

```typescript
let sqliteDb: ReturnType<typeof Database> | null = null;
try {
  sqliteDb = new Database("../download-egghead/egghead_videos.db", { readonly: true });
} catch (err) {
  console.warn("⚠️  SQLite database not available (legacy video fallback disabled)");
}
```

### 2. Missing createdById

**Problem**: Coursebuilder schema requires `createdById` (NOT NULL, no default).

**Solution**: Added Joel's user ID from Coursebuilder:

```typescript
const MIGRATION_USER_ID = "c903e890-0970-4d13-bdee-ea535aaaf69b";

// In all INSERT statements:
INSERT INTO egghead_ContentResource (id, type, createdById, fields, ...)
VALUES (${id}, ${type}, ${MIGRATION_USER_ID}, ...)
```

### 3. Resource References

**Problem**: Script expected `_ref` but Sanity query used `resources[]->` which returns full objects.

**Solution**: Converted fetched lesson objects to refs:

```typescript
const lessonRefs = course.resources?.filter((r: any) => r._id && r._type === 'lesson') || [];
const refObjects = lessonRefs.map((r: any) => ({ _ref: r._id }));
```

## Verification Checklist

✅ All 17 lessons created with correct slugs
✅ All videos have muxPlaybackId
✅ Course→lesson ordering matches Sanity (position 0-16)
✅ Lesson→video links created correctly
✅ `createdById` set correctly
✅ Legacy IDs preserved (`legacyRailsId`, `legacySanityId`)
✅ Migration metadata included

## Next Steps

1. **Manual UI Testing** - View course at `/courses/claude-code-essentials~jc0n6` in Coursebuilder
2. **Video Player Test** - Verify Mux playback works for each lesson
3. **Collaborators Display** - Check if instructor/author info renders correctly
4. **Software Libraries** - Verify tags/technologies display
5. **Scale Testing** - Apply pattern to remaining 419 courses

## Learnings for Production Migration

1. **SQLite not required for modern courses** - Rails HLS URLs are canonical source for lesson IDs > 10388
2. **createdById is mandatory** - Need migration user or map to actual instructors
3. **Sanity query optimization** - Can fetch course + lessons in one go with `resources[]->`
4. **Ordering preserved** - Sanity `resources[]` array order is maintained
5. **Video migration 100%** - No gaps for modern courses (all have Rails HLS URLs)

## Database State

**Before**:
- Courses: 0 with `legacySanityId`
- Lessons: 369 (type='post', created directly in CB)
- Videos: 410

**After**:
- Courses: 1 with `legacySanityId`
- Lessons: 386 (369 existing + 17 migrated)
- Videos: 427 (410 existing + 17 migrated)
