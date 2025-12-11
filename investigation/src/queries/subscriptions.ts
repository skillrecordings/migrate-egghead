#!/usr/bin/env tsx
/**
 * Subscription Analysis for Migration Planning
 *
 * Analyzes the current state of subscriptions in egghead-rails to inform
 * the migration to egghead-next.
 *
 * Run: pnpm subscriptions
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "../lib/db.js";
import * as Print from "../lib/print.js";

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  Print.header("SUBSCRIPTION ANALYSIS");
  console.log(
    "Analyzing egghead-rails subscription data for migration planning\n",
  );

  // 1. Overall subscription counts
  Print.subheader("1. Overall Subscription Counts");

  const legacySubCounts = yield* sql`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE state = 'active') as active,
      COUNT(*) FILTER (WHERE state = 'cancelled') as cancelled,
      COUNT(*) FILTER (WHERE state = 'expired') as expired,
      COUNT(*) FILTER (WHERE is_managed = true) as managed_teams
    FROM subscriptions
  `;
  console.log("Legacy Subscriptions table:");
  Print.summary({
    "Total records": Print.formatNumber(Number(legacySubCounts[0]?.total ?? 0)),
    Active: Print.formatNumber(Number(legacySubCounts[0]?.active ?? 0)),
    Cancelled: Print.formatNumber(Number(legacySubCounts[0]?.cancelled ?? 0)),
    Expired: Print.formatNumber(Number(legacySubCounts[0]?.expired ?? 0)),
    "Managed (Teams)": Print.formatNumber(
      Number(legacySubCounts[0]?.managedTeams ?? 0),
    ),
  });

  const accountSubCounts = yield* sql`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'trialing') as trialing,
      COUNT(*) FILTER (WHERE status = 'canceled') as canceled,
      COUNT(*) FILTER (WHERE status = 'past_due') as past_due,
      COUNT(*) FILTER (WHERE quantity > 1) as teams
    FROM account_subscriptions
  `;
  console.log("\nModern AccountSubscriptions table:");
  Print.summary({
    "Total records": Print.formatNumber(
      Number(accountSubCounts[0]?.total ?? 0),
    ),
    Active: Print.formatNumber(Number(accountSubCounts[0]?.active ?? 0)),
    Trialing: Print.formatNumber(Number(accountSubCounts[0]?.trialing ?? 0)),
    Canceled: Print.formatNumber(Number(accountSubCounts[0]?.canceled ?? 0)),
    "Past Due": Print.formatNumber(Number(accountSubCounts[0]?.pastDue ?? 0)),
    "Teams (qty > 1)": Print.formatNumber(
      Number(accountSubCounts[0]?.teams ?? 0),
    ),
  });

  // 2. Dual model coverage
  Print.subheader("2. Dual Model Coverage");

  const dualModelStats = yield* sql`
    WITH legacy_customers AS (
      SELECT DISTINCT stripe_id FROM subscriptions WHERE stripe_id IS NOT NULL
    ),
    modern_customers AS (
      SELECT DISTINCT a.stripe_customer_id 
      FROM accounts a 
      JOIN account_subscriptions asub ON a.id = asub.account_id
      WHERE a.stripe_customer_id IS NOT NULL
    )
    SELECT
      (SELECT COUNT(*) FROM legacy_customers) as legacy_only_count,
      (SELECT COUNT(*) FROM modern_customers) as modern_only_count,
      (SELECT COUNT(*) FROM legacy_customers lc 
       JOIN modern_customers mc ON lc.stripe_id = mc.stripe_customer_id) as both_count
  `;
  Print.summary({
    "Legacy only (needs migration)": Print.formatNumber(
      Number(dualModelStats[0]?.legacyOnlyCount ?? 0),
    ),
    "Modern only": Print.formatNumber(
      Number(dualModelStats[0]?.modernOnlyCount ?? 0),
    ),
    "Both models (dual-write working)": Print.formatNumber(
      Number(dualModelStats[0]?.bothCount ?? 0),
    ),
  });

  // 3. Subscription status distribution
  Print.subheader("3. AccountSubscription Status Distribution");

  const statusDist = yield* sql`
    SELECT 
      status,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
    FROM account_subscriptions
    GROUP BY status
    ORDER BY count DESC
  `;
  Print.table(
    statusDist as Array<{ status: string; count: bigint; percentage: number }>,
  );

  // 4. Interval distribution (monthly vs yearly)
  Print.subheader("4. Subscription Interval Distribution");

  const intervalDist = yield* sql`
    SELECT 
      COALESCE(interval, 'unknown') as interval,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE status IN ('active', 'trialing', 'past_due')) as active_count
    FROM account_subscriptions
    GROUP BY interval
    ORDER BY count DESC
  `;
  Print.table(
    intervalDist as Array<{
      interval: string;
      count: bigint;
      activeCount: bigint;
    }>,
  );

  // 5. Team vs Individual breakdown
  Print.subheader("5. Team vs Individual Accounts");

  const teamBreakdown = yield* sql`
    SELECT 
      CASE 
        WHEN quantity = 1 THEN 'Individual'
        WHEN quantity = -1 THEN 'Unlimited'
        WHEN quantity > 1 THEN 'Team'
        ELSE 'Unknown'
      END as account_type,
      COUNT(*) as count,
      SUM(quantity) FILTER (WHERE quantity > 0) as total_seats
    FROM account_subscriptions
    WHERE status IN ('active', 'trialing', 'past_due')
    GROUP BY 
      CASE 
        WHEN quantity = 1 THEN 'Individual'
        WHEN quantity = -1 THEN 'Unlimited'
        WHEN quantity > 1 THEN 'Team'
        ELSE 'Unknown'
      END
    ORDER BY count DESC
  `;
  Print.table(
    teamBreakdown as Array<{
      accountType: string;
      count: bigint;
      totalSeats: bigint | null;
    }>,
  );

  // 6. Webhook event processing stats
  Print.subheader("6. Stripe Webhook Event Stats (Last 30 Days)");

  const webhookStats = yield* sql`
    SELECT 
      stripe_type,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 2) as processed,
      COUNT(*) FILTER (WHERE status = 1) as processing,
      COUNT(*) FILTER (WHERE error_identifier IS NOT NULL) as with_errors
    FROM stripe_events
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY stripe_type
    ORDER BY total DESC
    LIMIT 15
  `;
  Print.table(
    webhookStats as Array<{
      stripeType: string;
      total: bigint;
      processed: bigint;
      processing: bigint;
      withErrors: bigint;
    }>,
  );

  // 7. Recent cancellations
  Print.subheader("7. Cancellation Trends (Last 90 Days)");

  const cancellationTrends = yield* sql`
    SELECT 
      DATE_TRUNC('week', updated_at)::date as week,
      COUNT(*) as cancellations
    FROM account_subscriptions
    WHERE status = 'canceled'
      AND updated_at > NOW() - INTERVAL '90 days'
    GROUP BY DATE_TRUNC('week', updated_at)
    ORDER BY week DESC
    LIMIT 12
  `;
  Print.table(
    cancellationTrends as Array<{ week: Date; cancellations: bigint }>,
  );

  // 8. Orphaned records check
  Print.subheader("8. Data Integrity Checks");

  const orphanedAccounts = yield* sql`
    SELECT COUNT(*) as count
    FROM accounts a
    LEFT JOIN account_subscriptions asub ON a.id = asub.account_id
    WHERE asub.id IS NULL
  `;

  const orphanedSubs = yield* sql`
    SELECT COUNT(*) as count
    FROM account_subscriptions asub
    LEFT JOIN accounts a ON asub.account_id = a.id
    WHERE a.id IS NULL
  `;

  const usersWithoutAccounts = yield* sql`
    SELECT COUNT(*) as count
    FROM users u
    LEFT JOIN account_users au ON u.id = au.user_id
    WHERE au.id IS NULL
      AND u.id IN (SELECT user_id FROM subscriptions WHERE state = 'active')
  `;

  Print.summary({
    "Accounts without subscriptions": Print.formatNumber(
      Number(orphanedAccounts[0]?.count ?? 0),
    ),
    "Subscriptions without accounts": Print.formatNumber(
      Number(orphanedSubs[0]?.count ?? 0),
    ),
    "Active legacy subs without account_user": Print.formatNumber(
      Number(usersWithoutAccounts[0]?.count ?? 0),
    ),
  });

  Print.header("ANALYSIS COMPLETE");
});

runWithDb(program).catch(console.error);
