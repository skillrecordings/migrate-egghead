/**
 * Query PostgreSQL pg_stat_user_tables to find which tables are actively receiving writes.
 * This helps identify what parts of Rails are still "alive" vs dead code.
 */

import { Effect, Console } from "effect";
import { SqlClient } from "@effect/sql";
import { table as printTable, header as printSection } from "../lib/print";

// Query pg_stat_user_tables for write activity since last stats reset
const getTableWriteStats = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
    SELECT 
      relname AS table_name,
      n_tup_ins AS inserts,
      n_tup_upd AS updates,
      n_tup_del AS deletes,
      (n_tup_ins + n_tup_upd + n_tup_del)::bigint AS total_writes,
      n_live_tup AS live_rows,
      last_autovacuum,
      last_autoanalyze
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND (n_tup_ins + n_tup_upd + n_tup_del) > 0
    ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
    LIMIT 50
  `;

  return result;
});

// Query recent activity on key tables using timestamps
const getRecentActivity = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // Tables we care about for the migration
  const tables = [
    "users",
    "accounts",
    "account_users",
    "account_subscriptions",
    "subscriptions",
    "stripe_events",
    "transactions",
    "sellable_purchases",
    "lesson_views",
    "comments",
    "ratings",
    "lessons",
    "playlists",
    "series",
  ];

  const results: Array<{
    table_name: string;
    last_7_days: number;
    last_30_days: number;
    last_24_hours: number;
  }> = [];

  for (const table of tables) {
    try {
      // Check if table has created_at and updated_at
      const columns = yield* sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table} 
          AND column_name IN ('created_at', 'updated_at')
      `;

      const hasCreatedAt = columns.some((c) => c.columnName === "created_at");
      const hasUpdatedAt = columns.some((c) => c.columnName === "updated_at");

      if (!hasCreatedAt && !hasUpdatedAt) {
        continue;
      }

      const timeColumn = hasUpdatedAt ? "updated_at" : "created_at";

      const [stats] = yield* sql.unsafe(`
        SELECT 
          COUNT(*) FILTER (WHERE ${timeColumn} > NOW() - INTERVAL '24 hours') AS last_24_hours,
          COUNT(*) FILTER (WHERE ${timeColumn} > NOW() - INTERVAL '7 days') AS last_7_days,
          COUNT(*) FILTER (WHERE ${timeColumn} > NOW() - INTERVAL '30 days') AS last_30_days
        FROM ${table}
      `);

      results.push({
        table_name: table,
        last_24_hours: Number(stats.last24Hours),
        last_7_days: Number(stats.last7Days),
        last_30_days: Number(stats.last30Days),
      });
    } catch (e) {
      // Table might not exist or have different structure
      yield* Console.log(`Skipping ${table}: ${e}`);
    }
  }

  return results.sort((a, b) => b.last_7_days - a.last_7_days);
});

// Get the most recent record from each key table
const getMostRecentRecords = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const tables = [
    "users",
    "accounts",
    "account_users",
    "account_subscriptions",
    "subscriptions",
    "stripe_events",
    "transactions",
    "sellable_purchases",
    "lesson_views",
  ];

  const results: Array<{
    table_name: string;
    most_recent_created: string | null;
    most_recent_updated: string | null;
  }> = [];

  for (const table of tables) {
    try {
      const [record] = yield* sql.unsafe(`
        SELECT 
          MAX(created_at) AS most_recent_created,
          MAX(updated_at) AS most_recent_updated
        FROM ${table}
      `);

      results.push({
        table_name: table,
        most_recent_created: record.mostRecentCreated
          ? new Date(record.mostRecentCreated).toISOString()
          : null,
        most_recent_updated: record.mostRecentUpdated
          ? new Date(record.mostRecentUpdated).toISOString()
          : null,
      });
    } catch (e) {
      // Skip
    }
  }

  return results;
});

// Check stripe_events for recent activity by event type
const getRecentWebhookEvents = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
    SELECT 
      stripe_type AS event_type,
      COUNT(*) AS count,
      MAX(created_at) AS most_recent
    FROM stripe_events
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY stripe_type
    ORDER BY count DESC
  `;

  return result;
});

const main = Effect.gen(function* () {
  printSection("TABLE WRITE ACTIVITY (pg_stat_user_tables)");
  yield* Console.log(
    "Note: Stats are cumulative since last server restart or pg_stat_reset()\n",
  );

  const writeStats = yield* getTableWriteStats;
  printTable(
    writeStats.map((r) => ({
      table: r.tableName,
      inserts: Number(r.inserts).toLocaleString(),
      updates: Number(r.updates).toLocaleString(),
      deletes: Number(r.deletes).toLocaleString(),
      total_writes: Number(r.totalWrites).toLocaleString(),
      live_rows: Number(r.liveRows).toLocaleString(),
    })),
  );

  printSection("RECENT ACTIVITY BY TIMESTAMP");
  const recentActivity = yield* getRecentActivity;
  printTable(
    recentActivity.map((r) => ({
      table: r.table_name,
      "24h": r.last_24_hours.toLocaleString(),
      "7d": r.last_7_days.toLocaleString(),
      "30d": r.last_30_days.toLocaleString(),
    })),
  );

  printSection("MOST RECENT RECORDS");
  const mostRecent = yield* getMostRecentRecords;
  printTable(
    mostRecent.map((r) => ({
      table: r.table_name,
      last_created: r.most_recent_created || "N/A",
      last_updated: r.most_recent_updated || "N/A",
    })),
  );

  printSection("STRIPE WEBHOOK EVENTS (Last 30 Days)");
  const webhookEvents = yield* getRecentWebhookEvents;
  printTable(
    webhookEvents.map((r) => ({
      event_type: r.eventType,
      count: Number(r.count).toLocaleString(),
      most_recent: r.mostRecent ? new Date(r.mostRecent).toISOString() : "N/A",
    })),
  );
});

import { runWithDb } from "../lib/db";

runWithDb(main).catch(console.error);
