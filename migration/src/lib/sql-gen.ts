/**
 * SQL generation utilities for migration scripts
 *
 * Pure functions - no side effects, fully testable
 */

/**
 * Convert camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * PII fields that must be scrubbed from all exports
 * This is the canonical list - add new fields here
 */
export const PII_FIELDS = {
  // Authentication & tokens
  encryptedPassword: "redacted",
  authenticationToken: null,
  confirmationToken: null,
  resetPasswordToken: null,
  resetPasswordSentAt: null,

  // IP addresses
  currentSignInIp: null,
  lastSignInIp: null,

  // External service IDs
  discordId: null,
  slackId: null,
  stripeCustomerId: null,

  // Email variants
  unconfirmedEmail: null,

  // Tracking data that might contain PII
  kvstore: null, // Contains drip data with emails, IPs, etc.
} as const;

/**
 * Anonymize user data for test seeds
 * Scrubs ALL PII fields that exist in the record and replaces email with test email
 */
export function anonymizeUser(
  user: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...user };

  // Only null out PII fields that exist in the original record
  for (const [key, value] of Object.entries(PII_FIELDS)) {
    if (key in result) {
      result[key] = value;
    }
  }

  // Always replace email and ensure names
  result.email = `user${user.id}@test.egghead.io`;
  result.firstName = user.firstName || "Test";
  result.lastName = user.lastName || "User";

  return result;
}

/**
 * Anonymize instructor data for test seeds
 */
export function anonymizeInstructor(
  instructor: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...instructor,
    email: instructor.email
      ? `instructor${instructor.id}@test.egghead.io`
      : null,
    slackId: null,
    gearTrackingNumber: null,
  };
}

/**
 * Scrub any record for PII - use as a safety net
 * Checks all string values for email patterns and IPs
 */
export function scrubRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const scrubbed = { ...record };

  for (const [key, value] of Object.entries(scrubbed)) {
    // Null out known PII fields
    if (key in PII_FIELDS) {
      scrubbed[key] = PII_FIELDS[key as keyof typeof PII_FIELDS];
      continue;
    }

    // Check strings for email patterns (but not @test.egghead.io)
    if (typeof value === "string") {
      let scrubbedValue = value;

      // Email pattern that's not our test domain
      if (
        scrubbedValue.includes("@") &&
        !scrubbedValue.includes("@test.egghead.io")
      ) {
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        scrubbedValue = scrubbedValue.replace(
          emailPattern,
          "redacted@test.egghead.io",
        );
      }

      // IP address pattern
      const ipPattern = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
      scrubbedValue = scrubbedValue.replace(ipPattern, "0.0.0.0");

      scrubbed[key] = scrubbedValue;
    }

    // Recursively scrub nested objects (like JSONB)
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      scrubbed[key] = scrubRecord(value as Record<string, unknown>);
    }
  }

  return scrubbed;
}

/**
 * Convert JS value to SQL literal
 */
export function toSqlValue(val: unknown): string {
  if (val === null || val === undefined) {
    return "NULL";
  }
  if (typeof val === "boolean") {
    return val ? "true" : "false";
  }
  if (typeof val === "number") {
    return String(val);
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (typeof val === "object") {
    // JSONB - escape single quotes in JSON string
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  // String - escape single quotes
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Generate INSERT statement from a row object
 * Converts camelCase keys to snake_case for PostgreSQL
 */
export function generateInsert(
  table: string,
  row: Record<string, unknown>,
  options: { onConflict?: "DO NOTHING" | "DO UPDATE" } = {},
): string {
  const columns = Object.keys(row).map(toSnakeCase);
  const values = Object.values(row).map(toSqlValue);
  const conflict =
    options.onConflict === "DO UPDATE"
      ? "ON CONFLICT (id) DO UPDATE SET " +
        columns.map((c) => `${c} = EXCLUDED.${c}`).join(", ")
      : "ON CONFLICT (id) DO NOTHING";

  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")}) ${conflict};`;
}

/**
 * Clean pg_dump output for Docker PostgreSQL compatibility
 * Removes commands that don't work in older PostgreSQL versions
 */
export function cleanPgDump(content: string): string {
  const problematicPatterns = [
    /^\\restrict .*/gm, // \restrict command (not standard)
    /^\\unrestrict .*/gm, // \unrestrict command (not standard)
    /^SET transaction_timeout.*/gm, // PG 17+ only
  ];

  let cleaned = content;
  for (const pattern of problematicPatterns) {
    cleaned = cleaned.replace(pattern, "-- (removed for compatibility)");
  }
  return cleaned;
}

/**
 * Generate sequence reset statements
 */
export function generateSequenceResets(tables: string[]): string[] {
  return tables.map(
    (table) =>
      `SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${table}), 1));`,
  );
}

/**
 * Wrap SQL statements with FK disable/enable
 */
export function wrapWithFkDisable(statements: string[]): string[] {
  return [
    "-- Disable FK checks during import",
    "SET session_replication_role = replica;",
    "",
    ...statements,
    "",
    "-- Re-enable FK checks",
    "SET session_replication_role = DEFAULT;",
  ];
}
