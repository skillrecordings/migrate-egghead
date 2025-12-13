/**
 * Reactive state store for migration TUI.
 * Simple event-based state management for tracking migration progress.
 */

import type { MigrationEntity } from "../lib/event-types.ts";

/**
 * Per-entity progress state.
 */
export interface EntityState {
  total: number;
  current: number;
  failed: number;
  status: "idle" | "running" | "complete";
}

/**
 * Error record for display in errors view.
 */
export interface ErrorRecord {
  entity: MigrationEntity;
  legacyId: number;
  error: string;
  timestamp: number;
}

/**
 * Global migration state.
 */
export interface MigrationState {
  entities: {
    tags: EntityState;
    courses: EntityState;
    lessons: EntityState;
  };
  errors: ErrorRecord[];
  currentView: "dashboard" | "errors";
  streamOffset: number;
  streamConnected: boolean;
}

/**
 * State change listener.
 */
export type StateListener = (state: MigrationState) => void;

/**
 * Reactive state store with pub/sub.
 */
export interface Store {
  getState(): MigrationState;
  setState(updater: (state: MigrationState) => MigrationState): void;
  subscribe(listener: StateListener): () => void;
}

/**
 * Create initial state with all entities idle.
 */
function createInitialState(): MigrationState {
  const entityState: EntityState = {
    total: 0,
    current: 0,
    failed: 0,
    status: "idle",
  };

  return {
    entities: {
      tags: { ...entityState },
      courses: { ...entityState },
      lessons: { ...entityState },
    },
    errors: [],
    currentView: "dashboard",
    streamOffset: -1,
    streamConnected: false,
  };
}

/**
 * Create a reactive state store.
 *
 * Usage:
 * ```typescript
 * const store = createStore();
 *
 * // Subscribe to changes
 * const unsub = store.subscribe((state) => {
 *   console.log('State updated:', state);
 * });
 *
 * // Update state
 * store.setState((prev) => ({
 *   ...prev,
 *   currentView: 'errors'
 * }));
 *
 * // Cleanup
 * unsub();
 * ```
 */
export function createStore(initial?: MigrationState): Store {
  let state = initial ?? createInitialState();
  const listeners = new Set<StateListener>();

  return {
    getState() {
      return state;
    },

    setState(updater) {
      const newState = updater(state);
      if (newState !== state) {
        state = newState;
        // Notify all listeners
        for (const listener of listeners) {
          listener(state);
        }
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      // Return unsubscribe function
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
