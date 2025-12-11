#!/usr/bin/env tsx
/**
 * Gift Subscription Analysis for Migration Planning
 *
 * Analyzes gift subscription data in egghead-rails to understand:
 * - Total gifts created
 * - Active/unclaimed gifts
 * - Claimed but active gifts
 * - Expired gifts
 * - Duration distribution
 * - Recent purchases
 *
 * Run: pnpm tsx src/queries/gifts.ts
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "../lib/db.js";
import * as Print from "../lib/print.js";

const DEFAULT_DURATION_MONTHS = 12;

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  Print.header("GIFT SUBSCRIPTION ANALYSIS");
  console.log("Analyzing egghead-rails gift data for migration planning\n");

  // 1. Total gifts ever created
  Print.subheader("1. Overall Gift Counts");

  const totalGifts = yield* sql`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE claimed_at IS NOT NULL) as claimed,
      COUNT(*) FILTER (WHERE claimed_at IS NULL) as unclaimed,
      COUNT(*) FILTER (WHERE lock_to_email = true) as locked_to_email,
      MIN(created_at) as earliest_gift,
      MAX(created_at) as latest_gift
    FROM gifts
  `;
  Print.summary({
    "Total gifts ever created": Print.formatNumber(
      Number(totalGifts[0]?.total ?? 0),
    ),
    Claimed: Print.formatNumber(Number(totalGifts[0]?.claimed ?? 0)),
    Unclaimed: Print.formatNumber(Number(totalGifts[0]?.unclaimed ?? 0)),
    "Locked to email": Print.formatNumber(
      Number(totalGifts[0]?.lockedToEmail ?? 0),
    ),
    "Earliest gift": String(totalGifts[0]?.earliestGift ?? "N/A"),
    "Latest gift": String(totalGifts[0]?.latestGift ?? "N/A"),
  });

  // 2. Active/unclaimed gifts (claimed_at IS NULL AND expires_at > NOW())
  Print.subheader("2. Active Unclaimed Gifts");

  const activeUnclaimed = yield* sql`
    SELECT 
      COUNT(*) as count,
      SUM(price) / 100.0 as total_value_dollars
    FROM gifts
    WHERE claimed_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
  `;
  Print.summary({
    "Active unclaimed gifts": Print.formatNumber(
      Number(activeUnclaimed[0]?.count ?? 0),
    ),
    "Total unredeemed value": `$${Number(activeUnclaimed[0]?.totalValueDollars ?? 0).toFixed(2)}`,
  });

  // List active unclaimed gifts
  const unclaimedList = yield* sql`
    SELECT 
      guid,
      email,
      COALESCE(duration_months, ${DEFAULT_DURATION_MONTHS}) as duration,
      created_at,
      expires_at,
      price / 100.0 as price_dollars,
      lock_to_email
    FROM gifts
    WHERE claimed_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
    LIMIT 20
  `;
  if (unclaimedList.length > 0) {
    console.log("\nRecent unclaimed gifts (up to 20):");
    Print.table(
      unclaimedList as Array<{
        guid: string;
        email: string | null;
        duration: number;
        createdAt: Date;
        expiresAt: Date | null;
        priceDollars: number;
        lockToEmail: boolean;
      }>,
    );
  }

  // 3. Claimed but still active gifts
  Print.subheader("3. Claimed & Active Gifts");

  const claimedActive = yield* sql`
    SELECT 
      COUNT(*) as count
    FROM gifts g
    WHERE g.claimed_at IS NOT NULL
      AND g.claimed_at >= NOW() - (COALESCE(g.duration_months, ${DEFAULT_DURATION_MONTHS}) || ' months')::interval
  `;
  Print.summary({
    "Claimed & still active": Print.formatNumber(
      Number(claimedActive[0]?.count ?? 0),
    ),
  });

  // Show when claimed active gifts will expire
  const claimedActiveExpiry = yield* sql`
    SELECT 
      DATE_TRUNC('month', g.claimed_at + (COALESCE(g.duration_months, ${DEFAULT_DURATION_MONTHS}) || ' months')::interval)::date as expires_month,
      COUNT(*) as count
    FROM gifts g
    WHERE g.claimed_at IS NOT NULL
      AND g.claimed_at >= NOW() - (COALESCE(g.duration_months, ${DEFAULT_DURATION_MONTHS}) || ' months')::interval
    GROUP BY DATE_TRUNC('month', g.claimed_at + (COALESCE(g.duration_months, ${DEFAULT_DURATION_MONTHS}) || ' months')::interval)
    ORDER BY expires_month
  `;
  if (claimedActiveExpiry.length > 0) {
    console.log("\nExpiration schedule for claimed active gifts:");
    Print.table(
      claimedActiveExpiry as Array<{ expiresMonth: Date; count: bigint }>,
    );
  }

  // 4. Expired gifts
  Print.subheader("4. Expired Gifts");

  const expiredGifts = yield* sql`
    SELECT 
      COUNT(*) FILTER (WHERE claimed_at IS NULL AND expires_at IS NOT NULL AND expires_at <= NOW()) as expired_unclaimed,
      COUNT(*) FILTER (
        WHERE claimed_at IS NOT NULL 
        AND claimed_at < NOW() - (COALESCE(duration_months, ${DEFAULT_DURATION_MONTHS}) || ' months')::interval
      ) as expired_claimed
    FROM gifts
  `;
  Print.summary({
    "Expired (never claimed)": Print.formatNumber(
      Number(expiredGifts[0]?.expiredUnclaimed ?? 0),
    ),
    "Expired (was claimed, now ended)": Print.formatNumber(
      Number(expiredGifts[0]?.expiredClaimed ?? 0),
    ),
  });

  // 5. Gift duration distribution
  Print.subheader("5. Gift Duration Distribution");

  const durationDist = yield* sql`
    SELECT 
      COALESCE(duration_months, ${DEFAULT_DURATION_MONTHS}) as duration_months,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE claimed_at IS NOT NULL) as claimed_count,
      ROUND(AVG(price) / 100.0, 2) as avg_price_dollars
    FROM gifts
    GROUP BY COALESCE(duration_months, ${DEFAULT_DURATION_MONTHS})
    ORDER BY duration_months
  `;
  Print.table(
    durationDist as Array<{
      durationMonths: number;
      count: bigint;
      claimedCount: bigint;
      avgPriceDollars: number;
    }>,
  );

  // 6. Recent gift purchases (last 90 days)
  Print.subheader("6. Recent Gift Purchases (Last 90 Days)");

  const recentGifts = yield* sql`
    SELECT 
      DATE_TRUNC('week', created_at)::date as week,
      COUNT(*) as purchases,
      COUNT(*) FILTER (WHERE claimed_at IS NOT NULL) as claimed,
      SUM(price) / 100.0 as revenue_dollars
    FROM gifts
    WHERE created_at > NOW() - INTERVAL '90 days'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week DESC
  `;
  if (recentGifts.length > 0) {
    Print.table(
      recentGifts as Array<{
        week: Date;
        purchases: bigint;
        claimed: bigint;
        revenueDollars: number;
      }>,
    );
  } else {
    console.log("No gifts purchased in the last 90 days.");
  }

  // 7. Gift types distribution
  Print.subheader("7. Gift Types");

  const giftTypes = yield* sql`
    SELECT 
      COALESCE(gift_type, 'standard') as gift_type,
      COUNT(*) as count,
      SUM(price) / 100.0 as total_revenue_dollars
    FROM gifts
    GROUP BY COALESCE(gift_type, 'standard')
    ORDER BY count DESC
  `;
  Print.table(
    giftTypes as Array<{
      giftType: string;
      count: bigint;
      totalRevenueDollars: number;
    }>,
  );

  // 8. Gifts by state
  Print.subheader("8. Gift States");

  const giftStates = yield* sql`
    SELECT 
      COALESCE(state, 'unknown') as state,
      COUNT(*) as count
    FROM gifts
    GROUP BY COALESCE(state, 'unknown')
    ORDER BY count DESC
  `;
  Print.table(giftStates as Array<{ state: string; count: bigint }>);

  // 9. Data integrity checks
  Print.subheader("9. Data Integrity Checks");

  const integrityChecks = yield* sql`
    SELECT 
      COUNT(*) FILTER (WHERE user_id IS NULL) as missing_user,
      COUNT(*) FILTER (WHERE account_subscription_id IS NULL AND subscription_id IS NULL) as no_subscription_link,
      COUNT(*) FILTER (WHERE stripe_id IS NULL) as missing_stripe_id,
      COUNT(*) FILTER (WHERE email IS NULL) as missing_email,
      COUNT(*) FILTER (WHERE account_subscription_id IS NOT NULL) as has_account_subscription,
      COUNT(*) FILTER (WHERE subscription_id IS NOT NULL) as has_legacy_subscription
    FROM gifts
  `;
  Print.summary({
    "Missing user_id": Print.formatNumber(
      Number(integrityChecks[0]?.missingUser ?? 0),
    ),
    "No subscription link": Print.formatNumber(
      Number(integrityChecks[0]?.noSubscriptionLink ?? 0),
    ),
    "Missing stripe_id": Print.formatNumber(
      Number(integrityChecks[0]?.missingStripeId ?? 0),
    ),
    "Missing email": Print.formatNumber(
      Number(integrityChecks[0]?.missingEmail ?? 0),
    ),
    "Has account_subscription link": Print.formatNumber(
      Number(integrityChecks[0]?.hasAccountSubscription ?? 0),
    ),
    "Has legacy subscription link": Print.formatNumber(
      Number(integrityChecks[0]?.hasLegacySubscription ?? 0),
    ),
  });

  // 10. Migration relevance summary
  Print.subheader("10. Migration Relevance Summary");

  const migrationSummary = yield* sql`
    SELECT 
      COUNT(*) FILTER (
        WHERE claimed_at IS NULL 
        AND (expires_at IS NULL OR expires_at > NOW())
      ) as needs_migration_unclaimed,
      COUNT(*) FILTER (
        WHERE claimed_at IS NOT NULL 
        AND claimed_at >= NOW() - (COALESCE(duration_months, ${DEFAULT_DURATION_MONTHS}) || ' months')::interval
      ) as needs_migration_active,
      COUNT(*) FILTER (
        WHERE (claimed_at IS NULL AND expires_at IS NOT NULL AND expires_at <= NOW())
        OR (claimed_at IS NOT NULL AND claimed_at < NOW() - (COALESCE(duration_months, ${DEFAULT_DURATION_MONTHS}) || ' months')::interval)
      ) as historical_only
    FROM gifts
  `;
  const needsUnclaimed = Number(
    migrationSummary[0]?.needsMigrationUnclaimed ?? 0,
  );
  const needsActive = Number(migrationSummary[0]?.needsMigrationActive ?? 0);
  const historical = Number(migrationSummary[0]?.historicalOnly ?? 0);

  Print.summary({
    "Active unclaimed (MUST migrate)": Print.formatNumber(needsUnclaimed),
    "Claimed & active (MUST migrate)": Print.formatNumber(needsActive),
    "Historical only (optional)": Print.formatNumber(historical),
    "TOTAL requiring migration": Print.formatNumber(
      needsUnclaimed + needsActive,
    ),
  });

  Print.header("ANALYSIS COMPLETE");
});

runWithDb(program).catch(console.error);
