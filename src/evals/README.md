# Eval System

Evaluation framework for benchmarking LLM filter accuracy against hand-labeled data and structural heuristics.

## Components

### 1. Golden Dataset Comparison (`golden.ts`)

Compares AI-evaluated jobs against a hand-labeled golden dataset.

**`PerJobResult` interface:**

| Field | Description |
|-------|-------------|
| `jobIndex` | 1-based index (#1–#40) |
| `jobTitle` | Job title |
| `jobURL` | Job URL (used for matching) |
| `expectedStatus` | Golden dataset status |
| `actualStatus` | AI-determined status |
| `statusMatch` | Whether expected === actual |
| `expectedKeywords` | Keywords expected in reason text |
| `matchedKeywords` | Keywords found in AI reason |
| `unmatchedKeywords` | Expected keywords not found |
| `reasonText` | Full AI reason text |

**`compareGolden()`** — Takes golden dataset + AI results, matches by `jobURL`, computes per-job results.

**Metrics computed:** Precision, recall, F1 per class (`PASS`, `FAIL`, `POTENTIAL_MATCH`), overall accuracy.

> **Primary metric: PASS F1** — PASS is the minority class (12/40) and hardest to get right.

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

## Commands

| Command | Description |
|---------|-------------|
| `pnpm eval <model>` | Run golden eval + structural heuristics for one model. Exit code 1 if accuracy < 80%. |
| `pnpm compare` | Run eval for all 3 models, print ranked comparison table sorted by PASS F1. |

## Adding New Heuristics

Add a function with this signature:

```ts
(jobs: EvaluatedJob[], rawJobs: BaseJob[]) => string | null
```

Returns an error message string if the check fails, or `null` if it passes. Import and add to the checks array in `structural.ts`.

## Golden Dataset

Located at `src/sites/wuzzuf/evals/golden-dataset.ts`. Contains **40 hand-labeled jobs**:

- 12 PASS
- 27 FAIL
- 1 POTENTIAL_MATCH

Each entry: `{ job: WuzzufJob, expectedStatus: JobStatus, expectedReasonKeywords: string[] }`

Jobs are numbered **#1–#40** in comments — keep numbering in sync when adding/removing jobs.
