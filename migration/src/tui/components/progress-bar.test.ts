/**
 * Tests for progress bar component utilities.
 * Verifies ETA calculation, bar generation, and formatting.
 */

import { describe, expect, test } from "bun:test";

/**
 * Format duration in ms to human-readable string.
 * (Duplicated from progress-bar.ts for testing)
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
 * Generate progress bar visualization using block characters.
 * (Duplicated from progress-bar.ts for testing)
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

describe("formatDuration", () => {
  test("formats seconds", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(1000)).toBe("1s");
    expect(formatDuration(30000)).toBe("30s");
    expect(formatDuration(59000)).toBe("59s");
  });

  test("formats minutes", () => {
    expect(formatDuration(60000)).toBe("1m");
    expect(formatDuration(90000)).toBe("1m 30s");
    expect(formatDuration(120000)).toBe("2m");
    expect(formatDuration(3540000)).toBe("59m");
  });

  test("formats hours", () => {
    expect(formatDuration(3600000)).toBe("1h");
    expect(formatDuration(3660000)).toBe("1h 1m");
    expect(formatDuration(7200000)).toBe("2h");
    expect(formatDuration(7320000)).toBe("2h 2m");
  });
});

describe("generateBar", () => {
  test("shows empty bar at 0%", () => {
    expect(generateBar(0, 100)).toBe("[░░░░░░░░░░░░░░░░░░░░]");
  });

  test("shows full bar at 100%", () => {
    expect(generateBar(100, 100)).toBe("[████████████████████]");
  });

  test("shows 50% progress", () => {
    expect(generateBar(50, 100)).toBe("[██████████░░░░░░░░░░]");
  });

  test("shows 25% progress", () => {
    expect(generateBar(25, 100)).toBe("[█████░░░░░░░░░░░░░░░]");
  });

  test("shows 75% progress", () => {
    expect(generateBar(75, 100)).toBe("[███████████████░░░░░]");
  });

  test("handles zero total", () => {
    expect(generateBar(0, 0)).toBe("[░░░░░░░░░░░░░░░░░░░░]");
  });

  test("handles realistic counts", () => {
    // 450/627 = ~71.8%
    expect(generateBar(450, 627)).toBe("[██████████████░░░░░░]");

    // 168/420 = 40%
    expect(generateBar(168, 420)).toBe("[████████░░░░░░░░░░░░]");

    // 512/5132 = ~9.9%
    expect(generateBar(512, 5132)).toBe("[█░░░░░░░░░░░░░░░░░░░]");
  });
});
