# Types

Runtime-validated type definitions for job listings, evaluation results, site configuration, and reporter output.

## Type Hierarchy

```
BaseJob (base.ts)
  ├── WuzzufJob (WuzzufJob.ts)
  └── IndeedJob (IndeedJob.ts)
```

Generic wrappers:

```
EvaluatedJob<T>     (evaluated-job.ts)  — original job + AI verdict
GoldenEntry<T>      (GoldenEntry.ts)    — original job + expected label (for eval)
```

Reporter types are defined in `src/reporters/types.ts` — see [`src/reporters/README.md`](../reporters/README.md).

## Types

### `BaseJob` (`base.ts`)

Base interface for all job listings:

| Field | Type | Description |
|-------|------|-------------|
| `jobTitle` | `string` | Job title |
| `jobURL` | `string` | Unique URL (used for matching in golden eval) |
| `company` | `string` | Company name |
| `location` | `string` | Job location |
| `date` | `string` | Posting date (relative string, e.g. "posted 2 days ago") |
| `jobDetails` | `string[]` | Array of job description lines |

### `WuzzufJob` (`WuzzufJob.ts`)

Extends `BaseJob` with Wuzzuf-specific overrides:

| Field | Type | Description |
|-------|------|-------------|
| `company` | `string` | Company name (overrides BaseJob) |
| `location` | `string` | Job location (overrides BaseJob) |
| `tags` | `string` | Comma-separated tag strings (e.g. `'Full Time, Remote'`) |

### `IndeedJob` (`IndeedJob.ts`)

Extends `BaseJob` with Indeed-specific overrides:

| Field | Type | Description |
|-------|------|-------------|
| `company` | `string` | Company name (overrides BaseJob) |
| `location` | `string` | Job location (overrides BaseJob) |

### `SiteConfig<T extends BaseJob>` (`site-config.ts`)

Generic site configuration. The filter prompt and LLM-output schema are intentionally **not** part of `SiteConfig` — they are unified across all sites (see [`src/pipeline/prompts.ts`](../pipeline/prompts.ts) and `jobEvaluationSchema` below).

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Display name |
| `crawl` | `() => Promise<T[]>` | Crawling function |
| `jobSchema` | `ZodType<T>` | Zod schema for an individual job structure |
| `prompts` | `{ jobSummary: string }` | Per-site prompt templates with `{{placeholder}}` substitution |

### `JobStatus` / `EvaluatedJob<T>` / `jobEvaluationSchema` (`evaluated-job.ts`)

`JobStatus` is the Zod enum `{ PASS | FAIL | POTENTIAL_MATCH }`.

`EvaluatedJob<T>` wraps an original job with its AI verdict:

| Field | Type | Description |
|-------|------|-------------|
| `job` | `T` | The original job data |
| `status` | `JobStatus` | AI-determined status |
| `reason` | `string[]` | Array of reason strings explaining the decision |
| `experienceLevel?` | `string` | Experience level extracted by the LLM (e.g. "2+ years") |
| `skills?` | `string[]` | Core tech stack identified by the LLM (e.g. ["React", "TypeScript"]) |

`jobEvaluationSchema` is the shared Zod schema for the LLM's filter output. It is converted to JSON Schema via `z.toJSONSchema()` and passed to Ollama's structured-output feature. Used by `src/pipeline/evaluate.ts`, `src/eval.ts`, and `src/compare-models.ts` — **never overridden per site**.

### `GoldenEntry<T extends BaseJob = BaseJob>` (`GoldenEntry.ts`)

A single hand-labeled entry in the golden dataset for eval benchmarking:

| Field | Type | Description |
|-------|------|-------------|
| `job` | `T` | The job listing to feed into the LLM |
| `expectedStatus` | `JobStatus` | The expected evaluation status (ground truth) |
| `expectedReasonKeywords` | `string[]` | Keywords that should appear in the AI's `reason` array |

## Zod Schemas vs TypeScript Interfaces

| Aspect | TypeScript Interfaces | Zod Schemas |
|--------|----------------------|-------------|
| Purpose | Static type shape for IDE tooling | Runtime validation of LLM responses |
| Timing | Compile-time only | Runtime |
| LLM integration | N/A | Converted to JSON Schema via `z.toJSONSchema()` for Ollama structured output |
| Usage | Type parameters (`T extends BaseJob`) | `jobEvaluationSchema` validates the full LLM response array; `jobSchema` validates individual job objects |

Both exist because TypeScript types are erased at compile time — Zod schemas provide the runtime validation needed when processing LLM responses.

## Pattern

All types use **Zod v4** (`import { z } from "zod"`) and derive TypeScript types via `z.infer<typeof schema>` where appropriate.
