---
name: migrate-egghead
description: Agent-only workflow for migrate-egghead, including "full analysis" investigations. Uses the agent CLI `bun tools/me.ts` to (1) query Axiom via log-beast story packs, (2) run a cursor-based `analysis full` report (with optional deltas), (3) normalize labels, and (4) manage org Project #4 items/status. Use whenever doing perf/observability triage, GitHub issue/project hygiene, or improving the agent CLI itself.
---

# migrate-egghead (Agent Skill)

This skill is mandatory in this repo. If you are reading `AGENTS.md`, load this skill first.

## Prime Directive: IMPROVE THE CLI

`tools/me.ts` is for agents only.

When an agent hits friction:
- Patch `tools/me.ts` immediately.
- Keep outputs stable and machine-readable (`--json`, minimal noise).
- Add `--dry-run` to anything that mutates GitHub state.
- Prefer idempotent operations (safe to run repeatedly).
- Update this skill + `AGENTS.md` examples whenever CLI behavior changes.

## Prereqs

- `gh` authenticated with scopes: `repo`, `read:org`, `project`
- `AGENT_AXIOM_TOKEN` set (for Axiom queries)
- `~/Code/skillrecordings/log-beast` present (CLI wrapper uses it)
- `bun install` run in repo root (agent CLI depends on `zod` for output validation)

## Quick Start

```bash
# Sanity check env/scopes + log-beast path + token
bun tools/me.ts check

# Ensure label taxonomy + sync mapped issues into org project #4
bun tools/me.ts sync

# Get the 24h frontend structured-log story as JSON (agent-readable)
bun tools/me.ts logs story -h 24 --json | jq .
```

## Core Workflows

### 1) Triage From Structured Logs

```bash
# Quantify: coverage, hot events, search cache hit rate, tRPC flag tax, top tRPC paths
bun tools/me.ts logs story -h 24 --json | jq .
```

Use the output to:
- Update existing issues with exact event names + 24h metrics.
- Create missing issues (prefer `egghead-next` for implementation, `migrate-egghead` for coordination).

### 1.1) Full Analysis (Cursor-Based)

Agent phrase "full analysis" means: run the full pack with a cursor so we only query *new* time since last investigation.

```bash
# Full investigation pack (frontend + backend + structured story)
# Advances cursor by default (unless you passed --since/--until).
bun tools/me.ts analysis full --json | jq .

# Include deltas vs previous same-length window (helps track progress)
bun tools/me.ts analysis full --json --compare | jq .

# Post a tight markdown summary onto an issue (idempotent by time-window marker)
# Use repo:num (preferred) to avoid '#' comment issues in some runners.
bun tools/me.ts analysis full --json --compare --comment migrate-egghead:21 | jq '.comment.results'

# Preview comment actions without mutating GitHub state
bun tools/me.ts analysis full --json --compare --comment migrate-egghead:21 --dry-run | jq '.comment.results'

# Cursor ops
bun tools/me.ts cursor show --json | jq .
bun tools/me.ts cursor clear
bun tools/me.ts cursor set 2026-02-07T00:00:00Z
```

Cursor rules:
- If you pass `--since/--until` explicitly, cursor will NOT advance unless you add `--advance`.
- Use `--no-advance` to keep cursor fixed (re-run analysis on same window).

### 2) Project Hygiene (Org Project #4)

Refs: use `repo:num` (preferred) because `#` is comment syntax in some runners.

```bash
# Add issues to Project #4
bun tools/me.ts project add egghead-next:1562 migrate-egghead:21
#
# Note: `project add` is idempotent (safe to re-run). It uses `gh project item-add` which returns
# a ProjectV2Item id (PVTI_*), even if the issue is already on the project.

# List project items (optionally filter by Status)
bun tools/me.ts project list "Todo"
bun tools/me.ts project list "In Progress"

# Move an item across Status
bun tools/me.ts project status egghead-next:1562 "In Progress"
#
# Note: `project status` is also idempotent. It ensures the item exists on the project and then
# sets the Status field (no expensive verification loop).
```

### 3) Labels

```bash
# Idempotent label ensure
bun tools/me.ts labels ensure
```

## Output Contract (Agent-Only)

When `stdout` is not a TTY, `tools/me.ts` defaults to JSON output automatically.
For deterministic agent pipelines, always pass `--json` explicitly.

## Improve Log Coverage

When new structured events land in production:
1. Ensure the event JSON is parseable (stringified JSON in `message`).
2. Add it to `tools/me.ts logs story` query pack.
3. If needed, patch `log-beast` to add a dedicated command.
