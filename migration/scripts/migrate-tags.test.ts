/**
 * Integration test for tag migration
 *
 * Tests against Docker containers (PostgreSQL + MySQL)
 *
 * Prerequisites:
 *   bun run docker:reset
 *
 * Then run:
 *   bun test scripts/migrate-tags.test.ts
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import mysql from "mysql2/promise";
import postgres from "postgres";

describe("Tag Migration (Integration)", () => {
  let railsDb: ReturnType<typeof postgres>;
  let mysqlDb: mysql.Connection;

  beforeAll(async () => {
    // Connect to Docker containers
    railsDb = postgres(
      "postgresql://postgres:postgres@localhost:5433/egghead_test",
    );
    mysqlDb = await mysql.createConnection(
      "mysql://root:root@localhost:3307/coursebuilder_test",
    );
  });

  afterAll(async () => {
    await railsDb.end();
    await mysqlDb.end();
  });

  test("Docker containers are healthy and seeded", async () => {
    // Check Rails has tags
    const railsTags = await railsDb`SELECT COUNT(*) as count FROM tags`;
    expect(Number(railsTags[0]?.count)).toBeGreaterThan(0);

    // Check MySQL is accessible
    const [tables] = await mysqlDb.execute("SHOW TABLES");
    expect(Array.isArray(tables)).toBe(true);
  });

  test("Tag table can be created and queried", async () => {
    // Create Tag table
    await mysqlDb.execute(`
      CREATE TABLE IF NOT EXISTS Tag (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(255) NOT NULL,
        organizationId VARCHAR(191),
        fields JSON,
        createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
        deletedAt TIMESTAMP(3),
        INDEX type_idx (type),
        INDEX organizationId_idx (organizationId)
      )
    `);

    // Insert a test tag
    await mysqlDb.execute(
      `INSERT INTO Tag (id, type, fields)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE type = type`,
      [
        "test_tag_1",
        "topic",
        JSON.stringify({
          name: "Test Tag",
          slug: "test-tag",
          legacyId: 999,
        }),
      ],
    );

    // Query back
    const [rows] = await mysqlDb.execute(
      "SELECT id, type, fields FROM Tag WHERE id = ?",
      ["test_tag_1"],
    );

    const tags = Array.isArray(rows) ? rows : [];
    expect(tags.length).toBe(1);

    const tag = tags[0] as { id: string; type: string; fields: any };
    expect(tag.id).toBe("test_tag_1");
    expect(tag.type).toBe("topic");

    const fields = tag.fields;
    expect(fields.name).toBe("Test Tag");
    expect(fields.legacyId).toBe(999);

    // Clean up
    await mysqlDb.execute("DELETE FROM Tag WHERE id = ?", ["test_tag_1"]);
  });

  test("Migration map table can be created and used", async () => {
    // Table already exists from init.sql with rails_id column
    // Insert a mapping
    await mysqlDb.execute(
      `INSERT INTO egghead_migration_tag_map (rails_id, cb_id, rails_slug)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE cb_id = VALUES(cb_id)`,
      [999, "test_tag_1", "test-slug"],
    );

    // Query back
    const [rows] = await mysqlDb.execute(
      "SELECT rails_id, cb_id, rails_slug FROM egghead_migration_tag_map WHERE rails_id = ?",
      [999],
    );

    const mappings = Array.isArray(rows) ? rows : [];
    expect(mappings.length).toBe(1);

    const mapping = mappings[0] as {
      rails_id: number;
      cb_id: string;
      rails_slug: string;
    };
    expect(mapping.rails_id).toBe(999);
    expect(mapping.cb_id).toBe("test_tag_1");
    expect(mapping.rails_slug).toBe("test-slug");

    // Clean up
    await mysqlDb.execute(
      "DELETE FROM egghead_migration_tag_map WHERE rails_id = ?",
      [999],
    );
  });

  test("JSON_EXTRACT works for finding tags by legacy ID", async () => {
    // Create Tag table
    await mysqlDb.execute(`
      CREATE TABLE IF NOT EXISTS Tag (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(255) NOT NULL,
        fields JSON,
        createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3)
      )
    `);

    // Insert test tags
    await mysqlDb.execute(
      `INSERT INTO Tag (id, type, fields)
      VALUES (?, ?, ?), (?, ?, ?)
      ON DUPLICATE KEY UPDATE type = type`,
      [
        "tag_1",
        "topic",
        JSON.stringify({ name: "Tag 1", legacyId: 42 }),
        "tag_2",
        "topic",
        JSON.stringify({ name: "Tag 2", legacyId: 99 }),
      ],
    );

    // Query by legacy ID using JSON_EXTRACT
    const [rows] = await mysqlDb.execute(
      "SELECT id, fields FROM Tag WHERE JSON_EXTRACT(fields, '$.legacyId') = ?",
      [42],
    );

    const found = Array.isArray(rows) ? rows : [];
    expect(found.length).toBe(1);

    const tag = found[0] as { id: string; fields: any };
    expect(tag.id).toBe("tag_1");

    const fields = tag.fields;
    expect(fields.legacyId).toBe(42);

    // Clean up
    await mysqlDb.execute("DELETE FROM Tag WHERE id IN (?, ?)", [
      "tag_1",
      "tag_2",
    ]);
  });

  test("Idempotent upsert works correctly", async () => {
    // Create Tag table
    await mysqlDb.execute(`
      CREATE TABLE IF NOT EXISTS Tag (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(255) NOT NULL,
        fields JSON,
        updatedAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3)
      )
    `);

    const tagId = "idempotent_test";
    const legacyId = 777;

    // Clean up any existing test data
    await mysqlDb.execute("DELETE FROM Tag WHERE id = ?", [tagId]);
    // First insert
    await mysqlDb.execute(
      "INSERT INTO Tag (id, type, fields) VALUES (?, ?, ?)",
      [tagId, "topic", JSON.stringify({ name: "Original", legacyId })],
    );

    // Check exists by legacy ID
    const [existingRows] = await mysqlDb.execute(
      "SELECT id FROM Tag WHERE JSON_EXTRACT(fields, '$.legacyId') = ?",
      [legacyId],
    );
    const existing = Array.isArray(existingRows) ? existingRows : [];
    expect(existing.length).toBe(1);

    // Second insert (should update)
    if (existing.length > 0) {
      const existingTag = existing[0] as { id: string };
      await mysqlDb.execute(
        "UPDATE Tag SET fields = ?, updatedAt = NOW(3) WHERE id = ?",
        [JSON.stringify({ name: "Updated", legacyId }), existingTag.id],
      );
    }

    // Verify updated
    const [updatedRows] = await mysqlDb.execute(
      "SELECT id, fields FROM Tag WHERE id = ?",
      [tagId],
    );
    const updated = Array.isArray(updatedRows) ? updatedRows : [];
    expect(updated.length).toBe(1);

    const tag = updated[0] as { id: string; fields: any };
    const fields = tag.fields;
    expect(fields.name).toBe("Updated");
    expect(fields.legacyId).toBe(legacyId);

    // Clean up
    await mysqlDb.execute("DELETE FROM Tag WHERE id = ?", [tagId]);
  });
});
