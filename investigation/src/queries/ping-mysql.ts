#!/usr/bin/env tsx
/**
 * PlanetScale/MySQL Connection Test
 *
 * Tests connectivity to the NEW_DATABASE_URL (target Next.js database).
 *
 * Run: pnpm ping-mysql
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithMysql } from "../lib/mysql.js";

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  console.log("=== PLANETSCALE CONNECTION TEST ===\n");

  // Test basic connectivity
  const pingResult = yield* sql`SELECT 1 as ping`;
  console.log("✓ Connected to PlanetScale/MySQL");
  console.log("  Ping result:", pingResult[0]);

  // Get MySQL version
  const versionResult = yield* sql`SELECT VERSION() as version`;
  console.log("  Version:", (versionResult[0] as { version: string }).version);

  // List tables
  console.log("\n=== TABLES ===\n");
  const tables = yield* sql`SHOW TABLES`;

  if ((tables as unknown[]).length === 0) {
    console.log("  No tables found (empty database)");
  } else {
    for (const row of tables as Array<Record<string, string>>) {
      const tableName = Object.values(row)[0];
      console.log("  •", tableName);
    }
  }

  // Get database name
  const dbResult = yield* sql`SELECT DATABASE() as db_name`;
  console.log("\n  Database:", (dbResult[0] as { dbName: string }).dbName);

  console.log("\n✓ Connection test complete");
});

runWithMysql(program).catch((err) => {
  console.error("✗ Connection failed:", err.message);
  process.exit(1);
});
