#!/usr/bin/env bun
/**
 * Simple migration progress watcher
 *
 * Polls databases and shows progress without the full TUI.
 * Use this when the TUI has issues or you want simpler output.
 *
 * Usage:
 *   USE_DOCKER=1 bun scripts/watch-migration.ts
 *   USE_DOCKER=1 bun scripts/watch-migration.ts --once  # Single check, no loop
 */

import { closeAll, getAllMigrationCounts } from "../src/lib/db";

const ONCE = process.argv.includes("--once");
const INTERVAL = 2000; // 2 seconds

function formatBar(current: number, total: number, width = 20): string {
  const pct = total > 0 ? Math.min(current / total, 1) : 0;
  const filled = Math.max(0, Math.floor(pct * width));
  const empty = Math.max(0, width - filled);
  return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}

function formatLine(label: string, current: number, total: number): string {
  const bar = formatBar(current, total);
  const pct = total > 0 ? ((current / total) * 100).toFixed(1) : "0.0";
  return `  ${label.padEnd(10)} ${bar} ${String(current).padStart(5)}/${String(total).padEnd(5)} ${pct.padStart(5)}%`;
}

async function showProgress() {
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout")), 5000),
    );
    const counts = await Promise.race([
      getAllMigrationCounts(),
      timeoutPromise,
    ]);

    console.clear();
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║          MIGRATION PROGRESS                          ║");
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log("║ SOURCE (Rails) → TARGET (Coursebuilder)              ║");
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(
      `║${formatLine("Tags", counts.coursebuilder.tags, counts.rails.tags).padEnd(54)}║`,
    );
    console.log(
      `║${formatLine("Courses", counts.coursebuilder.courses, counts.rails.courses).padEnd(54)}║`,
    );
    console.log(
      `║${formatLine("Lessons", counts.coursebuilder.lessons, counts.rails.lessons).padEnd(54)}║`,
    );
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log("║ MAPPING TABLES                                       ║");
    console.log(
      `║   tag_map:    ${String(counts.mappingTables.tagMap).padStart(5)} entries                          ║`,
    );
    console.log(
      `║   course_map: ${String(counts.mappingTables.courseMap).padStart(5)} entries                          ║`,
    );
    console.log(
      `║   lesson_map: ${String(counts.mappingTables.lessonMap).padStart(5)} entries                          ║`,
    );
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(
      `║ Last update: ${new Date().toLocaleTimeString().padEnd(40)}║`,
    );
    console.log("╚══════════════════════════════════════════════════════╝");

    if (!ONCE) {
      console.log("\nPress Ctrl+C to exit");
    }

    // Don't auto-exit - let user decide when to stop
    return false;
  } catch (error) {
    console.error("Error fetching counts:", error);
    return false;
  }
}

async function main() {
  console.log("Starting migration watcher...\n");

  if (ONCE) {
    await showProgress();
    await closeAll();
    process.exit(0);
  }

  // Polling loop
  let running = true;

  process.on("SIGINT", async () => {
    running = false;
    console.log("\n\nShutting down...");
    await closeAll();
    process.exit(0);
  });

  while (running) {
    const complete = await showProgress();
    if (complete) {
      await closeAll();
      process.exit(0);
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL));
  }
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await closeAll();
  process.exit(1);
});
