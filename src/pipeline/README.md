# Pipeline

The pipeline processes job listings through 4 sequential stages, each defined in its own file.

## Stages

### 1. `crawl.ts`

```ts
crawl<T extends BaseJob>(config: SiteConfig<T>): Promise<T[]>
```

Generic crawl orchestration. Delegates to the site's `crawl` function from `SiteConfig` and logs progress. Each crawler is responsible for stamping its jobs' `site` field (the field is required on `BaseJob`). Returns the raw job data with `site` populated.

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

```mermaid
sequenceDiagram
    participant main as main.ts
    participant crawl as crawl()
    participant evaluate as evaluate()
    participant summarize as generateSummary()
    participant reporters as reporters.display()

    main->>crawl: SiteConfig<T>
    crawl-->>main: T[] (raw jobs)
    main->>evaluate: jobs + SiteConfig + modelConfig
    Note right of evaluate: Delegates to runFilterLLMCall (strict)
    evaluate-->>main: EvaluatedJob<T>[]
    main->>summarize: evaluatedJobs + modelConfig
    Note right of summarize: LLM summary for passing jobs only (shared prompt)
    summarize-->>main: string (summary markdown)
    main->>reporters: jobs + summary + ReportContext
    Note right of reporters: Composable: cli-table, html, markdown, etc.
```

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
