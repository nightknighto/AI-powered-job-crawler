# Pipeline

The pipeline processes job listings through 4 sequential stages, each defined in its own file.

## Stages

### 1. `crawl.ts`

```ts
crawl<T extends BaseJob>(config: SiteConfig<T>): Promise<T[]>
```

Generic crawl orchestration. Delegates to the site's `crawl` function from `SiteConfig` (which returns jobs **without** a `site` field), then stamps each job's `site` centrally from `SiteConfig.key`. Returns the raw job data with `site` populated.

### 2. `evaluate.ts`

```ts
evaluate<T extends BaseJob>(site: SiteConfig<T>, jobs: T[], modelConfig: ModelConfig): Promise<EvaluatedJob<T>[]>
```

Thin production wrapper around `runFilterLLMCall(jobs, modelConfig, { mode: "strict" })` (see `run-filter.ts` below). Adds structural-heuristics logging. Strict mode throws on unknown/duplicate URLs (genuine LLM malfunction); dropped jobs are non-fatal and collected for reporting. Returns `{ evaluated, dropped }`.

### 2a. `run-filter.ts` (shared filter pipeline)

Single source of truth for the LLM filter call. Used by `evaluate.ts` (production), `eval.ts`, and `compare-models.ts`. Exports:

| Export | Purpose |
|--------|---------|
| `parseLlmOutput(content)` | Strip ` ``` ` fences, JSON-parse, Zod-validate against `jobEvaluationSchema` |
| `logTimingAndTokens(response)` | Unified compact timing + token-usage log line |
| `mergeJobsByUrl(jobs, parsed, mode)` | Re-attach original jobs to LLM output via URL. `mode: 'strict'` throws on unknown/duplicate URLs; `'tolerant'` warns. **Dropped jobs are always non-fatal**: collected into the returned `dropped` array (returned as `{ evaluated, dropped }`) |
| `runFilterLLMCall(jobs, modelConfig, { mode })` | Build prompt, call Ollama (with `keep_alive`), log timing, parse, merge. Returns `{ aiOutput, dropped, response }` |
| `runFilterEval(modelKey, goldenDataset)` | High-level: runs `runFilterLLMCall` on the supplied golden dataset in tolerant mode, then adds `compareGolden()` + heuristics. Returns `{ aiOutput, dropped, comparison, heuristics, metrics }`. The caller picks the dataset — combined via `getGoldenDataset()` or a single site via `getGoldenDataset('wuzzuf')` (the `--site` flag). Used by `eval.ts` and `compare-models.ts` |

### 3. `generate-summary.ts`

```ts
generateSummary<T extends BaseJob>(evaluatedJobs: EvaluatedJob<T>[], modelConfig: ModelConfig): Promise<string>
```

Generates an LLM summary for passing jobs only, using the shared `jobSummaryPrompt` template. Returns the raw markdown string (empty string if no passing jobs). Deterministic table generation is handled by reporters via `buildReportTables()`.

### 4. `report-helpers.ts`

Deterministic report utilities (no LLM calls):

- `parseRelativeDate(dateStr)` — Parses relative date strings (English + Arabic) into numeric days for sorting
- `splitByStatus(jobs)` — Splits evaluated jobs into passing (`PASS` + `POTENTIAL_MATCH`) and failing groups
- `sortByDate(jobs)` — Sorts jobs by date (newest first)
- `buildReportTables(jobs)` — Builds the passing/failing markdown tables + summary counts

## Pipeline Flow

```
crawl() → evaluate() → generateSummary() → reporters.display()
   T[]    EvaluatedJob<T>[]      string            void
```

The eval path (`eval.ts`, `compare-models.ts`) calls `runFilterEval` directly and bypasses
`evaluate` / `generateSummary` / reporters.

## Verdict Cache (production only)

`main.ts` wraps `evaluate` in a **verdict-cache stage** so daily runs skip re-filtering jobs seen
before. The cache (`src/state/verdict-cache.ts`) persists `jobURL → verdict` to
`state/verdict-cache.json` (gitignored). Per-site loop in `main.ts`:

1. **Crawl** — unchanged; Crawlee fetches up to 7 days of postings.
2. **Partition** — split into `cached` (URL has a stored verdict) vs `new` (no verdict).
3. **`evaluate(new only)`** — `evaluate.ts` is unchanged (always evaluates, 3 params). Only new
   jobs go to the LLM. If all jobs are cached, the LLM filter call is skipped entirely.
4. **Reconstruct cached** — `cache.toEvaluatedJob(job)` stamps the cached verdict onto today's
   fresh job body (so reports show current `date`/`jobDetails`).
5. **Merge** — fresh + cached verdicts flow into `evaluatedAll`.
6. **Record** — `cache.set(ev)` per newly-evaluated job (in-memory). Dropped jobs are NOT recorded.
7. **Persist once** — `cache.save()` after all sites (atomic write + 30-day prune).

```
crawl → partition → evaluate(new) → reconstruct(cached) → merge → record → [after all sites] save
                                         ↑ cached jobs skip the LLM entirely
```

- **`--refresh`** — `pnpm start <site> --refresh` ignores cached verdicts, re-evaluates ALL crawled
  jobs, and updates the store (preserving `firstSeenAt` for known URLs). Run after editing
  `filter.md`.
- **Eval path is cache-free** — `eval.ts` / `compare-models.ts` / `compare-prompts.ts` never
  construct a `VerdictCache`, so golden-dataset evaluation stays deterministic.
- **Newness is surfaced in reports** — `main.ts` passes a `newJobUrls: Set<string>` of URLs
  evaluated or dropped this run via `ReportContext`. Reporters badge those jobs with 🆕, sort them
  to the top of each group, and the HTML report adds a "New" count box. `--only-new` hides cached
  jobs from the tables (count boxes stay total). See `src/reporters/README.md` for the per-reporter
  details. Cached jobs never badge; the eval path never sets `newJobUrls` (no cache → no badges).

## Key Types

| Type | Source | Description |
|------|--------|-------------|
| `BaseJob` | `src/types/base.ts` | `{ jobTitle, jobURL, company, location, date, jobDetails[], site }` |
| `EvaluatedJob<T>` | `src/types/evaluated-job.ts` | `{ job: T, status: JobStatus, reason: string[] }` |
| `SiteConfig<T>` | `src/types/site-config.ts` | Generic config with crawl fn, schemas, prompts |
| `ModelConfigKey` | `src/config.ts` | Keys of `modelConfigs` — check the file for current values |

## Multi-site Runs

`main.ts` orchestrates the pipeline. Beyond a single site, it supports:

- `pnpm start all` — every registered site
- `pnpm start wuzzuf,indeed` — a subset (comma-separated)

For multi-site runs, the crawl → evaluate stages loop **once per site** (small per-site filter prompts, no context-window risk), with **skip-and-continue** error handling: a failed site is logged and skipped rather than aborting the whole run. The evaluated results are merged, then **one** combined summary LLM call covers all passing jobs across sites. Reporters run once over the merged set, producing a single unified report (`reports/all-<timestamp>.html`, etc.) with each job's origin shown in a `Site` column. Single-site runs take an unchanged flat path.

## Adding a New Stage

1. Create a new file exporting an async function
2. Import and call it in `main.ts` in sequence
3. Each stage receives the output of the previous stage as input
