/**
 * Schema verification script
 *
 * Tests database connectivity and lists key tables for the migration
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "../lib/db.js";
import { header, table } from "../lib/print.js";

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  header("Database Connection Test");

  // Test basic connectivity
  const versionResult = yield* sql`SELECT version()`;
  console.log(`✓ Connected to PostgreSQL`);
  console.log(`  ${versionResult[0].version.split(",")[0]}\n`);

  // List subscription-related tables
  header("Subscription Tables");
  const subscriptionTables = yield* sql`
    SELECT table_name, 
           (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND (
        table_name LIKE '%subscription%'
        OR table_name LIKE '%account%'
        OR table_name = 'users'
        OR table_name = 'stripe_events'
      )
    ORDER BY table_name
  `;
  table(subscriptionTables);

  // Get row counts for key tables
  header("Row Counts (Key Tables)");

  const counts = yield* Effect.all({
    users: sql`SELECT COUNT(*)::int as count FROM users`,
    subscriptions: sql`SELECT COUNT(*)::int as count FROM subscriptions`,
    accounts: sql`SELECT COUNT(*)::int as count FROM accounts`,
    accountSubscriptions: sql`SELECT COUNT(*)::int as count FROM account_subscriptions`,
    stripeEvents: sql`SELECT COUNT(*)::int as count FROM stripe_events`,
  });

  table([
    { table: "users", count: counts.users[0].count.toLocaleString() },
    {
      table: "subscriptions",
      count: counts.subscriptions[0].count.toLocaleString(),
    },
    { table: "accounts", count: counts.accounts[0].count.toLocaleString() },
    {
      table: "account_subscriptions",
      count: counts.accountSubscriptions[0].count.toLocaleString(),
    },
    {
      table: "stripe_events",
      count: counts.stripeEvents[0].count.toLocaleString(),
    },
  ]);

  console.log("\n✓ Schema verification complete");
});

runWithDb(program).catch((err) => {
  console.error(`✗ Database connection failed: ${err.message}`);
  process.exit(1);
});
