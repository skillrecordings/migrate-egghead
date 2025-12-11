# ADR: Video Player Architecture

## Status

Accepted

## Context

egghead-next uses a complex xstate-based video player with:

- Multiple state machines
- Complex progress tracking (30-second segments)
- Custom UI components
- Wistia integration (legacy)

We need to decide how to handle video playback in Coursebuilder.

## Decision

Use Coursebuilder's existing Mux player with simplified progress tracking.

### Video Player

- Use `@mux/mux-player-react` (already in CB)
- Reference: `apps/ai-hero/src/app/(content)/_components/video-player-overlay.tsx`
- No xstate, just React state

### Progress Tracking

- **Simplify**: Track completion, not segments
- Mark complete when user watches 90%+ of video
- Store: `{ lessonId, completedAt, watchedSeconds }`
- No segment-level tracking (unnecessary complexity)

### Features (MVP)

- Play/pause/seek
- Completion tracking
- Soft block overlay for non-subscribers
- Keyboard shortcuts (space, arrows)

### Features (Deferred)

- Playback speed control
- Captions/subtitles
- Bookmarks
- Transcript sync
- Picture-in-picture

## Consequences

### Positive

- Much simpler codebase (no xstate)
- Mux handles video delivery, encoding, analytics
- Completion-based progress is sufficient for most use cases
- Faster to implement

### Negative

- Lose segment-level progress (can't resume at exact position)
- Lose some analytics granularity
- Users who watched 89% won't show as complete

### Mitigation

- Store `watchedSeconds` for potential future use
- Can add segment tracking later if needed
- 90% threshold is generous

## Implementation

### Video Player Component

```typescript
// components/video-player/index.tsx
import MuxPlayer from '@mux/mux-player-react'

export function VideoPlayer({
  playbackId,
  lessonId,
  onComplete
}: VideoPlayerProps) {
  const [watchedSeconds, setWatchedSeconds] = useState(0)
  const [duration, setDuration] = useState(0)

  const handleTimeUpdate = (e: Event) => {
    const player = e.target as HTMLVideoElement
    setWatchedSeconds(player.currentTime)

    // Mark complete at 90%
    if (player.currentTime / player.duration > 0.9) {
      onComplete?.()
    }
  }

  return (
    <MuxPlayer
      playbackId={playbackId}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={(e) => setDuration(e.target.duration)}
    />
  )
}
```

### Progress Tracking

```typescript
// lib/progress.ts
export async function markLessonComplete(
  userId: string,
  lessonId: string,
  watchedSeconds: number,
) {
  await db
    .insert(resourceProgress)
    .values({
      userId,
      resourceId: lessonId,
      completedAt: new Date(),
      fields: { watchedSeconds },
    })
    .onDuplicateKeyUpdate({
      set: {
        completedAt: new Date(),
        fields: { watchedSeconds },
      },
    });
}
```

### Soft Block Overlay

```typescript
// components/video-player/soft-block.tsx
export function SoftBlock({ onSubscribe }: SoftBlockProps) {
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
      <div className="text-center">
        <h2>Subscribe to continue watching</h2>
        <Button onClick={onSubscribe}>Get Pro Access</Button>
      </div>
    </div>
  )
}
```

## Alternatives Considered

### Alternative 1: Port xstate Player

- Pros: Feature parity with egghead-next
- Cons: Complex, hard to maintain, unnecessary
- Rejected: Complexity not justified

### Alternative 2: Build Custom Player

- Pros: Full control
- Cons: Reinventing the wheel, maintenance burden
- Rejected: Mux player is excellent

### Alternative 3: Keep Segment Tracking

- Pros: Resume at exact position
- Cons: Complex, 3M records to migrate, overkill
- Rejected: Completion-based is sufficient

## Migration

### Progress Data

- Migrate `lesson_views.did_complete = true` → `ResourceProgress.completedAt`
- Migrate `lesson_views.segments` → `ResourceProgress.fields.legacySegments` (for reference)
- Don't migrate partial progress (users can re-watch)

### Video URLs

- All videos already on Mux (97.5% migrated)
- Map `mux_asset_id` → `ContentResource.fields.muxPlaybackId`
- 193 missing videos → redirect to `/gone` page
