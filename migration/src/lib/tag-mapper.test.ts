/**
 * Tag mapper tests - characterization tests following Feathers pattern
 */

import { describe, expect, test } from "bun:test";
import { createTagMapping, mapTag, type RailsTag } from "./tag-mapper";

describe("mapTag", () => {
  test("maps a complete Rails tag to Coursebuilder format", () => {
    const railsTag: RailsTag = {
      id: 42,
      name: "React",
      slug: "react",
      label: "React.js",
      description: "A JavaScript library for building user interfaces",
      imageUrl: "https://example.com/react.png",
      context: "technology",
      popularityOrder: 10,
      taggingsCount: 250,
      updatedAt: new Date("2024-01-15T10:00:00Z"),
    };

    const result = mapTag(railsTag);

    // Verify structure
    expect(result.id).toBeString();
    expect(result.id.length).toBeGreaterThan(20); // CUID is ~24-32 chars
    expect(result.type).toBe("topic");
    expect(result.organizationId).toBeNull();
    expect(result.deletedAt).toBeNull();

    // Verify fields mapping
    expect(result.fields.name).toBe("React");
    expect(result.fields.slug).toBe("react");
    expect(result.fields.label).toBe("React.js");
    expect(result.fields.description).toBe(
      "A JavaScript library for building user interfaces",
    );
    expect(result.fields.imageUrl).toBe("https://example.com/react.png");
    expect(result.fields.context).toBe("technology");
    expect(result.fields.popularityOrder).toBe(10);
    expect(result.fields.taggingsCount).toBe(250);
    expect(result.fields.legacyId).toBe(42);

    // Verify timestamps
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toEqual(new Date("2024-01-15T10:00:00Z"));
  });

  test("handles null fields gracefully", () => {
    const railsTag: RailsTag = {
      id: 99,
      name: "TypeScript",
      slug: "typescript",
      label: null,
      description: null,
      imageUrl: null,
      context: null,
      popularityOrder: null,
      taggingsCount: null,
      updatedAt: null,
    };

    const result = mapTag(railsTag);

    expect(result.fields.name).toBe("TypeScript");
    expect(result.fields.slug).toBe("typescript");
    expect(result.fields.label).toBeNull();
    expect(result.fields.description).toBeNull();
    expect(result.fields.imageUrl).toBeNull();
    expect(result.fields.context).toBeNull();
    expect(result.fields.popularityOrder).toBeNull();
    expect(result.fields.taggingsCount).toBeNull();
    expect(result.updatedAt).toBeInstanceOf(Date); // Falls back to now
  });

  test("handles missing name by providing default", () => {
    const railsTag: RailsTag = {
      id: 123,
      name: null,
      slug: "unknown-tag",
      label: null,
      description: null,
      imageUrl: null,
      context: null,
      popularityOrder: null,
      taggingsCount: null,
      updatedAt: null,
    };

    const result = mapTag(railsTag);

    expect(result.fields.name).toBe("Untitled");
    expect(result.fields.slug).toBe("unknown-tag");
  });

  test("generates slug from ID when missing", () => {
    const railsTag: RailsTag = {
      id: 456,
      name: "Test Tag",
      slug: null,
      label: null,
      description: null,
      imageUrl: null,
      context: null,
      popularityOrder: null,
      taggingsCount: null,
      updatedAt: null,
    };

    const result = mapTag(railsTag);

    expect(result.fields.slug).toBe("tag-456");
  });

  test("respects organizationId option", () => {
    const railsTag: RailsTag = {
      id: 789,
      name: "Next.js",
      slug: "nextjs",
      label: null,
      description: null,
      imageUrl: null,
      context: null,
      popularityOrder: null,
      taggingsCount: null,
      updatedAt: null,
    };

    const result = mapTag(railsTag, { organizationId: "org_123abc" });

    expect(result.organizationId).toBe("org_123abc");
  });

  test("generates unique IDs for different tags", () => {
    const tag1: RailsTag = {
      id: 1,
      name: "Tag 1",
      slug: "tag-1",
      label: null,
      description: null,
      imageUrl: null,
      context: null,
      popularityOrder: null,
      taggingsCount: null,
      updatedAt: null,
    };

    const tag2: RailsTag = {
      id: 2,
      name: "Tag 2",
      slug: "tag-2",
      label: null,
      description: null,
      imageUrl: null,
      context: null,
      popularityOrder: null,
      taggingsCount: null,
      updatedAt: null,
    };

    const result1 = mapTag(tag1);
    const result2 = mapTag(tag2);

    expect(result1.id).not.toBe(result2.id);
  });
});

describe("createTagMapping", () => {
  test("creates correct ID mapping", () => {
    const railsTag: RailsTag = {
      id: 42,
      name: "React",
      slug: "react",
      label: null,
      description: null,
      imageUrl: null,
      context: null,
      popularityOrder: null,
      taggingsCount: null,
      updatedAt: null,
    };

    const cbTag = mapTag(railsTag);
    const mapping = createTagMapping(railsTag, cbTag);

    expect(mapping.legacyId).toBe(42);
    expect(mapping.newId).toBe(cbTag.id);
  });
});
