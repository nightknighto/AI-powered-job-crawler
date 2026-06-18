# Pipeline

The pipeline processes job listings through 4 sequential stages, each defined in its own file.

## Stages

### 1. `crawl.ts`

```ts
crawl<T extends BaseJob>(config: SiteConfig<T>): Promise<T[]>
```

Generic crawl orchestration using Crawlee CheerioCrawler. Delegates to the site's `crawl` function from `SiteConfig`. Returns raw job data.

### 2. `evaluate.ts`

```ts
evaluate<T extends BaseJob>(site: SiteConfig<T>, jobs: T[], modelConfig: ModelConfig): Promise<EvaluatedJob<T>[]>
```

Sends jobs to Ollama LLM with the **shared** filter prompt, parses structured JSON response using Zod validation. Each job gets a status (`PASS`/`FAIL`/`POTENTIAL_MATCH`) and an array of reason strings. Uses the unified `unifiedFilterPrompt` (from `src/pipeline/prompts.ts`) and the shared `jobEvaluationSchema` (from `src/types/evaluated-job.ts`) — these are intentionally not part of `SiteConfig` so filtering behaves identically across all sites.

### 3. `generate-summary.ts`

```ts
generateSummary<T extends BaseJob>(site: SiteConfig<T>, evaluatedJobs: EvaluatedJob<T>[], modelConfig: ModelConfig): Promise<string>
```

Generates an LLM summary for passing jobs only, using the `jobSummary` prompt template. Returns the raw markdown string (empty string if no passing jobs). Deterministic table generation is handled by reporters via `buildReportTables()`.

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
    main->>evaluate: jobs + SiteConfig + modelKey
    Note right of evaluate: Ollama LLM + Zod validation
    evaluate-->>main: EvaluatedJob<T>[]
    main->>summarize: evaluatedJobs + SiteConfig + modelConfig
    Note right of summarize: LLM summary for passing jobs only
    summarize-->>main: string (summary markdown)
    main->>reporters: jobs + summary + ReportContext
    Note right of reporters: Composable: cli-table, html, markdown, etc.
```

## Key Types

| Type | Source | Description |
|------|--------|-------------|
| `BaseJob` | `src/types/base.ts` | `{ jobTitle, jobURL, company, location, date, jobDetails[] }` |
| `EvaluatedJob<T>` | `src/types/evaluated-job.ts` | `{ job: T, status: JobStatus, reason: string[] }` |
| `SiteConfig<T>` | `src/types/site-config.ts` | Generic config with crawl fn, schemas, prompts |
| `ModelConfigKey` | `src/config.ts` | Keys of `modelConfigs` — check the file for current values |

## Adding a New Stage

1. Create a new file exporting an async function
2. Import and call it in `main.ts` in sequence
3. Each stage receives the output of the previous stage as input
