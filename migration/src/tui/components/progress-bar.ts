/**
 * Progress bar component using OpenTUI primitives.
 * Shows entity name, progress bar visualization, count, percentage, and ETA.
 *
 * Example output:
 *   Tags      [████████████░░░░░░░░]  450/627  71.8%  ETA: 12s
 *   Courses   [████████░░░░░░░░░░░░]  168/420  40.0%  ETA: 45s
 *   Lessons   [██░░░░░░░░░░░░░░░░░░]  512/5132  9.9%  ETA: 3m 24s
 */

import type { CliRenderer } from "@opentui/core";
import { BoxRenderable, TextRenderable } from "@opentui/core";
import type { MigrationEntity } from "../../lib/event-types.ts";
import type { EntityState } from "../state.ts";

/**
 * Format duration in ms to human-readable string.
 * Examples: "12s", "3m 24s", "1h 5m"
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Calculate ETA based on current progress and start time.
 */
function calculateETA(
  current: number,
  total: number,
  startTime: number,
): string {
  if (current === 0) {
    return "calculating...";
  }

  if (current >= total) {
    return "complete";
  }

  const elapsed = Date.now() - startTime;
  const rate = current / elapsed; // items per millisecond
  const remaining = (total - current) / rate;

  return formatDuration(remaining);
}

/**
 * Generate progress bar visualization using block characters.
 * Bar is fixed width (20 characters).
 */
function generateBar(current: number, total: number): string {
  const barWidth = 20;
  const percentage = total > 0 ? current / total : 0;
  const filled = Math.floor(percentage * barWidth);
  const empty = barWidth - filled;

  const filledChars = "█".repeat(filled);
  const emptyChars = "░".repeat(empty);

  return `[${filledChars}${emptyChars}]`;
}

/**
 * Format entity name with fixed width padding.
 */
function formatLabel(entity: MigrationEntity): string {
  const labels: Record<MigrationEntity, string> = {
    tags: "Tags",
    courses: "Courses",
    lessons: "Lessons",
  };

  const label = labels[entity];
  // Pad to 10 characters for alignment
  return label.padEnd(10, " ");
}

/**
 * Generate stats text (count, percentage, ETA).
 */
function formatStats(state: EntityState, startTime: number): string {
  const { current, total, status } = state;

  // Count
  const count = `${current}/${total}`;

  // Percentage
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const percentStr = `${percentage.toFixed(1)}%`;

  // ETA
  let eta: string;
  if (status === "complete") {
    eta = "complete";
  } else if (status === "running") {
    eta = calculateETA(current, total, startTime);
  } else {
    eta = "waiting...";
  }

  return `  ${count}  ${percentStr}  ETA: ${eta}`;
}

/**
 * Progress bar component for a single entity.
 */
export interface ProgressBarComponent {
  container: BoxRenderable;
  update(state: EntityState): void;
  destroy(): void;
}

/**
 * Create a progress bar component for a migration entity.
 */
export function createProgressBar(
  renderer: CliRenderer,
  entity: MigrationEntity,
): ProgressBarComponent {
  const startTime = Date.now();

  // Container (horizontal flex)
  const container = new BoxRenderable(renderer, {
    id: `progress-${entity}`,
    width: "100%",
    height: 1,
    flexDirection: "row",
  });

  // Label
  const label = new TextRenderable(renderer, {
    id: `label-${entity}`,
    content: formatLabel(entity),
    fg: "#FFFFFF",
  });

  // Bar visualization
  const bar = new TextRenderable(renderer, {
    id: `bar-${entity}`,
    content: generateBar(0, 1),
    fg: "#00FF00",
  });

  // Stats (count, percentage, ETA)
  const stats = new TextRenderable(renderer, {
    id: `stats-${entity}`,
    content: "  0/0  0.0%  ETA: waiting...",
    fg: "#888888",
  });

  // Assemble
  container.add(label);
  container.add(bar);
  container.add(stats);

  /**
   * Update progress bar with new state.
   */
  function update(state: EntityState): void {
    // Update bar visualization
    bar.content = generateBar(state.current, state.total);

    // Update color based on status
    if (state.status === "complete") {
      bar.fg = "#00FF00"; // Green
      stats.fg = "#00FF00";
    } else if (state.failed > 0) {
      bar.fg = "#FFAA00"; // Orange (has errors but still running)
    } else {
      bar.fg = "#00FF00"; // Green
    }

    // Update stats
    stats.content = formatStats(state, startTime);
  }

  /**
   * Cleanup component.
   */
  function destroy(): void {
    container.destroy();
  }

  return {
    container,
    update,
    destroy,
  };
}
