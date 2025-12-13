/**
 * Tests for TUI state store.
 */

import { describe, expect, test } from "bun:test";
import { createStore } from "./state.ts";

describe("State Store", () => {
  test("initializes with correct defaults", () => {
    const store = createStore();
    const state = store.getState();

    expect(state.currentView).toBe("dashboard");
    expect(state.streamOffset).toBe(-1);
    expect(state.streamConnected).toBe(false);
    expect(state.errors).toEqual([]);
    expect(state.entities.tags.status).toBe("idle");
    expect(state.entities.courses.status).toBe("idle");
    expect(state.entities.lessons.status).toBe("idle");
  });

  test("setState updates state and notifies listeners", () => {
    const store = createStore();
    const updates: number[] = [];

    // Subscribe
    const unsub = store.subscribe(() => {
      updates.push(Date.now());
    });

    // Update state
    store.setState((prev) => ({
      ...prev,
      currentView: "errors",
    }));

    expect(store.getState().currentView).toBe("errors");
    expect(updates.length).toBe(1);

    // Cleanup
    unsub();
  });

  test("unsubscribe stops notifications", () => {
    const store = createStore();
    let callCount = 0;

    const unsub = store.subscribe(() => {
      callCount++;
    });

    store.setState((prev) => ({ ...prev, streamOffset: 100 }));
    expect(callCount).toBe(1);

    unsub();

    store.setState((prev) => ({ ...prev, streamOffset: 200 }));
    expect(callCount).toBe(1); // Still 1, not called again
  });

  test("multiple listeners receive updates", () => {
    const store = createStore();
    const calls: string[] = [];

    store.subscribe(() => calls.push("A"));
    store.subscribe(() => calls.push("B"));

    store.setState((prev) => ({ ...prev, streamConnected: true }));

    expect(calls).toEqual(["A", "B"]);
  });

  test("entity state updates correctly", () => {
    const store = createStore();

    store.setState((prev) => ({
      ...prev,
      entities: {
        ...prev.entities,
        tags: {
          ...prev.entities.tags,
          total: 627,
          status: "running",
        },
      },
    }));

    const state = store.getState();
    expect(state.entities.tags.total).toBe(627);
    expect(state.entities.tags.status).toBe("running");
  });

  test("errors accumulate correctly", () => {
    const store = createStore();

    store.setState((prev) => ({
      ...prev,
      errors: [
        ...prev.errors,
        {
          entity: "tags",
          legacyId: 123,
          error: "Duplicate tag name",
          timestamp: Date.now(),
        },
      ],
    }));

    expect(store.getState().errors.length).toBe(1);
    expect(store.getState().errors[0].entity).toBe("tags");
  });
});
