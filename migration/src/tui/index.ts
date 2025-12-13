/**
 * Migration Control Plane TUI.
 *
 * Two modes:
 * 1. Standalone mode (default): Query databases directly for migration status
 *    Usage: bun src/tui/index.ts
 *
 * 2. Stream mode: Real-time monitoring via Durable Streams
 *    Usage: bun src/tui/index.ts --run-id abc123 [--stream-url http://localhost:8787]
 *
 * Keyboard shortcuts:
 *   q - quit
 *   r - refresh (standalone mode only)
 *   tab - switch views (stream mode: dashboard / errors)
 */

import { parseArgs } from "node:util";
import { createCliRenderer, type CliRenderer } from "@opentui/core";
import type { MigrationEvent } from "../lib/event-types.ts";
import { MigrationStreamReader } from "../lib/migration-stream.ts";
import { createDashboard } from "./components/dashboard.ts";
import {
  createLayout,
  updateHeader,
  updateStatusBar,
} from "./components/layout.ts";
import { createStandaloneDashboard } from "./components/standalone-dashboard.ts";
import { createStore } from "./state.ts";

/**
 * CLI arguments.
 */
interface Args {
  "stream-url": string;
  "run-id": string | undefined;
  mode: "standalone" | "stream";
}

// Global renderer reference for cleanup
let renderer: CliRenderer | null = null;

/**
 * Clean up and exit gracefully.
 */
async function cleanup(code = 0) {
  // Close database connections first
  try {
    const { closeAll } = await import("../lib/db.ts");
    await closeAll();
  } catch {
    // Ignore DB cleanup errors
  }

  if (renderer) {
    try {
      renderer.stop();
    } catch {
      // Ignore renderer cleanup errors
    }
  }

  // Reset terminal state
  process.stdout.write("\x1b[?25h"); // Show cursor
  process.stdout.write("\x1b[0m"); // Reset colors
  process.stdout.write("\n"); // Newline to avoid prompt issues

  process.exit(code);
}

// Handle signals
process.on("SIGINT", () => void cleanup(0));
process.on("SIGTERM", () => void cleanup(0));
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  void cleanup(1);
});

/**
 * Parse command-line arguments.
 * If --run-id is provided, use stream mode. Otherwise, use standalone mode.
 */
function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      "stream-url": {
        type: "string",
        default: "http://localhost:8787",
      },
      "run-id": {
        type: "string",
      },
    },
  });

  // Determine mode based on whether --run-id was provided
  const mode = values["run-id"] ? "stream" : "standalone";

  return {
    "stream-url": values["stream-url"] as string,
    "run-id": values["run-id"],
    mode,
  };
}

/**
 * Handle migration events and update state.
 */
function handleEvent(
  event: MigrationEvent,
  store: ReturnType<typeof createStore>,
) {
  switch (event.type) {
    case "start":
      store.setState((state) => ({
        ...state,
        entities: {
          ...state.entities,
          [event.entity]: {
            ...state.entities[event.entity],
            total: event.total,
            status: "running",
          },
        },
      }));
      break;

    case "progress":
      store.setState((state) => ({
        ...state,
        entities: {
          ...state.entities,
          [event.entity]: {
            ...state.entities[event.entity],
            current: event.current,
            total: event.total,
          },
        },
      }));
      break;

    case "error":
      store.setState((state) => ({
        ...state,
        entities: {
          ...state.entities,
          [event.entity]: {
            ...state.entities[event.entity],
            failed: state.entities[event.entity].failed + 1,
          },
        },
        errors: [
          ...state.errors,
          {
            entity: event.entity,
            legacyId: event.legacyId,
            error: event.error,
            timestamp: event.timestamp,
          },
        ],
      }));
      break;

    case "complete":
      store.setState((state) => ({
        ...state,
        entities: {
          ...state.entities,
          [event.entity]: {
            ...state.entities[event.entity],
            status: "complete",
            failed: event.failed,
          },
        },
      }));
      break;

    case "checkpoint":
      store.setState((state) => ({
        ...state,
        streamOffset: event.offset,
      }));
      break;
  }
}

/**
 * Run standalone mode - query databases directly.
 */
async function runStandaloneMode() {
  // Create renderer
  renderer = await createCliRenderer();

  // Create layout
  const layout = createLayout(renderer);

  // Create standalone dashboard
  const dashboard = createStandaloneDashboard(renderer);
  layout.content.add(dashboard.container);

  // Update header to show standalone mode
  updateHeader(layout.header, "dashboard");
  updateStatusBar(
    layout.statusBar,
    false,
    -1,
    "standalone mode | r: refresh | q: quit",
  );

  // Keyboard handlers
  renderer.keyInput.on("keypress", async (key) => {
    if (key.name === "q" || key.name === "escape") {
      cleanup(0);
    }

    if (key.name === "r") {
      await dashboard.refresh();
    }
  });

  // Start render loop
  renderer.start();

  // Initial data load
  await dashboard.refresh();

  // Keep running until user quits
  // The event loop is kept alive by the renderer
}

/**
 * Run stream mode - connect to Durable Stream for real-time updates.
 */
async function runStreamMode(args: Args) {
  if (!args["run-id"]) {
    throw new Error("run-id is required for stream mode");
  }

  // Create renderer
  renderer = await createCliRenderer();

  // Create state store
  const store = createStore();

  // Create layout
  const layout = createLayout(renderer);

  // Create dashboard and add to content area
  const dashboard = createDashboard(renderer, store);
  layout.content.add(dashboard.container);

  // Initial render - show "waiting for stream" state
  updateHeader(layout.header, store.getState().currentView);
  updateStatusBar(layout.statusBar, false, -1, "waiting");

  // Subscribe to state changes
  store.subscribe((state) => {
    updateHeader(layout.header, state.currentView);
    updateStatusBar(
      layout.statusBar,
      state.streamConnected,
      state.streamOffset,
      state.streamConnected ? "connected" : "disconnected",
    );
  });

  // Keyboard handlers
  renderer.keyInput.on("keypress", (key) => {
    if (key.name === "q" || key.name === "escape") {
      cleanup(0);
    }

    if (key.name === "tab") {
      store.setState((state) => ({
        ...state,
        currentView: state.currentView === "dashboard" ? "errors" : "dashboard",
      }));
    }
  });

  // Start render loop BEFORE connecting to stream
  renderer.start();

  // Connect to stream with retry logic
  const streamReader = new MigrationStreamReader({
    baseUrl: args["stream-url"],
  });

  // Poll for stream existence (migration might not have started yet)
  let retries = 0;
  const maxRetries = 60; // Wait up to 60 seconds
  let exists = false;

  while (!exists && retries < maxRetries) {
    try {
      exists = await streamReader.streamExists(args["run-id"]);
      if (!exists) {
        retries++;
        // Update status to show waiting
        updateStatusBar(
          layout.statusBar,
          false,
          -1,
          `waiting for stream (${retries}s)`,
        );
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch {
      retries++;
      updateStatusBar(
        layout.statusBar,
        false,
        -1,
        `connection error, retrying (${retries}s)`,
      );
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!exists) {
    updateStatusBar(
      layout.statusBar,
      false,
      -1,
      "stream not found - start migration with --stream",
    );
    // Don't exit - let user quit manually or wait longer
    return;
  }

  // Mark connected
  store.setState((state) => ({
    ...state,
    streamConnected: true,
  }));

  // Tail events (async generator) with reconnection
  while (true) {
    try {
      for await (const event of streamReader.tailEvents(args["run-id"], {
        offset: String(store.getState().streamOffset),
      })) {
        handleEvent(event, store);
        // Update offset for resume
        if ("offset" in event) {
          store.setState((state) => ({
            ...state,
            streamOffset: (event as { offset: number }).offset,
          }));
        }
      }
      // Stream ended normally
      updateStatusBar(
        layout.statusBar,
        false,
        store.getState().streamOffset,
        "stream ended",
      );
      break;
    } catch {
      // Connection lost - try to reconnect
      store.setState((state) => ({
        ...state,
        streamConnected: false,
      }));
      updateStatusBar(
        layout.statusBar,
        false,
        store.getState().streamOffset,
        "reconnecting...",
      );
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

/**
 * Main entry point.
 */
async function main() {
  // Parse args BEFORE creating renderer (so errors print cleanly)
  const args = parseCliArgs();

  if (args.mode === "standalone") {
    await runStandaloneMode();
  } else {
    await runStreamMode(args);
  }
}

// Run
main().catch((error) => {
  cleanup(1);
  console.error("Fatal error:", error);
});
