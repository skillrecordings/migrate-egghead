import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { runWithDb } from "../lib/db.js";

const query = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
    SELECT id, slug, state, published_at, created_at 
    FROM lessons 
    WHERE id IN (10628, 10641, 10642, 10651, 10652, 10653, 10654, 10655, 10656, 10657, 10658, 10659, 10660, 10681, 10682)
    ORDER BY id
  `;

  console.log("\n=== Rails Lesson States ===");
  for (const row of result) {
    console.log(`${row.id}: ${row.slug}`);
    console.log(
      `  state=${row.state}, published=${row.publishedAt ? "yes" : "no"}`,
    );
  }
});

runWithDb(query).catch(console.error);
