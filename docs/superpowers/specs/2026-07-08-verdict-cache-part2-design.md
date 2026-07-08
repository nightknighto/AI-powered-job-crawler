# Verdict Cache — Part 2: Reporter & Output Changes

**Status:** Approved (brainstormed 2026-07-08). Implementation pending.
**Part 1:** `docs/superpowers/specs/2026-07-08-verdict-cache-part1-design.md` (shipped — persistent verdict cache, `--refresh`, cache-orchestration stage in `main.ts`).

## Goal

Surface what's genuinely new each daily run. Part 1 made daily runs fast and cheap (cached jobs skip the LLM filter); Part 2 makes newness **visible**: a 🆕 badge on jobs evaluated/dropped this run, new-to-top sorting, an HTML "New" count box, and an `--only-new` flag that hides cached jobs from the tables (counts stay total).

## Problem

Daily crawls overlap up to 7 days of postings, so each run re-surfaces old jobs alongside new ones. Part 1's cache stopped old jobs from being re-filtered, but the report still lists cached and new jobs **intermixed** with no way to tell them apart. The user cannot quickly answer "what's new today?".

## Decisions (from brainstorming Q&A)

| Question | Decision |
|---|---|
| What counts as "new"? | `newlyEvaluated ∪ dropped` this run. Cached never badges. |
| `--only-new` scope | Tables (passing/failing/dropped) filter to new-only; **count boxes stay total**; "(showing N new of M total)" hint. |
| First-run behavior | All badge as new (no special-casing — cache empty → every job is new). |
| `--refresh` interaction | All badge as new (invariant: new = evaluated/dropped this run). |
| Summary scope | **Unchanged** — all passing jobs (new + cached). No scoping. |
| Carry mechanism | `newJobUrls: Set<string>` in `ReportContext`. Keeps `EvaluatedJob<T>` pure. |

## Architecture

Newness travels through `ReportContext.newJobUrls` (a `Set<string>` of job URLs), threaded from `main.ts` → `CompositeReporter` → each reporter. Reporters check `ctx.newJobUrls.has(job.job.jobURL)`. `ctx.onlyNew` is the boolean flag for `--only-new`.

```
main.ts (accumulates newJobUrls from newlyEvaluated ∪ dropped)
   │
   ▼
ReportContext { newJobUrls: Set<string>, onlyNew?: boolean }
   │  (passed by reference to every reporter via CompositeReporter)
   ├─► html.ts        → 4th "New" count box (always), sortByNewThenDate,
   │                     --only-new table filter (counts from full split),
   │                     "showing N new of M total" hint, badged tableRow
   ├─► cli-card.ts    → sortByNewThenDate, badged renderCard, --only-new filter
   ├─► cli-table.ts   ─┐
   ├─► markdown.ts    ─┴→ buildReportTables(jobs, newUrls, onlyNew) [shared]
   └─► cli-summary.ts → sortByNewThenDate (was unsorted), badged bullet, --only-new filter
```

### Invariant

A job is **"new"** iff its URL was evaluated or dropped this run. Cached jobs (reconstructed from `VerdictCache`) are absent from `newJobUrls`. Consequences:

- **First run** (cache empty): every crawled job is evaluated → every job badges new. Technically accurate; no special-casing.
- **`--refresh`** (re-evaluates all crawled jobs): every job badges new. Accurate — they were all just evaluated.
- **Dropped jobs** are new (the LLM saw them this run, even with no verdict). They render in their own "Dropped by LLM" section; we do NOT badge them there (they're all-new by definition, so a badge on every row is redundant noise).

### Why a `Set<string>`, not a field on `EvaluatedJob<T>`

Three approaches were considered:

1. **`newJobUrls: Set<string>` in `ReportContext` (chosen)** — O(1) lookup, no mutation of `EvaluatedJob<T>` (respects the Part 1 constraint that this type stays pure), minimal type surface. The Part 1 spec already named this field.
2. **Stamp `isNew?: boolean` on each `EvaluatedJob`** — newness travels with the job, no extra param to thread. But violates "EvaluatedJob<T> unchanged" and pollutes the core type with a reporting concern; `VerdictCache.toEvaluatedJob` would have to set `isNew: false`. Rejected.
3. **Separate `newJobs: EvaluatedJob[]` array in ctx** — redundant (jobs exist in two arrays), identity/dedup headaches. Rejected.

### Why no `newlyEvaluatedAll` array

The Part 1 spec said Part 1 would accumulate `newlyEvaluatedAll`, but the shipped code does not (only `evaluatedAll`, `droppedAll`, `skipped`). Part 2 considered adding it for summary scoping — but the user decided the summary should stay **all passing** (status quo). With no consumer needing the full new-evaluated objects, only the URL set is required. Simpler, less state. `generate-summary.ts` stays untouched.

## Detailed Design

### 1. `ReportContext` (`src/reporters/types.ts`)

Add two optional fields after `droppedJobs`:

```ts
/** URLs of jobs newly evaluated or dropped this run (cached jobs are absent).
 * Drives the 🆕 badge and new-to-top sort. Omitted on eval/preview paths. */
newJobUrls?: Set<string>;
/** When true, job tables show only new jobs (count boxes stay total). Set by `--only-new`. */
onlyNew?: boolean;
```

Both optional → all existing callers (`eval.ts`, `compare-models.ts`, `preview.ts`) stay valid without changes; production `main.ts` always sets them.

### 2. `report-helpers.ts` — new sort + badged rows

- **Add `sortByNewThenDate<T>(jobs, newUrls?)`** — new jobs first (each group sorted newest-date-first within), then old jobs (same). When `newUrls` is undefined/empty, behaves like `sortByDate`.
- **Extend private `tableRow`** to accept `newUrls` and prepend `🆕 ` to the title cell when the job is new.
- **Extend `buildReportTables(jobs, newUrls?, onlyNew?)`**:
  - Compute counts (`totalPassing`/`totalFailing`) from the **full** split (always total, even under `--only-new`).
  - When `onlyNew`, filter passing/failing arrays to new-only before sorting/building rows.
  - Sort each group via `sortByNewThenDate`.
  - Badge titles via `tableRow(job, newUrls)`.
  - When a group is empty under `--only-new`, emit a placeholder row (`|  | _No new passing jobs._ |  |  |  |  |  |  |`) so the markdown table stays well-formed.
  - When `onlyNew`, prepend a `> Showing N new of M total.` blockquote above each table.
- **`buildDroppedJobsSection`** — **unchanged**. Dropped jobs are all-new by definition; badging every row is redundant.

### 3. `main.ts` — accumulate `newJobUrls`, parse `--only-new`

- Parse `const onlyNew = process.argv.slice(3).includes("--only-new");` alongside `--refresh`. Update usage string to `[--refresh] [--only-new]`.
- Add `const newJobUrls = new Set<string>();` accumulator (parallel to `evaluatedAll`/`droppedAll`/`skipped`).
- Inside the per-site loop, after `evaluate()` returns: `for (const ev of newlyEvaluated) newJobUrls.add(ev.job.jobURL);` and `for (const d of dropped) newJobUrls.add(d.jobURL);`.
- `generateSummary(evaluatedAll, model)` — **unchanged** (all passing).
- Pass `newJobUrls` and `onlyNew: onlyNew || undefined` into the `ReportContext`.

### 4. `html.ts` — count box, sort, filter, hint, badge

- 4th count box "New" (blue/accent) = `jobs.filter(j => newJobUrls.has(j.job.jobURL)).length`. Always shown (informative even at 0; essential under `--only-new`).
- `sortByDate` → `sortByNewThenDate(..., ctx.newJobUrls)` for both tables.
- `--only-new`: filter passing/failing arrays to new-only for table bodies; counts stay from the full split. Add a `<p class="meta">🔍 --only-new: showing N new of M total jobs.</p>` hint after the counts div.
- `tableRow` accepts `newUrls`, prepends `🆕 ` to the title `<a>` text.
- Failing `<summary>` count reflects the **filtered** count so the collapsed header matches the body.

### 5. `cli-card.ts` — sort, badge, filter

- `renderCard(job, passed, newUrls?)` — prepend `🆕 ` to the title line when new.
- `sortByDate` → `sortByNewThenDate(..., ctx.newJobUrls)`.
- `--only-new`: filter passing/failing to new-only before rendering cards.
- Dropped section **unchanged**.

### 6. `cli-table.ts` + `markdown.ts` — thread ctx into shared helper

- `buildReportTables(jobs)` → `buildReportTables(jobs, ctx.newJobUrls, ctx.onlyNew)`.
- No other changes (badge + sort + filter all happen inside the shared helper).

### 7. `cli-summary.ts` — badge, sort, filter

- Prepend `🆕 ` to the bullet title when new.
- Sort the currently-unsorted `passing` via `sortByNewThenDate(passing, ctx.newJobUrls)`.
- `--only-new`: filter passing to new-only. Counts line unchanged (uses full `passing.length`/`failing.length`).

### 8. `preview.ts` — previewable badge/sort

- Parse `--only-new` from argv (filter out `--` args from reporter names).
- Add `newJobUrls` (mark sample items #1 "Senior React Developer" + #2 "Frontend Developer" as new — exercises a new PASS + a new PASS) and `onlyNew` to `mockContext` so `pnpm preview-reporter` shows badged/sorted output without a full pipeline run.

## Files Touched

| File | Action | Change |
|------|--------|--------|
| `src/reporters/types.ts` | Modify | Add `newJobUrls?: Set<string>` + `onlyNew?: boolean` to `ReportContext` |
| `src/reporters/report-helpers.ts` | Modify | Add `sortByNewThenDate`; extend `tableRow` + `buildReportTables` signatures; badge title; counts from full split under `onlyNew` |
| `src/reporters/html.ts` | Modify | 4th "New" count box; `sortByNewThenDate`; `--only-new` filter (counts total); hint line; badged `tableRow` |
| `src/reporters/cli-card.ts` | Modify | `sortByNewThenDate`; badged `renderCard`; `--only-new` filter |
| `src/reporters/cli-table.ts` | Modify | Thread `ctx.newJobUrls` + `ctx.onlyNew` into `buildReportTables` |
| `src/reporters/markdown.ts` | Modify | Thread `ctx.newJobUrls` + `ctx.onlyNew` into `buildReportTables` |
| `src/reporters/cli-summary.ts` | Modify | Badged bullet; `sortByNewThenDate`; `--only-new` filter |
| `src/reporters/preview.ts` | Modify | Add `newJobUrls` + parse `--only-new` |
| `src/main.ts` | Modify | Parse `--only-new`; accumulate `newJobUrls` from `newlyEvaluated` + `dropped`; pass into `ReportContext` |
| `src/reporters/README.md` | Modify | Document `newJobUrls`/`onlyNew`, badge, sort, `--only-new` |
| `AGENTS.md` | Modify | `ReportContext` fields, `--only-new` flag, new-to-top sort + badge pattern, gotcha |
| `README.md` | Modify | `--only-new` usage; note 🆕 badge + "New" box |

## NOT Touched

- `EvaluatedJob<T>` (`src/types/evaluated-job.ts`) — stays pure; newness is a reporting concern, not a job property.
- `evaluate.ts`, `run-filter.ts`, `generate-summary.ts` — cache-unaware, summary covers all passing.
- `VerdictCache` (`src/state/verdict-cache.ts`) — mechanics only, unchanged.
- Eval scripts (`eval.ts`, `compare-models.ts`, `compare-prompts.ts`) — cache-free AND badge-free (never set `newJobUrls`/`onlyNew`).
- `config.ts`, `composite.ts`, `index.ts`, crawlers, types (except `types.ts` in reporters/).
- Golden datasets, filter rules (`filter.md`), structural heuristics — per AGENTS.md "Never Change Without Explicit Request".
- User's untracked WIP: `linkedin/`, `compare-prompts.ts`, `filter.md`, `registry.ts`, `variants/`, `.zcode/`.

## Edge Cases

- **Empty new set** (`newJobUrls` empty/undefined): `sortByNewThenDate` falls back to `sortByDate`; no badges render. Zero behavioral change from today.
- **`--only-new` with no new jobs**: tables show placeholder rows ("_No new passing jobs._"); counts stay total; hint shows "showing 0 new of N total".
- **First run**: all jobs badge new. Acceptable (accurate).
- **`--refresh`**: all jobs badge new. Acceptable (accurate — they were all just evaluated).
- **Dropped jobs**: included in `newJobUrls` (so the count is right) but NOT badged in their section (redundant — they're all new).
- **`onlyNew` true but `newJobUrls` undefined/empty**: treated as "no new jobs" → empty tables with placeholder rows. Cannot happen in production (main.ts always sets `newJobUrls`), but defensive.
