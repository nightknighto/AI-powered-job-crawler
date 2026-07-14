# Eval System

Evaluation framework for benchmarking LLM filter accuracy against hand-labeled cases and structural heuristics.

The eval pipeline is **fully unified across all sites**: it consumes a single rule-tagged case library, the shared `filterPrompt`, and the shared `jobEvaluationSchema`. There is no per-site filter prompt, evaluation schema, or golden dataset.

## Design principles

1. **Real jobs first.** ~80% of cases are sourced verbatim from real crawled jobs (`storage/datasets/*.json`) or historical `realJobs`. Synthetic cases exist only to fill coverage gaps no real job supplies (e.g. internship titles).
2. **Single-causal by construction.** Each case isolates exactly one filter rule — every OTHER filter is kept green so only the target rule can trigger. This makes per-category accuracy directly diagnostic: a low score in one category pinpoints exactly which rule the model mishandles.
3. **Plain-English scoring.** Overall accuracy + per-category accuracy. No F1 / precision / recall — those were computed but carried no weight and added jargon without value.
4. **Reasons are inspection-only.** The model's `reason[]` text is kept in the output for human investigation of failures, but it is NEVER keyword-matched or scored. The per-category accuracy already pinpoints which rules fail.

## Case library (`cases/`)

One file per filter rule, so dropping in a new case means opening the right file:

```
src/evals/cases/
  title-seniority.ts   — Title Filter (Senior/Lead/Manager/Head of/Director/Principal/Staff)
  internship.ts        — Internship Filter
  tech-stack.ts        — Tech Stack Filter (JS/TS ecosystem vs non-JS)
  role-type.ts         — Role Type Filter (dev roles vs QA/PM/vendor-platform)
  experience.ts        — Experience Filter (≤3yr PASS, 4+yr FAIL)
  location.ts          — Location Filter (remote/hybrid-Egypt PASS, onsite/hybrid-non-Egypt FAIL)
  ambiguous.ts         — POTENTIAL_MATCH fallback (dual-stack, non-dev titles, multi-backend)
  multi-cause.ts       — Compound-rejection jobs (2+ valid failure reasons; status-only scoring)
  index.ts             — assembles all files, exports getAllCases / getCasesByIds / casesById
```

Each case has the shape (see `src/types/GoldenEntry.ts`):

```ts
{
  id: string;              // signal-descriptive slug, e.g. "exp-threshold-4yr-fail"
  category: CaseCategory;  // the one rule this case isolates (= its file)
  real: boolean;           // true if sourced from a real crawled job
  job: BaseJob;            // the job to feed the LLM (minimal shape, no `tags`)
  expectedStatus: JobStatus;
  isolationNote: string;   // what signal this case isolates (shown in report on mismatch)
}
```

### Case IDs

IDs are signal-descriptive slugs: `<category>-<what-makes-this-case-unique>[-status]` (e.g. `exp-threshold-4yr-fail`, `role-qa-junior-fail`, `ambig-dualstack-pm`). The suffix describes the case's signal — never a sequence number — so adding or removing a sibling case never forces a renumber. IDs must be globally unique; `cases/index.ts` throws at load time on a duplicate.

### Sourcing a new case from a real job

1. Run `pnpm crawl <site>` to refresh `storage/datasets/<site>/`.
2. Find a real job that isolates ONE rule (every other filter green).
3. Copy its fields verbatim into the matching `cases/<category>.ts` file — full `jobDetails` text untruncated (that's what the LLM filters on). Set `real: true`.
4. Give it a signal-descriptive `id` and write an `isolationNote` documenting which filters are deliberately green.

Only fall back to a synthetic case (`real: false`, `jobURL: "https://eval.synthetic/<id>"`) when no real job supplies the needed signal.

## Components

### 1. Golden Comparison (`golden.ts`)

`compareGolden(dataset, aiOutput)` matches cases by `jobURL`, checks status correctness, and rolls accuracy up per category.

**`PerJobResult` fields:** `id`, `category`, `jobTitle`, `jobURL`, `expectedStatus`, `actualStatus`, `statusMatch`, `dropped`, `reasonText` (inspection only), `isolationNote`, `real`.

**`GoldenComparisonResult`:** `perJob[]`, `overallAccuracy`, `categoryMetrics` (`Record<CaseCategory, { correct, total, accuracy }>`), `summary`.

**Scoring is status-only.** Keyword matching was removed entirely — it carried zero weight and couldn't distinguish a correct verdict citing a different valid reason from a wrong one. Per-category accuracy replaces it: a low score in `experience` means the model mishandles the experience rule, full stop.

### 2. Structural Heuristics (`structural.ts`)

6 rule-based checks independent of the golden cases:

| # | Check | Description |
|---|-------|-------------|
| 1 | `checkNoDroppedJobs` | AI should not return fewer jobs than input |
| 2 | `checkValidStatuses` | Only PASS/FAIL/POTENTIAL_MATCH allowed |
| 3 | `checkNonEmptyReasons` | Every job must have at least one reason string |
| 4 | `checkTitleFilterConsistency` | Lead/Manager/Head of/Director/Principal/Staff in title → FAIL (NOTE: "senior" is intentionally excluded — seniority is enforced via the Experience Filter + 2-3yr exception per `filter.md`, not the title keyword) |
| 5 | `checkInternshipFilterConsistency` | "Intern" in title → FAIL |
| 6 | `checkNoEmptyFields` | No empty strings in job title, URL, or reasons |

### 3. Report Writer (`report-writer.ts`)

Writes eval results to `eval-results/` as markdown:

- **`writeEvalReport()`** — single-model report: per-category accuracy table, heuristics, per-case breakdown (with id, isolationNote, model reason marked "inspection only").
- **`writeCompareReport()`** — multi-model comparison ranked by overall accuracy.
- **`writePromptCompareReport()`** — prompt-variant comparison ranked by overall accuracy, with timing/token columns.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm eval <model>` | Run all cases for one model. Exit 1 if accuracy < 80%. `--print-failed-only` prints only mismatches. |
| `pnpm eval <model> --category <name>` | Scope to one rule category (`title-seniority` \| `internship` \| `tech-stack` \| `role-type` \| `experience` \| `location` \| `ambiguous` \| `multi-cause`). |
| `pnpm eval <model> --cases id1,id2,...` | Cherry-pick specific cases by ID. |
| `pnpm compare` | Run all configured models, rank by overall accuracy. Accepts `--category` / `--cases` too. |
| `pnpm compare-prompts <model>` | Run all prompt variants for a model, rank by overall accuracy. Accepts `--category` / `--cases` / `--variants`. |

`--category` and `--cases` can be combined with any runner. `--cases` wins if both are given.

## Implementation Details

All three runners share the same filter pipeline via `runFilterEval(modelKey, goldenDataset, prompt?)` in `src/pipeline/run-filter.ts`. The caller resolves the case set via `getAllCases(category?)` / `getCasesByIds(ids)` from `src/evals/cases/index.ts` and passes it in.

`runFilterEval` calls `runFilterLLMCall(jobs, modelConfig, { mode: "tolerant" })` — tolerant mode warns (rather than throws) on unknown/duplicate/dropped URLs so noisy LLM output can still be scored. It then runs `compareGolden()` and `runStructuralHeuristics()`.

The production pipeline (`src/pipeline/evaluate.ts`) uses the same `runFilterLLMCall` but in `'strict'` mode — see `src/pipeline/README.md`.

## Adding New Heuristics

Add a function with the signature `(input: BaseJob[], output: EvaluatedJob[]) => HeuristicResult` to `structural.ts` and register it in the checks array.
