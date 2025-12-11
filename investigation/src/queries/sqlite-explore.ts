/**
 * Explore the download-egghead SQLite databases
 *
 * Shows schema, row counts, and sample data from egghead_videos.db
 */
import {
  openVideosDb,
  getTables,
  getTableSchema,
  getRowCount,
  sampleRows,
} from "../lib/sqlite";
import { header, table, subheader } from "../lib/print";

const main = () => {
  header("EGGHEAD VIDEOS DATABASE EXPLORATION");

  const db = openVideosDb();

  // Get all tables
  const tables = getTables(db);
  console.log(`Found ${tables.length} tables:\n`);

  for (const { name } of tables) {
    subheader(`Table: ${name}`);

    // Schema
    const schema = getTableSchema(db, name);
    console.log("\nSchema:");
    table(
      schema.map((col) => ({
        column: col.name,
        type: col.type,
        nullable: col.notnull ? "NO" : "YES",
        pk: col.pk ? "YES" : "",
      })),
    );

    // Row count
    const count = getRowCount(db, name);
    console.log(`\nRow count: ${count.toLocaleString()}`);

    // Sample data
    if (count > 0) {
      console.log("\nSample rows:");
      const samples = sampleRows(db, name, 3);
      table(samples as Record<string, unknown>[]);
    }

    console.log("");
  }

  // Check for Mux migration status
  subheader("MUX MIGRATION STATUS");

  // Check if there's a mux_asset_id or similar column
  const videosSchema = getTableSchema(db, "videos").map((c) => c.name);
  console.log("Videos table columns:", videosSchema.join(", "));

  // Try to find Mux-related data
  if (
    videosSchema.includes("mux_asset_id") ||
    videosSchema.includes("mux_playback_id")
  ) {
    const muxStats = db
      .prepare(
        `SELECT 
          COUNT(*) as total,
          COUNT(mux_asset_id) as with_mux_asset,
          COUNT(mux_playback_id) as with_mux_playback
        FROM videos`,
      )
      .get() as {
      total: number;
      with_mux_asset: number;
      with_mux_playback: number;
    };

    console.log("\nMux migration stats:");
    console.log(`  Total videos: ${muxStats.total}`);
    console.log(`  With Mux asset ID: ${muxStats.with_mux_asset}`);
    console.log(`  With Mux playback ID: ${muxStats.with_mux_playback}`);
    console.log(
      `  Migration progress: ${((muxStats.with_mux_playback / muxStats.total) * 100).toFixed(1)}%`,
    );
  }

  db.close();
};

main();
