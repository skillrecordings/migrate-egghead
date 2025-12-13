/**
 * Error log component for migration TUI.
 * Displays scrollable list of failed records with keyboard navigation.
 */

import {
  BoxRenderable,
  type CliRenderer,
  SelectRenderable,
  TextRenderable,
} from "@opentui/core";
import type { ErrorRecord, Store } from "../state.ts";
import type { KeyEvent } from "@opentui/core/lib/KeyHandler";

/**
 * Error log components structure.
 */
export interface ErrorLogComponents {
  container: BoxRenderable;
  errorList: SelectRenderable;
  hints: TextRenderable;
  detailsModal?: BoxRenderable;
}

/**
 * Format error record for display in list.
 */
function formatError(err: ErrorRecord): string {
  const time = new Date(err.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
  });
  return `[${time}] ${err.entity} #${err.legacyId}: ${err.error}`;
}

/**
 * Create error log component with scrollable list.
 *
 * Layout:
 * ```
 * ┌─ Errors (3 total) ────────────────────────────────────────┐
 * │                                                           │
 * │  [12:34:56] lessons #4521: Foreign key constraint failed  │
 * │  [12:35:02] courses #89: Duplicate slug 'react-basics'    │
 * │  [12:35:15] tags #234: Invalid UTF-8 in description       │
 * │                                                           │
 * │  ↑/k: up  ↓/j: down  Enter: details  Esc: back           │
 * └───────────────────────────────────────────────────────────┘
 * ```
 */
export function createErrorLog(
  renderer: CliRenderer,
  store: Store,
): ErrorLogComponents {
  const state = store.getState();

  // Main container with border
  const container = new BoxRenderable(renderer, {
    id: "error-log",
    width: "100%",
    height: "100%",
    borderStyle: "single",
    borderColor: "#FF6666",
    title: `Errors (${state.errors.length} total)`,
    titleAlignment: "left",
    flexDirection: "column",
    padding: 1,
  });

  // Scrollable error list
  const errorList = new SelectRenderable(renderer, {
    id: "error-list",
    width: "100%",
    flexGrow: 1,
    options: state.errors.map((err) => ({
      name: formatError(err),
      description: "", // Keep descriptions empty for compact view
      value: err,
    })),
    backgroundColor: "#000000",
    textColor: "#FFFFFF",
    selectedBackgroundColor: "#333333",
    selectedTextColor: "#FFFF00",
    focusedBackgroundColor: "#444444",
    focusedTextColor: "#FFFFFF",
    showScrollIndicator: true,
    wrapSelection: false,
    showDescription: false,
  });

  // Keyboard hints bar
  const hints = new TextRenderable(renderer, {
    id: "error-hints",
    content: "↑/k: up  ↓/j: down  Enter: details  Esc: back",
    fg: "#666666",
    height: 1,
  });

  // Assemble components
  container.add(errorList);
  container.add(hints);

  // Subscribe to state changes
  store.subscribe((newState) => {
    // Update title with error count
    container.title = `Errors (${newState.errors.length} total)`;

    // Update error list options
    errorList.options = newState.errors.map((err) => ({
      name: formatError(err),
      description: "",
      value: err,
    }));

    // Handle empty state
    if (newState.errors.length === 0) {
      errorList.options = [
        {
          name: "No errors yet - migration running clean! ✨",
          description: "",
          value: null,
        },
      ];
    }
  });

  // Keyboard event handlers
  renderer.keyInput.on("keypress", (key) => {
    // Only handle keys when error log is visible
    if (store.getState().currentView !== "errors") {
      return;
    }

    // Esc: return to dashboard
    if (key.name === "escape") {
      store.setState((prev) => ({
        ...prev,
        currentView: "dashboard",
      }));
      return;
    }

    // Enter: show error details
    if (key.name === "return" || key.name === "enter") {
      const selected = errorList.getSelectedOption();
      if (selected?.value) {
        showErrorDetails(renderer, container, selected.value as ErrorRecord);
      }
      return;
    }

    // j/k navigation (SelectRenderable handles arrow keys by default)
    if (key.name === "j") {
      errorList.moveDown();
    }
    if (key.name === "k") {
      errorList.moveUp();
    }
  });

  return {
    container,
    errorList,
    hints,
  };
}

/**
 * Show detailed error modal overlay.
 */
function showErrorDetails(
  renderer: CliRenderer,
  parent: BoxRenderable,
  error: ErrorRecord,
): void {
  const time = new Date(error.timestamp).toLocaleString("en-US");

  // Create modal overlay
  const modal = new BoxRenderable(renderer, {
    id: "error-modal",
    position: "absolute",
    width: 70,
    height: 12,
    left: "center",
    top: "center",
    backgroundColor: "#1a1a1a",
    borderStyle: "double",
    borderColor: "#FF6666",
    title: "Error Details",
    titleAlignment: "center",
    flexDirection: "column",
    padding: 1,
  });

  // Entity and ID
  const entityInfo = new TextRenderable(renderer, {
    id: "error-entity",
    content: `Entity: ${error.entity} (Legacy ID: #${error.legacyId})`,
    fg: "#00FF00",
    height: 1,
  });

  // Timestamp
  const timestamp = new TextRenderable(renderer, {
    id: "error-time",
    content: `Time: ${time}`,
    fg: "#888888",
    height: 1,
  });

  // Error message (may wrap)
  const errorMsg = new TextRenderable(renderer, {
    id: "error-message",
    content: `\nError:\n${error.error}`,
    fg: "#FF6666",
    flexGrow: 1,
  });

  // Close hint
  const closeHint = new TextRenderable(renderer, {
    id: "error-close-hint",
    content: "Press Esc to close",
    fg: "#666666",
    height: 1,
  });

  // Assemble modal
  modal.add(entityInfo);
  modal.add(timestamp);
  modal.add(errorMsg);
  modal.add(closeHint);

  // Add to parent
  parent.add(modal);
  modal.focus();

  // Close handler
  const closeHandler = (key: KeyEvent) => {
    if (key.name === "escape") {
      modal.remove();
      renderer.keyInput.off("keypress", closeHandler);
    }
  };

  renderer.keyInput.on("keypress", closeHandler);
}

/**
 * Update error log visibility based on current view.
 */
export function updateErrorLogVisibility(
  components: ErrorLogComponents,
  currentView: "dashboard" | "errors",
): void {
  if (currentView === "errors") {
    components.container.visible = true;
    components.errorList.focus();
  } else {
    components.container.visible = false;
  }
}
