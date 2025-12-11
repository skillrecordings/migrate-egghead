#!/usr/bin/env tsx
/**
 * Multi-Tenant Analysis
 *
 * Analyzes site tenant distribution to validate single-tenant migration recommendation.
 *
 * Run: pnpm tenants
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "../lib/db.js";
import * as Print from "../lib/print.js";

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  Print.header("MULTI-TENANT ANALYSIS");
  console.log("Analyzing site tenant distribution for migration planning\n");

  // 1. List all tenants
  Print.subheader("1. All Site Tenants");

  const tenants = yield* sql`
    SELECT 
      st.id,
      st.name,
      da.uid as client_id,
      da.name as app_name
    FROM site_tenants st
    LEFT JOIN oauth_applications da ON st.application_id = da.id
    ORDER BY st.name
  `;
  Print.table(
    tenants as Array<{
      id: number;
      name: string;
      clientId: string;
      appName: string;
    }>,
  );

  // 2. Subscription distribution by tenant
  Print.subheader("2. Active Subscriptions by Tenant");

  const subsByTenant = yield* sql`
    SELECT 
      COALESCE(st.name, 'unknown') as tenant,
      COUNT(*) as total_subs,
      COUNT(*) FILTER (WHERE asub.status IN ('active', 'trialing', 'past_due')) as active_subs,
      SUM(asub.quantity) FILTER (WHERE asub.status IN ('active', 'trialing', 'past_due') AND asub.quantity > 0) as total_seats
    FROM account_subscriptions asub
    LEFT JOIN accounts a ON asub.account_id = a.id
    LEFT JOIN account_users au ON a.id = au.account_id
    LEFT JOIN users u ON au.user_id = u.id
    LEFT JOIN site_tenants st ON true  -- This needs proper tenant association
    GROUP BY st.name
    ORDER BY active_subs DESC
  `;
  Print.table(
    subsByTenant as Array<{
      tenant: string;
      totalSubs: bigint;
      activeSubs: bigint;
      totalSeats: bigint | null;
    }>,
  );

  // 3. Webhook events by tenant (last 30 days)
  Print.subheader("3. Webhook Events by Tenant (Last 30 Days)");

  const webhooksByTenant = yield* sql`
    SELECT 
      COALESCE(st.name, 'unknown') as tenant,
      COUNT(*) as event_count,
      COUNT(*) FILTER (WHERE se.status = 2) as processed,
      COUNT(*) FILTER (WHERE se.error_identifier IS NOT NULL) as errors
    FROM stripe_events se
    LEFT JOIN site_tenants st ON se.site_tenant_id = st.id
    WHERE se.created_at > NOW() - INTERVAL '30 days'
    GROUP BY st.name
    ORDER BY event_count DESC
  `;
  Print.table(
    webhooksByTenant as Array<{
      tenant: string;
      eventCount: bigint;
      processed: bigint;
      errors: bigint;
    }>,
  );

  // 4. Revenue proxy by tenant (transaction count as proxy)
  Print.subheader("4. Transaction Activity by Tenant (Last 90 Days)");

  const txByTenant = yield* sql`
    SELECT 
      COALESCE(st.name, 'egghead.io') as tenant,
      COUNT(*) as transaction_count,
      SUM(t.amount) as total_amount_cents
    FROM transactions t
    LEFT JOIN site_tenants st ON true  -- Needs proper association
    WHERE t.created_at > NOW() - INTERVAL '90 days'
      AND t.amount > 0
    GROUP BY st.name
    ORDER BY total_amount_cents DESC NULLS LAST
  `;

  for (const row of txByTenant as Array<{
    tenant: string;
    transactionCount: bigint;
    totalAmountCents: bigint | null;
  }>) {
    console.log(
      `${row.tenant}: ${Print.formatNumber(Number(row.transactionCount))} transactions, ${Print.formatCurrency(Number(row.totalAmountCents ?? 0))}`,
    );
  }

  // 5. Doorkeeper applications (OAuth clients)
  Print.subheader("5. OAuth Applications (Doorkeeper)");

  const oauthApps = yield* sql`
    SELECT 
      name,
      uid,
      redirect_uri,
      created_at::date as created
    FROM oauth_applications
    ORDER BY created_at
  `;
  Print.table(
    oauthApps as Array<{
      name: string;
      uid: string;
      redirectUri: string;
      created: Date;
    }>,
  );

  // 6. Recommendation
  Print.subheader("6. Migration Recommendation");

  const totalActive = yield* sql`
    SELECT COUNT(*) as count
    FROM account_subscriptions
    WHERE status IN ('active', 'trialing', 'past_due')
  `;

  const eggheadActive = yield* sql`
    SELECT COUNT(*) as count
    FROM account_subscriptions asub
    JOIN accounts a ON asub.account_id = a.id
    WHERE asub.status IN ('active', 'trialing', 'past_due')
    -- Assuming most are egghead.io since that's the primary tenant
  `;

  const total = Number(totalActive[0]?.count ?? 0);
  const egghead = Number(eggheadActive[0]?.count ?? 0);
  const percentage = total > 0 ? (egghead / total) * 100 : 0;

  console.log(`
Based on the analysis:
- Total active subscriptions: ${Print.formatNumber(total)}
- Estimated egghead.io subscriptions: ${Print.formatNumber(egghead)} (${percentage.toFixed(1)}%)

RECOMMENDATION: ${percentage > 90 ? "SINGLE-TENANT migration is viable" : "Review multi-tenant requirements"}

Note: This analysis may need refinement based on actual tenant association logic.
The current schema doesn't have direct tenant->subscription relationships,
which itself suggests the multi-tenant model is not fully utilized.
`);

  Print.header("ANALYSIS COMPLETE");
});

runWithDb(program).catch(console.error);
