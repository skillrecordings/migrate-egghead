#!/usr/bin/env tsx
/**
 * Migration Status Report
 *
 * Verifies that new subscriptions are going to the modern model only
 * and provides data for the migration report.
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "../lib/db.js";

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  console.log("=== SUBSCRIPTION MIGRATION STATUS ===\n");

  // 1. Legacy subscription states
  const legacyStates = yield* sql`
    SELECT state, COUNT(*)::int as cnt
    FROM subscriptions
    GROUP BY state
    ORDER BY cnt DESC
  `;
  console.log("1. Legacy subscriptions by state:");
  for (const row of legacyStates as Array<{
    state: string | null;
    cnt: number;
  }>) {
    console.log(
      "   " + (row.state || "NULL") + ": " + row.cnt.toLocaleString(),
    );
  }

  // 2. Recent legacy subscription activity
  const legacyRecent = yield* sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int as last30,
      COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '30 days')::int as updated30,
      MAX(created_at) as newest_created,
      MAX(updated_at) as newest_updated
    FROM subscriptions
  `;
  const lr = legacyRecent[0] as {
    total: number;
    last30: number;
    updated30: number;
    newestCreated: Date | null;
    newestUpdated: Date | null;
  };
  console.log("\n2. Legacy subscriptions activity:");
  console.log("   Total records: " + lr.total.toLocaleString());
  console.log("   Created last 30 days: " + lr.last30);
  console.log("   Updated last 30 days: " + lr.updated30.toLocaleString());
  console.log("   Most recent created: " + lr.newestCreated);
  console.log("   Most recent updated: " + lr.newestUpdated);

  // 3. Modern account_subscriptions status
  const modernStatus = yield* sql`
    SELECT status, COUNT(*)::int as cnt
    FROM account_subscriptions
    GROUP BY status
    ORDER BY cnt DESC
  `;
  console.log("\n3. Modern account_subscriptions by status:");
  for (const row of modernStatus as Array<{ status: string; cnt: number }>) {
    console.log("   " + row.status + ": " + row.cnt.toLocaleString());
  }

  // 4. Recent modern subscription activity
  const modernRecent = yield* sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int as last30,
      COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '30 days')::int as updated30,
      MAX(created_at) as newest_created,
      MAX(updated_at) as newest_updated
    FROM account_subscriptions
  `;
  const mr = modernRecent[0] as {
    total: number;
    last30: number;
    updated30: number;
    newestCreated: Date | null;
    newestUpdated: Date | null;
  };
  console.log("\n4. Modern account_subscriptions activity:");
  console.log("   Total records: " + mr.total.toLocaleString());
  console.log("   Created last 30 days: " + mr.last30);
  console.log("   Updated last 30 days: " + mr.updated30.toLocaleString());
  console.log("   Most recent created: " + mr.newestCreated);
  console.log("   Most recent updated: " + mr.newestUpdated);

  // 5. Active subscription comparison
  const activeComp = yield* sql`
    SELECT 
      (SELECT COUNT(*)::int FROM subscriptions WHERE state = 'active') as legacy_active,
      (SELECT COUNT(*)::int FROM account_subscriptions WHERE status IN ('active', 'trialing', 'past_due')) as modern_active
  `;
  const ac = activeComp[0] as { legacyActive: number; modernActive: number };
  console.log("\n5. Active subscriptions comparison:");
  console.log("   Legacy active: " + ac.legacyActive);
  console.log("   Modern active: " + ac.modernActive);

  // 6. New subscriptions - are they going to modern only?
  const newSubs = yield* sql`
    SELECT 
      asub.stripe_subscription_id,
      asub.created_at as modern_created,
      asub.status,
      s.id as legacy_id,
      s.created_at as legacy_created
    FROM account_subscriptions asub
    LEFT JOIN subscriptions s ON asub.stripe_subscription_id = s.stripe_subscription_id
    WHERE asub.created_at > NOW() - INTERVAL '30 days'
    ORDER BY asub.created_at DESC
    LIMIT 10
  `;
  console.log("\n6. Recent new subscriptions (last 30 days, sample of 10):");
  console.log(
    "   stripe_subscription_id      | modern_created | status   | has_legacy?",
  );
  console.log("   " + "-".repeat(75));
  for (const row of newSubs as Array<{
    stripeSubscriptionId: string | null;
    modernCreated: Date;
    status: string;
    legacyId: number | null;
  }>) {
    const hasLegacy = row.legacyId ? "YES" : "NO";
    const subId = (row.stripeSubscriptionId || "null").padEnd(28);
    const date = new Date(row.modernCreated).toISOString().split("T")[0];
    console.log(
      `   ${subId} | ${date} | ${row.status.padEnd(8)} | ${hasLegacy}`,
    );
  }

  // 7. Count new subs with/without legacy
  const newSubsCount = yield* sql`
    SELECT 
      COUNT(*)::int as total_new,
      COUNT(s.id)::int as with_legacy,
      COUNT(*) FILTER (WHERE s.id IS NULL)::int as modern_only
    FROM account_subscriptions asub
    LEFT JOIN subscriptions s ON asub.stripe_subscription_id = s.stripe_subscription_id
    WHERE asub.created_at > NOW() - INTERVAL '30 days'
  `;
  const nsc = newSubsCount[0] as {
    totalNew: number;
    withLegacy: number;
    modernOnly: number;
  };
  console.log("\n7. New subscriptions summary (last 30 days):");
  console.log("   Total new in modern model: " + nsc.totalNew);
  console.log("   Also have legacy record: " + nsc.withLegacy);
  console.log("   Modern-only (no legacy): " + nsc.modernOnly);

  // 8. Accounts summary
  const accountsSummary = yield* sql`
    SELECT 
      COUNT(*)::int as total_accounts,
      COUNT(*) FILTER (WHERE stripe_customer_id IS NOT NULL)::int as with_stripe,
      COUNT(DISTINCT asub.account_id)::int as with_subscription
    FROM accounts a
    LEFT JOIN account_subscriptions asub ON a.id = asub.account_id
  `;
  const as_ = accountsSummary[0] as {
    totalAccounts: number;
    withStripe: number;
    withSubscription: number;
  };
  console.log("\n8. Accounts summary:");
  console.log("   Total accounts: " + as_.totalAccounts.toLocaleString());
  console.log("   With Stripe customer ID: " + as_.withStripe.toLocaleString());
  console.log(
    "   With subscription record: " + as_.withSubscription.toLocaleString(),
  );

  // 9. Pro users
  const proUsers = yield* sql`
    SELECT 
      COUNT(*)::int as total_users,
      COUNT(*) FILTER (WHERE 'pro' = ANY(roles))::int as pro_users,
      COUNT(*) FILTER (WHERE 'account_owner' = ANY(roles))::int as account_owners,
      COUNT(*) FILTER (WHERE 'account_member' = ANY(roles))::int as account_members,
      COUNT(*) FILTER (WHERE 'lifetime_subscriber' = ANY(roles))::int as lifetime
    FROM users
  `;
  const pu = proUsers[0] as {
    totalUsers: number;
    proUsers: number;
    accountOwners: number;
    accountMembers: number;
    lifetime: number;
  };
  console.log("\n9. User roles:");
  console.log("   Total users: " + pu.totalUsers.toLocaleString());
  console.log("   Pro users: " + pu.proUsers.toLocaleString());
  console.log("   Account owners: " + pu.accountOwners.toLocaleString());
  console.log("   Account members: " + pu.accountMembers.toLocaleString());
  console.log("   Lifetime subscribers: " + pu.lifetime.toLocaleString());

  // 10. Revenue by interval (active only)
  const revenueByInterval = yield* sql`
    SELECT 
      interval,
      COUNT(*)::int as count,
      SUM(price)::bigint as total_mrr_cents
    FROM account_subscriptions
    WHERE status IN ('active', 'trialing', 'past_due')
    GROUP BY interval
    ORDER BY count DESC
  `;
  console.log("\n10. Active subscriptions by interval:");
  for (const row of revenueByInterval as Array<{
    interval: string;
    count: number;
    totalMrrCents: bigint | null;
  }>) {
    const mrr = row.totalMrrCents ? Number(row.totalMrrCents) / 100 : 0;
    console.log(
      `   ${row.interval}: ${row.count} subs, $${mrr.toLocaleString()} total`,
    );
  }

  console.log("\n=== MIGRATION STATUS COMPLETE ===");
});

runWithDb(program).catch(console.error);
