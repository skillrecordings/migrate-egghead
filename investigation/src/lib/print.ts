/**
 * Pretty printing utilities for investigation output
 */

/**
 * Print a section header
 */
export const header = (title: string): void => {
  console.log("\n" + "=".repeat(60));
  console.log(` ${title}`);
  console.log("=".repeat(60) + "\n");
};

/**
 * Print a sub-section header
 */
export const subheader = (title: string): void => {
  console.log("\n" + "-".repeat(40));
  console.log(` ${title}`);
  console.log("-".repeat(40));
};

/**
 * Print a table from an array of objects
 */
export const table = <T extends Record<string, unknown>>(
  rows: readonly T[],
  columns?: (keyof T)[],
): void => {
  if (rows.length === 0) {
    console.log("(no data)");
    return;
  }

  const cols = columns ?? (Object.keys(rows[0] ?? {}) as (keyof T)[]);
  const widths = cols.map((col) => {
    const values = rows.map((row) => String(row[col] ?? ""));
    return Math.max(String(col).length, ...values.map((v) => v.length));
  });

  // Header
  const headerRow = cols
    .map((col, i) => String(col).padEnd(widths[i] ?? 0))
    .join(" | ");
  console.log(headerRow);
  console.log(widths.map((w) => "-".repeat(w)).join("-+-"));

  // Rows
  for (const row of rows) {
    const line = cols
      .map((col, i) => String(row[col] ?? "").padEnd(widths[i] ?? 0))
      .join(" | ");
    console.log(line);
  }
};

/**
 * Print a key-value summary
 */
export const summary = (data: Record<string, unknown>): void => {
  const maxKeyLen = Math.max(...Object.keys(data).map((k) => k.length));
  for (const [key, value] of Object.entries(data)) {
    console.log(`${key.padEnd(maxKeyLen)} : ${value}`);
  }
};

/**
 * Format a number with commas
 */
export const formatNumber = (n: number | bigint): string => {
  return n.toLocaleString();
};

/**
 * Format a percentage
 */
export const formatPercent = (n: number, decimals = 1): string => {
  return `${(n * 100).toFixed(decimals)}%`;
};

/**
 * Format currency (cents to dollars)
 */
export const formatCurrency = (cents: number | bigint): string => {
  const dollars = Number(cents) / 100;
  return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
