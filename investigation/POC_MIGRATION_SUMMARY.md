# POC Migration Script Summary

**Script**: `investigation/poc-migrate-modern-course.ts`
**Status**: ✅ Complete
**Course**: Claude Code Essentials (claude-code-essentials~jc0n6)
**Lessons**: 17

---

## Purpose

Proof-of-concept migration script that demonstrates the full flow for migrating a **modern course** (Sanity CMS + Rails) to Coursebuilder.

This script serves as the reference implementation for Phase 1 (Data Migration).

---

## Architecture

### Data Sources

1. **Sanity CMS** - Rich content metadata (portable text, collaborators, software libraries)
2. **Rails PostgreSQL** - Video URLs (`current_video_hls_url`)
3. **SQLite** - Legacy Mux asset IDs (for lessons ≤ 10388)

### Data Flow

```
Sanity Course
  ↓
  ├─→ Course metadata → ContentResource (type: 'course')
  │
  └─→ Lessons[] (ordered)
        ↓
        ├─→ Sanity lesson metadata
        ├─→ Rails video URL → Extract Mux playback ID
        ├─→ Create ContentResource (type: 'videoResource')
        ├─→ Create ContentResource (type: 'lesson')
        ├─→ Link lesson → video (ContentResourceResource)
        └─→ Link course → lesson (ContentResourceResource, preserve order)
```

---

## Key Functions

### 1. `fetchCourseFromSanity(slug: string)`
- GROQ query for course document
- Fetches: title, description, collaborators, softwareLibraries, resources[]
- Returns: `SanityCourse` object

### 2. `fetchLessonsFromSanity(lessonRefs: Array<{_ref: string}>)`
- Batch GROQ query for lesson documents
- **Preserves order** from `course.resources[]`
- Fetches: Full lesson metadata including portable text

### 3. `getVideoDataForLesson(railsLessonId: number)`
- **Primary**: Query Rails for `current_video_hls_url`, extract Mux playback ID
- **Fallback**: Query SQLite for legacy Mux assets (lesson ID ≤ 10388)
- Returns: `VideoAsset` with muxPlaybackId and source

### 4. `migrateToCoursebuilder(course, lessons)`
- **Effect-TS** program for MySQL inserts
- Creates:
  - Video resources (`type: 'videoResource'`)
  - Lesson resources (`type: 'lesson'`)
  - Course resource (`type: 'course'`)
  - Links: lesson→video, course→lessons (with position)

---

## Field Mappings

### Lesson ContentResource Fields

```typescript
{
  title: string,                      // Sanity
  slug: string,                       // Sanity
  description: string,                // Portable text → markdown
  body: string,                       // Portable text → markdown
  state: 'published' | 'draft',       // Sanity
  visibility: 'public',               // Default
  thumbnailUrl: string | null,        // Sanity
  videoResourceId: string | null,     // Link to videoResource
  
  // Rich Sanity fields (JSON)
  collaborators: [{ userId, role, eggheadInstructorId }],
  softwareLibraries: [{ name, version, url }],
  resources: [{ title, url, type }],
  
  // Legacy tracking
  legacyRailsId: number,              // Rails lesson.id
  legacySanityId: string,             // Sanity _id
  
  // Migration metadata
  migratedAt: ISO timestamp,
  migratedFrom: 'sanity'
}
```

### Video Resource Fields

```typescript
{
  muxPlaybackId: string,              // Extracted from Rails HLS URL
  muxAssetId: string | null,          // SQLite (if legacy)
  state: 'ready',
  migratedAt: ISO timestamp,
  migratedFrom: 'rails_url' | 'sqlite',
  legacyRailsLessonId: number
}
```

### Course ContentResource Fields

```typescript
{
  title: string,
  slug: string,
  description: string,                // Portable text → markdown
  state: 'published' | 'draft',
  image: string | null,
  
  // Rich Sanity fields (JSON)
  collaborators: [{ userId, role, eggheadInstructorId }],
  softwareLibraries: [{ name, version, url }],
  
  // Legacy tracking
  legacyRailsSeriesId: number | null,
  legacySanityId: string,
  
  // Migration metadata
  migratedAt: ISO timestamp,
  migratedFrom: 'sanity'
}
```

---

## Portable Text Conversion

**Current approach**: Extract plain text via `portableTextToMarkdown()`

```typescript
function portableTextToMarkdown(blocks: any): string {
  return blocks
    .map((block) => {
      if (block._type === 'block' && block.children) {
        return block.children.map((child) => child.text || '').join('');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}
```

**Future enhancement**: Use `@portabletext/to-markdown` for full conversion (links, formatting, etc.)

---

## Dependencies

```json
{
  "@sanity/client": "^7.13.2",       // Sanity GROQ queries
  "@effect/sql": "^0.48.6",          // Effect SQL client
  "@effect/sql-mysql2": "^0.49.1",   // MySQL driver
  "@effect/sql-pg": "^0.49.7",       // PostgreSQL driver
  "better-sqlite3": "^12.5.0",       // SQLite for legacy videos
  "effect": "^3.19.11"                // Effect runtime
}
```

**Note**: Uses simple ID generation (`generateId()`). Production should use `@paralleldrive/cuid2`.

---

## Running the Script

```bash
cd investigation

# Ensure .env has:
# DATABASE_URL=postgres://...        (Rails PostgreSQL)
# NEW_DATABASE_URL=mysql://...       (Coursebuilder PlanetScale)

# Run migration
pnpm tsx poc-migrate-modern-course.ts
```

**Expected output**:
- Course fetched from Sanity
- 17 lessons fetched (ordered)
- 17 video resources created
- 17 lesson resources created
- 1 course resource created
- Links established
- Verification checklist

---

## Verification Checklist

After running the script:

- [ ] All 17 lessons created with correct slugs
- [ ] All videos have `muxPlaybackId`
- [ ] Course→lesson ordering matches Sanity
- [ ] Can view at `/courses/claude-code-essentials~jc0n6`
- [ ] Lesson pages load correctly
- [ ] Video player works on each lesson
- [ ] Collaborators displayed correctly
- [ ] Software libraries shown

**SQL verification queries**:

```sql
-- Check course created
SELECT * FROM egghead_ContentResource 
WHERE type = 'course' 
  AND JSON_EXTRACT(fields, '$.slug') = 'claude-code-essentials~jc0n6';

-- Check lessons count
SELECT COUNT(*) FROM egghead_ContentResource 
WHERE type = 'lesson'
  AND JSON_EXTRACT(fields, '$.legacySanityId') IS NOT NULL;

-- Check videos
SELECT COUNT(*) FROM egghead_ContentResource 
WHERE type = 'videoResource'
  AND JSON_EXTRACT(fields, '$.muxPlaybackId') IS NOT NULL;

-- Check course→lesson links
SELECT COUNT(*) FROM egghead_ContentResourceResource crr
INNER JOIN egghead_ContentResource cr ON cr.id = crr.resourceOfId
WHERE cr.type = 'course' 
  AND JSON_EXTRACT(cr.fields, '$.slug') = 'claude-code-essentials~jc0n6';
```

---

## Next Steps

1. **Test the script** - Run against Coursebuilder dev database
2. **Verify in UI** - Check course and lesson pages render
3. **Extract patterns** - Generalize for Phase 1 batch migration
4. **Handle edge cases**:
   - Missing video URLs
   - Portable text formatting (code blocks, links)
   - Multiple collaborators/instructors
5. **Idempotency** - Add checks to prevent duplicate inserts
6. **Error handling** - Retry logic, partial rollback

---

## Lessons Learned

### What Works Well

- **Effect-TS SQL**: Clean, type-safe database operations
- **Sanity GROQ**: Efficient batch fetching with references
- **Portable text**: JSON structure preserves rich content
- **Order preservation**: Using `position` field in ContentResourceResource

### Challenges

- **Portable text → Markdown**: Need better conversion for code blocks, links
- **Video URL extraction**: Regex-based, could be more robust
- **Legacy video lookup**: SQLite join is slow for large batches
- **ID generation**: Simple approach works for POC, but need proper CUIDs

### Production Improvements

- [ ] Use `@paralleldrive/cuid2` for ID generation
- [ ] Use `@portabletext/to-markdown` for proper conversion
- [ ] Add transaction support for atomic inserts
- [ ] Add idempotency checks (unique constraints on legacy IDs)
- [ ] Batch video URL lookups (single query for all lessons)
- [ ] Add retry logic for Mux API failures
- [ ] Log migration progress to file
- [ ] Add dry-run mode

---

## File Structure

```
investigation/
├── poc-migrate-modern-course.ts      # This script
├── POC_MIGRATION_SUMMARY.md          # This document
├── src/
│   ├── lib/
│   │   ├── db.ts                     # Rails PostgreSQL client
│   │   ├── mysql.ts                  # Coursebuilder MySQL client
│   │   └── env.ts                    # Environment loader
│   └── queries/                      # Reference query patterns
└── package.json
```

---

**Status**: Ready for testing ✅
**Next**: Run script, verify output, report findings
