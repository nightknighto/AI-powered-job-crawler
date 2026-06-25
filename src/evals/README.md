# Eval System

Evaluation framework for benchmarking LLM filter accuracy against hand-labeled data and structural heuristics.

The eval pipeline is **fully unified across all sites**: it consumes a single combined golden dataset, the shared `filterPrompt`, and the shared `jobEvaluationSchema`. There is no per-site filter prompt or evaluation schema.

## Components

### 1. Golden Dataset Comparison (`golden.ts`)

Compares AI-evaluated jobs against a hand-labeled golden dataset.

**`PerJobResult` interface:**

| Field | Description |
|-------|-------------|
| `jobIndex` | 1-based index into the combined dataset |
| `jobTitle` | Job title |
| `jobURL` | Job URL (used for matching) |
| `expectedStatus` | Golden dataset status |
| `actualStatus` | AI-determined status |
| `statusMatch` | Whether expected === actual |
| `dropped` | Whether the AI didn't include this job at all |
| `expectedKeywords` | Keywords expected in reason text |
| `matchedKeywords` | Keywords found in AI reason |
| `unmatchedKeywords` | Expected keywords not found |
| `reasonText` | Full AI reason text |

**`compareGolden()`** — Takes golden dataset + AI results, matches by `jobURL`, computes per-job results.

**Metrics computed:** Precision, recall, F1 per class (`PASS`, `FAIL`, `POTENTIAL_MATCH`), overall accuracy.

> **Primary metric: PASS F1** — PASS is the minority class (15/54) and hardest to get right.

**Keyword checking:** For each golden entry, checks if `expectedReasonKeywords` appear in the AI's reason text (case-insensitive).

### 2. Structural Heuristics (`structural.ts`)

6 rule-based checks that don't depend on the golden dataset:

| # | Check | Description |
|---|-------|-------------|
| 1 | `checkNoDroppedJobs` | AI should not return fewer jobs than input |
| 2 | `checkValidStatuses` | Only PASS/FAIL/POTENTIAL_MATCH allowed |
| 3 | `checkNonEmptyReasons` | Every job must have at least one reason string |
| 4 | `checkTitleFilterConsistency` | "Senior"/"Lead" etc. in title → FAIL (unless description overrides) |
| 5 | `checkInternshipFilterConsistency` | "Intern" in title → FAIL |
| 6 | `checkNoEmptyFields` | No empty strings in job title, URL, or reasons |

### 3. Report Writer (`report-writer.ts`)

Writes eval results to the `eval-results/` directory as markdown files:

- **`writeEvalReport()`** — Writes a single-model eval report with per-job comparison, class metrics table, and heuristic results
- **`writeCompareReport()`** — Writes a multi-model comparison report ranking all models by PASS F1
- Timestamps are included in filenames for easy comparison over time

## Commands

| Command | Description |
|---------|-------------|
| `pnpm eval <model>` | Run golden eval + structural heuristics for one model against the combined dataset (default). Pass `--print-failed-only` to print only mismatches. Exit code 1 if accuracy < 80%. |
| `pnpm eval <model> --site <name>` | Scope the eval to one site's golden dataset (`wuzzuf` \| `indeed` \| `workable`). The report filename and header reflect the selected site. |
| `pnpm compare` | Run eval for all configured models, print ranked comparison table sorted by PASS F1. |
| `pnpm compare --site <name>` | Same, scoped to one site's golden dataset. |

## Implementation Details

The evaluation script ([`src/eval.ts`](../eval.ts)) and benchmark script ([`src/compare-models.ts`](../compare-models.ts)) share the **same filter pipeline** via `runFilterEval(modelKey, goldenDataset)` in [`src/pipeline/run-filter.ts`](../pipeline/run-filter.ts). `compare-models.ts` is literally "run `eval` on every configured model and rank the results" — not a parallel implementation.

The caller (not the pipeline) decides which dataset to evaluate. Both scripts resolve it with `getGoldenDataset(site?)`:

- No `--site` flag → the **combined** dataset (default, all sites).
- `--site <name>` → only that site's golden dataset (`wuzzuf` | `indeed` | `workable`).

The resolved array is passed both to `runFilterEval` and to the report-writer, so the report filename/header reflect the scope (e.g. `2026-06-25_qwenReason_site-indeed.md` with a `Site: indeed` header).

`runFilterEval` internally:

- Calls `runFilterLLMCall(jobs, modelConfig, { mode: "tolerant" })` on the jobs from the supplied golden dataset, which:
  - Builds the filter prompt from the shared [`src/pipeline/prompts.ts`](../pipeline/prompts.ts) (`filterPrompt` ← `src/pipeline/prompts/filter.md`)
  - Calls Ollama with the shared [`jobEvaluationSchema`](../types/evaluated-job.ts) for structured output
  - Parses and merges results in `'tolerant'` mode (warns on unknown/duplicate/dropped URLs instead of throwing, so noisy LLM output can still be scored)
- Runs the generic [`compareGolden()`](golden.ts) and [`runStructuralHeuristics()`](structural.ts) and returns `{ aiOutput, comparison, heuristics }`

Each caller then handles its own UX: `eval.ts` prints verbose per-job results and exits 1 below 80% accuracy; `compare-models.ts` prints a rankings table sorted by PASS F1 and writes a comparison report.

The production pipeline ([`src/pipeline/evaluate.ts`](../pipeline/evaluate.ts)) uses the **same** `runFilterLLMCall` but in `'strict'` mode (throws on bad URLs) — see [`src/pipeline/README.md`](../pipeline/README.md).

This unified approach means:

- One filter pipeline, three callers (production eval, single-model eval, multi-model benchmark)
- Zero duplication — any change to the LLM call, prompt, schema, or merge logic lands in exactly one place
- Easy to add new sites — drop a new `<site>-golden-dataset.ts` file and register it in `goldenDatasetsBySite` (`src/evals/combined-golden-dataset.ts`)
- Consistent evaluation across all job boards

## Golden Dataset

Aggregated by [`src/evals/combined-golden-dataset.ts`](combined-golden-dataset.ts). The per-site datasets are registered in the `goldenDatasetsBySite` map; `getGoldenDataset(site?)` returns either the combined dataset (default) or a single site's dataset (for `--site <name>`):

| File | Jobs | Source |
|------|------|--------|
| [`src/sites/wuzzuf/evals/wuzzuf-golden-dataset.ts`](../sites/wuzzuf/evals/wuzzuf-golden-dataset.ts) | 40 (9 real + 31 synthetic) | Mix of real crawled jobs and synthetic test cases |
| [`src/sites/indeed/evals/indeed-golden-dataset.ts`](../sites/indeed/evals/indeed-golden-dataset.ts) | 14 (12 real + 2 synthetic) | Representative jobs from Indeed Egypt |
| **Combined** | **54** | 15 PASS, 38 FAIL, 1 POTENTIAL_MATCH |

Each entry has the shape `{ job: T extends BaseJob, expectedStatus: JobStatus, expectedReasonKeywords: string[] }` (see the `GoldenEntry<T>` type in [`src/types/GoldenEntry.ts`](../types/GoldenEntry.ts)).

Wuzzuf entries are numbered **#1–#40** in comments. Indeed entries are unnumbered. When adding/removing jobs, keep the Wuzzuf numbering in sync.

### Filter Rule Coverage

The combined dataset tests every filter rule:

- **Seniority**: Jobs with Senior, Lead, Manager, Head of, Director, Principal, Staff in titles
- **Experience**: Jobs with 3+ years (PASS) and 4+ years (FAIL)
- **Tech Stack**: JS/TS ecosystems (React, Next.js, Vue, Angular, Node.js) vs. non-JS (Python, Java, PHP, .NET, etc.)
- **Role Type**: Dev roles vs. PM, Designer, QA, Data Analyst, SEO, Facilities
- **Location**: Remote (anywhere OK), Hybrid (Egypt only), On-site (FAIL), non-Egypt remote (OK)
- **Internship**: Jobs with "Intern" in title or description
- **Edge Cases**: Ambiguous stacks, senior titles with 2-3yr exceptions, mid-level titles, Arabic descriptions

### Cross-Site Compatibility

By including jobs from both Wuzzuf and Indeed, the dataset ensures the filter evaluation is:

- **Not site-specific**: Works with any job board that implements the crawler interface
- **Schema-independent**: Site-specific golden files preserve their full type (e.g. `GoldenEntry<WuzzufJob>`), but the combined dataset widens to `GoldenEntry<BaseJob>` so the comparison engine is generic
- **Comprehensive**: Covers diverse job descriptions and formatting across sites
- **Maintainable**: One per-site file + one aggregator = single source of truth, no duplication

## Adding New Heuristics

Add a function with this signature:

```ts
(jobs: EvaluatedJob[], rawJobs: BaseJob[]) => string | null
```

Returns an error message string if the check fails, or `null` if it passes. Import and add to the checks array in `structural.ts`.
