/**
 * Durable Streams client wrapper for migration events.
 *
 * NOTE: This is a minimal implementation until @durable-streams/client is published.
 * Once available, replace with the official client.
 *
 * Protocol reference: https://github.com/durable-streams/durable-streams
 */

import type { MigrationEvent } from "./event-types.ts";

/**
 * Configuration for the Durable Streams server.
 */
export interface StreamConfig {
  /**
   * Base URL of the Durable Streams server.
   * @default "http://localhost:8787"
   */
  baseUrl?: string;

  /**
   * Custom fetch implementation (for testing/mocking).
   */
  fetch?: typeof globalThis.fetch;
}

/**
 * Options for creating/opening a stream.
 */
export interface StreamOptions {
  /**
   * Stream ID (unique identifier for this migration run).
   */
  streamId: string;

  /**
   * Time-to-live in seconds for the stream.
   * @default 3600 (1 hour)
   */
  ttlSeconds?: number;

  /**
   * Abort signal for cancellation.
   */
  signal?: AbortSignal;
}

/**
 * Options for reading from a stream.
 */
export interface ReadOptions {
  /**
   * Starting offset. Use "-1" to read from beginning.
   * @default "-1"
   */
  offset?: string;

  /**
   * Enable live tailing via SSE.
   * @default false
   */
  live?: boolean;

  /**
   * Abort signal for cancellation.
   */
  signal?: AbortSignal;
}

/**
 * Write events to a Durable Stream.
 * Used by migration scripts to emit progress events.
 */
export class MigrationStreamWriter {
  private baseUrl: string;
  private fetch: typeof globalThis.fetch;

  constructor(config: StreamConfig = {}) {
    this.baseUrl = config.baseUrl ?? "http://localhost:8787";
    this.fetch = config.fetch ?? globalThis.fetch;
  }

  /**
   * Get the full URL for a stream.
   */
  getStreamUrl(streamId: string): string {
    return `${this.baseUrl}/migrations/${streamId}`;
  }

  /**
   * Create a new stream for a migration run.
   */
  async createStream(options: StreamOptions): Promise<void> {
    const url = this.getStreamUrl(options.streamId);
    const ttl = options.ttlSeconds ?? 3600;

    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stream-TTL": ttl.toString(),
      },
      body: JSON.stringify({
        type: "init",
        timestamp: Date.now(),
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create stream: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * Append an event to the stream.
   */
  async appendEvent(
    streamId: string,
    event: MigrationEvent,
    signal?: AbortSignal,
  ): Promise<void> {
    const url = this.getStreamUrl(streamId);

    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
      signal,
    });

    if (!response.ok) {
      const msg = `Failed to append event: ${response.status} ${response.statusText}`;
      throw new Error(msg);
    }
  }

  /**
   * Append multiple events in a single request (batching).
   */
  async appendBatch(
    streamId: string,
    events: MigrationEvent[],
    signal?: AbortSignal,
  ): Promise<void> {
    const url = this.getStreamUrl(streamId);

    // Format as newline-delimited JSON (NDJSON)
    const ndjson = events.map((e) => JSON.stringify(e)).join("\n") + "\n";

    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-ndjson",
      },
      body: ndjson,
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to append batch: ${response.status} ${response.statusText}`,
      );
    }
  }
}

/**
 * Read events from a Durable Stream.
 * Used by OpenTUI to tail migration progress in real-time.
 */
export class MigrationStreamReader {
  private baseUrl: string;
  private fetch: typeof globalThis.fetch;

  constructor(config: StreamConfig = {}) {
    this.baseUrl = config.baseUrl ?? "http://localhost:8787";
    this.fetch = config.fetch ?? globalThis.fetch;
  }

  /**
   * Get the full URL for a stream.
   */
  getStreamUrl(streamId: string): string {
    return `${this.baseUrl}/migrations/${streamId}`;
  }

  /**
   * Read events from a stream (catch-up mode).
   * Returns all events from offset to current end of stream.
   */
  async readEvents(
    streamId: string,
    options: ReadOptions = {},
  ): Promise<MigrationEvent[]> {
    const url = new URL(this.getStreamUrl(streamId));
    url.searchParams.set("offset", options.offset ?? "-1");

    const response = await this.fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/x-ndjson",
      },
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to read events: ${response.status} ${response.statusText}`,
      );
    }

    const text = await response.text();
    const events: MigrationEvent[] = [];

    for (const line of text.split("\n")) {
      if (line.trim()) {
        events.push(JSON.parse(line) as MigrationEvent);
      }
    }

    return events;
  }

  /**
   * Tail events from a stream using Server-Sent Events.
   * Async generator that yields events as they arrive.
   *
   * @example
   * ```typescript
   * const reader = new MigrationStreamReader();
   * for await (const event of reader.tailEvents('run-123')) {
   *   console.log(event);
   * }
   * ```
   */
  async *tailEvents(
    streamId: string,
    options: ReadOptions = {},
  ): AsyncGenerator<MigrationEvent, void, void> {
    const url = new URL(this.getStreamUrl(streamId));
    url.searchParams.set("offset", options.offset ?? "-1");
    url.searchParams.set("live", "sse");

    const response = await this.fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
      },
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to tail events: ${response.status} ${response.statusText}`,
      );
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6); // Remove "data: " prefix
            if (data.trim()) {
              const event = JSON.parse(data) as MigrationEvent;
              yield event;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check if a stream exists.
   */
  async streamExists(streamId: string, signal?: AbortSignal): Promise<boolean> {
    const url = this.getStreamUrl(streamId);

    const response = await this.fetch(url, {
      method: "HEAD",
      signal,
    });

    return response.status === 200;
  }
}

/**
 * Helper to create a stream URL for a migration run.
 *
 * @param runId - Unique identifier for this migration run (e.g., timestamp or UUID)
 * @param baseUrl - Base URL of Durable Streams server
 * @returns Full stream URL
 */
export function createStreamUrl(
  runId: string,
  baseUrl = "http://localhost:8787",
): string {
  return `${baseUrl}/migrations/${runId}`;
}
