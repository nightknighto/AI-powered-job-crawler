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
