#!/usr/bin/env bun
/**
 * Create ID mapping tables for migration
 *
 * These tables track the relationship between Rails IDs and Coursebuilder IDs,
 * enabling legacy URL redirects and data reconciliation.
 *
 * Usage:
 *   bun scripts/create-mapping-tables.ts              # Docker (default)
 *   bun scripts/create-mapping-tables.ts --prod       # Production (PlanetScale)
 *   bun scripts/create-mapping-tables.ts --dry-run    # Show SQL without executing
 *
 * Tables created:
 *   _migration_tag_map        - Rails tag.id → CB ContentResource.id
 *   _migration_course_map     - Rails playlist.id → CB ContentResource.id
 *   _migration_lesson_map     - Rails lesson.id → CB ContentResource.id
 *   _migration_instructor_map - Rails user.id (instructor) → CB User.id
 */

import mysql from "mysql2/promise";

// Parse CLI args
const args = process.argv.slice(2);
const isProd = args.includes("--prod");
const isDryRun = args.includes("--dry-run");

// Connection config
const DOCKER_CONFIG = {
  host: "localhost",
  port: 3307,
  user: "root",
  password: "root",
  database: "coursebuilder_test",
};

function getProdConfig() {
  const url = process.env.NEW_DATABASE_URL;
  if (!url) {
    throw new Error("NEW_DATABASE_URL not set for production mode");
  }
  // Parse mysql:// URL
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "3306"),
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1), // Remove leading /
    ssl: { rejectUnauthorized: true },
  };
}

// SQL statements for creating mapping tables
const CREATE_TABLES_SQL = `
-- Tag mapping: Rails tags → CB ContentResource (type='tag')
CREATE TABLE IF NOT EXISTS _migration_tag_map (
  rails_id INT PRIMARY KEY COMMENT 'Rails tags.id',
  cb_id VARCHAR(255) NOT NULL COMMENT 'CB ContentResource.id (cuid)',
  rails_name VARCHAR(255) COMMENT 'Rails tags.name for debugging',
  rails_slug VARCHAR(255) COMMENT 'Rails tags.slug for URL redirects',
  migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cb_id (cb_id),
  INDEX idx_slug (rails_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Course mapping: Rails playlists → CB ContentResource (type='course')
CREATE TABLE IF NOT EXISTS _migration_course_map (
  rails_id INT PRIMARY KEY COMMENT 'Rails playlists.id',
  cb_id VARCHAR(255) NOT NULL COMMENT 'CB ContentResource.id (cuid)',
  rails_slug VARCHAR(255) COMMENT 'Rails playlists.slug for URL redirects',
  rails_title VARCHAR(500) COMMENT 'Rails playlists.title for debugging',
  sanity_id VARCHAR(255) COMMENT 'Sanity document ID if modern course',
  migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cb_id (cb_id),
  INDEX idx_slug (rails_slug),
  INDEX idx_sanity (sanity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lesson mapping: Rails lessons → CB ContentResource (type='lesson')
CREATE TABLE IF NOT EXISTS _migration_lesson_map (
  rails_id INT PRIMARY KEY COMMENT 'Rails lessons.id',
  cb_id VARCHAR(255) NOT NULL COMMENT 'CB ContentResource.id (cuid)',
  video_resource_id VARCHAR(255) COMMENT 'CB videoResource.id for Mux playback',
  rails_slug VARCHAR(255) COMMENT 'Rails lessons.slug for URL redirects',
  rails_title VARCHAR(500) COMMENT 'Rails lessons.title for debugging',
  mux_playback_id VARCHAR(255) COMMENT 'Mux playback ID for video',
  migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cb_id (cb_id),
  INDEX idx_video (video_resource_id),
  INDEX idx_slug (rails_slug),
  INDEX idx_mux (mux_playback_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Instructor mapping: Rails users (instructors) → CB User
CREATE TABLE IF NOT EXISTS _migration_instructor_map (
  rails_id INT PRIMARY KEY COMMENT 'Rails users.id',
  cb_id VARCHAR(255) NOT NULL COMMENT 'CB User.id (cuid)',
  rails_slug VARCHAR(255) COMMENT 'Rails instructor slug for URL redirects',
  rails_email VARCHAR(255) COMMENT 'Rails users.email for matching',
  migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cb_id (cb_id),
  INDEX idx_slug (rails_slug),
  INDEX idx_email (rails_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function main() {
  const target = isProd
    ? "PRODUCTION (PlanetScale)"
    : "DOCKER (localhost:3307)";
  console.log(`\n🗄️  Creating migration mapping tables`);
  console.log(`   Target: ${target}`);
  console.log(`   Dry run: ${isDryRun}\n`);

  if (isDryRun) {
    console.log("SQL to execute:\n");
    console.log(CREATE_TABLES_SQL);
    console.log("\n✅ Dry run complete - no changes made");
    return;
  }

  // Connect
  const config = isProd ? getProdConfig() : DOCKER_CONFIG;
  console.log(
    `Connecting to ${config.host}:${config.port}/${config.database}...`,
  );

  const connection = await mysql.createConnection(config);
  console.log("Connected!\n");

  // Execute each statement separately (mysql2 doesn't support multi-statement by default)
  // Remove SQL comments first, then split by semicolon
  const sqlWithoutComments = CREATE_TABLES_SQL.split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = sqlWithoutComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    // Extract table name for logging
    const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\S+)/);
    const tableName = match ? match[1] : "unknown";

    try {
      await connection.query(stmt);
      console.log(`✅ Created table: ${tableName}`);
    } catch (err) {
      console.error(`❌ Failed to create ${tableName}:`, err);
      throw err;
    }
  }

  // Verify tables exist
  console.log("\nVerifying tables...");
  const [tables] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE '_migration_%'`,
    [config.database],
  );

  console.log(`\n📊 Migration tables in ${config.database}:`);
  for (const row of tables) {
    const [[countRow]] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM ${row.TABLE_NAME}`,
    );
    console.log(`   ${row.TABLE_NAME}: ${countRow.count} rows`);
  }

  await connection.end();
  console.log("\n✅ Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
