# AGENTS.md

## Project Overview

Job search filtering system that crawls Wuzzuf and Indeed Egypt (job boards), filters listings through a local LLM (Ollama) using structured JSON output, and generates markdown/HTML reports via a composable reporter system. Includes a rule-tagged eval case library for benchmarking LLM filter accuracy across multiple models.

## Tech Stack & Conventions

- **TypeScript ESM** — `"type": "module"`, `Node16` module resolution
- **Import paths** use `.js` extensions even for `.ts` files (Node16 requirement)
- **pnpm** — package manager
- **Zod v4.4.3** — runtime validation + `z.toJSONSchema()` for Ollama structured output
- **tsx** — TypeScript runner (no build step needed)
- **Crawlee 3.17 + Cheerio** — web crawling
- **marked + marked-terminal + chalk** — terminal markdown rendering

## Key Patterns

### SiteConfig\<T\> generic

Sites are abstracted behind `SiteConfig<T extends BaseJob>`:

```ts
interface SiteConfig<T extends BaseJob> {
  key: SiteKey;                              // registry key + display name (e.g. "wuzzuf")
  crawl: () => Promise<Omit<T, "site">[]>;   // returns jobs WITHOUT a `site` field
  jobSchema: ZodType<Omit<T, "site">>;       // validates the non-`site` fields only
}
```

Sites only describe **crawling** and the **raw job shape** — to add a site, implement this interface and register it in `src/sites/registry.ts`. The `site` field is deliberately **not** part of `SiteConfig`: crawlers return jobs without it, and `src/pipeline/crawl.ts` stamps it centrally from `key`, so every job's origin is derived from its registry slot. This decoupling means a site can be crawled and filtered **without** first shipping a golden dataset.

> The **filter prompt**, the **job-summary prompt**, and the **LLM-output evaluation schema** are intentionally **not** part of `SiteConfig`. They live in `src/pipeline/prompts.ts` (`filterPrompt`, `jobSummaryPrompt`) and `src/types/evaluated-job.ts` (`jobEvaluationSchema`) respectively, so filtering and summarizing behave identically across all sites.

### `SiteKey` (source of truth for job origin)

`SiteKey` is the **source of truth** for `BaseJob.site`. It is derived directly from the production `sites` registry in `src/sites/registry.ts` (`export type SiteKey = keyof typeof sites`), so it covers every crawlable site — currently `'wuzzuf' | 'indeed' | 'workable' | 'jooble' | 'linkedin'`.

There used to be a `GoldenSiteKey` (an eval subset of `SiteKey`); it was removed when the eval system was unified. The eval case library is now **site-agnostic** — cases are organized by filter-rule category (`CaseCategory`), not by site. The dependency direction is still **production → eval**: `BaseJob.site: SiteKey` exists because production crawlers stamp it; eval cases declare it as a literal for traceability but no code branches on it. Never import from `src/evals/` into `src/types/` or `src/sites/`.

### Prompt templates with `{{placeholder}}` substitution

Both prompts are shared site-wide under `src/pipeline/prompts/`:

- **Filter prompt** (`filter.md`) — at runtime, the `{{jobs}}` placeholder is replaced with the JSON array of crawled jobs.
- **Job-summary prompt** (`job-summary.md`) — at runtime, the `{{passingJobs}}` placeholder is replaced with the JSON array of passing evaluated jobs.

Both are loaded as plain-string constants by `src/pipeline/prompts.ts`.

### Zod schemas for LLM output validation

LLM output is validated by the shared `jobEvaluationSchema` in `src/types/evaluated-job.ts`. `z.toJSONSchema()` converts it to JSON Schema for Ollama's `structured_outputs` feature. Per-site schemas only validate raw job shape (`jobSchema`), never the LLM response.

### Eval case library (rule-tagged, real-job-based)

The eval benchmark is a single unified case library at `src/evals/cases/`, organized **one file per filter rule** (`title-seniority`, `internship`, `tech-stack`, `role-type`, `experience`, `location`, `ambiguous`, `multi-cause`). Each case is a `GoldenEntry` tagged with the ONE rule it isolates (`category: CaseCategory`), is **single-causal by construction** (every other filter kept green so only the target rule can trigger), and is sourced from a **real crawled job** wherever possible (`real: true`, fields copied verbatim from `storage/datasets/*.json`); synthetic gap-fillers (`real: false`) exist only for coverage no real job supplies (e.g. internship titles). `compareGolden()` matches by URL and reports **overall accuracy + per-category accuracy** — no F1/precision/recall, no keyword scoring (reasons are kept in the output for human inspection only). The per-category accuracy IS the eval-suite coverage: a low score in `experience` pinpoints exactly which rule the model mishandles.

Case IDs are signal-descriptive slugs (`<category>-<unique-signal>[-status]`, e.g. `exp-threshold-4yr-fail`), never sequence numbers, so adding/removing a case never renumbers siblings. The `--category <name>` flag scopes a run to one rule file; `--cases id1,id2,...` cherry-picks specific cases.

### Model config pattern

```ts
const modelConfigs = {
  camelCaseKey: { model: 'ollama-model-name', temperature: 0.2, think: false },
} as const satisfies Record<string, ModelConfig>;
```

Keys are camelCase identifiers used in CLI args. `model` is the exact Ollama model tag. `think` enables Ollama's reasoning mode.

### Reporter key pattern

Reporters are configured in the `shared` object in `src/config.ts`, not per-model:

```ts
export const shared = {
  reporters: ['cli-table'] as string[],
  // ...
};
```

Reporter keys are lowercase-hyphen strings registered in `src/reporters/index.ts`: `cli-table`, `cli-card`, `cli-summary`, `html`, `markdown`. Multiple reporters can be composed (e.g. `["html", "cli-summary"]` for HTML file + terminal summary). The `CompositeReporter` runs them sequentially sharing the same `ReportContext`.

### Multi-site runs

`main.ts` accepts more than a single site via its first positional arg:

- `pnpm start <site>` — single site, unchanged flat path
- `pnpm start all` — every entry in the `sites` object
- `pnpm start wuzzuf,indeed` — a comma-separated subset

For multi-site runs, crawl → evaluate loop **once per site** (small per-site filter prompts; one malformed LLM output only loses one site), with **skip-and-continue**: a failed site is logged and recorded in `ReportContext.skippedSites` rather than aborting the whole run. Evaluated results are merged, then **one** combined summary LLM call covers all passing jobs. Reporters run once over the merged set, producing a single unified report named after the run (`reports/all-<timestamp>.html`, `reports/wuzzuf-indeed-<timestamp>.html`, etc.). Each job's origin shows in a `Site` column; the report header lists the actual sites present (derived from job data).

This relies on every job carrying a `site: SiteKey` field (see `BaseJob`). `src/pipeline/crawl.ts` stamps it centrally from `SiteConfig.key` for production jobs; eval cases declare it as a literal for traceability — so the eval path also carries `site` through (it appears in the prompt JSON as harmless read-only context; the LLM never outputs it, and `mergeJobsByUrl` reattaches the full original job by reference).

### Verdict cache (production only)

Daily runs overlap heavily (crawlers fetch up to 7 days of postings), so re-filtering yesterday's
jobs wastes LLM tokens. A persistent `VerdictCache` (`src/state/verdict-cache.ts`) stores
`jobURL → { status, reason, experienceLevel?, skills?, firstSeenAt, site }` in
`state/verdict-cache.json` (gitignored). The cache stage lives in `main.ts`'s per-site loop:

```ts
const toEvaluate = refresh ? jobs : jobs.filter((j) => !cache.has(j.jobURL));
const cachedJobs = refresh ? [] : jobs.filter((j) => cache.has(j.jobURL));
// evaluate(new only) → reconstruct(cached, fresh body) → merge → cache.set(new) → save once
```

- **`evaluate.ts` and `run-filter.ts` are cache-unaware.** Caching is a stage in `main.ts`; the
  shared filter stays pure so the eval path is unaffected.
- **Dropped jobs are never cached** — they're re-evaluated next run (transient LLM hiccups don't
  permanently bury a job).
- **`--refresh`** ignores cache reads, re-evaluates all crawled jobs, and updates the store while
  **preserving `firstSeenAt`** for known URLs. Run after editing `filter.md`. It does NOT clear the
  store; un-crawled entries age out via 30-day pruning.
- **Eval path is cache-free** — `eval.ts`, `compare-models.ts`, `compare-prompts.ts` never
  construct a `VerdictCache`.
- **Part 2 makes newness visible in reports.** `main.ts` accumulates a `newJobUrls: Set<string>`
  of every URL evaluated or dropped this run and passes it via `ReportContext.newJobUrls`. Each
  reporter prepends a 🆕 badge to a new job's title, sorts new jobs to the top within each group
  (`sortByNewThenDate` in `report-helpers.ts`), and the HTML reporter adds a 4th blue "New" count
  box. **Cached jobs never badge.** The `--only-new` flag (`ReportContext.onlyNew`) hides cached
  jobs from the tables (passing/failing/dropped show only new) while **count boxes stay total**, and
  also scopes the **LLM summary** to newly-evaluated passing jobs (`main.ts` computes the exact set
  to summarize — passing-only always, narrowed to new under `--only-new` — and hands it to a pure
  `generateSummary`). **Invariant:** a job is "new" iff it was evaluated or dropped this run — so the
  first run (cache empty) and `--refresh` (re-evaluates all) badge every job. By default (no flag) the
  summary covers **all** passing jobs (new + cached) for a self-contained report. The eval path never
  sets `newJobUrls`/`onlyNew`, so eval reports have no badges. Newness travels via `ctx.newJobUrls`,
  **not** a field on `EvaluatedJob<T>` — keep that
  type pure.

### Site addition pattern

To add a new job board site:

1. **Create site type** in `src/types/<Site>Job.ts` extending `BaseJob`:
   ```ts
   export interface SiteJob extends BaseJob {
     company: string;
     location: string;
     // Add any site-specific fields
   }
   ```
   - `BaseJob` already includes a required `site: SiteKey` field — inherited automatically.

2. **Create crawler** in `src/sites/<site>/<site>-crawler.ts`:
   - Export `async function crawl<Site>(): Promise<Omit<SiteJob, "site">[]>` (jobs WITHOUT a `site` field — `crawl()` stamps it centrally)
   - Use CheerioCrawler (or PlaywrightCrawler for JS-heavy SPAs) from Crawlee
   - Max 20 requests total
   - For sites requiring detail page visits (like Indeed), use two-stage crawl
   - **Do NOT stamp a `site` field** — `src/pipeline/crawl.ts` derives it from `SiteConfig.key`. The pushed object uses `satisfies Omit<SiteJob, "site">`.
   - **Write to a per-site named dataset** (`Dataset.open("<site>")`), `drop()` it at the start of every run (named datasets are NOT auto-purged), and read results back via `store.getData()`. Do **not** use the default `pushData` and `readdir`/`JSON.parse` on `storage/datasets/default` — in a multi-site run all crawlers share one process, so the default dataset collides and every crawler reads back a contaminated mix of all sites' jobs. See `src/sites/README.md` → "Dataset convention".

3. **Create SiteConfig** in `src/sites/<site>/index.ts`:
   ```ts
   const jobSchema = z.object({
     jobTitle: z.string(),
     // ...other BaseJob + site-specific fields (NO `site` field — stamped centrally)
   }) satisfies z.ZodType<Omit<SiteJob, "site">>;

   export const siteConfig: SiteConfig<SiteJob> = {
     key: "site",   // MUST equal the registry slot below (convention — see registry.ts)
     crawl: crawlSite,
     jobSchema,
   };
   ```
   - Define `jobSchema` over the non-`site` fields only. There is no `siteKeySchema` to import — that was removed when `site` became centrally stamped.
   - Do **not** create any per-site prompt files — both the filter prompt and the job-summary prompt are shared site-wide at `src/pipeline/prompts/`.

4. **Register site** in `src/sites/registry.ts`:
   - Import the site config
   - Add to the `sites` object keyed by the **same** string as `SiteConfig.key` (convention, documented in `registry.ts` — `crawl.ts` stamps every job's `site` from `key`, so a mismatch mislabels all jobs and surfaces immediately in reports). This single registration makes the site available to `pnpm start all` and comma-lists automatically, AND to `pnpm crawl <site>` for crawl-only testing. `SiteKey` widens to include the new key automatically (`keyof typeof sites`).
   - Site is selected via the first positional CLI arg (`pnpm start <site>`, `pnpm start all`, or `pnpm start site1,site2`). To test the crawler in isolation while developing it, use `pnpm crawl <site>` — it dumps raw jobs to `reports/crawl-<site>-<ts>.json` and skips the LLM filter/summary/reporters.

5. **Update exports** in `src/types/index.ts`:
   - Export the new site type (`SiteKey` is already re-exported there and widens automatically)

6. *(Optional)* **Contribute real jobs to the eval case library** — the eval cases are site-agnostic and organized by filter-rule category under `src/evals/cases/`, NOT per-site. If crawling the new site surfaces a real job that isolates a filter rule (e.g. an on-site-only location FAIL), copy it verbatim into the matching `cases/<category>.ts` file with a signal-descriptive `id` and `real: true`. **A site works in production without this step** — eval coverage is never a prerequisite for crawling/filtering.

7. **Update documentation**:
   - `README.md` — Add site to quick start and pipeline description
   - `AGENTS.md` — Update file structure and patterns
   - `src/sites/README.md` — Document site-specific implementation
   - `src/types/README.md` — Document the new type

## File Structure

```
src/
  main.ts                          — Entry point, orchestrates the full pipeline; first positional arg selects one site, `all`, or a comma-list (e.g. wuzzuf,indeed)
  crawl-dev.ts                     — Crawl-only dev tool (`pnpm crawl <site> [--verbose]`): runs ONLY the crawler and dumps raw jobs to reports/crawl-<site>-<ts>.json, skipping the LLM filter/summary/reporters. `--verbose` prints the full JSON of the first 10 jobs per site. Used when iterating on a crawler's extraction logic.
  config.ts                        — ModelConfig interface, modelConfigs map, shared settings
  eval.ts                          — Single-model eval runner; `--category`/`--cases` scope the case set; 80% accuracy threshold gate
  compare-models.ts                — Multi-model benchmark, ranks by overall accuracy
  compare-prompts.ts               — Prompt variant comparison runner (pnpm compare-prompts); ranks by overall accuracy
  types/
    base.ts                        — BaseJob interface (jobTitle, jobURL, company, location, date, jobDetails[], site)
    WuzzufJob.ts                   — Extends BaseJob with company, location, tags
    IndeedJob.ts                   — Extends BaseJob with company, location
    JoobleJob.ts                   — Extends BaseJob (no extra fields)
    evaluated-job.ts               — JobStatus enum, EvaluatedJob<T> type, shared jobEvaluationSchema (status, reason, experienceLevel?, skills?)
    site-config.ts                 — SiteConfig<T> interface (key: SiteKey, crawl → Omit<T,"site">[], jobSchema validates non-site fields)
    GoldenEntry.ts                 — GoldenEntry interface (id, category, real, job, expectedStatus, isolationNote) for eval case library; CaseCategory union
    index.ts                       — Re-exports all types
    WorkableJob.ts                 — Extends BaseJob (Workable-specific shape; currently no extra fields)
  pipeline/
    crawl.ts                       — Generic crawl orchestration via SiteConfig
    evaluate.ts                    — Production filter stage; thin wrapper around run-filter.ts (strict mode on unknown/duplicate URLs; dropped jobs collected non-fatally)
    run-filter.ts                  — Shared filter pipeline: parseLlmOutput, logTimingAndTokens, mergeJobsByUrl, runFilterLLMCall, runFilterEval(modelKey, goldenCases) (used by evaluate.ts, eval.ts, compare-models.ts, compare-prompts.ts)
    generate-summary.ts            — LLM summary for passing jobs (returns string)
    report-helpers.ts              — Deterministic report tables (no LLM), date parsing, table formatting
    prompts.ts                     — Loads the shared filter + job-summary prompts from prompts/*.md and exports filterPrompt, jobSummaryPrompt
    prompts/
      filter.md                    — Shared LLM filter prompt with {{jobs}} placeholder (used by all sites)
      job-summary.md               — Shared LLM job-summary prompt with {{passingJobs}} placeholder (used by all sites)
      variants/                    — Prompt variant files for compare-prompts runner
  reporters/
    types.ts                       — Reporter interface, ReportContext, ReportOutput types
    composite.ts                   — CompositeReporter wraps multiple reporters, shares context
    index.ts                       — Factory createReporters(names[]), availableReporters registry
    cli-table.ts                   — Terminal markdown tables via marked-terminal (original behavior)
    cli-card.ts                    — Stacked card format with full-width fields
    cli-summary.ts                 — Compact counts + passing titles + file paths
    html.ts                        — Styled HTML with Site column + "Sites:" header + "Skipped" note + 🆕 badge + "New" count box, auto-open, saved to reports/<siteName>-<ts>.html
    markdown.ts                    — .md file output with Site column, saved to reports/<siteName>-<ts>.md
    preview.ts                     — Standalone preview script (pnpm preview-reporter)
    fixtures/
      sample-evaluated-jobs.ts     — 6 sample EvaluatedJob<WuzzufJob> for testing reporters
  evals/
    cases/                         — Unified, site-agnostic eval case library (one file per filter rule)
      title-seniority.ts           — Title Filter cases (Lead/Manager/Head of/Director/Principal/Staff)
      internship.ts                — Internship Filter cases (synthetic — no real internship jobs exist)
      tech-stack.ts                — Tech Stack Filter cases (JS/TS vs non-JS; secondary-language exception)
      role-type.ts                 — Role Type Filter cases (QA/vendor-platform/data-engineer rejects)
      experience.ts                — Experience Filter cases (≤3yr PASS, 4+yr FAIL, no-signals PASS, clean baseline)
      location.ts                  — Location Filter cases (hybrid-non-Egypt, on-site)
      ambiguous.ts                 — POTENTIAL_MATCH fallback cases (dual-stack, non-dev title, multi-backend)
      multi-cause.ts               — Compound-rejection cases (2+ valid failures; status-only scoring)
      index.ts                     — Assembles casesByCategory; getAllCases(category?), getCasesByIds(ids), casesById; duplicate-id guard
    golden.ts                      — compareGolden(): per-category accuracy (overall + per CaseCategory); no F1/precision/recall; reasons inspection-only
    structural.ts                  — 6 heuristic checks (dropped jobs, valid statuses, title/internship consistency, etc.)
    report-writer.ts               — Writes eval/compare/compare-prompts results to eval-results/ (per-category accuracy tables)
  sites/
    registry.ts                    — Single source of truth for the `sites` map + `SiteKey` type (derived via `keyof typeof sites`). Imported by main.ts, crawl-dev.ts, and type-only by base.ts/site-config.ts. Register new sites here. Each config's `key` must match its slot (convention — centralstamping in crawl.ts makes a mismatch obvious in reports).
    wuzzuf/
      index.ts                     — SiteConfig for Wuzzuf
      wuzzuf-crawler.ts            — Cheerio crawler, 4 search URLs, max 20 requests
      prompts/filter.old.md        — Historical per-site filter prompt, kept for reference (not loaded at runtime)
      prompts/report.old.md        — Historical per-site report prompt, kept for reference (not loaded at runtime)
    indeed/
      index.ts                     — SiteConfig for Indeed Egypt
      indeed-crawler.ts            — Two-stage crawler (search + detail pages), max 20 requests
    workable/
      index.ts                     — SiteConfig for Workable
      workable-crawler.ts          — Playwright crawler (JS-heavy SPA), max 20 requests
    jooble/
      index.ts                     — SiteConfig for Jooble
      jooble-crawler.ts            — Playwright crawler, max 20 requests
    linkedin/
      index.ts                     — SiteConfig for LinkedIn (uses BaseJob directly — no site-specific fields)
      linkedin-crawler.ts          — Cheerio crawler, seed page enqueues detail pages, max 30 requests
  helpers/
  helpers/
    extractTextWithLineBreaks.ts   — HTML → text with preserved line breaks
  state/
    verdict-cache.ts               — VerdictCache: persistent jobURL→verdict store (mechanics only); load/has/toEvaluatedJob/set/save; 30-day prune; atomic write. Cache orchestration is a stage in main.ts, not in evaluate.ts
    README.md                      — Documents the verdict cache module
```

## Documentation — Mandatory for All Feature Work and Design Changes

**Documentation is not optional.** Every new feature, system design change, or architectural decision must include documentation updates as part of the change — not as a follow-up.

### When documentation is required

- **Creating a new feature** → Document it in `README.md` and the relevant subfolder README before considering the feature complete.
- **Changing system design or architecture** → Update `AGENTS.md` patterns, file structure, and conventions; update `README.md` architecture description.
- **Adding a new file or module** → Add it to the file structure in `AGENTS.md` and update the relevant subfolder README.
- **Modifying an existing file** → Update that subfolder's README to reflect the change.

### Documentation checklist — must be satisfied before marking any task complete

1. **`README.md`** — Does this change affect how users use the system, the architecture, the pipeline, or available scripts? If yes → update `README.md`.
2. **`AGENTS.md`** — Does this change affect file structure, patterns, conventions, or tech stack? If yes → update `AGENTS.md`.
3. **Subfolder READMEs** — Does this change touch files in a subfolder? If yes → update that subfolder's README:
   - `src/pipeline/README.md` ← any change to `src/pipeline/*.ts`
   - `src/evals/README.md` ← any change to `src/evals/*.ts`
   - `src/sites/README.md` ← any change to `src/sites/**/*`
   - `src/types/README.md` ← any change to `src/types/*.ts`
4. **JSDoc** — When changing an exported function, interface, or type, update its JSDoc comment to match.
5. **File Structure tree** — If files are added/renamed/removed, update the tree in this file AND in README.md.

**Rule of thumb:** If a reviewer would be surprised by stale docs after reading the code, the docs need updating.

## Accomplishments

**After completing significant features, draft accomplishments for the [accomplishments.md](accomplishments.md) file.** This builds a showcase portfolio of your work suitable for CVs, job interviews, and technical discussions.

### Accomplishment Style Guide

Each accomplishment should follow this pattern:

1. **Action verb** at the start — "Reduced", "Split", "Refactored", "Implemented", "Extended", "Built", etc.
2. **Concrete metrics** — use percentages when possible, not absolute numbers that vary across runs (e.g., "reduced by 55%" not "reduced by 220 seconds")
3. **Technical context** — what was changed, how it was implemented, what systems were involved
4. **Benefits/outcomes** — why this matters, what problems it solved (reliability, cost, speed, quality, maintainability)
5. **Concise but informative** — typically 1-2 sentences for impact-focused accomplishments, 2-3 for more technical depth

### Examples

```
- Reduced LLM filter inference time by 55% and output tokens by 54% by refactoring the structured output to return only deduced fields, merging original job data in code via URL-based lookup.

- Split monolithic LLM job evaluation into separate filter and report stages, enabling objective quality benchmarking, improved system reliability, and faster iteration through stage isolation.

- Refactored report stage from monolithic LLM to hybrid approach: code-driven tables for instant, deterministic output plus LLM summaries only for passing jobs, reducing latency, costs, and output variance.
```

### When to Add Accomplishments

- After architectural changes that improve system quality or performance
- After completing feature sets with measurable impact
- After refactoring that yields clear efficiency gains
- After implementing testing/quality infrastructure

## Never Change Without Explicit Request

- **Eval case labels** — hand-labeled cases in `src/evals/cases/<category>.ts`, each tagged with the one rule it isolates and its expected status; these are the ground truth
- **Filter rules** in `src/pipeline/prompts/filter.md` — these define "correct" behavior
- **Structural heuristic checks** in `src/evals/structural.ts` — these are rule-based, not AI-generated

## Common Gotchas

- **Import paths must use `.js` extension** even for `.ts` files (Node16 module resolution)
- **Zod v4 API differences from v3** — use `z.toJSONSchema()` not `zodToJsonSchema()`, and note other v4 breaking changes
- **`marked.use(markedTerminal())`** needs `@ts-ignore` — types are mismatched but it works at runtime
- **Eval case matching is by URL** — synthetic gap-filler cases must use unique fake URLs (e.g. `https://eval.synthetic/<id>`); real cases keep their original real jobURL
- **Case IDs are signal-descriptive slugs, NOT sequence numbers** — format `<category>-<unique-signal>[-status]` (e.g. `exp-threshold-4yr-fail`). Adding/removing a case never renumbers siblings. `cases/index.ts` throws at load time on a duplicate ID.
- **Cases are single-causal by construction** — each case isolates exactly ONE filter rule (every other filter kept green). When adding a case, verify only the target rule can trigger. The `multi-cause` category is the deliberate exception (2+ valid failures, status-only scoring, no reason assertion).
- **Reasons are inspection-only** — `compareGolden()` never keyword-matches or scores the model's `reason[]`. The text is kept in `PerJobResult.reasonText` for human investigation of failures. Per-category accuracy already pinpoints which rules a model mishandles.
- **Every job carries `site: SiteKey`** — a required field on `BaseJob`, typed as `SiteKey` (derived from the production `sites` registry in `src/sites/registry.ts`). Crawlers do **not** stamp it — they return `Omit<T, "site">[]` and `src/pipeline/crawl.ts` stamps it centrally from `SiteConfig.key`. Eval cases declare `site` as a literal for traceability, but no code branches on it (the eval case library is site-agnostic). There is no `siteKeySchema` anymore; per-site `jobSchema`s validate only the non-`site` fields.
- **No `GoldenSiteKey` anymore** — it was removed when the eval system was unified. Eval cases are scoped by `--category <name>` (a `CaseCategory`) or `--cases id1,id2`, never by site.
- **`ReportContext.site` was replaced by `siteName: string`** — reporters no longer receive a full `SiteConfig` (there's no single config for an `all` run). For per-job origin read `job.site`; for the run label use `ctx.siteName`. Failed sites in a multi-site run surface via `ctx.skippedSites`; jobs the LLM dropped surface via `ctx.droppedJobs`.
- **Dropped jobs are non-fatal and surfaced in the report** — when the LLM omits some input URLs from its filter output, `mergeJobsByUrl` no longer throws (even in strict mode); it collects the dropped jobs and threads them to `ReportContext.droppedJobs`, which reporters render as a "Dropped by LLM" section. Only unknown/hallucinated and duplicate URLs still throw in strict mode.
- **`storage/` directory** is Crawlee internal state, gitignored, regenerated on each crawl
- **Crawlers must use per-site named datasets** — Crawlee only auto-purges the *default* (unnamed) storages once per process. In an `all` run every crawler shares that one process, so any crawler using the default `pushData` collides on `storage/datasets/default` and silently reads back a mix of every site's jobs (a data-correctness bug, not just stale files). Each crawler opens `Dataset.open("<site>")`, drops it at the start of every run (named ≠ auto-purged), and reads back via `getData()`. Do not `readdir`/`JSON.parse` `storage/` directly.
- **`state/verdict-cache.json`** is the persistent verdict cache (production only). Gitignored. If it's missing or corrupt, `VerdictCache.load()` warns and starts fresh — the run still works, it just re-evaluates everything as new. Don't delete it unless you want to re-evaluate every job next run (or use `--refresh`).
- **🆕 badges are driven by `ReportContext.newJobUrls`** — a `Set<string>` of URLs accumulated in `main.ts` from `newlyEvaluated` + `dropped`. NOT a field on `EvaluatedJob<T>` (keep that type pure). Cached jobs are absent from the set → they never badge. The first run and `--refresh` badge everything (all jobs are newly evaluated). `--only-new` filters table bodies (count boxes stay total) AND narrows the jobs handed to `generateSummary` to newly-evaluated passing jobs (filtering lives in `main.ts`; `generateSummary` itself is a pure template-applier). The eval path never sets `newJobUrls`/`onlyNew`.

## Filter Rules Reference

| Category | Rule |
|----------|------|
| **Title** | Reject Senior/Lead/Manager/Head of/Director/Principal/Staff (unless description says 2-3yr OK) |
| **Internship** | Reject Intern/Internship |
| **Tech Stack** | Accept only JS/TS ecosystem (Node.js, React, Next.js, Vue, Angular, NestJS, Express, etc.) |
| **Experience** | Reject >3 years |
| **Role Type** | Dev roles only (Frontend/Backend/Fullstack/DevOps). Reject PM, Designer, QA, Data Analyst/Scientist/Engineer, Scrum Master, Support, and **vendor-platform specialists** (ServiceNow, Salesforce, SAP, Workday, Microsoft Power Platform, Dynamics 365, OutSystems, Mendix) — even if the title says "Developer" or "Engineer". DevOps means CI/CD + cloud infra + containers + IaC for in-house software — not third-party SaaS/ITSM/ERP configuration or scripting. |
| **Location** | Remote → non-Egypt OK; Hybrid → only Egypt; On-site → FAIL |

## Eval Methodology

- **Primary metric**: overall accuracy, broken down per filter-rule category. No F1 / precision / recall — the per-category breakdown pinpoints which rules a model mishandles in plain English (e.g. "Experience rules 100%, Location rules 67%").
- **Accuracy threshold**: 80% on overall accuracy (`eval.ts` exits 1 below it).
- **Reasons are inspection-only** — the model's `reason[]` is never keyword-matched or scored. It's kept in the per-case output so you can read WHY a case failed, but it doesn't affect any score.
- Models are configured in `src/config.ts` — the set can change at any time, check the file for current keys
- `pnpm eval <model>` runs a single model (by its config key) against the case library (all categories by default)
- `pnpm eval <model> --category <name>` scopes to one rule category (`title-seniority` | `internship` | `tech-stack` | `role-type` | `experience` | `location` | `ambiguous` | `multi-cause`)
- `pnpm eval <model> --cases id1,id2,...` cherry-picks specific cases by ID
- `pnpm compare` runs all configured models and ranks by overall accuracy (accepts `--category` / `--cases` too)
- `pnpm compare-prompts <model>` runs prompt variant comparison for a given model against all variants in `src/pipeline/prompts/variants/`, ranks by overall accuracy
- `pnpm compare-prompts <model> --variants v1,v2` runs only the specified custom variants (+ baseline), skipping the rest
- **Both scripts share the same filter pipeline** via `runFilterEval(modelKey, goldenCases)` in `src/pipeline/run-filter.ts` — the caller resolves the cases via `getAllCases(category?)` / `getCasesByIds(ids)` from `src/evals/cases/index.ts` and passes them in; `compare-models.ts` is literally "run `eval` on every configured model and rank the results", not a parallel implementation
- **The verdict cache does NOT affect evals** — `eval.ts`, `compare-models.ts`, and `compare-prompts.ts` call `runFilterEval` directly and never construct a `VerdictCache`. Only `main.ts` (the production pipeline) uses the cache. So eval results are deterministic across runs regardless of cache state.
- **Strict vs tolerant**: the production pipeline (`evaluate.ts`) calls `runFilterLLMCall(..., { mode: 'strict' })` which throws on **unknown or duplicate** URLs (genuine LLM malfunction); eval scripts use `'tolerant'` mode (warn and continue) so noisy LLM output can still be scored. **Dropped jobs are always non-fatal** regardless of mode: input URLs the LLM omitted are collected into a `dropped` array and surfaced in the report (`ReportContext.droppedJobs`), so a common LLM hiccup no longer throws away an entire site's worth of results. The `checkNoDroppedJobs` structural heuristic (used in eval) independently logs drops for scoring.