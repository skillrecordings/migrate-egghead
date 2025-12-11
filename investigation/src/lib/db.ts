/**
 * Database connection module using Effect SQL for PostgreSQL
 *
 * Provides a configured PgClient layer that reads from DATABASE_URL env var.
 * Used by investigation scripts to query the egghead-rails database.
 */
import { SqlClient } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Config, Effect } from "effect";
import { loadEnv } from "./env.js";

/**
 * Database configuration from environment
 */
const DatabaseConfig = Config.redacted("DATABASE_URL");

/**
 * PostgreSQL client layer configured from DATABASE_URL
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { SqlClient } from "@effect/sql"
 * import { DatabaseLive } from "./lib/db.js"
 *
 * const program = Effect.gen(function* () {
 *   const sql = yield* SqlClient.SqlClient
 *   const rows = yield* sql`SELECT * FROM users LIMIT 10`
 *   return rows
 * })
 *
 * Effect.runPromise(program.pipe(Effect.provide(DatabaseLive)))
 * ```
 */
export const DatabaseLive = PgClient.layerConfig(
  Config.map(DatabaseConfig, (url) => ({
    url,
    // Transform snake_case to camelCase for result rows
    transformResultNames: (name) =>
      name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
  })),
);

/**
 * Run an Effect program with database connection
 *
 * Handles env loading, provides database layer, and runs the effect.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { SqlClient } from "@effect/sql"
 * import { runWithDb } from "./lib/db.js"
 *
 * const program = Effect.gen(function* () {
 *   const sql = yield* SqlClient.SqlClient
 *   const rows = yield* sql`SELECT COUNT(*) FROM users`
 *   console.log(rows)
 * })
 *
 * runWithDb(program)
 * ```
 */
export const runWithDb = <A, E>(
  effect: Effect.Effect<A, E, SqlClient.SqlClient>,
): Promise<A> => {
  loadEnv();
  return Effect.runPromise(effect.pipe(Effect.provide(DatabaseLive)));
};

/**
 * Create a scoped database program runner
 *
 * For scripts that need to run multiple queries with proper cleanup.
 */
export const runWithDbScoped = <A, E>(
  effect: Effect.Effect<A, E, SqlClient.SqlClient>,
): Promise<A> => {
  loadEnv();
  return Effect.runPromise(
    Effect.scoped(effect.pipe(Effect.provide(DatabaseLive))),
  );
};
