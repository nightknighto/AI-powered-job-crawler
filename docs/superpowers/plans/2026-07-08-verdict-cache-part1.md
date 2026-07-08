# Verdict Cache — Part 1: Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent verdict cache so daily production runs skip re-filtering jobs already seen, sending only genuinely-new postings to the LLM.

**Architecture:** A new `VerdictCache` class (`src/state/verdict-cache.ts`) owns persistence mechanics only — load, lookup, reconstruct, set, save. Cache orchestration is a new explicit stage visible in `main.ts`'s per-site loop: crawl → partition (cached/new) → `evaluate(new only)` → reconstruct(cached) → merge → record → persist-once. `evaluate.ts` and `run-filter.ts` are **completely untouched** — `evaluate` always evaluates, stays 3 params, returns `{ evaluated, dropped }`. The eval path (`eval.ts`, `compare-models.ts`, `compare-prompts.ts`) never constructs a cache and stays deterministic. Part 1 is invisible in the report: same jobs, same summary covering all passing jobs, same reporter calls.

**Tech Stack:** TypeScript ESM (Node16 module resolution, `.js` import extensions), Node `fs`/`path`, Zod v4 (only for reusing `JobStatus` type). No new dependencies. Verification via `pnpm check` (tsc) and manual `pnpm start` / `pnpm eval` runs — there is no test runner in this project.

**Spec:** `docs/superpowers/specs/2026-07-08-verdict-cache-part1-design.md` (committed). Note: the spec's "caching inside evaluate.ts" section was superseded by the clean-code decision — caching is a stage in `main.ts`, `evaluate.ts` stays untouched. This plan reflects the revised architecture.

## Global Constraints

- **Import paths use `.js` extensions** even for `.ts` files (Node16 module resolution).
- **`evaluate.ts` and `run-filter.ts` are NOT modified.** Caching lives in `src/state/verdict-cache.ts` (mechanics) + `main.ts` (orchestration stage).
- **Eval path stays cache-free** — `eval.ts`, `compare-models.ts`, `compare-prompts.ts` untouched.
- **`EvaluatedJob<T>` type is unchanged.** Cached jobs reconstruct the identical `{ job, status, reason, experienceLevel, skills }` shape.
- **Dropped jobs are never cached** — they get no `set()` call and are re-evaluated next run.
- **`--refresh` preserves `firstSeenAt`** — updates verdict fields for known URLs but keeps original first-seen timestamp. Does NOT clear the store.
- **Pruning window = 30 days** (`PRUNE_AFTER_DAYS` constant).
- **Store location:** `state/verdict-cache.json`, gitignored. One global store.
- **No new dependencies.** Node built-ins + existing deps only.
- **Documentation is mandatory** per `AGENTS.md`.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/state/verdict-cache.ts` | Create | `VerdictCache` class + `CachedVerdict`/`VerdictStore` types. Mechanics only. |
| `src/state/README.md` | Create | Document the cache module. |
| `src/main.ts` | Modify | New cache stage in per-site loop + `--refresh`. Summary + reporter calls unchanged. |
| `.gitignore` | Modify | Add `state/`. |
| `src/pipeline/README.md` | Modify | Document the new cache stage + `--refresh`. |
| `AGENTS.md` | Modify | New "Verdict Cache" pattern; `state/` in file tree; `--refresh`; eval-path note. |
| `README.md` | Modify | `--refresh` in usage; architecture mention. |

**Files NOT touched:** `evaluate.ts`, `run-filter.ts`, `generate-summary.ts`, `eval.ts`, `compare-models.ts`, `compare-prompts.ts`, all reporters, `config.ts`, all crawlers, all types.

---

## Task Interfaces

```ts
// src/state/verdict-cache.ts — Task 1 produces, Task 2 consumes
export interface CachedVerdict {
    status: JobStatus; reason: string[]; experienceLevel?: string; skills?: string[];
    firstSeenAt: string; site: string;
}
export interface VerdictStore { version: 1; entries: Record<string, CachedVerdict>; }
export const VERDICT_CACHE_PATH = "state/verdict-cache.json";
export const PRUNE_AFTER_DAYS = 30;
export class VerdictCache {
    static load(): VerdictCache;
    has(url: string): boolean;
    toEvaluatedJob<T extends BaseJob>(job: T): EvaluatedJob<T> | undefined;
    set<T extends BaseJob>(evaluatedJob: EvaluatedJob<T>, now?: Date): void;
    save(now?: Date): void;
}
```

---

### Task 1: Create the `VerdictCache` module

**Files:** Create `src/state/verdict-cache.ts`, Create `src/state/README.md`, Modify `.gitignore`

- [ ] **Step 1: Create `src/state/verdict-cache.ts`** with this content:

```ts
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import type { BaseJob } from "../types/base.js";
import type { EvaluatedJob, JobStatus } from "../types/evaluated-job.js";

/** Path to the on-disk verdict cache, relative to cwd (same convention as `reports/`). */
export const VERDICT_CACHE_PATH = "state/verdict-cache.json";

/** Entries older than this (by `firstSeenAt`) are pruned on `save()`. */
export const PRUNE_AFTER_DAYS = 30;

/** One stored verdict. Verdict fields mirror the LLM-output fields of {@link EvaluatedJob}. */
export interface CachedVerdict {
    status: JobStatus;
    reason: string[];
    experienceLevel?: string;
    skills?: string[];
    /** ISO timestamp of the run that first evaluated this URL. Used for pruning + debugging. */
    firstSeenAt: string;
    /** Origin site key (GoldenSiteKey value). For debugging/pruning only — not a lookup key. */
    site: string;
}

/** On-disk shape. `version` enables future migrations. */
export interface VerdictStore {
    version: 1;
    entries: Record<string, CachedVerdict>;
}

/** Persists LLM filter verdicts by `jobURL` so daily runs skip re-filtering seen jobs.
 *
 * This class owns **mechanics only**: loading, lookup, reconstruction, recording, and persisting
 * verdicts. It does NOT decide when to call the LLM or how to merge cached vs fresh results —
 * that orchestration lives in `main.ts` as an explicit pipeline stage. `evaluate.ts` is never
 * aware of the cache.
 *
 * - Missing or corrupt store file → empty cache (warns, does not throw).
 * - Dropped jobs are never recorded (no `set()` call); they are re-evaluated next run.
 * - `set()` on an existing URL updates verdict fields but **preserves the original `firstSeenAt`**
 *   (pruning age is from first evaluation, not last refresh).
 * - `save()` prunes entries older than {@link PRUNE_AFTER_DAYS} days, then writes atomically
 *   (temp file + rename) so a crash mid-write cannot corrupt the store.
 */
export class VerdictCache {
    private entries: Map<string, CachedVerdict>;

    private constructor(entries: Map<string, CachedVerdict>) {
        this.entries = entries;
    }

    /** Load the cache from {@link VERDICT_CACHE_PATH}. Missing/corrupt → empty cache (warn). */
    static load(): VerdictCache {
        if (!existsSync(VERDICT_CACHE_PATH)) {
            return new VerdictCache(new Map());
        }
        try {
            const raw = readFileSync(VERDICT_CACHE_PATH, "utf-8");
            const parsed = JSON.parse(raw) as VerdictStore;
            if (!parsed || typeof parsed !== "object" || !parsed.entries || typeof parsed.entries !== "object") {
                throw new Error("store JSON is not a valid VerdictStore");
            }
            const map = new Map<string, CachedVerdict>();
            for (const [url, v] of Object.entries(parsed.entries)) {
                if (v && typeof v.status === "string" && Array.isArray(v.reason) && typeof v.firstSeenAt === "string") {
                    map.set(url, v as CachedVerdict);
                }
            }
            return new VerdictCache(map);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`⚠️  Verdict cache unreadable (${msg}), starting fresh.`);
            return new VerdictCache(new Map());
        }
    }

    /** True if the URL has a stored verdict. */
    has(url: string): boolean {
        return this.entries.has(url);
    }

    /** Reconstruct an {@link EvaluatedJob} from a cached verdict + a freshly-crawled job body.
     *
     * The `job` argument is TODAY's crawl (fresh `date`/`jobDetails`/etc.); the cached verdict
     * fields (`status`, `reason`, `experienceLevel`, `skills`) are stamped onto it. Returns
     * `undefined` if the URL isn't cached (shouldn't happen if `has()` was checked first). */
    toEvaluatedJob<T extends BaseJob>(job: T): EvaluatedJob<T> | undefined {
        const v = this.entries.get(job.jobURL);
        if (!v) return undefined;
        return {
            job,
            status: v.status,
            reason: v.reason,
            ...(v.experienceLevel !== undefined ? { experienceLevel: v.experienceLevel } : {}),
            ...(v.skills !== undefined ? { skills: v.skills } : {}),
        };
    }

    /** Record a fresh verdict extracted from an {@link EvaluatedJob}.
     *
     * If the URL already has an entry, updates verdict fields but **preserves the original
     * `firstSeenAt`** (so pruning age is measured from first evaluation, not last refresh).
     * If new, sets `firstSeenAt = now` (default: current time). */
    set<T extends BaseJob>(evaluatedJob: EvaluatedJob<T>, now: Date = new Date()): void {
        const url = evaluatedJob.job.jobURL;
        const existing = this.entries.get(url);
        const verdict: CachedVerdict = {
            status: evaluatedJob.status,
            reason: evaluatedJob.reason,
            ...(evaluatedJob.experienceLevel !== undefined ? { experienceLevel: evaluatedJob.experienceLevel } : {}),
            ...(evaluatedJob.skills !== undefined ? { skills: evaluatedJob.skills } : {}),
            firstSeenAt: existing?.firstSeenAt ?? now.toISOString(),
            site: evaluatedJob.job.site,
        };
        this.entries.set(url, verdict);
    }

    /** Persist to disk atomically: prune old entries, write a temp file, then rename. */
    save(now: Date = new Date()): void {
        // Prune entries older than PRUNE_AFTER_DAYS.
        const cutoff = now.getTime() - PRUNE_AFTER_DAYS * 24 * 60 * 60 * 1000;
        for (const [url, v] of this.entries) {
            const ts = Date.parse(v.firstSeenAt);
            if (Number.isNaN(ts) || ts < cutoff) {
                this.entries.delete(url);
            }
        }

        const store: VerdictStore = {
            version: 1,
            entries: Object.fromEntries(this.entries),
        };

        const absDir = join(process.cwd(), dirname(VERDICT_CACHE_PATH));
        const absPath = join(process.cwd(), VERDICT_CACHE_PATH);
        const absTmp = absPath + ".tmp";
        try {
            mkdirSync(absDir, { recursive: true });
            writeFileSync(absTmp, JSON.stringify(store, null, 2), "utf-8");
            renameSync(absTmp, absPath);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`⚠️  Could not persist verdict cache: ${msg}`);
        }
    }
}
```

- [ ] **Step 2: Type-check** — Run `pnpm check`. Expected: PASS.

- [ ] **Step 3: Smoke-test round-trip** — Create throwaway `src/state/_smoke.ts`:

```ts
import { VerdictCache } from "./verdict-cache.js";
import type { BaseJob } from "../types/base.js";
import type { EvaluatedJob } from "../types/evaluated-job.js";

const job: BaseJob = {
    jobTitle: "Backend Dev", jobURL: "https://example.com/j/1", company: "Acme",
    location: "Remote", date: "posted today", jobDetails: ["node", "react"], site: "wuzzuf",
};
const ev: EvaluatedJob<BaseJob> = { job, status: "PASS", reason: ["js/ts stack"], experienceLevel: "2+ years", skills: ["Node.js", "React"] };

const c1 = VerdictCache.load();
console.log("has before set:", c1.has(job.jobURL));            // expect false
c1.set(ev);
console.log("has after set:", c1.has(job.jobURL));             // expect true
c1.save();

const c2 = VerdictCache.load();
console.log("has after reload:", c2.has(job.jobURL));          // expect true
const got = c2.toEvaluatedJob(job);
console.log("reconstructed status:", got?.status);             // expect PASS

// refresh-preservation: set again with a DIFFERENT status, confirm firstSeenAt unchanged
const before = (c2 as unknown as { entries: Map<string, { firstSeenAt: string }> }).entries.get(job.jobURL)!.firstSeenAt;
c2.set({ ...ev, status: "FAIL" as const, reason: ["changed mind"] });
const after = (c2 as unknown as { entries: Map<string, { firstSeenAt: string }> }).entries.get(job.jobURL)!.firstSeenAt;
console.log("firstSeenAt preserved on update:", before === after); // expect true
const statusNow = (c2 as unknown as { entries: Map<string, { status: string }> }).entries.get(job.jobURL)!.status;
console.log("status updated:", statusNow);                     // expect FAIL
```

Run: `pnpm exec tsx src/state/_smoke.ts`
Expected output:
```
has before set: false
has after set: true
has after reload: true
reconstructed status: PASS
firstSeenAt preserved on update: true
status updated: FAIL
```
Then delete the smoke script AND the store file it created:
```bash
rm src/state/_smoke.ts
rm -f state/verdict-cache.json
rmdir state 2>/dev/null || true
```

- [ ] **Step 4: Create `src/state/README.md`** documenting the module (purpose, store location/shape, API table, design rules: mechanics-only / dropped-never-cached / `--refresh` preserves firstSeenAt / eval-path-cache-free).

- [ ] **Step 5: Add `state` to `.gitignore`**.

- [ ] **Step 6: Commit** `feat: add VerdictCache module for cross-run verdict persistence`.

---

### Task 2: Wire the cache stage into `main.ts`

**Files:** Modify `src/main.ts`

- [ ] **Step 1: Add imports** — `import { DroppedJob } from "./pipeline/run-filter.js";` + `import { VerdictCache } from "./state/verdict-cache.js";`
- [ ] **Step 2: Parse `--refresh`** — `const refresh = process.argv.slice(3).includes("--refresh");` after the usage block; update usage string to show `[--refresh]`.
- [ ] **Step 3: Construct cache once** before the loop — `const cache = VerdictCache.load();` + refresh log line.
- [ ] **Step 4: Replace per-site loop** with the 7-stage version (crawl → partition → evaluate(new) → reconstruct(cached) → merge → record → persist-once after all sites).
- [ ] **Step 5: Confirm** `generateSummary(evaluatedAll, model)` + `reporters.display(evaluatedAll, summary, {...})` **unchanged** (Part 1 summarizes all passing; scoping is Part 2).
- [ ] **Step 6:** `pnpm check` → PASS.
- [ ] **Step 7:** Commit `feat: add verdict-cache stage to production pipeline`.

---

### Task 3: Manual end-to-end verification (no code changes; requires Ollama + qwen-reason)

- [ ] **Step 1:** `pnpm check` PASS.
- [ ] **Step 2:** `pnpm eval qwenReason` — runs as before; no `state/` created; no `📦` log (confirms eval-path cache-free).
- [ ] **Step 3:** `pnpm start wuzzuf` (first run) — `📦 N new, 0 cached`, LLM runs on all N, `state/verdict-cache.json` created with N entries.
- [ ] **Step 4:** `pnpm start wuzzuf` (second run, same postings) — `📦 0 new, N cached — skipping LLM filter`, **no** filter `🤖`/`⏱️` lines, report equivalent.
- [ ] **Step 5:** `--refresh` — corrupt one verdict's status to FAIL, run `pnpm start wuzzuf --refresh`, confirm all re-evaluated + status overwritten + firstSeenAt unchanged.
- [ ] **Step 6:** If any run drops a job, confirm that URL absent from store. (If no drops occur, N/A.)
- [ ] **Step 7:** No commit.

---

### Task 4: Documentation

**Files:** Modify `src/pipeline/README.md`, `AGENTS.md`, `README.md`

- [ ] **Step 1:** `src/pipeline/README.md` — add "## Verdict Cache (production only)" section: 7 stages, ASCII flow, `--refresh`, eval-path-cache-free, Part 1 report-invisible.
- [ ] **Step 2:** `AGENTS.md` file tree — add `state/` (verdict-cache.ts + README.md) after `helpers/`.
- [ ] **Step 3:** `AGENTS.md` patterns — add "### Verdict cache (production only)" after "### Multi-site runs".
- [ ] **Step 4:** `AGENTS.md` gotchas — add `state/verdict-cache.json` bullet.
- [ ] **Step 5:** `AGENTS.md` eval methodology — add bullet: cache does NOT affect evals.
- [ ] **Step 6:** `README.md` — `--refresh` in usage + short "Verdict cache" architecture subsection.
- [ ] **Step 7:** `pnpm check` PASS (sanity).
- [ ] **Step 8:** Commit `docs: document verdict cache (Part 1)`.

---

## Spec coverage (self-review)

All spec requirements covered across T1–T4. Part 2 items (`--only-new`, badges, new-to-top sort, count box, summary scoping, `ReportContext` changes) explicitly out of scope.
