/**
 * Dashboard component - combines all progress bars for entity tracking.
 * Renders the main content area of the TUI.
 */

import type { CliRenderer } from "@opentui/core";
import { BoxRenderable } from "@opentui/core";
import type { Store } from "../state.ts";
import { createProgressBar } from "./progress-bar.ts";

/**
 * Dashboard component structure.
 */
export interface DashboardComponent {
  container: BoxRenderable;
  destroy(): void;
}

/**
 * Create dashboard with progress bars for all entities.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────┐
 * │ Tags      [████████████░░░░░░░░]  450/627  71.8%    │
 * │ Courses   [████████░░░░░░░░░░░░]  168/420  40.0%    │
 * │ Lessons   [██░░░░░░░░░░░░░░░░░░]  512/5132  9.9%    │
 * └─────────────────────────────────────────────────────┘
 */
export function createDashboard(
  renderer: CliRenderer,
  store: Store,
): DashboardComponent {
  // Main container (vertical flex)
  const container = new BoxRenderable(renderer, {
    id: "dashboard",
    width: "100%",
    height: "100%",
    flexDirection: "column",
    padding: 1,
  });

  // Create progress bars for each entity
  const tagsBar = createProgressBar(renderer, "tags");
  const coursesBar = createProgressBar(renderer, "courses");
  const lessonsBar = createProgressBar(renderer, "lessons");

  // Add to container
  container.add(tagsBar.container);
  container.add(coursesBar.container);
  container.add(lessonsBar.container);

  // Subscribe to state changes and update bars
  const unsubscribe = store.subscribe((state) => {
    tagsBar.update(state.entities.tags);
    coursesBar.update(state.entities.courses);
    lessonsBar.update(state.entities.lessons);
  });

  // Initial render with current state
  const initialState = store.getState();
  tagsBar.update(initialState.entities.tags);
  coursesBar.update(initialState.entities.courses);
  lessonsBar.update(initialState.entities.lessons);

  /**
   * Cleanup component and unsubscribe from store.
   */
  function destroy(): void {
    unsubscribe();
    tagsBar.destroy();
    coursesBar.destroy();
    lessonsBar.destroy();
    container.destroy();
  }

  return {
    container,
    destroy,
  };
}
