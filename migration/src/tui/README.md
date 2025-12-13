# Migration Control Plane TUI

Real-time monitoring UI for migration progress using OpenTUI and Durable Streams.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Migration Control Plane v1.0        [Tab: Switch]  │  <- Header
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tags      [████████████░░░░░░░░]  450/627  71.8%   │
│  Courses   [████████░░░░░░░░░░░░]  168/420  40.0%   │  <- Dashboard
│  Lessons   [██░░░░░░░░░░░░░░░░░░]  512/5132  9.9%   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Stream: connected | Offset: 1234 | q: quit         │  <- Status bar
└─────────────────────────────────────────────────────┘
```

## Components

### `state.ts`

Reactive state store with pub/sub pattern. Tracks progress for all entities (tags, courses, lessons).

**Key interfaces:**

- `EntityState` - progress tracking per entity
- `MigrationState` - global state
- `Store` - reactive store with subscribe/setState

### `components/progress-bar.ts`

Individual progress bar component for a single entity.

**Features:**

- Fixed-width bar visualization (20 characters)
- ETA calculation based on current rate
- Color coding by status (idle/running/complete)
- Reactive updates via state subscription

**Key functions:**

- `createProgressBar(renderer, entity)` - create component
- `generateBar(current, total)` - render bar with █ and ░
- `calculateETA(current, total, startTime)` - estimate completion
- `formatDuration(ms)` - human-readable time (e.g., "3m 24s")

### `components/dashboard.ts`

Combines all progress bars into a single view.

**Features:**

- Vertical layout with padding
- Auto-subscribes to state changes
- Manages lifecycle of child components

### `components/layout.ts`

Root layout structure with header, content area, and status bar.

### `index.ts`

Main entry point. Handles:

- CLI argument parsing
- Stream connection
- Event handling
- Keyboard shortcuts (q, tab)

## Usage

```bash
# Start migration worker (emits events to stream)
bun scripts/migrate-tags.ts --stream-id migration-2025-01-01

# In another terminal, start TUI
bun src/tui/index.ts --run-id migration-2025-01-01

# Optional: specify stream URL (default: http://localhost:8787)
bun src/tui/index.ts --run-id migration-2025-01-01 --stream-url http://localhost:8787
```

## Keyboard Shortcuts

- `q` or `Escape` - quit
- `Tab` - switch views (dashboard / errors)

## Event Flow

```
Migration Script                  Durable Stream                    TUI
     │                                   │                           │
     ├── emit('start', {entity, total})──>                           │
     │                                   │                           │
     │                                   ├──────────────────────────>│
     │                                   │                           │
     │                                   │   Subscribe to state,     │
     │                                   │   update progress bars    │
     │                                   │                           │
     ├── emit('progress', {current})────>                            │
     │                                   │                           │
     │                                   ├──────────────────────────>│
     │                                   │   Bar updates reactively  │
     │                                   │                           │
     ├── emit('complete', {migrated})───>                            │
     │                                   │                           │
     │                                   ├──────────────────────────>│
     │                                   │   Mark complete, show ✓   │
```

## Testing

```bash
# Run tests
bun test src/tui/

# Test specific component
bun test src/tui/components/progress-bar.test.ts
```

## Dependencies

- `@opentui/core` - Terminal UI framework with Yoga flexbox
- `../lib/event-types.ts` - Migration event type definitions
- `../lib/migration-stream.ts` - Durable Stream client

## Design Decisions

### Why OpenTUI?

- Yoga-based flexbox layout (familiar mental model)
- Type-safe component API
- Built-in input handling
- No virtual DOM overhead

### Why Reactive Store?

- Simple pub/sub pattern
- No framework lock-in
- Easy to test
- Explicit state updates

### Why Fixed-Width Bars?

- Terminal width varies
- Fixed 20-char bars are readable at any size
- Easy to calculate percentage visually
- Consistent with common CLI tools

### Why Separate Progress Bar Component?

- Reusable for different entities
- Isolated test surface
- Clear separation of concerns
- Easy to extend (e.g., add pause/resume)

## Future Enhancements

- [ ] Errors view (switch with Tab)
- [ ] Detailed stats on hover/focus
- [ ] Pause/resume controls
- [ ] Export progress to JSON
- [ ] Terminal notification on completion
- [ ] Color themes
