# Errored Mux Assets Investigation Report

**Date:** December 12, 2025  
**Investigator:** InvestigatorAgent  
**Bead:** migrate-egghead-brp.1

## Summary

Investigated 15 errored Mux assets (lesson IDs 10628, 10641, 10642, 10651-10660, 10681, 10682). Found that 14 have inaccessible S3 source files (HTTP 403), while 1 has a subtitle validation error but accessible source.

## Key Findings

### 1. S3 Source Accessibility

| Status | Count | Lesson IDs |
|--------|-------|------------|
| **403 Forbidden** | 14 | 10628, 10641, 10651-10660, 10681-10682 |
| **200 OK** | 1 | 10642 |

### 2. Rails Lesson State

**ALL 15 lessons are published** in Rails PostgreSQL:
- State: `published`
- Published date: Set (not null)
- These are live, user-facing lessons

### 3. Mux Asset Status

All 15 videos have Mux asset IDs in SQLite:
- **14 with missing S3 sources** still have valid Mux asset IDs
- This suggests the videos were successfully uploaded to Mux before S3 sources became inaccessible
- **1 with subtitle error** (10642) has accessible S3 source and valid Mux asset ID

### 4. Course Affiliation

**13 of 15** are from Lucas Minter's Bootstrap course:
- 10 core lessons (10651-10660)
- 2 course bookends (10681-10682 intro/outro)

**2 are from Cursor course:**
- 10628: Cursor Tab
- 10641: Cursor Composer

## Investigation Details

### Videos with Inaccessible S3 Sources (403 Forbidden)

```
10628: egghead-streamline-adding-and-refactoring-code-with-cursor-tab
       S3: https://egghead-video-downloads.s3.amazonaws.com/lessons/Cursor%20Copilot%2B%2B/Cursor%20Copilot%2B%2B.mp4
       Mux: 2sSNW1IEmStSDFtrBbyie01PkMPqN7lpqdB01n6nYdzuc

10641: egghead-generate-logic-for-benchmarking-a-function-with-cursor-composer
       S3: https://egghead-video-downloads.s3.amazonaws.com/lessons/cmd%2Bk-generate/cmd%2Bk-generate.mp4
       Mux: RS8XbtuLx6fVGUa76Tss7Xkm4jfPg6sIkSb1PTPpCTA

10651-10660: Lucas Minter Bootstrap Course Lessons (all 403)
10681-10682: Bootstrap Course Intro/Outro (both 403)
```

### Video with Subtitle Error (Accessible Source)

```
10642: egghead-build-tools-in-languages-you-don-t-know-with-cursor
       S3: https://egghead-video-downloads.s3.amazonaws.com/lessons/egghead-build-tools-in-languages-you-don-t-know-with-cursor-0c-Pxusx_/egghead-build-tools-in-languages-you-don-t-know-with-cursor-0c-Pxusx_.mp4
       Mux: IwC4OvBwu00TgqAOjhpNmTAemKkSnxBgRZeqiVYiGOkY
       Status: HTTP 200 (source accessible)
       Issue: Subtitle validation failed during Mux upload
```

## SQLite Database Updates

Updated `download-egghead/egghead_videos.db`:

```sql
-- 14 videos with inaccessible S3 sources
UPDATE videos SET state = 'missing_video' 
WHERE id IN (10628, 10641, 10651-10660, 10681, 10682);

-- 1 video with subtitle validation error
UPDATE videos SET state = 'error' 
WHERE id = 10642;
```

### Updated State Distribution

| State | Count | Notes |
|-------|-------|-------|
| `updated` | 6,895 | Successfully migrated to Mux |
| `no_srt` | 677 | On Mux but missing subtitles |
| `missing_video` | 207 | Source files not found (14 newly added) |
| `error` | 1 | Subtitle validation error (10642) |

## Critical Insight: Mux Assets May Still Work

**The 14 videos marked `missing_video` have Mux asset IDs**, meaning:
1. They were successfully uploaded to Mux at some point
2. The S3 source URLs are now inaccessible (403)
3. **The Mux playback URLs may still work** (need verification with Mux API credentials)

## Recommendations

### Immediate Actions

1. **Verify Mux Playback Availability**
   - Use Mux API to check if these 14 assets are still playable
   - If Mux assets are `ready`, they can be used even without S3 sources
   - If Mux assets are `errored`, videos need re-uploading

2. **Fix Video 10642 (Subtitle Error)**
   - S3 source is accessible (HTTP 200)
   - Retry Mux upload without subtitles or fix subtitle format
   - OR use existing Mux asset if it's in `ready` state despite subtitle error

3. **Course Impact Assessment**
   - Lucas Minter Bootstrap course: 13/15 affected videos
   - Cursor course: 2/15 affected videos
   - Determine if course should remain published with broken videos

### Next Steps for Migration

1. **Add Mux Playback URL Check**
   - Extend `check-mux-status.mjs` to verify playback URL accessibility
   - Query Mux API for asset status (requires `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET`)

2. **Update Video Migration Strategy**
   - For videos with valid Mux assets: use Mux playback URL directly
   - For videos with errored Mux assets: mark for re-upload if source is accessible
   - For videos with inaccessible sources AND errored Mux: mark as permanently unavailable

3. **Coursebuilder Integration**
   - Ensure Coursebuilder can handle lessons with unavailable videos gracefully
   - Add UI indicators for lessons with video issues
   - Consider hiding broken lessons from public view

## Files Modified

- `download-egghead/egghead_videos.db` - Updated 15 video state records
- `investigation/src/queries/check-errored-lessons.ts` - Created for Rails lesson state queries

## Tools Created

- `download-egghead/check-specific-mux-assets.mjs` - Mux API checker for specific asset IDs (requires credentials)
