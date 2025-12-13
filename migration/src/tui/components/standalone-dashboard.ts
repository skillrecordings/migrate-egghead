/**
 * Standalone Dashboard Component.
 * Displays migration status by querying databases directly (no stream required).
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────┐
 * │  Migration Control Plane v1.0        [Standalone]   │
 * ├─────────────────────────────────────────────────────┤
 * │  MIGRATION STATUS                                   │
 * │  Tags      [████████████████████]  627/627  100%   │
 * │  Courses   [████████████░░░░░░░░]  250/420   60%   │
 * │  Lessons   [██████░░░░░░░░░░░░░░] 1500/5132  29%   │
 * │                                                     │
 * │  MAPPING TABLES                                     │
 * │  tag_map      627 entries                          │
 * │  course_map   250 entries                          │
 * │  lesson_map  1500 entries                          │
 * ├─────────────────────────────────────────────────────┤
 * │  Mode: standalone | r: refresh | q: quit            │
 * └─────────────────────────────────────────────────────┘
 */

import type { CliRenderer } from "@opentui/core";
import { BoxRenderable, TextRenderable } from "@opentui/core";
import { getAllMigrationCounts, type MigrationCounts } from "../../lib/db.ts";

/**
 * Standalone dashboard component structure.
 */
export interface StandaloneDashboardComponent {
  container: BoxRenderable;
  refresh(): Promise<void>;
  destroy(): void;
}

/**
 * Generate progress bar visualization.
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
 * Format a progress line.
 */
function formatProgressLine(
  label: string,
  current: number,
  total: number,
): string {
  const paddedLabel = label.padEnd(10, " ");
  const bar = generateBar(current, total);
  const count = `${current}/${total}`.padStart(10, " ");
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const percentStr = `${percentage.toFixed(0)}%`.padStart(5, " ");

  return `${paddedLabel}${bar}  ${count}  ${percentStr}`;
}

/**
 * Format mapping table line.
 */
function formatMappingLine(label: string, count: number): string {
  const paddedLabel = label.padEnd(14, " ");
  return `${paddedLabel}${count} entries`;
}

/**
 * Create standalone dashboard that queries databases directly.
 */
export function createStandaloneDashboard(
  renderer: CliRenderer,
): StandaloneDashboardComponent {
  // Main container
  const container = new BoxRenderable(renderer, {
    id: "standalone-dashboard",
    width: "100%",
    height: "100%",
    flexDirection: "column",
    padding: 1,
  });

  // Section: Migration Status
  const statusHeader = new TextRenderable(renderer, {
    id: "status-header",
    content: "MIGRATION STATUS",
    fg: "#FFFFFF",
  });

  const tagsLine = new TextRenderable(renderer, {
    id: "tags-line",
    content: formatProgressLine("Tags", 0, 0),
    fg: "#888888",
  });

  const coursesLine = new TextRenderable(renderer, {
    id: "courses-line",
    content: formatProgressLine("Courses", 0, 0),
    fg: "#888888",
  });

  const lessonsLine = new TextRenderable(renderer, {
    id: "lessons-line",
    content: formatProgressLine("Lessons", 0, 0),
    fg: "#888888",
  });

  // Spacer
  const spacer1 = new TextRenderable(renderer, {
    id: "spacer1",
    content: "",
  });

  // Section: Mapping Tables
  const mappingHeader = new TextRenderable(renderer, {
    id: "mapping-header",
    content: "MAPPING TABLES",
    fg: "#FFFFFF",
  });

  const tagMapLine = new TextRenderable(renderer, {
    id: "tag-map-line",
    content: formatMappingLine("tag_map", 0),
    fg: "#888888",
  });

  const courseMapLine = new TextRenderable(renderer, {
    id: "course-map-line",
    content: formatMappingLine("course_map", 0),
    fg: "#888888",
  });

  const lessonMapLine = new TextRenderable(renderer, {
    id: "lesson-map-line",
    content: formatMappingLine("lesson_map", 0),
    fg: "#888888",
  });

  // Spacer
  const spacer2 = new TextRenderable(renderer, {
    id: "spacer2",
    content: "",
  });

  // Last refresh
  const lastRefresh = new TextRenderable(renderer, {
    id: "last-refresh",
    content: "Loading...",
    fg: "#666666",
  });

  // Assemble
  container.add(statusHeader);
  container.add(tagsLine);
  container.add(coursesLine);
  container.add(lessonsLine);
  container.add(spacer1);
  container.add(mappingHeader);
  container.add(tagMapLine);
  container.add(courseMapLine);
  container.add(lessonMapLine);
  container.add(spacer2);
  container.add(lastRefresh);

  /**
   * Update display with new counts.
   */
  function updateDisplay(counts: MigrationCounts): void {
    // Update progress lines
    tagsLine.content = formatProgressLine(
      "Tags",
      counts.coursebuilder.tags,
      counts.rails.tags,
    );
    tagsLine.fg =
      counts.coursebuilder.tags >= counts.rails.tags ? "#00FF00" : "#FFAA00";

    coursesLine.content = formatProgressLine(
      "Courses",
      counts.coursebuilder.courses,
      counts.rails.courses,
    );
    coursesLine.fg =
      counts.coursebuilder.courses >= counts.rails.courses
        ? "#00FF00"
        : "#FFAA00";

    lessonsLine.content = formatProgressLine(
      "Lessons",
      counts.coursebuilder.lessons,
      counts.rails.lessons,
    );
    lessonsLine.fg =
      counts.coursebuilder.lessons >= counts.rails.lessons
        ? "#00FF00"
        : "#FFAA00";

    // Update mapping table lines
    tagMapLine.content = formatMappingLine(
      "tag_map",
      counts.mappingTables.tagMap,
    );
    courseMapLine.content = formatMappingLine(
      "course_map",
      counts.mappingTables.courseMap,
    );
    lessonMapLine.content = formatMappingLine(
      "lesson_map",
      counts.mappingTables.lessonMap,
    );

    // Update last refresh time
    const now = new Date();
    lastRefresh.content = `Last refresh: ${now.toLocaleTimeString()}`;
  }

  /**
   * Refresh data from databases.
   */
  async function refresh(): Promise<void> {
    try {
      lastRefresh.content = "Refreshing...";
      lastRefresh.fg = "#FFFF00";

      const counts = await getAllMigrationCounts();
      updateDisplay(counts);

      lastRefresh.fg = "#666666";
    } catch (error) {
      lastRefresh.content = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
      lastRefresh.fg = "#FF0000";
    }
  }

  /**
   * Cleanup component.
   */
  function destroy(): void {
    container.destroy();
  }

  return {
    container,
    refresh,
    destroy,
  };
}
