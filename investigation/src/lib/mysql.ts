/**
 * MySQL/PlanetScale connection module using Effect SQL
 *
 * Provides a configured MysqlClient layer that reads from NEW_DATABASE_URL env var.
 * Used for the target Next.js database (PlanetScale).
 */
import { SqlClient } from "@effect/sql";
import { MysqlClient } from "@effect/sql-mysql2";
import { Config, Effect } from "effect";
import { loadEnv } from "./env.js";

/**
 * MySQL configuration from environment
 */
const MysqlConfig = Config.redacted("NEW_DATABASE_URL");

/**
 * MySQL client layer configured from NEW_DATABASE_URL
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { SqlClient } from "@effect/sql"
 * import { MysqlLive } from "./lib/mysql.js"
 *
 * const program = Effect.gen(function* () {
 *   const sql = yield* SqlClient.SqlClient
 *   const rows = yield* sql`SELECT * FROM users LIMIT 10`
 *   return rows
 * })
 *
 * Effect.runPromise(program.pipe(Effect.provide(MysqlLive)))
 * ```
 */
export const MysqlLive = MysqlClient.layerConfig(
  Config.map(MysqlConfig, (url) => ({
    url,
    // Transform snake_case to camelCase for result rows
    transformResultNames: (name) =>
      name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
  })),
);

/**
 * Run an Effect program with MySQL connection
 *
 * Handles env loading, provides MySQL layer, and runs the effect.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { SqlClient } from "@effect/sql"
 * import { runWithMysql } from "./lib/mysql.js"
 *
 * const program = Effect.gen(function* () {
 *   const sql = yield* SqlClient.SqlClient
 *   const rows = yield* sql`SELECT 1 as ping`
 *   console.log(rows)
 * })
 *
 * runWithMysql(program)
 * ```
 */
export const runWithMysql = <A, E>(
  effect: Effect.Effect<A, E, SqlClient.SqlClient>,
): Promise<A> => {
  loadEnv();
  return Effect.runPromise(effect.pipe(Effect.provide(MysqlLive)));
};

/**
 * Create a scoped MySQL program runner
 *
 * For scripts that need to run multiple queries with proper cleanup.
 */
export const runWithMysqlScoped = <A, E>(
  effect: Effect.Effect<A, E, SqlClient.SqlClient>,
): Promise<A> => {
  loadEnv();
  return Effect.runPromise(
    Effect.scoped(effect.pipe(Effect.provide(MysqlLive))),
  );
};
