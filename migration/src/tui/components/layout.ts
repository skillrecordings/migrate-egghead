/**
 * Layout components for migration TUI.
 * Uses OpenTUI's BoxRenderable and TextRenderable with Yoga flexbox.
 */

import type { CliRenderer } from "@opentui/core";
import { BoxRenderable, TextRenderable } from "@opentui/core";

/**
 * Layout structure for the TUI.
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  Migration Control Plane v1.0        [Tab: Switch]  │  <- Header
 * ├─────────────────────────────────────────────────────┤
 * │                                                     │
 * │  [Main content area - dashboard or errors]          │  <- Content
 * │                                                     │
 * ├─────────────────────────────────────────────────────┤
 * │  Stream: connected | Offset: 1234 | q: quit         │  <- Status bar
 * └─────────────────────────────────────────────────────┘
 */
export interface LayoutComponents {
  container: BoxRenderable;
  header: TextRenderable;
  content: BoxRenderable;
  statusBar: TextRenderable;
}

/**
 * Create the main layout structure.
 */
export function createLayout(renderer: CliRenderer): LayoutComponents {
  // Main container (fills terminal)
  const container = new BoxRenderable(renderer, {
    id: "container",
    width: "100%",
    height: "100%",
    flexDirection: "column",
  });

  // Header (fixed height)
  const header = new TextRenderable(renderer, {
    id: "header",
    content: "",
    fg: "#00FF00",
    height: 1,
  });

  // Content area (flex-grow to fill space)
  const content = new BoxRenderable(renderer, {
    id: "content",
    width: "100%",
    flexGrow: 1,
    flexDirection: "column",
  });

  // Status bar (fixed height)
  const statusBar = new TextRenderable(renderer, {
    id: "status-bar",
    content: "",
    fg: "#888888",
    height: 1,
  });

  // Assemble layout
  renderer.root.add(container);
  container.add(header);
  container.add(content);
  container.add(statusBar);

  return {
    container,
    header,
    content,
    statusBar,
  };
}

/**
 * Update header text.
 */
export function updateHeader(
  header: TextRenderable,
  view: "dashboard" | "errors",
): void {
  const viewIndicator = view === "dashboard" ? "Dashboard" : "Errors";
  header.content = `Migration Control Plane v1.0        [Tab: Switch to ${viewIndicator}]`;
}

/**
 * Update status bar text.
 */
export function updateStatusBar(
  statusBar: TextRenderable,
  connected: boolean,
  offset: number,
  statusMessage?: string,
): void {
  const connStatus =
    statusMessage ?? (connected ? "connected" : "disconnected");
  const connColor = connected ? "#00FF00" : "#FFAA00";

  statusBar.content = `Stream: ${connStatus} | Offset: ${offset} | q: quit`;
  statusBar.fg = connColor;
}
