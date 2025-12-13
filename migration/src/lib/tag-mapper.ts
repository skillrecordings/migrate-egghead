/**
 * Tag mapper: Rails tags → Coursebuilder Tag
 *
 * Rails schema (tags table):
 * - id, name, slug, label, description, image_url, context
 * - popularity_order, taggings_count, updated_at
 *
 * Coursebuilder schema (Tag table):
 * - id (varchar), type (varchar), fields (json)
 * - organizationId (varchar, nullable), createdAt, updatedAt, deletedAt
 *
 * Mapping strategy:
 * - id: Generate new CUID (not numeric)
 * - type: 'topic' (egghead tags are content topics)
 * - fields: JSON containing all Rails fields
 */

import { createId } from "@paralleldrive/cuid2";

/** Rails tag record (snake_case keys from postgres client) */
export type RailsTag = {
  id: number;
  name: string | null;
  slug: string | null;
  label: string | null;
  description: string | null;
  imageUrl: string | null;
  context: string | null;
  popularityOrder: number | null;
  taggingsCount: number | null;
  updatedAt: Date | null;
};

/** Coursebuilder Tag record */
export type CoursebuilderTag = {
  id: string;
  type: string;
  organizationId: string | null;
  fields: {
    name: string;
    slug: string;
    label: string | null;
    description: string | null;
    imageUrl: string | null;
    context: string | null;
    popularityOrder: number | null;
    taggingsCount: number | null;
    /** Legacy Rails ID for lookups */
    legacyId: number;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

/** Tag ID mapping for legacy lookups */
export type TagIdMapping = {
  legacyId: number;
  newId: string;
};

/**
 * Map a Rails tag to Coursebuilder format
 *
 * Pure function - fully testable, no side effects
 */
export function mapTag(
  railsTag: RailsTag,
  options: { organizationId?: string } = {},
): CoursebuilderTag {
  const now = new Date();

  return {
    id: createId(),
    type: "topic",
    organizationId: options.organizationId ?? null,
    fields: {
      name: railsTag.name || "Untitled",
      slug: railsTag.slug || `tag-${railsTag.id}`,
      label: railsTag.label,
      description: railsTag.description,
      imageUrl: railsTag.imageUrl,
      context: railsTag.context,
      popularityOrder: railsTag.popularityOrder,
      taggingsCount: railsTag.taggingsCount,
      legacyId: railsTag.id,
    },
    createdAt: now,
    updatedAt: railsTag.updatedAt || now,
    deletedAt: null,
  };
}

/**
 * Create tag ID mapping for _migration_tag_map table
 */
export function createTagMapping(
  railsTag: RailsTag,
  cbTag: CoursebuilderTag,
): TagIdMapping {
  return {
    legacyId: railsTag.id,
    newId: cbTag.id,
  };
}
