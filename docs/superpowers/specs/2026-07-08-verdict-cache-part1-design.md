# Verdict Cache — Part 1: Pipeline (Caching & Skipping)

**Status:** Spec — awaiting user review
**Date:** 2026-07-08
**Scope:** Part 1 of 2. Part 1 introduces a persistent verdict cache and makes the production pipeline cache-aware (skip re-filtering jobs seen before). Part 2 (separate brainstorm) covers all reporter/output changes: badges, new-to-top sort, `--only-new`, and summary scoping.

---

## Problem

The project is run daily. Crawlers extract postings from up to 7 days prior, so each run's crawled set overlaps heavily with the previous day's. Because the pipeline is fully stateless today (no cross-run storage), every run re-sends the entire crawled set through the local LLM filter — re-paying tokens and latency for jobs already evaluated yesterday. It is also impossible to tell which jobs are genuinely new.

## Goal (Part 1)

Introduce a **verdict cache**: persistent storage mapping `jobURL → verdict`. On each run, jobs whose URL already has a stored verdict skip the LLM filter call entirely and reuse their cached verdict; only genuinely-new jobs are sent to the LLM. This shrinks the daily LLM filter call from ~20/site to the handful of new postings.

**Part 1 is invisible in the report.** The report's contents, layout, summary, and counts are unchanged from today. The only observable difference is faster runs and a console log line reporting new vs cached counts. All reporter/output changes are deferred to Part 2.

## Non-Goals (Part 1)

- No `--only-new` flag (output concern — Part 2).
- No badge, no new-to-top sort, no count-box changes (Part 2).
- No summary scoping — the LLM job-summary continues to cover **all** passing jobs, exactly as today (Part 2).
- No `ReportContext` changes.
- No changes to the eval path (`eval.ts`, `compare-models.ts`, `compare-prompts.ts`, `runFilterEval`).
- No changes to `run-filter.ts` (shared, cache-agnostic filter stays pure).
- No changes to `EvaluatedJob<T>` type.

## Design

### Data model & store — new `src/state/verdict-cache.ts`

One focused module, sole responsibility: persist and look up verdicts by URL.

```ts
import type { JobStatus } from "../types/evaluated-job.js";

/** One stored verdict. Verdict fields mirror the LLM-output fields of EvaluatedJob. */
export interface CachedVerdict {
    status: JobStatus;
    reason: string[];
    experienceLevel?: string;
    skills?: string[];
    /** ISO timestamp of the run that first evaluated this URL. Used for pruning + debugging. */
    firstSeenAt: string;
    /** GoldenSiteKey of the job that produced this verdict. For debugging/pruning only — not a lookup key. */
    site: string;
}

/** On-disk shape. `version` enables future migrations. */
export interface VerdictStore {
    version: 1;
    entries: Record<string, CachedVerdict>;  // keyed by jobURL
}
```

**Location:** `state/verdict-cache.json` (new `state/` directory, gitignored — same convention as `reports/` and `eval-results/`).

**Scope:** one global store. Job URLs are unique across sites, so a single file is simplest. A job cross-posted to two sites (rare) is correctly treated as cached on the second.

**I/O:** read once at run start into an in-memory `Map`; written once at run end as a single `JSON.stringify`. No incremental writes, no DB, no concurrency.

**Pruning:** on each write, drop entries whose `firstSeenAt` is older than `PRUNE_AFTER_DAYS` (default `30`, a module constant — not a CLI arg). Job boards cap at 7 days of history, but a posting could reappear; 30 days bounds store size while staying well inside any realistic re-post window.

**Dropped jobs are never cached.** A dropped job (the LLM omitted it from its output) is treated as "no verdict" and re-sent on the next run until it gets a real PASS/FAIL/POTENTIAL_MATCH. This guards against a transient LLM hiccup permanently burying a job.

### Module API

```ts
export const VERDICT_CACHE_PATH = "state/verdict-cache.json";
export const PRUNE_AFTER_DAYS = 30;

export class VerdictCache {
    /** Load from disk. Missing or corrupt file → empty store (warn, do not throw). */
    static load(): VerdictCache;

    /** True if the URL has a non-dropped verdict stored. */
    has(url: string): boolean;

    /** Reconstruct an EvaluatedJob-style verdict for a cached URL. Returns undefined if not cached. */
    get(url: string): CachedVerdict | undefined;

    /** Record a fresh verdict (called for each newly-evaluated job).
     *  If the URL already has an entry, updates verdict fields but PRESERVES the original
     *  `firstSeenAt` (so pruning age is measured from first evaluation, not last refresh).
     *  If new, sets `firstSeenAt = now`. */
    set(url: string, verdict: Omit<CachedVerdict, "firstSeenAt">, now?: Date): void;

    /** Persist to disk atomically: write temp file then rename. Prunes old entries first. */
    save(now?: Date): void;
}
```

`get()` returns the raw `CachedVerdict` (verdict fields only); the caller in `evaluate.ts` reattaches the fresh job body. This keeps `VerdictCache` independent of `EvaluatedJob<T>`'s generic job type.

### Pipeline integration — `evaluate.ts` becomes the cache-aware layer

Today `evaluate(site, jobs, model)` sends all jobs to the LLM. New signature:

```ts
export async function evaluate<T extends BaseJob>(
    site: SiteConfig<T>,
    jobs: T[],
    modelConfig: ModelConfig,
    cache?: VerdictCache,            // undefined in eval path → today's behavior
    options?: { refresh?: boolean }, // true → ignore cache reads, re-evaluate all, overwrite on save
): Promise<{
    evaluated: EvaluatedJob<T>[];
    dropped: DroppedJob[];
    newlyEvaluated: EvaluatedJob<T>[];   // jobs evaluated by the LLM this run (not cached)
}>;
```

Logic:

1. **Partition.** If `cache` is undefined or `options.refresh` is true: `cached = []`, `toEvaluate = jobs`. Otherwise: `cached = jobs.filter(j => cache.has(j.jobURL))`, `toEvaluate = jobs.filter(j => !cache.has(j.jobURL))`.
2. **Log the split.** e.g. `📦 5 new, 15 cached — skipping LLM filter for 15`.
3. **LLM call (conditional).**
   - If `toEvaluate.length > 0`: call `runFilterLLMCall(toEvaluate, modelConfig, { mode: "strict" })` exactly as today. Run structural heuristics on its output (as today).
   - If `toEvaluate.length === 0`: skip the LLM call entirely (no `runFilterLLMCall`, no heuristics on an empty set). `newlyEvaluated = []`.
4. **Merge.** Combine:
   - `newlyEvaluated` — the LLM's freshly-evaluated jobs (job body from `toEvaluate`, already attached by `mergeJobsByUrl`).
   - `cachedEvaluated` — for each `cached` job, reconstruct `{ job, status, reason, experienceLevel, skills }` using the cached verdict and **today's** freshly-crawled job object (so the report shows today's `date`/`jobDetails`, not stale crawl data). Verdict fields come from the cache.
   - `evaluated = [...newlyEvaluated, ...cachedEvaluated]`.
5. **Dropped.** `dropped` comes from the LLM call only (cached jobs are never dropped — they have a verdict). If `toEvaluate.length === 0`, `dropped = []`.
6. **Persist.** For each job in `newlyEvaluated`, call `cache.set(job.job.jobURL, { status, reason, experienceLevel, skills, site })`. **Dropped jobs are not set.** (The caller `main.ts` calls `cache.save()` once after all sites, so a multi-site run persists atomically. `evaluate` only mutates the in-memory cache; `main.ts` flushes.)

**Invariant:** `EvaluatedJob<T>` shape is unchanged. Cached jobs reconstruct the identical `{ job, status, reason, experienceLevel, skills }` object. `run-filter.ts` is not modified — it stays the shared, cache-agnostic filter. This keeps `eval.ts`, `compare-models.ts`, `compare-prompts.ts` (which call `runFilterEval` directly) untouched and deterministic.

### CLI — `main.ts`

Add minimal flag parsing. Today `main.ts` reads only `process.argv[2]` (the site). New:

```ts
const args = process.argv.slice(3);  // flags after the positional site arg
const refresh = args.includes("--refresh");
```

No `--only-new` in Part 1 (Part 2). No `--no-store`.

Orchestration changes:

1. Construct `const cache = VerdictCache.load();` once before the site loop.
2. Pass `cache` and `{ refresh }` to each `evaluate(site, jobs, model, cache, { refresh })` call.
3. Accumulate `newlyEvaluatedAll` alongside `evaluatedAll` and `droppedAll`.
4. After the site loop (regardless of skips), call `cache.save()` once. The cache was mutated during `evaluate()` for every successfully-evaluated job (`set()` called per newly-evaluated job). **`--refresh` does NOT clear the store before re-evaluating** — instead, every crawled job is sent to the LLM (cache reads ignored), and `set()` is called for each result, which **updates verdict fields while preserving the original `firstSeenAt`** for already-known URLs and creating fresh entries for new ones. This means:
   - Verdicts reflect the current filter prompt.
   - Old entries for jobs no longer crawled remain in the store (they age out via pruning, not via refresh). This is intentional — a refresh re-evaluates *what was crawled today*, not the entire historical store.
   - A site that failed mid-run contributes no `set()` calls, so its jobs keep their prior cached verdicts (if any) — correct, since they weren't re-evaluated. On `--refresh` with a failed site, those jobs retain old verdicts and will be re-evaluated next non-refresh run only if still crawled; acceptable.
5. The `generateSummary` call is **unchanged** — still receives `evaluatedAll` (all passing jobs). Summary scoping is Part 2.
6. The `reporters.display(...)` call is **unchanged** — same `ReportContext` as today, no `newJobUrls`, no `onlyNew`.

**First-run behavior:** no store file exists → `VerdictCache.load()` returns empty → all jobs are `toEvaluate` → all evaluated, all persisted, `newlyEvaluated = evaluatedAll`. The console log reports `📦 N new, 0 cached`. This is honest (you've never seen them). No silent seeding, no special-casing. Badging of these as "new" is a Part 2 concern.

### Files touched (Part 1)

| File | Change |
|------|--------|
| `src/state/verdict-cache.ts` | **NEW** — `VerdictCache` class, `CachedVerdict`/`VerdictStore` types, `VERDICT_CACHE_PATH`, `PRUNE_AFTER_DAYS`. |
| `src/state/README.md` | **NEW** — documents the cache module. |
| `src/pipeline/evaluate.ts` | Modify — new `cache` + `options.refresh` params; partition; conditional LLM call; merge cached verdicts; return `newlyEvaluated`. |
| `src/main.ts` | Modify — parse `--refresh`; construct `VerdictCache`; thread through `evaluate`; persist once; accumulate `newlyEvaluatedAll` (logged, not yet rendered). |
| `.gitignore` | Add `state/`. |
| `AGENTS.md` | New "Verdict Cache" pattern section; `state/` + `verdict-cache.ts` in file tree; `--refresh` in scripts; note eval path is cache-free. |
| `README.md` | `--refresh` in usage/scripts; architecture mention of the verdict cache. |
| `src/pipeline/README.md` | `evaluate.ts` cache-aware behavior. |

**Files explicitly NOT touched in Part 1:** `run-filter.ts`, `eval.ts`, `compare-models.ts`, `compare-prompts.ts`, `generate-summary.ts`, all reporters (`types.ts`, `html.ts`, `cli-card.ts`, `cli-table.ts`, `cli-summary.ts`, `report-helpers.ts`, `composite.ts`, `index.ts`, `markdown.ts`, `preview.ts`), `config.ts`, all crawlers, all types.

## Error Handling & Edge Cases

- **Store file missing:** `load()` returns empty cache. Normal first-run path.
- **Store file corrupt / unreadable:** `load()` warns (`⚠️ Verdict cache unreadable, starting fresh`) and returns empty. The run evaluates everything as new and overwrites the file on `save()`. Never crashes the run.
- **Store write fails:** `save()` warns (`⚠️ Could not persist verdict cache: <msg>`) and returns. The run still produces a report; next run re-evaluates today's new jobs (idempotent — no data loss, just wasted tokens once).
- **`--refresh` semantics:** ignore cache reads (everything is `toEvaluate`), re-evaluate all crawled jobs through the LLM, then `set()` each result — which **updates verdict fields but preserves original `firstSeenAt`** for known URLs and creates fresh entries for new ones. The store is NOT cleared first; entries for jobs not crawled today are left untouched (they age out via pruning). Intended for use after editing `filter.md` (cached verdicts would otherwise reflect the old rules). Dropped jobs on a refresh run are still not cached (re-evaluated next run).
- **Same URL, different site (cross-posted):** store key is URL alone; second site sees it as cached. Acceptable — the verdict is origin-independent.
- **Pruning:** on `save()`, entries with `firstSeenAt` older than 30 days are dropped. A pruned job that reappears in tomorrow's crawl is correctly treated as new.
- **Empty `toEvaluate` (all cached):** no LLM call, no heuristics, `newlyEvaluated = []`, `dropped = []`, `evaluated` built purely from cache. Fastest path.

## Testing

Manual verification (no automated test harness exists in this project today):

1. **First run (no store):** `pnpm start wuzzuf` → all jobs evaluated, console shows `📦 N new, 0 cached`, `state/verdict-cache.json` created with N entries, report identical to pre-change behavior.
2. **Second run (store exists, same postings):** `pnpm start wuzzuf` → console shows `📦 0 new, N cached — skipping LLM filter for N`, **no LLM filter call** (verify no `🤖 Evaluating...` / `⏱️` lines for the filter), report contents identical to run 1.
3. **Mixed run (some new, some cached):** delete a few entries from the store manually → run → only the missing-URL jobs are evaluated; rest are cached.
4. **`--refresh`:** `pnpm start wuzzuf --refresh` → all crawled jobs re-evaluated; verdict fields updated in the store (original `firstSeenAt` preserved for known URLs). Verify: manually flip a stored verdict's `status`, run `--refresh`, confirm the status is corrected to the LLM's fresh verdict while `firstSeenAt` is unchanged.
5. **Dropped job not cached:** manually craft a scenario (or just observe a run where the LLM drops a job) → confirm that URL is absent from `state/verdict-cache.json` and is re-evaluated next run.
6. **Corrupt store:** put garbage in `state/verdict-cache.json` → run warns, starts fresh, overwrites on save.
7. **Eval path unaffected:** `pnpm eval qwenReason` → runs exactly as before (no cache constructed, no `state/` read or write).
8. **Type check:** `pnpm check` passes.

## Part 2 Preview (not implemented now)

After Part 1 ships, Part 2 will brainstorm and implement:

- `--only-new` flag (hide cached jobs from the report).
- `ReportContext.newJobUrls: Set<string>` and `ReportContext.onlyNew: boolean`.
- `🆕` badge on new jobs across `html`, `cli-card`, `cli-table`, `cli-summary`.
- New-to-top sort (`sortByNewThenDate` in `report-helpers.ts`).
- "New" count box in HTML.
- Summary scoping: `generateSummary` receives only newly-evaluated passing jobs.

Part 1 produces `newlyEvaluatedAll` but does not render it — Part 2 consumes it.
