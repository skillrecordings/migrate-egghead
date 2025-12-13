/**
 * Event types for migration progress tracking via Durable Streams.
 * Used by migration scripts to emit events and by OpenTUI to render progress.
 */

export type MigrationEntity = "tags" | "courses" | "lessons";

/**
 * Union type for all migration events.
 * Each event is tagged with a type discriminator for type-safe handling.
 */
export type MigrationEvent =
  | {
      type: "start";
      entity: MigrationEntity;
      total: number;
      timestamp: number;
    }
  | {
      type: "progress";
      entity: MigrationEntity;
      current: number;
      total: number;
      timestamp: number;
    }
  | {
      type: "success";
      entity: MigrationEntity;
      legacyId: number;
      newId: string;
      timestamp: number;
    }
  | {
      type: "error";
      entity: MigrationEntity;
      legacyId: number;
      error: string;
      timestamp: number;
    }
  | {
      type: "complete";
      entity: MigrationEntity;
      migrated: number;
      failed: number;
      duration: number;
      timestamp: number;
    }
  | {
      type: "checkpoint";
      offset: number;
      state: Record<string, unknown>;
      timestamp: number;
    };

/**
 * Type guard to check if an event is of a specific type.
 */
export function isEventOfType<T extends MigrationEvent["type"]>(
  event: MigrationEvent,
  type: T,
): event is Extract<MigrationEvent, { type: T }> {
  return event.type === type;
}

/**
 * Create a migration event with automatic timestamp.
 */
export function createEvent<T extends MigrationEvent["type"]>(
  type: T,
  data: Omit<Extract<MigrationEvent, { type: T }>, "type" | "timestamp">,
): Extract<MigrationEvent, { type: T }> {
  return {
    type,
    timestamp: Date.now(),
    ...data,
  } as Extract<MigrationEvent, { type: T }>;
}
