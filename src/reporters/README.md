# Reporters

Composable output system for rendering evaluated job listings in multiple formats. Each reporter implements the `Reporter` interface and can run independently or combined via `CompositeReporter`.

## Core Types

### `Reporter` (`types.ts`)

```ts
interface Reporter {
    display(jobs: EvaluatedJob<BaseJob>[], summary: string, ctx: ReportContext): Promise<void>;
}
```

### `ReportContext` (`types.ts`)

Shared context passed to all reporters in a composable run:

| Field | Type | Description |
|-------|------|-------------|
| `siteName` | `string` | Report label derived from the run — `'all'`, `'wuzzuf'`, or `'wuzzuf-indeed'` (used for filenames and headers). For per-job origin, read each job's `job.site` field. |
| `model` | `string` | Model name used for evaluation |
| `timestamp` | `Date` | Report generation time |
| `outputFiles` | `string[]` | Mutable array — file-writing reporters push paths here for sibling reporters to reference |
| `skippedSites?` | `{ site, reason }[]` | Sites that failed and were skipped during a multi-site run (omitted when nothing was skipped) |
| `droppedJobs?` | `{ site, jobURL, jobTitle }[]` | Jobs the LLM dropped from its filter output (input jobs that received no verdict). Omitted when none. Rendered as a "Dropped by LLM" section. |
| `newJobUrls?` | `Set<string>` | URLs of jobs newly evaluated or dropped this run (cached jobs are absent). Drives the 🆕 badge and new-to-top sort. Omitted on the eval/preview paths (no cache → no newness distinction). |
| `onlyNew?` | `boolean` | When `true`, job tables show only new jobs; count boxes stay total. Set by `--only-new`. |

### `ReportOutput` (`types.ts`)

```ts
interface ReportOutput {
    tablesMarkdown: string;
    summaryMarkdown: string;
}
```

## Available Reporters

| Key | File | Output |
|-----|------|--------|
| `cli-table` | `cli-table.ts` | Terminal markdown tables via `marked-terminal` + `chalk`. Preserves original display behavior. |
| `cli-card` | `cli-card.ts` | Stacked card format — one job per block, each field on its own line. Long skills/reason text gets full terminal width. |
| `cli-summary` | `cli-summary.ts` | Compact: status counts, passing job titles as bullets, file paths from `ctx.outputFiles`. Designed to complement file-writing reporters. |
| `html` | `html.ts` | Styled HTML with inline CSS, 8-column tables (incl. `Site`), clickable job titles, collapsible filtered section, "Sites:" header derived from jobs, "Skipped" note for failed sites. Auto-opens in default browser. Saved to `reports/<siteName>-<timestamp>.html`. |
| `markdown` | `markdown.ts` | Writes deterministic tables (incl. `Site` column) + LLM summary to a `<siteName>-<timestamp>.md` file. Saved to `reports/`. |

## Factory & Composition

- **`createReporters(names: string[])`** — Factory that maps string keys to reporter instances, returns a `CompositeReporter`.
- **`CompositeReporter`** — Wraps multiple reporters, runs them sequentially sharing the same `ReportContext`.
- **`availableReporters`** — Array of all registered reporter keys (for CLI validation / help text).

## Configuration

Reporters are configured as a shared setting in `src/config.ts`:

```ts
export const shared = {
    reporters: ["cli-table"] as string[],  // change to e.g. ["html", "cli-summary"]
    // ...
};
```

Composable — use multiple reporters:

```ts
reporters: ["html", "cli-summary"]
```

## Newness: 🆕 badge, new-to-top sort, `--only-new`

Daily runs overlap up to 7 days of postings, so the report mixes cached (already-seen) and new jobs. Part 2 of the verdict cache feature makes newness **visible**:

- **🆕 badge** — prepended to a job's title when it was newly evaluated or dropped this run. Cached jobs never badge.
- **New-to-top sort** — new jobs sort to the top of each table/card list (within each group, newest-date-first). Driven by `sortByNewThenDate(jobs, newUrls)` in `report-helpers.ts`; falls back to `sortByDate` when `newUrls` is empty/undefined.
- **"New" count box** (HTML only) — a 4th blue count box showing how many jobs are new this run. Always shown (informative even at 0).
- **`--only-new` flag** — hides cached jobs from the tables (passing/failing/dropped show only new jobs). **Count boxes stay total** so you retain awareness of the full set, and the LLM summary is likewise narrowed to newly-evaluated passing jobs (orchestrated in `main.ts`; `generateSummary` just summarizes what it's given, so it plays no role here). A "showing N new of M total" hint appears under the counts.

**Invariant:** a job is "new" iff its URL was evaluated or dropped this run. Consequences:
- First run (cache empty) → every job badges new (technically accurate).
- `--refresh` (re-evaluates all crawled jobs) → every job badges new.
- Dropped jobs are new, but are NOT badged in their section (all-new by definition → a badge on every row is noise).

**Carry mechanism:** newness travels via `ctx.newJobUrls: Set<string>` (a URL set), NOT a field on `EvaluatedJob<T>`. This keeps `EvaluatedJob<T>` pure — newness is a reporting concern, not a job property. `main.ts` accumulates the set from `newlyEvaluated` + `dropped`; the eval path never sets it (so eval reports have no badges).

Badge insertion points per reporter:
- `html.ts` — `tableRow(job, newUrls)` (single method serves both tables); 4th count box in `buildHtml`.
- `cli-card.ts` — `renderCard(job, passed, newUrls)` (title line).
- `cli-table.ts` + `markdown.ts` — via the shared `buildReportTables(jobs, newUrls, onlyNew)` → private `tableRow(job, newUrls)` in `report-helpers.ts`.
- `cli-summary.ts` — the bullet line.

## Preview Command

Test reporters independently with fixture data (no crawl/LLM needed):

```bash
pnpm preview-reporter html cli-summary
```

Uses 6 sample jobs from `fixtures/sample-evaluated-jobs.ts` covering PASS, FAIL, POTENTIAL_MATCH statuses and edge cases (long skills arrays, missing optional fields, multiline reasons).

## Adding a New Reporter

1. Create `src/reporters/<name>.ts` implementing the `Reporter` interface
2. Register it in `src/reporters/index.ts`:
   - Add import
   - Add entry to the `reporterMap` object with a camelCase key
   - Add key to `availableReporters` array
3. Test with `pnpm preview-reporter <name>`

## File Structure

```
src/reporters/
  types.ts                              — Reporter, ReportContext, ReportOutput types
  composite.ts                          — CompositeReporter wrapper
  index.ts                              — Factory + availableReporters registry
  cli-table.ts                          — Terminal markdown tables (original behavior)
  cli-card.ts                           — Stacked card format
  cli-summary.ts                        — Compact summary + file paths
  html.ts                               — Styled HTML report + browser auto-open
  markdown.ts                           — Timestamped .md file output
  preview.ts                            — Standalone preview script (tsx src/reporters/preview.ts)
  fixtures/
    sample-evaluated-jobs.ts            — 6 sample jobs for testing reporters
```
