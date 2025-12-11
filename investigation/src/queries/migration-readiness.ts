#!/usr/bin/env tsx
/**
 * Migration Readiness Assessment
 *
 * Comprehensive analysis to determine readiness for migrating
 * Stripe webhook handling from Rails to Next.js.
 *
 * Run: pnpm migration-readiness
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "../lib/db.js";
import * as Print from "../lib/print.js";

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  Print.header("MIGRATION READINESS ASSESSMENT");
  console.log(
    "Comprehensive analysis for Rails -> Next.js webhook migration\n",
  );

  // 1. Data Model Completeness
  Print.subheader("1. Modern Data Model Coverage");

  const modelCoverage = yield* sql`
    WITH legacy_active AS (
      SELECT COUNT(*) as count FROM subscriptions WHERE state = 'active'
    ),
    modern_active AS (
      SELECT COUNT(*) as count FROM account_subscriptions WHERE status IN ('active', 'trialing', 'past_due')
    ),
    accounts_total AS (
      SELECT COUNT(*) as count FROM accounts
    ),
    accounts_with_subs AS (
      SELECT COUNT(DISTINCT account_id) as count FROM account_subscriptions
    )
    SELECT 
      (SELECT count FROM legacy_active) as legacy_active,
      (SELECT count FROM modern_active) as modern_active,
      (SELECT count FROM accounts_total) as total_accounts,
      (SELECT count FROM accounts_with_subs) as accounts_with_subs
  `;

  const legacyActive = Number(modelCoverage[0]?.legacyActive ?? 0);
  const modernActive = Number(modelCoverage[0]?.modernActive ?? 0);
  const totalAccounts = Number(modelCoverage[0]?.totalAccounts ?? 0);
  const accountsWithSubs = Number(modelCoverage[0]?.accountsWithSubs ?? 0);

  Print.summary({
    "Legacy active subscriptions": Print.formatNumber(legacyActive),
    "Modern active subscriptions": Print.formatNumber(modernActive),
    "Coverage ratio": Print.formatPercent(
      modernActive / Math.max(legacyActive, 1),
    ),
    "Total accounts": Print.formatNumber(totalAccounts),
    "Accounts with subscriptions": Print.formatNumber(accountsWithSubs),
  });

  // 2. Webhook Processing Health
  Print.subheader("2. Webhook Processing Health (Last 7 Days)");

  const webhookHealth = yield* sql`
    SELECT 
      COUNT(*) as total_events,
      COUNT(*) FILTER (WHERE status = 2 AND error_identifier IS NULL) as successful,
      COUNT(*) FILTER (WHERE status = 1) as stuck_processing,
      COUNT(*) FILTER (WHERE error_identifier IS NOT NULL) as with_errors,
      COUNT(*) FILTER (WHERE status = 0) as unprocessed
    FROM stripe_events
    WHERE created_at > NOW() - INTERVAL '7 days'
  `;

  const totalEvents = Number(webhookHealth[0]?.totalEvents ?? 0);
  const successful = Number(webhookHealth[0]?.successful ?? 0);
  const stuckProcessing = Number(webhookHealth[0]?.stuckProcessing ?? 0);
  const withErrors = Number(webhookHealth[0]?.withErrors ?? 0);
  const unprocessed = Number(webhookHealth[0]?.unprocessed ?? 0);

  Print.summary({
    "Total events": Print.formatNumber(totalEvents),
    "Successfully processed": `${Print.formatNumber(successful)} (${Print.formatPercent(successful / Math.max(totalEvents, 1))})`,
    "Stuck in processing": Print.formatNumber(stuckProcessing),
    "With errors": Print.formatNumber(withErrors),
    Unprocessed: Print.formatNumber(unprocessed),
  });

  // 3. Critical Event Types
  Print.subheader("3. Subscription Event Volume (Last 30 Days)");

  const subEventVolume = yield* sql`
    SELECT 
      stripe_type,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE status = 2 AND error_identifier IS NULL) as success_count,
      ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))), 2) as avg_processing_seconds
    FROM stripe_events
    WHERE created_at > NOW() - INTERVAL '30 days'
      AND stripe_type LIKE '%subscription%'
    GROUP BY stripe_type
    ORDER BY count DESC
  `;
  Print.table(
    subEventVolume as Array<{
      stripeType: string;
      count: bigint;
      successCount: bigint;
      avgProcessingSeconds: number;
    }>,
  );

  // 4. User Role Distribution
  Print.subheader("4. Pro User Distribution");

  const proUsers = yield* sql`
    SELECT 
      COUNT(*) FILTER (WHERE 'pro' = ANY(roles)) as pro_users,
      COUNT(*) FILTER (WHERE 'account_owner' = ANY(roles)) as account_owners,
      COUNT(*) FILTER (WHERE 'account_member' = ANY(roles)) as account_members,
      COUNT(*) FILTER (WHERE 'instructor' = ANY(roles)) as instructors,
      COUNT(*) FILTER (WHERE 'lifetime_subscriber' = ANY(roles)) as lifetime_subscribers,
      COUNT(*) as total_users
    FROM users
  `;
  Print.summary({
    "Total users": Print.formatNumber(Number(proUsers[0]?.totalUsers ?? 0)),
    "Pro users": Print.formatNumber(Number(proUsers[0]?.proUsers ?? 0)),
    "Account owners": Print.formatNumber(
      Number(proUsers[0]?.accountOwners ?? 0),
    ),
    "Account members": Print.formatNumber(
      Number(proUsers[0]?.accountMembers ?? 0),
    ),
    Instructors: Print.formatNumber(Number(proUsers[0]?.instructors ?? 0)),
    "Lifetime subscribers": Print.formatNumber(
      Number(proUsers[0]?.lifetimeSubscribers ?? 0),
    ),
  });

  // 5. External Integration Dependencies
  Print.subheader("5. External Integration Activity");

  // Check for ConvertKit activity (via user fields or tags)
  const externalActivity = yield* sql`
    SELECT 
      COUNT(*) FILTER (WHERE contact_id IS NOT NULL) as users_with_convertkit,
      COUNT(*) FILTER (WHERE customer_io_id IS NOT NULL) as users_with_customerio
    FROM users
  `;
  Print.summary({
    "Users with ConvertKit ID": Print.formatNumber(
      Number(externalActivity[0]?.usersWithConvertkit ?? 0),
    ),
    "Users with Customer.io ID": Print.formatNumber(
      Number(externalActivity[0]?.usersWithCustomerio ?? 0),
    ),
  });

  // 6. Potential Migration Blockers
  Print.subheader("6. Potential Migration Blockers");

  // Check for recent errors
  const recentErrors = yield* sql`
    SELECT 
      stripe_type,
      COUNT(*) as error_count,
      MAX(created_at)::date as last_error
    FROM stripe_events
    WHERE error_identifier IS NOT NULL
      AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY stripe_type
    ORDER BY error_count DESC
    LIMIT 5
  `;

  if ((recentErrors as unknown[]).length > 0) {
    console.log("Recent webhook errors (potential issues to address):");
    Print.table(
      recentErrors as Array<{
        stripeType: string;
        errorCount: bigint;
        lastError: Date;
      }>,
    );
  } else {
    console.log("No recent webhook errors found.");
  }

  // Check for stuck events
  const stuckEvents = yield* sql`
    SELECT 
      stripe_type,
      COUNT(*) as stuck_count,
      MIN(created_at)::date as oldest
    FROM stripe_events
    WHERE status = 1
      AND created_at < NOW() - INTERVAL '1 hour'
    GROUP BY stripe_type
    ORDER BY stuck_count DESC
    LIMIT 5
  `;

  if ((stuckEvents as unknown[]).length > 0) {
    console.log("\nStuck events (processing > 1 hour):");
    Print.table(
      stuckEvents as Array<{
        stripeType: string;
        stuckCount: bigint;
        oldest: Date;
      }>,
    );
  } else {
    console.log("\nNo stuck events found.");
  }

  // 7. Migration Readiness Score
  Print.subheader("7. Migration Readiness Score");

  const scores: Record<string, { score: number; max: number; notes: string }> =
    {
      "Modern model coverage": {
        score:
          modernActive >= legacyActive * 0.9
            ? 25
            : modernActive >= legacyActive * 0.7
              ? 15
              : 5,
        max: 25,
        notes: `${Print.formatPercent(modernActive / Math.max(legacyActive, 1))} of legacy subs have modern equivalent`,
      },
      "Webhook health": {
        score:
          successful / Math.max(totalEvents, 1) > 0.99
            ? 25
            : successful / Math.max(totalEvents, 1) > 0.95
              ? 20
              : 10,
        max: 25,
        notes: `${Print.formatPercent(successful / Math.max(totalEvents, 1))} success rate`,
      },
      "No stuck events": {
        score: stuckProcessing === 0 ? 25 : stuckProcessing < 10 ? 15 : 5,
        max: 25,
        notes: `${stuckProcessing} events stuck in processing`,
      },
      "Error rate": {
        score:
          withErrors / Math.max(totalEvents, 1) < 0.01
            ? 25
            : withErrors / Math.max(totalEvents, 1) < 0.05
              ? 15
              : 5,
        max: 25,
        notes: `${Print.formatPercent(withErrors / Math.max(totalEvents, 1))} error rate`,
      },
    };

  let totalScore = 0;
  let maxScore = 0;
  for (const [category, data] of Object.entries(scores)) {
    totalScore += data.score;
    maxScore += data.max;
    console.log(`${category}: ${data.score}/${data.max} - ${data.notes}`);
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(
    `TOTAL SCORE: ${totalScore}/${maxScore} (${Print.formatPercent(totalScore / maxScore)})`,
  );
  console.log(`${"=".repeat(40)}`);

  if (totalScore >= 80) {
    console.log("\nRECOMMENDATION: Ready for migration");
  } else if (totalScore >= 60) {
    console.log("\nRECOMMENDATION: Address issues before migration");
  } else {
    console.log("\nRECOMMENDATION: Significant work needed before migration");
  }

  Print.header("ASSESSMENT COMPLETE");
});

runWithDb(program).catch(console.error);
