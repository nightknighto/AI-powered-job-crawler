# Types

Runtime-validated type definitions for job listings, evaluation results, and site configuration.

## Type Hierarchy

```
BaseJob (base.ts)
  └── WuzzufJob (WuzzufJob.ts)
```

## Types

### `BaseJob` (`base.ts`)

Base interface for all job listings:

| Field | Type | Description |
|-------|------|-------------|
| `jobTitle` | `string` | Job title |
| `jobURL` | `string` | Unique URL (used for matching in golden eval) |
| `date` | `string` | Posting date |
| `jobDetails` | `string` | Full job description text |

### `WuzzufJob` (`WuzzufJob.ts`)

Extends `BaseJob` with Wuzzuf-specific fields:

| Field | Type | Description |
|-------|------|-------------|
| `companyAndLocation` | `string` | Combined company name + location |
| `tags` | `string` | Comma-separated tag strings |

### `JobStatus` (`evaluated-job.ts`)

Zod enum with three values:

| Value | Meaning |
|-------|---------|
| `PASS` | Job matches all filter criteria |
| `FAIL` | Job should be rejected |
| `POTENTIAL_MATCH` | Borderline case worth reviewing |

### `EvaluatedJob<T>` (`evaluated-job.ts`)

Generic wrapper for evaluated jobs:

| Field | Type | Description |
|-------|------|-------------|
| `job` | `T` | The original job data |
| `status` | `JobStatus` | AI-determined status |
| `reason` | `string[]` | Array of reason strings explaining the decision |

### `SiteConfig<T extends BaseJob>` (`site-config.ts`)

Generic site configuration:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Display name |
| `crawl` | `() => Promise<T[]>` | Crawling function |
| `evaluationSchema` | `ZodSchema` | Zod schema for LLM output validation |
| `jobSchema` | `ZodSchema` | Zod schema for job structure |
| `prompts` | `{ filter: string, report: string }` | Prompt templates |

## Zod Schemas vs TypeScript Interfaces

| Aspect | TypeScript Interfaces | Zod Schemas |
|--------|----------------------|-------------|
| Purpose | Static type shape for IDE tooling | Runtime validation of LLM responses |
| Timing | Compile-time only | Runtime |
| LLM integration | N/A | Converted to JSON Schema via `z.toJSONSchema()` for Ollama structured output |
| Usage in SiteConfig | Type parameters (`T extends BaseJob`) | `evaluationSchema` validates full LLM response array, `jobSchema` validates individual job objects |

Both exist because TypeScript types are erased at compile time — Zod schemas provide the runtime validation needed when processing LLM responses.

## Pattern

All types use **Zod v4** (`import { z } from "zod"`) and derive TypeScript types via `z.infer<typeof schema>` where appropriate.
