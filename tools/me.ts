#!/usr/bin/env bun
/**
 * migrate-egghead agent CLI (Bun)
 *
 * Design goals:
 * - fast, idempotent wrappers around `gh` + `log-beast`
 * - machine-readable output when stdout is not a TTY
 *
 * Notes:
 * - Structured "frontend" events in Axiom are currently JSON strings in `message`.
 *   We parse them in APL via `parse_json(["message"])` (same pattern used by log-beast).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type OutputFormat = "text" | "json";

type GlobalOpts = {
  owner: string;
  projectNumber: number;
  hours: number;
  since?: string;
  until?: string;
  format: OutputFormat;
  quiet: boolean;
  dryRun: boolean;
};

type RunResult = { exitCode: number; stdout: string; stderr: string };

const DEFAULT_OWNER = process.env.ME_OWNER ?? "skillrecordings";
const DEFAULT_PROJECT_NUMBER = Number(process.env.ME_PROJECT ?? "4");
const DEFAULT_HOURS = Number(process.env.ME_HOURS ?? "24");
const LOG_BEAST_CLI =
  process.env.LOG_BEAST_CLI ??
  path.join(os.homedir(), "Code/skillrecordings/log-beast/src/cli.ts");

const ME_CACHE_DIR = process.env.ME_CACHE_DIR ?? path.join(os.homedir(), ".cache/migrate-egghead");
const PROJECT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CURSOR_CACHE_PATH =
  process.env.ME_CURSOR_FILE ?? path.join(ME_CACHE_DIR, "analysis_cursor.json");
const CURSOR_MAX_HOURS = Number(process.env.ME_CURSOR_MAX_HOURS ?? "168"); // 7d guardrail

const DEFAULT_REPOS = ["migrate-egghead", "egghead-next", "egghead-rails"] as const;

const PROJECT_SYNC_URLS: string[] = [
  // migrate-egghead coordination issues
  "https://github.com/skillrecordings/migrate-egghead/issues/21",
  "https://github.com/skillrecordings/migrate-egghead/issues/20",
  "https://github.com/skillrecordings/migrate-egghead/issues/18",
  "https://github.com/skillrecordings/migrate-egghead/issues/17",
  "https://github.com/skillrecordings/migrate-egghead/issues/15",
  "https://github.com/skillrecordings/migrate-egghead/issues/16",
  "https://github.com/skillrecordings/migrate-egghead/issues/12",
  "https://github.com/skillrecordings/migrate-egghead/issues/10",

  // egghead-next perf backlog mapped from structured logs
  "https://github.com/skillrecordings/egghead-next/issues/1558",
  "https://github.com/skillrecordings/egghead-next/issues/1559",
  "https://github.com/skillrecordings/egghead-next/issues/1560",
  "https://github.com/skillrecordings/egghead-next/issues/1561",
  "https://github.com/skillrecordings/egghead-next/issues/1562",
  "https://github.com/skillrecordings/egghead-next/issues/1563",
  "https://github.com/skillrecordings/egghead-next/issues/1564",
  "https://github.com/skillrecordings/egghead-next/issues/1555",
  "https://github.com/skillrecordings/egghead-next/issues/1556",

  // legacy bug that blocks pricing correctness
  "https://github.com/skillrecordings/egghead-rails/issues/5027",
];

function isTty(): boolean {
  return Boolean(process.stdout.isTTY);
}

function die(message: string, code = 1): never {
  console.error(message);
  process.exit(code);
}

function printHelp(): void {
  console.log(`
migrate-egghead agent CLI (bun)

Usage:
  bun tools/me.ts [global options] <command> [args]

Global options:
  --owner <org>         GitHub org/user (default: ${DEFAULT_OWNER})
  --project <number>    Org Project number (default: ${DEFAULT_PROJECT_NUMBER})
  --hours, -h <n>       Time range in hours for log queries (default: ${DEFAULT_HOURS})
  --since <iso>         Log query start time (defaults to --hours window)
  --until <iso>         Log query end time (defaults to now)
  --json                Emit JSON output (auto when stdout is not a TTY)
  --quiet               Less output
  --dry-run             Print actions without mutating GitHub state

Commands:
  check
  sync
  analysis full [--compare] [--comment <issueRef>] [--advance] [--no-advance]
  cursor show
  cursor set <iso>
  cursor clear
  issues list [repo]
  labels ensure
  project add <ref...>
  project list [Todo|In Progress|Done]
  project status <ref> <Todo|In Progress|Done>
  logs story
  logs trace <request_id>

Refs:
  - Full URL: https://github.com/skillrecordings/egghead-next/issues/1561
  - Short:    egghead-next:1561 (preferred, defaults owner to --owner)
  - Short:    egghead-next#1561 (may need quoting; in some shells # starts a comment)
`);
}

function parseGlobal(argv: string[]): { opts: GlobalOpts; rest: string[] } {
  const format: OutputFormat = !isTty() ? "json" : "text";
  const opts: GlobalOpts = {
    owner: DEFAULT_OWNER,
    projectNumber: DEFAULT_PROJECT_NUMBER,
    hours: Number.isFinite(DEFAULT_HOURS) && DEFAULT_HOURS > 0 ? DEFAULT_HOURS : 24,
    since: undefined,
    until: undefined,
    format,
    quiet: false,
    dryRun: false,
  };

  const rest: string[] = [];
  // Global flags are allowed anywhere in the argv. Unrecognized flags are left
  // in `rest` so subcommands can opt into pass-through later.
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--help" || a === "-?" || a === "-help") {
      printHelp();
      process.exit(0);
    }
    if (a === "--owner") {
      const v = argv[++i];
      if (!v) die("Missing value for --owner");
      opts.owner = v;
      continue;
    }
    if (a === "--project") {
      const v = argv[++i];
      if (!v) die("Missing value for --project");
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) die(`Invalid --project: ${v}`);
      opts.projectNumber = n;
      continue;
    }
    if (a === "--hours" || a === "-h") {
      const v = argv[++i];
      if (!v) die("Missing value for --hours/-h");
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) die(`Invalid --hours: ${v}`);
      opts.hours = n;
      continue;
    }
    if (a === "--since") {
      const v = argv[++i];
      if (!v) die("Missing value for --since");
      opts.since = v;
      continue;
    }
    if (a === "--until") {
      const v = argv[++i];
      if (!v) die("Missing value for --until");
      opts.until = v;
      continue;
    }
    if (a === "--json") {
      opts.format = "json";
      continue;
    }
    if (a === "--quiet") {
      opts.quiet = true;
      continue;
    }
    if (a === "--dry-run") {
      opts.dryRun = true;
      continue;
    }

    rest.push(a);
  }

  return { opts, rest };
}

async function run(cmd: string[], { quiet }: { quiet?: boolean } = {}): Promise<RunResult> {
  const p = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
    p.exited,
  ]);

  if (!quiet && stderr.trim()) {
    // Some tools (gh) emit useful warnings to stderr.
    // Don't treat as failure unless exitCode != 0.
    console.error(stderr.trim());
  }

  return { exitCode, stdout, stderr };
}

async function runInherit(cmd: string[]): Promise<number> {
  const p = Bun.spawn(cmd, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });
  return await p.exited;
}

function safeJsonParse<T>(text: string, context: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse JSON (${context}): ${msg}\n---\n${text.slice(0, 2000)}`);
  }
}

type AnalysisCursor = {
  version: 1;
  updatedAt: string;
  lastSince?: string;
  lastUntil: string;
};

function readCursor(): AnalysisCursor | null {
  try {
    if (!fs.existsSync(CURSOR_CACHE_PATH)) return null;
    const raw = fs.readFileSync(CURSOR_CACHE_PATH, "utf8");
    const json = JSON.parse(raw) as AnalysisCursor;
    if (json?.version !== 1) return null;
    if (!json.lastUntil) return null;
    if (!Number.isFinite(Date.parse(json.lastUntil))) return null;
    return json;
  } catch {
    return null;
  }
}

function atomicWriteFileSync(targetPath: string, contents: string): void {
  // Avoid partial reads when multiple commands/agents touch the same file.
  // Write to a temp file in the same directory, then rename (atomic on POSIX).
  const dir = path.dirname(targetPath);
  const base = path.basename(targetPath);
  const tmp = path.join(dir, `.${base}.tmp.${process.pid}.${Math.random().toString(16).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tmp, contents, "utf8");
  fs.renameSync(tmp, targetPath);
}

function writeCursor(cursor: AnalysisCursor): void {
  atomicWriteFileSync(CURSOR_CACHE_PATH, JSON.stringify(cursor, null, 2));
}

function clearCursor(): void {
  if (fs.existsSync(CURSOR_CACHE_PATH)) fs.unlinkSync(CURSOR_CACHE_PATH);
}

type EffectiveTimeRange = {
  source: "explicit" | "cursor" | "hours";
  hours: number;
  since: string;
  until: string;
  cursorPath: string;
  cursorUsed: boolean;
  cursorClamped: boolean;
  cursorOriginalSince?: string;
};

function computeHours(sinceIso: string, untilIso: string): number {
  const sinceMs = Date.parse(sinceIso);
  const untilMs = Date.parse(untilIso);
  if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs)) return 0;
  const diffMs = Math.max(0, untilMs - sinceMs);
  return diffMs / (60 * 60 * 1000);
}

function computeSinceFromHours(hours: number, untilIso: string): string {
  const untilMs = Date.parse(untilIso);
  if (!Number.isFinite(untilMs)) die(`Invalid until time: ${untilIso}`);
  return new Date(untilMs - hours * 60 * 60 * 1000).toISOString();
}

function getEffectiveTimeRange(opts: GlobalOpts): EffectiveTimeRange {
  const now = new Date().toISOString();

  // Explicit since/until always wins.
  if (opts.since || opts.until) {
    const tr = normalizeTimeRange(opts);
    const since = tr.since ?? computeSinceFromHours(tr.hours, tr.until ?? now);
    const until = tr.until ?? now;
    return {
      source: "explicit",
      hours: computeHours(since, until),
      since,
      until,
      cursorPath: CURSOR_CACHE_PATH,
      cursorUsed: false,
      cursorClamped: false,
    };
  }

  // Cursor-driven window if available.
  const cursor = readCursor();
  if (cursor?.lastUntil) {
    const since0 = new Date(Date.parse(cursor.lastUntil)).toISOString();
    const until0 = now;
    const hours0 = computeHours(since0, until0);
    const maxHours = Number.isFinite(CURSOR_MAX_HOURS) && CURSOR_MAX_HOURS > 0 ? CURSOR_MAX_HOURS : 168;
    if (hours0 > maxHours) {
      const since = computeSinceFromHours(maxHours, until0);
      return {
        source: "cursor",
        hours: computeHours(since, until0),
        since,
        until: until0,
        cursorPath: CURSOR_CACHE_PATH,
        cursorUsed: true,
        cursorClamped: true,
        cursorOriginalSince: since0,
      };
    }
    return {
      source: "cursor",
      hours: hours0,
      since: since0,
      until: until0,
      cursorPath: CURSOR_CACHE_PATH,
      cursorUsed: true,
      cursorClamped: false,
    };
  }

  // Fallback: hours window.
  const until = now;
  const since = computeSinceFromHours(opts.hours, until);
  return {
    source: "hours",
    hours: opts.hours,
    since,
    until,
    cursorPath: CURSOR_CACHE_PATH,
    cursorUsed: false,
    cursorClamped: false,
  };
}

function normalizeTimeRange(opts: GlobalOpts): { hours: number; since?: string; until?: string } {
  if (!opts.since && !opts.until) return { hours: opts.hours };

  const untilRaw = opts.until ?? new Date().toISOString();
  const untilMs = Date.parse(untilRaw);
  if (!Number.isFinite(untilMs)) die(`Invalid --until (expected ISO 8601): ${untilRaw}`);

  const until = new Date(untilMs).toISOString();

  if (opts.since) {
    const sinceMs = Date.parse(opts.since);
    if (!Number.isFinite(sinceMs)) die(`Invalid --since (expected ISO 8601): ${opts.since}`);
    if (sinceMs > untilMs) die(`Invalid time range: --since must be <= --until`);
    return { hours: opts.hours, since: new Date(sinceMs).toISOString(), until };
  }

  const since = new Date(untilMs - opts.hours * 60 * 60 * 1000).toISOString();
  return { hours: opts.hours, since, until };
}

function getLogBeastTimeArgs(opts: GlobalOpts): string[] {
  const tr = normalizeTimeRange(opts);
  if (tr.since && tr.until) return ["--since", tr.since, "--until", tr.until];
  return ["-h", String(tr.hours)];
}

function toIssueUrl(owner: string, ref: string): string {
  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;
  const m0 = ref.match(/^([^#\/:]+):(\d+)$/); // repo:123
  if (m0) return `https://github.com/${owner}/${m0[1]}/issues/${m0[2]}`;
  const m0b = ref.match(/^([^#\/:]+)\/([^#\/:]+):(\d+)$/); // org/repo:123
  if (m0b) return `https://github.com/${m0b[1]}/${m0b[2]}/issues/${m0b[3]}`;
  const m1 = ref.match(/^([^#\/]+)#(\d+)$/); // repo#123
  if (m1) return `https://github.com/${owner}/${m1[1]}/issues/${m1[2]}`;
  const m2 = ref.match(/^([^#\/]+)\/([^#\/]+)#(\d+)$/); // org/repo#123
  if (m2) return `https://github.com/${m2[1]}/${m2[2]}/issues/${m2[3]}`;
  return die(
    `Unsupported ref: ${ref}\n` +
      `Expected one of:\n` +
      `- repo:num (preferred)  e.g. egghead-next:1561\n` +
      `- org/repo:num          e.g. skillrecordings/egghead-next:1561\n` +
      `- full URL              e.g. https://github.com/skillrecordings/egghead-next/issues/1561\n` +
      `Hint: in some shells, '#' starts a comment so repo#1561 becomes just 'repo'. Use repo:num.`,
  );
}

async function cmdCheck(opts: GlobalOpts): Promise<void> {
  const gh = await run(["gh", "auth", "status"], { quiet: true });
  const scopesLine = gh.stdout
    .split("\n")
    .find(l => l.includes("Token scopes:"))?.trim();

  const scopes = scopesLine ? Array.from(scopesLine.matchAll(/'([^']+)'/g)).map(m => m[1]) : [];
  const hasProjectScope = scopes.includes("project");
  const hasRepoScope = scopes.includes("repo");
  const hasReadOrgScope = scopes.includes("read:org");

  const hasLogBeast = fs.existsSync(LOG_BEAST_CLI);
  const hasAxiomToken = Boolean(process.env.AGENT_AXIOM_TOKEN);

  const ok = gh.exitCode === 0 && hasProjectScope && hasRepoScope && hasReadOrgScope && hasLogBeast && hasAxiomToken;

  const data = {
    ok,
    gh: {
      ok: gh.exitCode === 0,
      scopes,
      needs: {
        project: !hasProjectScope,
        repo: !hasRepoScope,
        "read:org": !hasReadOrgScope,
      },
    },
    logBeast: {
      ok: hasLogBeast,
      cli: LOG_BEAST_CLI,
    },
    env: {
      AGENT_AXIOM_TOKEN: hasAxiomToken,
    },
  };

  if (opts.format === "json") {
    console.log(JSON.stringify(data));
    process.exit(ok ? 0 : 2);
  }

  console.log(`gh scopes: ${scopes.join(", ") || "(unknown)"}`);
  console.log(`log-beast cli: ${hasLogBeast ? "ok" : "missing"} (${LOG_BEAST_CLI})`);
  console.log(`AGENT_AXIOM_TOKEN: ${hasAxiomToken ? "set" : "missing"}`);
  if (!ok) process.exit(2);
}

type LabelSpec = { name: string; color: string; description: string };

async function ensureLabels(repo: string, labels: LabelSpec[], opts: GlobalOpts): Promise<void> {
  for (const l of labels) {
    const cmd = [
      "gh",
      "label",
      "create",
      l.name,
      "-R",
      repo,
      "--color",
      l.color,
      "--description",
      l.description,
      "--force",
    ];
    if (opts.dryRun) {
      if (opts.format === "text" && !opts.quiet) console.log(cmd.join(" "));
      continue;
    }
    const r = await run(cmd, { quiet: true });
    if (r.exitCode !== 0) {
      // Non-fatal; continue to avoid blocking on a single label.
      if (!opts.quiet) console.error(`label ensure failed: ${repo} ${l.name}`);
    }
  }
}

async function cmdLabelsEnsure(opts: GlobalOpts): Promise<void> {
  const migrateRepo = `${opts.owner}/migrate-egghead`;
  const nextRepo = `${opts.owner}/egghead-next`;

  // migrate-egghead taxonomy
  await ensureLabels(
    migrateRepo,
    [
      { name: "agent/ready", color: "7057ff", description: "Can be picked up by an AI agent" },
      { name: "priority:critical", color: "b60205", description: "Needs immediate action" },
      { name: "priority:high", color: "d93f0b", description: "High impact / near-term" },
      { name: "area:frontend", color: "1d76db", description: "egghead-next frontend behavior/perf" },
      { name: "area:backend", color: "0e8a16", description: "egghead-rails backend behavior/perf" },
      { name: "area:observability", color: "5319e7", description: "Axiom/logging/instrumentation" },
      { name: "area:auth", color: "0052cc", description: "Authentication/session/token flows" },
      { name: "area:pricing", color: "c2e0c6", description: "Pricing/PPP/Stripe coupon flows" },
      { name: "type:discovery", color: "fbca04", description: "Investigation findings" },
      { name: "type:perf", color: "f9d0c4", description: "Performance optimization" },
      { name: "type:bug", color: "d73a4a", description: "Behavioral regression or defect" },
      { name: "type:strategy", color: "bfdadc", description: "Architecture/migration strategy" },
    ],
    opts,
  );

  // Minimal extra taxonomy in egghead-next
  await ensureLabels(
    nextRepo,
    [
      { name: "perf", color: "f29513", description: "Performance work" },
      { name: "observability", color: "5319e7", description: "Structured logging/metrics/telemetry" },
    ],
    opts,
  );
}

async function cmdIssuesList(opts: GlobalOpts, repoArg?: string): Promise<void> {
  const repos = repoArg ? [repoArg] : [...DEFAULT_REPOS];
  const all: any[] = [];
  for (const r of repos) {
    const repo = r.includes("/") ? r : `${opts.owner}/${r}`;
    const out = await run(
      [
        "gh",
        "issue",
        "list",
        "-R",
        repo,
        "--state",
        "open",
        "--limit",
        "200",
        "--json",
        "number,title,url,labels,assignees,updatedAt",
      ],
      { quiet: true },
    );
    if (out.exitCode !== 0) die(`gh issue list failed for ${repo}`);
    const issues = safeJsonParse<any[]>(out.stdout, `gh issue list ${repo}`);
    for (const i of issues) all.push({ repo, ...i });
  }

  if (opts.format === "json") {
    console.log(JSON.stringify({ repos, count: all.length, issues: all }));
    return;
  }

  for (const i of all) {
    const labels = (i.labels ?? []).map((l: any) => l.name).join(", ");
    console.log(`${i.repo}#${i.number}  ${i.title}${labels ? `  [${labels}]` : ""}`);
  }
}

async function cmdProjectAdd(opts: GlobalOpts, refs: string[]): Promise<void> {
  if (refs.length === 0) die("project add: missing <ref...>");

  const project = String(opts.projectNumber);
  const projectRef = `${opts.owner}#${opts.projectNumber}`;

  const inputUrls: string[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    const url = toIssueUrl(opts.owner, ref);
    if (seen.has(url)) continue;
    seen.add(url);
    inputUrls.push(url);
  }

  const ensured: { id: string; url: string; type?: string; title?: string }[] = [];
  const wouldEnsure: string[] = [];
  const errors: { url: string; error: string }[] = [];

  for (const url of inputUrls) {
    const cmd = [
      "gh",
      "project",
      "item-add",
      project,
      "--owner",
      opts.owner,
      "--url",
      url,
      "--format",
      "json",
      "--jq",
      "{id: .id, url: .url, type: .type, title: .title}",
    ];
    if (opts.dryRun) {
      wouldEnsure.push(url);
      if (opts.format === "text" && !opts.quiet) console.log(cmd.join(" "));
      continue;
    }

    const r = await run(cmd, { quiet: true });
    if (r.exitCode === 0) {
      const item = safeJsonParse<any>(r.stdout, "gh project item-add");
      ensured.push({ id: String(item.id), url: String(item.url ?? url), type: item.type, title: item.title });
      continue;
    }
    errors.push({ url, error: (r.stderr || r.stdout || "unknown error").trim() });
  }

  const result = { project: projectRef, dryRun: opts.dryRun, ensured, wouldEnsure, errors };
  if (opts.format === "json") {
    console.log(JSON.stringify(result));
    return;
  }
  if (!opts.quiet) {
    console.log(`ensured: ${ensured.length}`);
    if (opts.dryRun) console.log(`would ensure: ${wouldEnsure.length}`);
    console.log(`errors: ${errors.length}`);
  }
}

type ProjectInfo = {
  id: string;
  url: string;
  title: string;
};

async function getProjectInfo(opts: GlobalOpts): Promise<ProjectInfo> {
  const r = await run(
    ["gh", "project", "view", String(opts.projectNumber), "--owner", opts.owner, "--format", "json"],
    { quiet: true },
  );
  if (r.exitCode !== 0) {
    die(`Failed to read org project (check gh scopes)\n${(r.stderr || r.stdout || "").trim()}`);
  }
  const json = safeJsonParse<any>(r.stdout, "gh project view");
  return { id: json.id, url: json.url, title: json.title };
}

type StatusField = {
  fieldId: string;
  options: { name: string; id: string }[];
};

type ProjectItem = {
  id: string;
  status: string;
  url?: string;
  title?: string;
  repo?: string;
  labels: string[];
};

async function getProjectItems(opts: GlobalOpts): Promise<ProjectItem[]> {
  const r = await run(
    ["gh", "project", "item-list", String(opts.projectNumber), "--owner", opts.owner, "--limit", "500", "--format", "json"],
    { quiet: true },
  );
  if (r.exitCode !== 0) {
    die(`Failed to list project items\n${(r.stderr || r.stdout || "").trim()}`);
  }
  const json = safeJsonParse<any>(r.stdout, "gh project item-list");
  return (json.items ?? []).map((it: any) => ({
    id: it.id,
    status: it.status,
    url: it?.content?.url,
    title: it?.content?.title ?? it?.title,
    repo: it.repository,
    labels: Array.isArray(it.labels) ? it.labels : [],
  }));
}

async function getStatusField(opts: GlobalOpts): Promise<StatusField> {
  const r = await run(
    ["gh", "project", "field-list", String(opts.projectNumber), "--owner", opts.owner, "--format", "json"],
    { quiet: true },
  );
  if (r.exitCode !== 0) {
    die(`Failed to list project fields\n${(r.stderr || r.stdout || "").trim()}`);
  }
  const json = safeJsonParse<any>(r.stdout, "gh project field-list");
  const status = (json.fields ?? []).find((f: any) => f.name === "Status");
  if (!status) die('Project is missing required field "Status"');
  if (!Array.isArray(status.options)) die('Project "Status" field missing options');
  return {
    fieldId: status.id,
    options: status.options.map((o: any) => ({ name: o.name, id: o.id })),
  };
}

type ProjectCache = {
  owner: string;
  projectNumber: number;
  projectId: string;
  projectUrl: string;
  projectTitle: string;
  statusFieldId: string;
  statusOptions: Record<string, string>; // lowercased option name -> option id
  fetchedAt: string;
};

function getProjectCachePath(opts: GlobalOpts): string {
  const safeOwner = opts.owner.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return path.join(ME_CACHE_DIR, `project_${safeOwner}_${opts.projectNumber}.json`);
}

function readProjectCache(opts: GlobalOpts): ProjectCache | null {
  const p = getProjectCachePath(opts);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as ProjectCache;
  } catch {
    return null;
  }
}

function isProjectCacheFresh(cache: ProjectCache): boolean {
  const t = Date.parse(cache.fetchedAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < PROJECT_CACHE_TTL_MS;
}

function writeProjectCache(opts: GlobalOpts, cache: ProjectCache): void {
  atomicWriteFileSync(getProjectCachePath(opts), JSON.stringify(cache, null, 2));
}

async function refreshProjectCache(opts: GlobalOpts): Promise<ProjectCache> {
  const project = await getProjectInfo(opts);
  const status = await getStatusField(opts);
  const statusOptions = Object.fromEntries(status.options.map(o => [o.name.toLowerCase(), o.id]));
  const cache: ProjectCache = {
    owner: opts.owner,
    projectNumber: opts.projectNumber,
    projectId: project.id,
    projectUrl: project.url,
    projectTitle: project.title,
    statusFieldId: status.fieldId,
    statusOptions,
    fetchedAt: new Date().toISOString(),
  };
  writeProjectCache(opts, cache);
  return cache;
}

async function getProjectCache(opts: GlobalOpts, forceRefresh = false): Promise<ProjectCache> {
  const cached = readProjectCache(opts);
  if (!forceRefresh && cached && isProjectCacheFresh(cached) && cached.projectId && cached.statusFieldId) return cached;
  return refreshProjectCache(opts);
}

async function cmdProjectList(opts: GlobalOpts, statusFilterRaw?: string): Promise<void> {
  const items = await getProjectItems(opts);

  const statusFilter = statusFilterRaw?.trim();
  const filtered = statusFilter
    ? items.filter((it: any) => String(it.status).toLowerCase() === statusFilter.toLowerCase())
    : items;

  if (opts.format === "json") {
    console.log(JSON.stringify({ project: `${opts.owner}#${opts.projectNumber}`, count: filtered.length, items: filtered }));
    return;
  }

  for (const it of filtered) {
    if (!it.url) continue;
    console.log(`${it.status}\t${it.url}\t${it.title ?? ""}`);
  }
}

async function cmdProjectStatus(opts: GlobalOpts, ref: string, statusNameRaw: string): Promise<void> {
  const url = toIssueUrl(opts.owner, ref);
  const statusName = statusNameRaw.trim().toLowerCase();

  const cache = await getProjectCache(opts);
  let optionId = cache.statusOptions[statusName];
  if (!optionId) {
    // Status options can change; refresh cache once to avoid false negatives.
    const refreshed = await getProjectCache(opts, true);
    optionId = refreshed.statusOptions[statusName];
  }
  if (!optionId) {
    const valid = Object.keys(cache.statusOptions).sort().join(", ");
    die(`Unknown status "${statusNameRaw}". Valid: ${valid}`);
  }

  // `item-add` is idempotent and returns a ProjectV2Item id (PVTI_*).
  const ensureCmd = [
    "gh",
    "project",
    "item-add",
    String(opts.projectNumber),
    "--owner",
    opts.owner,
    "--url",
    url,
    "--format",
    "json",
    "--jq",
    ".id",
  ];
  let itemId: string;
  if (opts.dryRun) {
    itemId = "<dry-run>";
  } else {
    const ensured = await run(ensureCmd, { quiet: true });
    if (ensured.exitCode !== 0) die(`Failed to ensure item in project for ${url}\n${(ensured.stderr || ensured.stdout || "").trim()}`);
    itemId = ensured.stdout.trim();
  }

  const cmd = [
    "gh",
    "project",
    "item-edit",
    "--id",
    itemId,
    "--field-id",
    cache.statusFieldId,
    "--project-id",
    cache.projectId,
    "--single-select-option-id",
    optionId,
  ];

  if (opts.dryRun) {
    if (opts.format === "text" && !opts.quiet) console.log(cmd.join(" "));
    if (opts.format === "json") {
      console.log(JSON.stringify({ url, status: statusNameRaw.trim(), dryRun: true, command: cmd.join(" "), ensure: ensureCmd.join(" ") }));
    }
    return;
  }

  const r = await run(cmd, { quiet: true });
  if (r.exitCode !== 0) die(`Failed to set status for ${url}`);

  if (opts.format === "json") {
    console.log(JSON.stringify({ url, status: statusNameRaw.trim(), itemId, ok: true }));
    return;
  }

  if (!opts.quiet) {
    console.log(`${url} -> ${statusNameRaw.trim()}`);
  }
}

function parseBucketsToRows(result: any): any[] {
  const totals = result?.buckets?.totals;
  const seriesGroups = result?.buckets?.series?.[0]?.groups;
  const groups = Array.isArray(totals) ? totals : Array.isArray(seriesGroups) ? seriesGroups : [];

  return groups.map((g: any) => {
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(g.group ?? {})) {
      if (k.startsWith("_tmp")) continue;
      row[k] = v;
    }
    for (const a of g.aggregations ?? []) {
      if (!a?.op) continue;
      row[a.op] = a.value;
    }
    return row;
  });
}

async function runLogBeastRaw(apl: string, opts: GlobalOpts): Promise<any> {
  if (!fs.existsSync(LOG_BEAST_CLI)) {
    die(`log-beast CLI not found at ${LOG_BEAST_CLI}`);
  }

  const timeArgs = getLogBeastTimeArgs(opts);
  const r = await run(
    [
      "bun",
      "run",
      LOG_BEAST_CLI,
      "raw",
      apl,
      ...timeArgs,
      "--format",
      "json",
      "--quiet",
    ],
    { quiet: true },
  );
  if (r.exitCode !== 0) die(`log-beast raw failed\n${r.stderr || r.stdout}`);
  return safeJsonParse<any>(r.stdout, "log-beast raw");
}

async function getLogsStoryResult(opts: GlobalOpts): Promise<any> {
  // Story pack: a handful of fixed queries that quantify the perf narrative.
  const filter = `["request.host"] startswith "egghead.io"`;
  const structured = `["message"] startswith "{"`;

  const timeRange = normalizeTimeRange(opts);
  const qCoverage = `["vercel"] | where ${filter} and ["vercel.source"] == "lambda" | summarize total=count(), structured=countif(${structured}) | extend structured_pct=100.0 * todouble(structured) / todouble(total)`;

  const events = [
    "lesson.loadLesson.summary",
    "lesson.loadLessonMetadataFromGraphQL.graphql",
    "lesson.loadLessonComments.graphql",
    "lesson.loadLessonMetadataFromSanity.groq",
    "course.loadPlaylist.summary",
    "course.loadResourcesForCourse.summary",
    "trpc.call",
    "lesson.trpc.getLessonbySlug.result",
    "search_ssr_cache",
  ];
  const eventList = events.map(e => `"${e}"`).join(", ");

  const qEventStats = `["vercel"] | where ${filter} and ["vercel.source"] == "lambda" and ${structured} | extend msg=parse_json(["message"]) | where tostring(msg.event) in (${eventList}) | extend duration_ms=todouble(msg.duration_ms) | extend is_error=isnotnull(msg.error_message) or isnotnull(msg.error) or tostring(msg.ok) == "false" | summarize calls=count(), avg_ms=avg(duration_ms), p95_ms=percentile(duration_ms, 95), errors=countif(is_error) by event=tostring(msg.event) | order by calls desc`;

  const qSearchCache = `["vercel"] | where ${filter} and ["vercel.source"] == "lambda" and ${structured} | extend msg=parse_json(["message"]) | where tostring(msg.event) == "search_ssr_cache" | summarize hits=countif(tostring(msg.status) == "hit"), misses=countif(tostring(msg.status) == "miss"), errs=countif(tostring(msg.status) == "error"), total=count() | extend hit_rate=100.0 * todouble(hits) / todouble(total)`;

  const qTrpcTax = `["vercel"] | where ${filter} and ["vercel.source"] == "lambda" and ${structured} | extend msg=parse_json(["message"]) | where tostring(msg.event) == "trpc.call" | summarize total=count(), feature_flag=countif(tostring(msg.path) startswith "featureFlag."), with_token=countif(tostring(msg.has_token) == "true") | extend feature_flag_pct=100.0 * todouble(feature_flag) / todouble(total)`;

  const qTrpcTop = `["vercel"] | where ${filter} and ["vercel.source"] == "lambda" and ${structured} | extend msg=parse_json(["message"]) | where tostring(msg.event) == "trpc.call" | extend duration_ms=todouble(msg.duration_ms) | summarize calls=count(), avg_ms=avg(duration_ms), p95_ms=percentile(duration_ms, 95) by path=tostring(msg.path) | order by calls desc | limit 15`;

  const qLessonRefetch = `["vercel"] | where ${filter} and ["vercel.source"] == "lambda" and ${structured} | extend msg=parse_json(["message"]) | where tostring(msg.event) == "lesson.trpc.getLessonbySlug.result" | summarize total=count(), with_token=countif(tostring(msg.has_token) == "true") | extend with_token_pct=100.0 * todouble(with_token) / todouble(total)`;

  const qLessonSourceUtil = `["vercel"] | where ${filter} and ["vercel.source"] == "lambda" and ${structured} | extend msg=parse_json(["message"]) | where tostring(msg.event) == "lesson.loadLesson.summary" | summarize total=count(), has_sanity=countif(tostring(msg.has_sanity) == "true"), has_graphql=countif(tostring(msg.has_graphql) == "true"), has_coursebuilder=countif(tostring(msg.has_coursebuilder) == "true") | extend sanity_pct=100.0 * todouble(has_sanity) / todouble(total), graphql_pct=100.0 * todouble(has_graphql) / todouble(total), coursebuilder_pct=100.0 * todouble(has_coursebuilder) / todouble(total)`;

  const qLessonGraphqlErrorStats = `["vercel"] | where ${filter} and ["vercel.source"] == "lambda" and ${structured} | extend msg=parse_json(["message"]) | where tostring(msg.event) == "lesson.loadLessonMetadataFromGraphQL.graphql" and isnotnull(msg.error_message) | extend is_404=tostring(msg.error_message) contains "Code: 404" | summarize total_errors=count(), errors_404=countif(is_404) | extend errors_other=total_errors - errors_404`;

  const qLessonGraphqlErrorSlugs = `["vercel"] | where ${filter} and ["vercel.source"] == "lambda" and ${structured} | extend msg=parse_json(["message"]) | where tostring(msg.event) == "lesson.loadLessonMetadataFromGraphQL.graphql" and isnotnull(msg.error_message) | summarize errors=count() by slug=tostring(msg.slug) | order by errors desc | limit 15`;

  const [
    coverage,
    eventStats,
    searchCache,
    trpcTax,
    trpcTop,
    lessonRefetch,
    lessonSourceUtil,
    lessonGraphqlErrorStats,
    lessonGraphqlErrorSlugs,
  ] = await Promise.all([
    runLogBeastRaw(qCoverage, opts),
    runLogBeastRaw(qEventStats, opts),
    runLogBeastRaw(qSearchCache, opts),
    runLogBeastRaw(qTrpcTax, opts),
    runLogBeastRaw(qTrpcTop, opts),
    runLogBeastRaw(qLessonRefetch, opts),
    runLogBeastRaw(qLessonSourceUtil, opts),
    runLogBeastRaw(qLessonGraphqlErrorStats, opts),
    runLogBeastRaw(qLessonGraphqlErrorSlugs, opts),
  ]);

  return {
    hours: timeRange.hours,
    since: timeRange.since,
    until: timeRange.until,
    coverage: parseBucketsToRows(coverage.data.result)[0] ?? null,
    eventStats: parseBucketsToRows(eventStats.data.result),
    searchCache: parseBucketsToRows(searchCache.data.result)[0] ?? null,
    trpcTax: parseBucketsToRows(trpcTax.data.result)[0] ?? null,
    trpcTop: parseBucketsToRows(trpcTop.data.result),
    lessonRefetch: parseBucketsToRows(lessonRefetch.data.result)[0] ?? null,
    lessonSourceUtil: parseBucketsToRows(lessonSourceUtil.data.result)[0] ?? null,
    lessonGraphqlErrorStats: parseBucketsToRows(lessonGraphqlErrorStats.data.result)[0] ?? null,
    lessonGraphqlErrorSlugs: parseBucketsToRows(lessonGraphqlErrorSlugs.data.result),
  };
}

async function cmdLogsStory(opts: GlobalOpts): Promise<void> {
  const result = await getLogsStoryResult(opts);

  if (opts.format === "json") {
    console.log(JSON.stringify(result));
    return;
  }

  if (!opts.quiet) console.log(`log story (last ${opts.hours}h)`);
  if (!opts.quiet) console.log(`structured coverage: ${result.coverage?.structured_pct?.toFixed?.(1) ?? "?"}%`);

  if (!opts.quiet) console.log("\nTop event stats:");
  for (const r of result.eventStats.slice(0, 12)) {
    const avg = typeof r.avg_ms === "number" ? `${r.avg_ms.toFixed(0)}ms` : "n/a";
    const p95 = typeof r.p95_ms === "number" ? `${r.p95_ms.toFixed(0)}ms` : "n/a";
    console.log(`- ${r.event}: calls=${r.calls} avg=${avg} p95=${p95} errors=${r.errors}`);
  }
}

async function cmdLogsTrace(opts: GlobalOpts, requestId: string, passthrough: string[]): Promise<void> {
  if (!requestId) die("logs trace: missing <request_id>");
  if (!fs.existsSync(LOG_BEAST_CLI)) die(`log-beast CLI not found at ${LOG_BEAST_CLI}`);

  // pass-through wrapper, still uses opts.hours and log-beast formatting
  const timeArgs = getLogBeastTimeArgs(opts);
  const args = ["bun", "run", LOG_BEAST_CLI, "trace", "--filter", requestId, ...timeArgs, ...passthrough];
  if (opts.format === "json") args.push("--format", "json", "--quiet");
  const exitCode = await runInherit(args);
  process.exit(exitCode);
}

async function runLogBeastCommand(
  command: string,
  tr: EffectiveTimeRange,
  extraArgs: string[] = [],
): Promise<any> {
  if (!fs.existsSync(LOG_BEAST_CLI)) die(`log-beast CLI not found at ${LOG_BEAST_CLI}`);
  const r = await run(
    [
      "bun",
      "run",
      LOG_BEAST_CLI,
      command,
      "--since",
      tr.since,
      "--until",
      tr.until,
      "--format",
      "json",
      "--quiet",
      ...extraArgs,
    ],
    { quiet: true },
  );
  const stdout = r.stdout.trim();
  if (!stdout) die(`log-beast ${command} returned no output\n${(r.stderr || "").trim()}`);

  // log-beast commands intentionally use non-zero exit codes to signal "bad status"
  // (e.g. `errors` sets exitCode when error rows exist). For agent workflows, we still
  // want the JSON payload even when exitCode != 0.
  const parsed = safeJsonParse<any>(stdout, `log-beast ${command}`);
  return { ...parsed, exitCode: r.exitCode };
}

function storyByEvent(story: any): Record<string, any> {
  const map: Record<string, any> = {};
  for (const row of story?.eventStats ?? []) {
    if (!row?.event) continue;
    map[String(row.event)] = row;
  }
  return map;
}

function asFiniteNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
}

function diffNumber(now: unknown, prev: unknown): { now: number | null; prev: number | null; delta: number | null } {
  const nn = asFiniteNumber(now);
  const pp = asFiniteNumber(prev);
  const d = nn != null && pp != null ? nn - pp : null;
  return { now: nn, prev: pp, delta: d };
}

type AnalysisFullArgs = {
  compare: boolean;
  advance: boolean;
  noAdvance: boolean;
  commentRefs: string[];
};

function parseAnalysisFullArgs(args: string[]): AnalysisFullArgs {
  const res: AnalysisFullArgs = {
    compare: false,
    advance: false,
    noAdvance: false,
    commentRefs: [],
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--compare") {
      res.compare = true;
      continue;
    }
    if (a === "--advance") {
      res.advance = true;
      continue;
    }
    if (a === "--no-advance") {
      res.noAdvance = true;
      continue;
    }
    if (a === "--comment") {
      const ref = args[++i];
      if (!ref || ref.startsWith("-")) die("analysis full --comment: missing <issueRef> (use repo:num or full URL)");
      res.commentRefs.push(ref);
      continue;
    }
  }

  return res;
}

function parseGitHubIssueUrl(issueUrl: string): { owner: string; repo: string; number: number } {
  let u: URL;
  try {
    u = new URL(issueUrl);
  } catch {
    die(`Invalid GitHub URL: ${issueUrl}`);
  }

  const parts = u.pathname.split("/").filter(Boolean);
  // /{owner}/{repo}/issues/{n} or /{owner}/{repo}/pull/{n}
  if (parts.length < 4) die(`Unsupported GitHub issue URL: ${issueUrl}`);
  const [owner, repo, kind, num] = parts;
  if (kind !== "issues" && kind !== "pull") die(`Unsupported GitHub URL type (expected issues/pull): ${issueUrl}`);
  const n = Number(num);
  if (!Number.isFinite(n) || n <= 0) die(`Unsupported GitHub issue URL (bad number): ${issueUrl}`);
  return { owner, repo, number: n };
}

function formatPct(n: unknown, digits = 1): string {
  const v = typeof n === "number" ? n : n == null ? NaN : Number(n);
  if (!Number.isFinite(v)) return "?";
  return `${v.toFixed(digits)}%`;
}

function formatMs(n: unknown): string {
  const v = typeof n === "number" ? n : n == null ? NaN : Number(n);
  if (!Number.isFinite(v)) return "?";
  return `${Math.round(v)}ms`;
}

function formatCount(n: unknown): string {
  const v = typeof n === "number" ? n : n == null ? NaN : Number(n);
  if (!Number.isFinite(v)) return "?";
  return v.toLocaleString();
}

function pickTop<T>(arr: T[] | undefined, n: number): T[] {
  return Array.isArray(arr) ? arr.slice(0, n) : [];
}

function buildAnalysisMarker(tr: EffectiveTimeRange, compare: boolean): string {
  // Cursor runs advance `since` on each successful run, so `since` alone is a stable idempotency key.
  // (Avoid spamming comments because `until=now` changes every run.)
  if (tr.source === "cursor") {
    return `<!-- migrate-egghead:analysis-full since=${tr.since} compare=${compare ? "1" : "0"} -->`;
  }
  return `<!-- migrate-egghead:analysis-full since=${tr.since} until=${tr.until} compare=${compare ? "1" : "0"} -->`;
}

function buildAnalysisCommentBody(analysis: any, marker: string): string {
  const tr = analysis?.timeRange as EffectiveTimeRange;
  const frontend = analysis?.frontend?.data ?? {};
  const backendDash = analysis?.backend?.dashboard?.data ?? {};
  const backendErrors = analysis?.backend?.errors?.data ?? {};
  const story = analysis?.story ?? {};
  const compare = analysis?.compare ?? null;

  const cache = frontend.cache ?? {};
  const topRoutes = pickTop(frontend.routes, 6).map((r: any) => `${r.route} (${formatCount(r.count)})`).join(", ");
  const top500 = pickTop(frontend.errors, 6).map((r: any) => `${r.route} (${formatCount(r.count)})`).join(", ");

  const byEvent = storyByEvent(story);
  const lesson = byEvent["lesson.loadLesson.summary"];
  const lessonGql = byEvent["lesson.loadLessonMetadataFromGraphQL.graphql"];
  const courseRes = byEvent["course.loadResourcesForCourse.summary"];

  const gqlErr = story.lessonGraphqlErrorStats ?? {};
  const gqlSlugs = pickTop(story.lessonGraphqlErrorSlugs, 5)
    .map((s: any) => `${s.slug} (${formatCount(s.errors)})`)
    .join(", ");

  const lines: string[] = [];
  lines.push(marker);
  lines.push("");
  lines.push("## Agent Report: Analysis Full");
  lines.push("");
  lines.push(`**Window:** \`${tr.since}\` -> \`${tr.until}\` (\`${tr.hours.toFixed(2)}h\`, source=\`${tr.source}\`)`);
  lines.push("");
  lines.push("### Frontend (Vercel)");
  lines.push(`- Cache: hitRate=${cache.hitRate ?? "?"}% missRate=${cache.missRate ?? "?"}% (hits=${formatCount(cache.hits)} misses=${formatCount(cache.misses)})`);
  lines.push(`- 500s top routes: ${top500 || "(none)"}`);
  lines.push(`- Top routes: ${topRoutes || "(unknown)"}`);
  lines.push("");
  lines.push("### Structured Story (Lambda JSON Events)");
  lines.push(`- Structured coverage: ${formatPct(story?.coverage?.structured_pct, 1)} (${formatCount(story?.coverage?.structured)}/${formatCount(story?.coverage?.total)})`);
  lines.push(`- Search SSR cache: hit_rate=${formatPct(story?.searchCache?.hit_rate, 2)} (hit=${formatCount(story?.searchCache?.hits)} miss=${formatCount(story?.searchCache?.misses)})`);
  lines.push(`- tRPC feature-flag tax: ${formatPct(story?.trpcTax?.feature_flag_pct, 1)} (${formatCount(story?.trpcTax?.feature_flag)}/${formatCount(story?.trpcTax?.total)})`);
  if (lesson) lines.push(`- lesson.loadLesson.summary: calls=${formatCount(lesson.calls)} avg=${formatMs(lesson.avg_ms)} p95=${formatMs(lesson.p95_ms)}`);
  if (lessonGql) lines.push(`- lesson.loadLessonMetadataFromGraphQL.graphql: calls=${formatCount(lessonGql.calls)} avg=${formatMs(lessonGql.avg_ms)} p95=${formatMs(lessonGql.p95_ms)} errors=${formatCount(lessonGql.errors)}`);
  if (courseRes) lines.push(`- course.loadResourcesForCourse.summary: calls=${formatCount(courseRes.calls)} avg=${formatMs(courseRes.avg_ms)} p95=${formatMs(courseRes.p95_ms)}`);
  lines.push(`- GraphQL lesson metadata errors: total=${formatCount(gqlErr.total_errors)} 404=${formatCount(gqlErr.errors_404)} other=${formatCount(gqlErr.errors_other)}`);
  if (gqlSlugs) lines.push(`- Worst GraphQL slugs: ${gqlSlugs}`);
  lines.push("");
  lines.push("### Backend (Rails)");
  lines.push(`- totalEvents=${formatCount(backendDash.totalEvents)} activeWorkers=${formatCount(backendDash.activeWorkers)} errorTypes=${formatCount(backendDash.errorTypes)}`);
  const topErrRows = pickTop(backendErrors.rows, 5)
    .map((r: any) => `${r.group?.["unknown.event"] ?? "?"} ${r.group?.["unknown.error_class"] ?? "?"} (${formatCount(r.count)})`)
    .join(", ");
  if (topErrRows) lines.push(`- Top errors: ${topErrRows}`);

  if (compare?.deltas) {
    lines.push("");
    lines.push("### Deltas (Previous Window)");
    lines.push(`- Structured coverage delta: ${formatPct(compare.deltas.structured_pct?.delta, 2)}`);
    lines.push(`- Search hit_rate delta: ${formatPct(compare.deltas.search_hit_rate?.delta, 2)}`);
    lines.push(`- tRPC feature-flag pct delta: ${formatPct(compare.deltas.trpc_feature_flag_pct?.delta, 2)}`);
  }

  // Keep it tight and deterministic.
  lines.push("");
  lines.push("_Generated by `bun tools/me.ts analysis full` (agent-only)._");
  lines.push("");
  return lines.join("\n");
}

type CommentResult = {
  issueUrl: string;
  marker: string;
  skipped: boolean;
  posted: boolean;
  reason?: string;
  commentUrl?: string;
  commentId?: number;
  error?: string;
};

async function ensureIssueComment(opts: GlobalOpts, issueUrl: string, marker: string, body: string): Promise<CommentResult> {
  const { owner, repo, number } = parseGitHubIssueUrl(issueUrl);

  const list = await run(["gh", "api", `repos/${owner}/${repo}/issues/${number}/comments?per_page=100`], { quiet: true });
  if (list.exitCode !== 0) {
    return { issueUrl, marker, skipped: false, posted: false, error: (list.stderr || list.stdout || "gh api failed").trim() };
  }
  const comments = safeJsonParse<any[]>(list.stdout, "gh api issue comments");
  const already = comments.some(c => typeof c?.body === "string" && c.body.includes(marker));
  if (already) {
    return { issueUrl, marker, skipped: true, posted: false, reason: "marker already present in recent comments" };
  }

  if (opts.dryRun) {
    return { issueUrl, marker, skipped: false, posted: false, reason: "dry-run" };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "me-analysis-comment-"));
  const bodyPath = path.join(tmpDir, "body.md");
  try {
    fs.writeFileSync(bodyPath, body, "utf8");
    const post = await run(
      ["gh", "api", `repos/${owner}/${repo}/issues/${number}/comments`, "-F", `body=@${bodyPath}`],
      { quiet: true },
    );
    if (post.exitCode !== 0) {
      return { issueUrl, marker, skipped: false, posted: false, error: (post.stderr || post.stdout || "gh api post failed").trim() };
    }
    const created = safeJsonParse<any>(post.stdout, "gh api post issue comment");
    return {
      issueUrl,
      marker,
      skipped: false,
      posted: true,
      commentUrl: created.html_url,
      commentId: created.id,
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

async function cmdAnalysisFull(opts: GlobalOpts, args: string[]): Promise<void> {
  const parsedArgs = parseAnalysisFullArgs(args);
  const compare = parsedArgs.compare;
  const advanceFlag = parsedArgs.advance;
  const noAdvanceFlag = parsedArgs.noAdvance;
  const commentRefs = parsedArgs.commentRefs;

  const tr = getEffectiveTimeRange(opts);
  const shouldAdvance = noAdvanceFlag ? false : advanceFlag ? true : tr.source !== "explicit";

  const [frontend, backendDashboard, backendErrors] = await Promise.all([
    runLogBeastCommand("frontend", tr),
    runLogBeastCommand("dashboard", tr),
    runLogBeastCommand("errors", tr),
  ]);

  const storyOpts: GlobalOpts = { ...opts, since: tr.since, until: tr.until, format: "json", quiet: true };
  const story = await getLogsStoryResult(storyOpts);

  let compareResult: any = null;
  if (compare) {
    const windowMs = Date.parse(tr.until) - Date.parse(tr.since);
    if (Number.isFinite(windowMs) && windowMs > 0) {
      const prevUntil = tr.since;
      const prevSince = new Date(Date.parse(prevUntil) - windowMs).toISOString();
      const prevStory = await getLogsStoryResult({ ...storyOpts, since: prevSince, until: prevUntil });

      const nowBy = storyByEvent(story);
      const prevBy = storyByEvent(prevStory);
      const events = Array.from(new Set([...Object.keys(nowBy), ...Object.keys(prevBy)])).sort();

      compareResult = {
        previousRange: { since: prevSince, until: prevUntil, hours: computeHours(prevSince, prevUntil) },
        deltas: {
          structured_pct: diffNumber(story?.coverage?.structured_pct, prevStory?.coverage?.structured_pct),
          search_hit_rate: diffNumber(story?.searchCache?.hit_rate, prevStory?.searchCache?.hit_rate),
          trpc_feature_flag_pct: diffNumber(story?.trpcTax?.feature_flag_pct, prevStory?.trpcTax?.feature_flag_pct),
        },
        eventDeltas: events.map(ev => ({
          event: ev,
          calls: diffNumber(nowBy[ev]?.calls, prevBy[ev]?.calls),
          avg_ms: diffNumber(nowBy[ev]?.avg_ms, prevBy[ev]?.avg_ms),
          p95_ms: diffNumber(nowBy[ev]?.p95_ms, prevBy[ev]?.p95_ms),
          errors: diffNumber(nowBy[ev]?.errors, prevBy[ev]?.errors),
        })),
      };
    }
  }

  const ghRate = await run(["gh", "api", "rate_limit", "--jq", ".resources.graphql | {limit,remaining,reset}"], { quiet: true });
  const ghRateJson = ghRate.exitCode === 0 ? safeJsonParse<any>(ghRate.stdout, "gh api rate_limit") : null;

  const result = {
    timeRange: tr,
    cursor: {
      path: CURSOR_CACHE_PATH,
      used: tr.cursorUsed,
      clamped: tr.cursorClamped,
      originalSince: tr.cursorOriginalSince,
      maxHours: CURSOR_MAX_HOURS,
      shouldAdvance,
    },
    frontend,
    backend: {
      dashboard: backendDashboard,
      errors: backendErrors,
    },
    story,
    compare: compareResult,
    gh: { graphqlRate: ghRateJson },
  };

  let commentResults: CommentResult[] = [];
  if (commentRefs.length > 0) {
    const marker = buildAnalysisMarker(tr, compare);
    const body = buildAnalysisCommentBody(result, marker);
    const issueUrls = commentRefs.map(ref => toIssueUrl(opts.owner, ref));
    commentResults = await Promise.all(issueUrls.map(u => ensureIssueComment(opts, u, marker, body)));
    (result as any).comment = {
      marker,
      targets: issueUrls,
      results: commentResults,
      dryRun: opts.dryRun,
    };
  }

  if (shouldAdvance) {
    writeCursor({
      version: 1,
      updatedAt: new Date().toISOString(),
      lastSince: tr.since,
      lastUntil: tr.until,
    });
  }

  if (opts.format === "json") {
    console.log(JSON.stringify(result));
    return;
  }

  console.log(`analysis full: ${tr.since} -> ${tr.until} (${tr.hours.toFixed(2)}h) [${tr.source}]`);
  if (tr.cursorUsed) console.log(`cursor: ${CURSOR_CACHE_PATH}${tr.cursorClamped ? " (clamped)" : ""}`);
  console.log(
    `frontend cache hitRate=${frontend?.data?.cache?.hitRate ?? "?"}% missRate=${frontend?.data?.cache?.missRate ?? "?"}% 500s=${(frontend?.data?.statusCodes ?? []).find((s: any) => s.status === 500)?.count ?? "?"}`,
  );
  console.log(
    `backend totalEvents=${backendDashboard?.data?.totalEvents ?? "?"} activeWorkers=${backendDashboard?.data?.activeWorkers ?? "?"}`,
  );
  console.log(`structured coverage=${story?.coverage?.structured_pct?.toFixed?.(1) ?? "?"}%`);
  console.log(
    `search hit_rate=${story?.searchCache?.hit_rate?.toFixed?.(2) ?? "?"}% trpc feature_flag_pct=${story?.trpcTax?.feature_flag_pct?.toFixed?.(1) ?? "?"}%`,
  );

  if (commentResults.length > 0) {
    const posted = commentResults.filter(r => r.posted).length;
    const skipped = commentResults.filter(r => r.skipped).length;
    const errored = commentResults.filter(r => r.error).length;
    console.log(`comments: posted=${posted} skipped=${skipped} errors=${errored}`);
    for (const r of commentResults) {
      if (r.posted) console.log(`- posted: ${r.commentUrl ?? r.issueUrl}`);
      else if (r.skipped) console.log(`- skipped: ${r.issueUrl} (${r.reason ?? "already"})`);
      else if (r.error) console.log(`- error: ${r.issueUrl} (${r.error})`);
    }
  }
}

async function cmdCursorShow(opts: GlobalOpts): Promise<void> {
  const c = readCursor();
  const result = { cursorPath: CURSOR_CACHE_PATH, exists: Boolean(c), cursor: c };
  if (opts.format === "json") {
    console.log(JSON.stringify(result));
    return;
  }
  console.log(`cursor: ${CURSOR_CACHE_PATH}`);
  if (!c) {
    console.log("(missing)");
    return;
  }
  console.log(`lastUntil: ${c.lastUntil}`);
}

async function cmdCursorSet(opts: GlobalOpts, iso: string): Promise<void> {
  if (!iso) die("cursor set: missing <iso>");
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) die(`cursor set: invalid ISO time: ${iso}`);
  const until = new Date(ms).toISOString();
  const cursor: AnalysisCursor = {
    version: 1,
    updatedAt: new Date().toISOString(),
    lastUntil: until,
  };
  writeCursor(cursor);

  if (opts.format === "json") {
    console.log(JSON.stringify({ ok: true, cursorPath: CURSOR_CACHE_PATH, cursor }));
    return;
  }
  console.log(`cursor set: ${until}`);
}

async function cmdCursorClear(opts: GlobalOpts): Promise<void> {
  clearCursor();
  if (opts.format === "json") {
    console.log(JSON.stringify({ ok: true, cursorPath: CURSOR_CACHE_PATH, cleared: true }));
    return;
  }
  console.log("cursor cleared");
}

async function cmdSync(opts: GlobalOpts): Promise<void> {
  await cmdLabelsEnsure(opts);
  await cmdProjectAdd(opts, PROJECT_SYNC_URLS);
}

async function main(): Promise<void> {
  const { opts, rest } = parseGlobal(process.argv.slice(2));
  const [cmd, sub, ...args] = rest;

  if (!cmd) {
    printHelp();
    process.exit(1);
  }

  if (cmd === "check") return cmdCheck(opts);
  if (cmd === "sync") return cmdSync(opts);

  if (cmd === "analysis" && sub === "full") return cmdAnalysisFull(opts, args);
  if (cmd === "full-analysis") return cmdAnalysisFull(opts, ["--compare"]);

  if (cmd === "cursor" && sub === "show") return cmdCursorShow(opts);
  if (cmd === "cursor" && sub === "set") return cmdCursorSet(opts, args[0]);
  if (cmd === "cursor" && sub === "clear") return cmdCursorClear(opts);

  if (cmd === "issues" && sub === "list") return cmdIssuesList(opts, args[0]);
  if (cmd === "labels" && sub === "ensure") return cmdLabelsEnsure(opts);

  if (cmd === "project" && sub === "add") return cmdProjectAdd(opts, args);
  if (cmd === "project" && sub === "list") return cmdProjectList(opts, args.join(" ").trim() || undefined);
  if (cmd === "project" && sub === "status") {
    const ref = args[0];
    const statusName = args.slice(1).join(" ").trim();
    if (!ref || !statusName) die("project status: usage: project status <ref> <Todo|In Progress|Done>");
    return cmdProjectStatus(opts, ref, statusName);
  }

  if (cmd === "logs" && sub === "story") return cmdLogsStory(opts);
  if (cmd === "logs" && sub === "trace") return cmdLogsTrace(opts, args[0], args.slice(1));

  if (cmd === "help") {
    printHelp();
    process.exit(0);
  }

  die(`Unknown command: ${[cmd, sub].filter(Boolean).join(" ")}`);
}

await main();
