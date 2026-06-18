# Eval System

Evaluation framework for benchmarking LLM filter accuracy against hand-labeled data and structural heuristics.

The eval pipeline is **fully unified across all sites**: it consumes a single combined golden dataset, the shared `unifiedFilterPrompt`, and the shared `jobEvaluationSchema`. There is no per-site filter prompt or evaluation schema.

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
| `pnpm eval <model>` | Run golden eval + structural heuristics for one model against the combined dataset. Pass `--failed-only` to print only mismatches. Exit code 1 if accuracy < 80%. |
| `pnpm compare` | Run eval for all configured models, print ranked comparison table sorted by PASS F1. |

## Implementation Details

The evaluation script ([`src/eval.ts`](../eval.ts)) and benchmark script ([`src/compare-models.ts`](../compare-models.ts)) both use:

- The **combined golden dataset** from [`src/evals/combined-golden-dataset.ts`](combined-golden-dataset.ts), which aggregates every per-site file under `src/sites/<site>/evals/`
- The **shared filter prompt** `unifiedFilterPrompt` from [`src/pipeline/prompts.ts`](../pipeline/prompts.ts) (loaded from `src/pipeline/prompts/filter.md`)
- The **shared evaluation schema** `jobEvaluationSchema` from [`src/types/evaluated-job.ts`](../types/evaluated-job.ts)
- The generic comparison logic in [`src/evals/golden.ts`](golden.ts) that works with `BaseJob`-typed jobs

This unified approach means:

- No site-specific code in the evaluation system
- A single combined dataset for all sites (no duplication)
- Easy to add new sites — just drop a new `<site>-golden-dataset.ts` file and append it in `combined-golden-dataset.ts`
- Consistent evaluation across all job boards

## Golden Dataset

Aggregated by [`src/evals/combined-golden-dataset.ts`](combined-golden-dataset.ts) from per-site files:

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
