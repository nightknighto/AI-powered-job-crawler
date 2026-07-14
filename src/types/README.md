# Types

Runtime-validated type definitions for job listings, evaluation results, site configuration, and reporter output.

## Type Hierarchy

```
BaseJob (base.ts)
  ├── WuzzufJob (WuzzufJob.ts)
  ├── IndeedJob (IndeedJob.ts)
  ├── WorkableJob (WorkableJob.ts)
  └── JoobleJob (JoobleJob.ts)
```

Generic wrappers:

```
EvaluatedJob<T>     (evaluated-job.ts)  — original job + AI verdict
GoldenEntry         (GoldenEntry.ts)    — one unified eval case (BaseJob + expected label + rule-isolation metadata)
```

`EvaluatedJob<T>` is generic over the job type; `GoldenEntry` is **not** generic — it is a plain interface over `BaseJob`. See the `GoldenEntry` / `CaseCategory` section below.

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
| `site` | `SiteKey` | Origin site key, derived from the production `sites` registry (`'wuzzuf' \| 'indeed' \| 'workable' \| 'jooble' \| 'linkedin'`). Stamped centrally by `crawl()` from `SiteConfig.key` for production jobs; declared as a literal in golden datasets. Lets a multi-site run merge jobs while preserving each job's origin. |

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
| `key` | `SiteKey` | Registry key that also serves as the display name in logs/reports (e.g. `"wuzzuf"`) |
| `crawl` | `() => Promise<Omit<T, "site">[]>` | Crawling function — returns jobs **without** a `site` field |
| `jobSchema` | `ZodType<Omit<T, "site">>` | Zod schema for a single raw job's non-`site` fields |

The `site` field is **not** part of `SiteConfig` — crawlers return jobs without it, and `src/pipeline/crawl.ts` stamps it centrally from `key`. This means every job's origin is derived from its registry slot, so a site can be crawled without needing a golden dataset first.

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

### `GoldenEntry` (`GoldenEntry.ts`)

A single hand-labeled case in the unified golden dataset for eval benchmarking. Not generic — it's a plain interface over `BaseJob`. The case library lives entirely under `src/evals/cases/<category>.ts` (one file per `CaseCategory`, plus an `index.ts` aggregator) and is site-agnostic (no per-site golden datasets anymore).

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Signal-descriptive slug, globally unique, stable under insert/remove. Format `<category-prefix>-<what-makes-this-case-unique>[-status]` (e.g. `exp-threshold-4yr-fail`, `role-qa-junior-fail`, `ambig-dualstack-pm`). The suffix describes the case's signal, never a sequence number — so adding/removing a sibling case never forces a renumber. |
| `category` | `CaseCategory` | The **one** filter rule this case isolates (also determines its file). |
| `real` | `boolean` | `true` if sourced from a real crawled job (`storage/datasets/*.json` or a historical `realJobs` array); `false` if a synthetic gap-filler (which uses clearly-fake URLs). |
| `job` | `BaseJob` | The job listing to feed into the LLM (minimal `BaseJob` shape, no `tags`). |
| `expectedStatus` | `JobStatus` | The expected evaluation status (ground truth). |
| `isolationNote` | `string` | What signal this case isolates and why it is single-causal — which filters are deliberately green so only the target rule can trigger. Shown in the eval report on mismatch to aid human inspection. |

Each case isolates exactly one filter rule (single-causal by construction) so per-category accuracy directly pinpoints which rules a model mishandles. `multi-cause` is the deliberate exception — its cases carry several valid failure reasons and are scored on status only.

### `CaseCategory` (`GoldenEntry.ts`)

Union of the eight rule categories the case library is organized into. Each value maps to a file under `src/evals/cases/<category>.ts` and is independently selectable via the `--category` eval flag, so a run can be scoped to a single rule at a time:

```ts
type CaseCategory =
    | "title-seniority"
    | "internship"
    | "tech-stack"
    | "role-type"
    | "experience"
    | "location"
    | "ambiguous"
    | "multi-cause";
```

`ambiguous` is the POTENTIAL_MATCH fallback category; `multi-cause` is the compound-rejection category (scored on status only).

### `SiteKey` (unchanged)

`SiteKey` is still derived from the production `sites` registry (`src/sites/registry.ts`) — see `BaseJob.site` above. The old `GoldenSiteKey` type was removed in the eval redesign (the unified case library is site-agnostic, so there's no per-site key for golden datasets anymore).

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
