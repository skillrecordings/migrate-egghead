import { describe, expect, test } from "bun:test";

import {
  anonymizeInstructor,
  anonymizeUser,
  cleanPgDump,
  generateInsert,
  generateSequenceResets,
  PII_FIELDS,
  scrubRecord,
  toSnakeCase,
  toSqlValue,
  wrapWithFkDisable,
} from "./sql-gen";

describe("toSnakeCase", () => {
  test("converts camelCase to snake_case", () => {
    expect(toSnakeCase("firstName")).toBe("first_name");
    expect(toSnakeCase("createdAt")).toBe("created_at");
    expect(toSnakeCase("userId")).toBe("user_id");
  });

  test("handles already snake_case", () => {
    expect(toSnakeCase("first_name")).toBe("first_name");
  });

  test("handles single word", () => {
    expect(toSnakeCase("id")).toBe("id");
    expect(toSnakeCase("email")).toBe("email");
  });

  test("handles multiple capitals", () => {
    expect(toSnakeCase("currentSignInIp")).toBe("current_sign_in_ip");
  });
});

describe("toSqlValue", () => {
  test("handles null and undefined", () => {
    expect(toSqlValue(null)).toBe("NULL");
    expect(toSqlValue(undefined)).toBe("NULL");
  });

  test("handles booleans", () => {
    expect(toSqlValue(true)).toBe("true");
    expect(toSqlValue(false)).toBe("false");
  });

  test("handles numbers", () => {
    expect(toSqlValue(42)).toBe("42");
    expect(toSqlValue(3.14)).toBe("3.14");
    expect(toSqlValue(0)).toBe("0");
  });

  test("handles dates", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    expect(toSqlValue(date)).toBe("'2024-01-15T10:30:00.000Z'");
  });

  test("handles strings", () => {
    expect(toSqlValue("hello")).toBe("'hello'");
  });

  test("escapes single quotes in strings", () => {
    expect(toSqlValue("it's")).toBe("'it''s'");
    expect(toSqlValue("don't")).toBe("'don''t'");
  });

  test("handles objects as JSONB", () => {
    expect(toSqlValue({ foo: "bar" })).toBe(`'{"foo":"bar"}'::jsonb`);
  });

  test("escapes quotes in JSONB", () => {
    expect(toSqlValue({ msg: "it's" })).toBe(`'{"msg":"it''s"}'::jsonb`);
  });
});

describe("generateInsert", () => {
  test("generates basic INSERT", () => {
    const row = { id: 1, firstName: "John", email: "john@test.com" };
    const sql = generateInsert("users", row);
    expect(sql).toBe(
      "INSERT INTO users (id, first_name, email) VALUES (1, 'John', 'john@test.com') ON CONFLICT (id) DO NOTHING;",
    );
  });

  test("handles null values", () => {
    const row = { id: 1, name: "Test", deletedAt: null };
    const sql = generateInsert("items", row);
    expect(sql).toContain("NULL");
  });

  test("handles dates", () => {
    const row = { id: 1, createdAt: new Date("2024-01-01T00:00:00.000Z") };
    const sql = generateInsert("items", row);
    expect(sql).toContain("'2024-01-01T00:00:00.000Z'");
  });

  test("handles JSONB", () => {
    const row = { id: 1, metadata: { key: "value" } };
    const sql = generateInsert("items", row);
    expect(sql).toContain(`'{"key":"value"}'::jsonb`);
  });
});

describe("PII_FIELDS", () => {
  test("contains all critical PII fields", () => {
    expect(PII_FIELDS).toHaveProperty("encryptedPassword");
    expect(PII_FIELDS).toHaveProperty("authenticationToken");
    expect(PII_FIELDS).toHaveProperty("currentSignInIp");
    expect(PII_FIELDS).toHaveProperty("lastSignInIp");
    expect(PII_FIELDS).toHaveProperty("kvstore");
    expect(PII_FIELDS).toHaveProperty("stripeCustomerId");
  });
});

describe("anonymizeUser", () => {
  test("replaces email with test email", () => {
    const user = { id: 123, email: "real@email.com", firstName: "John" };
    const anon = anonymizeUser(user);
    expect(anon.email).toBe("user123@test.egghead.io");
    expect(anon.firstName).toBe("John"); // preserved
  });

  test("redacts all PII fields", () => {
    const user = {
      id: 1,
      email: "test@test.com",
      encryptedPassword: "secret123",
      authenticationToken: "token123",
      confirmationToken: "confirm123",
      resetPasswordToken: "reset123",
      currentSignInIp: "192.168.1.1",
      lastSignInIp: "10.0.0.1",
      discordId: "discord123",
      slackId: "slack123",
      unconfirmedEmail: "other@test.com",
      kvstore: { email: "real@email.com", ip: "1.2.3.4" },
    };
    const anon = anonymizeUser(user);

    expect(anon.encryptedPassword).toBe("redacted");
    expect(anon.authenticationToken).toBeNull();
    expect(anon.confirmationToken).toBeNull();
    expect(anon.resetPasswordToken).toBeNull();
    expect(anon.currentSignInIp).toBeNull();
    expect(anon.lastSignInIp).toBeNull();
    expect(anon.discordId).toBeNull();
    expect(anon.slackId).toBeNull();
    expect(anon.unconfirmedEmail).toBeNull();
    expect(anon.kvstore).toBeNull(); // kvstore nulled entirely
  });

  test("provides default names if missing", () => {
    const user = { id: 1, email: "test@test.com" };
    const anon = anonymizeUser(user);
    expect(anon.firstName).toBe("Test");
    expect(anon.lastName).toBe("User");
  });
});

describe("anonymizeInstructor", () => {
  test("replaces email with test email", () => {
    const instructor = { id: 42, email: "instructor@real.com", name: "Jane" };
    const anon = anonymizeInstructor(instructor);
    expect(anon.email).toBe("instructor42@test.egghead.io");
    expect(anon.name).toBe("Jane"); // preserved
  });

  test("handles null email", () => {
    const instructor = { id: 42, email: null, name: "Jane" };
    const anon = anonymizeInstructor(instructor);
    expect(anon.email).toBeNull();
  });

  test("nulls slackId and gearTrackingNumber", () => {
    const instructor = {
      id: 42,
      email: "test@test.com",
      slackId: "U12345",
      gearTrackingNumber: "1Z999AA10123456784",
    };
    const anon = anonymizeInstructor(instructor);
    expect(anon.slackId).toBeNull();
    expect(anon.gearTrackingNumber).toBeNull();
  });
});

describe("scrubRecord", () => {
  test("scrubs known PII fields", () => {
    const record = {
      id: 1,
      name: "Test",
      encryptedPassword: "secret",
      currentSignInIp: "192.168.1.1",
    };
    const scrubbed = scrubRecord(record);
    expect(scrubbed.encryptedPassword).toBe("redacted");
    expect(scrubbed.currentSignInIp).toBeNull();
    expect(scrubbed.name).toBe("Test"); // preserved
  });

  test("scrubs email patterns in strings", () => {
    const record = {
      id: 1,
      notes: "Contact john@example.com for details",
    };
    const scrubbed = scrubRecord(record);
    expect(scrubbed.notes).toBe("Contact redacted@test.egghead.io for details");
  });

  test("preserves @test.egghead.io emails", () => {
    const record = {
      id: 1,
      email: "user123@test.egghead.io",
    };
    const scrubbed = scrubRecord(record);
    expect(scrubbed.email).toBe("user123@test.egghead.io");
  });

  test("scrubs IP addresses in strings", () => {
    const record = {
      id: 1,
      log: "Request from 192.168.1.100 at 10.0.0.1",
    };
    const scrubbed = scrubRecord(record);
    expect(scrubbed.log).toBe("Request from 0.0.0.0 at 0.0.0.0");
  });

  test("recursively scrubs nested objects", () => {
    const record = {
      id: 1,
      metadata: {
        userEmail: "secret@example.com",
        nested: {
          ip: "192.168.1.1",
        },
      },
    };
    const scrubbed = scrubRecord(record);
    const metadata = scrubbed.metadata as Record<string, unknown>;
    expect(metadata.userEmail).toBe("redacted@test.egghead.io");
    const nested = metadata.nested as Record<string, unknown>;
    expect(nested.ip).toBe("0.0.0.0");
  });

  test("handles multiple emails in one string", () => {
    const record = {
      id: 1,
      notes: "CC: alice@foo.com, bob@bar.org",
    };
    const scrubbed = scrubRecord(record);
    expect(scrubbed.notes).toBe(
      "CC: redacted@test.egghead.io, redacted@test.egghead.io",
    );
  });
});

describe("cleanPgDump", () => {
  test("removes \\restrict command", () => {
    const input = `SET client_encoding = 'UTF8';
\\restrict WMluaL3Jiq9P1gvYdbdPzBx8hP4fnUId4nBobGkkET8J9ibZdyj60SCFW8SoQNe
SET standard_conforming_strings = on;`;

    const cleaned = cleanPgDump(input);
    expect(cleaned).not.toContain("\\restrict");
    expect(cleaned).toContain("-- (removed for compatibility)");
    expect(cleaned).toContain("SET client_encoding");
  });

  test("removes \\unrestrict command", () => {
    const input = `ALTER TABLE foo;
\\unrestrict RWICJaFfaEtSCM4VwowG1sLXW9xMplYQJeTBXpdfpQaSRQf71GB8fScO3Uzy1wq`;

    const cleaned = cleanPgDump(input);
    expect(cleaned).not.toContain("\\unrestrict");
    expect(cleaned).toContain("ALTER TABLE foo;");
  });

  test("removes transaction_timeout", () => {
    const input = `SET statement_timeout = 0;
SET lock_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';`;

    const cleaned = cleanPgDump(input);
    expect(cleaned).not.toContain("SET transaction_timeout = 0;");
    expect(cleaned).toContain("SET statement_timeout = 0;");
    expect(cleaned).toContain("SET lock_timeout = 0;");
  });

  test("preserves valid SQL", () => {
    const input = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255)
);`;

    const cleaned = cleanPgDump(input);
    expect(cleaned).toBe(input);
  });
});

describe("generateSequenceResets", () => {
  test("generates setval statements", () => {
    const resets = generateSequenceResets(["users", "lessons"]);
    expect(resets).toHaveLength(2);
    expect(resets[0]).toBe(
      "SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));",
    );
    expect(resets[1]).toBe(
      "SELECT setval('lessons_id_seq', COALESCE((SELECT MAX(id) FROM lessons), 1));",
    );
  });
});

describe("wrapWithFkDisable", () => {
  test("wraps statements with FK disable/enable", () => {
    const statements = ["INSERT INTO users VALUES (1);"];
    const wrapped = wrapWithFkDisable(statements);

    expect(wrapped[0]).toContain("Disable FK");
    expect(wrapped[1]).toBe("SET session_replication_role = replica;");
    expect(wrapped).toContain("INSERT INTO users VALUES (1);");
    expect(wrapped[wrapped.length - 1]).toBe(
      "SET session_replication_role = DEFAULT;",
    );
  });
});
