import { beforeAll, describe, expect, test } from "bun:test";
import { $ } from "bun";

/**
 * Integration tests for Docker reset
 *
 * These tests verify that Docker containers are running and data is loaded.
 * Run with: bun test:integration
 *
 * Prerequisites:
 * - Docker running
 * - bun docker:reset has been run at least once
 */

// Match docker-compose.yml credentials
const PG_USER = "postgres";
const PG_DB = "egghead_test";
const MYSQL_USER = "root";
const MYSQL_PASS = "root";
const MYSQL_DB = "coursebuilder_test";

describe("Docker Integration", () => {
  beforeAll(async () => {
    // Check Docker is running
    const dockerCheck = await $`docker info 2>/dev/null`.quiet().nothrow();
    if (dockerCheck.exitCode !== 0) {
      throw new Error("Docker is not running");
    }
  });

  describe("PostgreSQL Container", () => {
    test("container is running and healthy", async () => {
      const result =
        await $`docker ps --format "{{.Names}}:{{.Status}}" | grep egghead_test_postgres`.text();
      expect(result).toContain("healthy");
    });

    test("can connect and query", async () => {
      const result =
        await $`docker exec egghead_test_postgres psql -U ${PG_USER} -d ${PG_DB} -t -c "SELECT 1"`.text();
      expect(result.trim()).toBe("1");
    });

    test("has users table", async () => {
      const result =
        await $`docker exec egghead_test_postgres psql -U ${PG_USER} -d ${PG_DB} -t -c "SELECT COUNT(*) FROM users"`.text();
      const count = parseInt(result.trim(), 10);
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test("has series table with data", async () => {
      const result =
        await $`docker exec egghead_test_postgres psql -U ${PG_USER} -d ${PG_DB} -t -c "SELECT COUNT(*) FROM series"`.text();
      const count = parseInt(result.trim(), 10);
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test("has lessons table with data", async () => {
      const result =
        await $`docker exec egghead_test_postgres psql -U ${PG_USER} -d ${PG_DB} -t -c "SELECT COUNT(*) FROM lessons"`.text();
      const count = parseInt(result.trim(), 10);
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test("fix-common-git-mistakes course exists", async () => {
      const result =
        await $`docker exec egghead_test_postgres psql -U ${PG_USER} -d ${PG_DB} -t -c "SELECT slug FROM series WHERE slug = 'fix-common-git-mistakes'"`.text();
      expect(result.trim()).toBe("fix-common-git-mistakes");
    });

    test("user emails are anonymized", async () => {
      const result =
        await $`docker exec egghead_test_postgres psql -U ${PG_USER} -d ${PG_DB} -t -c "SELECT email FROM users LIMIT 5"`.text();
      const emails = result
        .trim()
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean);
      for (const email of emails) {
        expect(email).toMatch(/@test\.egghead\.io$/);
      }
    });
  });

  describe("MySQL Container", () => {
    test("container is running and healthy", async () => {
      const result =
        await $`docker ps --format "{{.Names}}:{{.Status}}" | grep egghead_test_mysql`.text();
      expect(result).toContain("healthy");
    });

    test("can connect and query", async () => {
      const result =
        await $`docker exec egghead_test_mysql mysql -u${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "SELECT 1" -N`.text();
      expect(result.trim()).toBe("1");
    });

    test("has egghead_User table", async () => {
      const result =
        await $`docker exec egghead_test_mysql mysql -u${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "SELECT COUNT(*) FROM egghead_User" -N`.text();
      const count = parseInt(result.trim(), 10);
      expect(count).toBeGreaterThanOrEqual(1); // At least system user
    });
  });

  describe("Sanity Mock", () => {
    test("GraphQL endpoint responds", async () => {
      const response = await fetch("http://localhost:4000/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ __typename }" }),
      });
      expect(response.ok).toBe(true);
      const data = (await response.json()) as { data: { __typename: string } };
      expect(data.data.__typename).toBe("Query");
    });
  });
});

describe("Data Integrity", () => {
  test("lessons reference valid series", async () => {
    const result =
      await $`docker exec egghead_test_postgres psql -U ${PG_USER} -d ${PG_DB} -t -c "
      SELECT COUNT(*) FROM lessons l 
      LEFT JOIN series s ON l.series_id = s.id 
      WHERE l.series_id IS NOT NULL AND s.id IS NULL
    "`.text();
    const orphanCount = parseInt(result.trim(), 10);
    expect(orphanCount).toBe(0);
  });

  test("instructors reference valid users", async () => {
    const result =
      await $`docker exec egghead_test_postgres psql -U ${PG_USER} -d ${PG_DB} -t -c "
      SELECT COUNT(*) FROM instructors i 
      LEFT JOIN users u ON i.user_id = u.id 
      WHERE i.user_id IS NOT NULL AND u.id IS NULL
    "`.text();
    const orphanCount = parseInt(result.trim(), 10);
    expect(orphanCount).toBe(0);
  });

  test("taggings reference valid tags", async () => {
    const result =
      await $`docker exec egghead_test_postgres psql -U ${PG_USER} -d ${PG_DB} -t -c "
      SELECT COUNT(*) FROM taggings t 
      LEFT JOIN tags ta ON t.tag_id = ta.id 
      WHERE t.tag_id IS NOT NULL AND ta.id IS NULL
    "`.text();
    const orphanCount = parseInt(result.trim(), 10);
    expect(orphanCount).toBe(0);
  });
});
