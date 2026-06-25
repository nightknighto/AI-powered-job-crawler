# AGENTS.md

## Project Overview

Job search filtering system that crawls Wuzzuf and Indeed Egypt (job boards), filters listings through a local LLM (Ollama) using structured JSON output, and generates markdown/HTML reports via a composable reporter system. Includes a golden-dataset evaluation framework for benchmarking LLM filter accuracy across multiple models.

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
  name: string;
  crawl: () => Promise<T[]>;
  jobSchema: ZodType<T>;
  prompts: { jobSummary: string };
}
```

To add a site, implement this interface and register it in `main.ts`.

> The **filter prompt** and the **LLM-output evaluation schema** are intentionally **not** part of `SiteConfig`. They live in `src/pipeline/prompts.ts` (`unifiedFilterPrompt`) and `src/types/evaluated-job.ts` (`jobEvaluationSchema`) respectively, so filtering behaves identically across all sites.

### Prompt templates with `{{placeholder}}` substitution

- The **filter prompt** is shared site-wide at `src/pipeline/prompts/filter.md`. At runtime, the `{{jobs}}` placeholder is replaced with the JSON array of crawled jobs.
- The **job-summary prompt** is per-site at `src/sites/<site>/prompts/job-summary.md`. At runtime, the `{{passingJobs}}` placeholder is replaced with the JSON array of passing evaluated jobs.

### Zod schemas for LLM output validation

LLM output is validated by the shared `jobEvaluationSchema` in `src/types/evaluated-job.ts`. `z.toJSONSchema()` converts it to JSON Schema for Ollama's `structured_outputs` feature. Per-site schemas only validate raw job shape (`jobSchema`), never the LLM response.

### Golden dataset for eval

The combined golden dataset (54 hand-labeled jobs: 40 Wuzzuf + 14 Indeed; 15 PASS, 38 FAIL, 1 POTENTIAL_MATCH) is aggregated by `src/evals/combined-golden-dataset.ts` from per-site files under `src/sites/<site>/evals/`. The `compareGolden()` function matches by URL and computes precision/recall/F1 per class.

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

2. **Create crawler** in `src/sites/<site>/<site>-crawler.ts`:
   - Export `async function crawl<Site>(): Promise<SiteJob[]>`
   - Use CheerioCrawler from Crawlee
   - Max 20 requests total
   - For sites requiring detail page visits (like Indeed), use two-stage crawl

3. **Create prompts** in `src/sites/<site>/prompts/`:
   - `job-summary.md` — LLM job summary prompt with `{{passingJobs}}` placeholder
   - Do **not** create a per-site `filter.md` — the filter prompt is shared site-wide at `src/pipeline/prompts/filter.md`

4. **Create SiteConfig** in `src/sites/<site>/index.ts`:
   ```ts
   export const siteConfig: SiteConfig<SiteJob> = {
     name: "site",
     crawl: crawlSite,
     jobSchema,
     prompts: {
       jobSummary: jobSummaryPrompt,
     },
   };
   ```

5. **Register site** in `src/main.ts`:
   - Import the site config
   - Add to `sites` object
   - Site is selected via the first positional CLI arg (`pnpm start <site>`)

6. **Update exports** in `src/types/index.ts`:
   - Export the new site type

7. *(Optional)* **Add golden dataset** in `src/sites/<site>/evals/<site>-golden-dataset.ts` and register it in the `goldenDatasetsBySite` map in `src/evals/combined-golden-dataset.ts` so `pnpm eval` / `pnpm compare` pick it up (both combined and `--site <name>`).

8. **Update documentation**:
   - `README.md` — Add site to quick start and pipeline description
   - `AGENTS.md` — Update file structure and patterns
   - `src/sites/README.md` — Document site-specific implementation
   - `src/types/README.md` — Document the new type

## File Structure

```
src/
  main.ts                          — Entry point, orchestrates the full pipeline, site selected via first positional CLI arg
  config.ts                        — ModelConfig interface, modelConfigs map, shared settings
  eval.ts                          — Single-model golden dataset evaluation runner
  compare-models.ts                — Multi-model benchmark, ranks by PASS F1
  types/
    base.ts                        — BaseJob interface (jobTitle, jobURL, company, location, date, jobDetails[])
    WuzzufJob.ts                   — Extends BaseJob with company, location, tags
    IndeedJob.ts                   — Extends BaseJob with company, location
    evaluated-job.ts               — JobStatus enum, EvaluatedJob<T> type, shared jobEvaluationSchema (status, reason, experienceLevel?, skills?)
    site-config.ts                 — SiteConfig<T> interface (prompts: jobSummary only — filter prompt is site-wide)
    GoldenEntry.ts                 — GoldenEntry<T> interface (job, expectedStatus, expectedReasonKeywords) for eval golden dataset
    index.ts                       — Re-exports all types
  pipeline/
    crawl.ts                       — Generic crawl orchestration via SiteConfig
    evaluate.ts                    — Production filter stage; thin wrapper around run-filter.ts (strict mode)
    run-filter.ts                  — Shared filter pipeline: parseLlmOutput, logTimingAndTokens, mergeJobsByUrl, runFilterLLMCall, runFilterEval(modelKey, goldenDataset) (used by evaluate.ts, eval.ts, compare-models.ts)
    generate-summary.ts            — LLM summary for passing jobs (returns string)
    report-helpers.ts              — Deterministic report tables (no LLM), date parsing, table formatting
    prompts.ts                     — Loads the unified filter prompt from prompts/filter.md and exports unifiedFilterPrompt
    prompts/
      filter.md                    — Shared LLM filter prompt with {{jobs}} placeholder (used by all sites)
  reporters/
    types.ts                       — Reporter interface, ReportContext, ReportOutput types
    composite.ts                   — CompositeReporter wraps multiple reporters, shares context
    index.ts                       — Factory createReporters(names[]), availableReporters registry
    cli-table.ts                   — Terminal markdown tables via marked-terminal (original behavior)
    cli-card.ts                    — Stacked card format with full-width fields
    cli-summary.ts                 — Compact counts + passing titles + file paths
    html.ts                        — Styled HTML with auto-open, saved to reports/
    markdown.ts                    — Timestamped .md file output, saved to reports/
    preview.ts                     — Standalone preview script (pnpm preview-reporter)
    fixtures/
      sample-evaluated-jobs.ts     — 6 sample EvaluatedJob<WuzzufJob> for testing reporters
  evals/
    combined-golden-dataset.ts     — goldenDatasetsBySite registry, GoldenSiteKey, getGoldenDataset(site?) for eval/compare (combined by default, single-site via --site)
    golden.ts                      — Golden dataset comparison engine (precision/recall/F1 per class)
    structural.ts                  — 6 heuristic checks (dropped jobs, valid statuses, etc.)
    report-writer.ts               — Writes eval/compare results to eval-results/ directory
  sites/
    wuzzuf/
      index.ts                     — SiteConfig for Wuzzuf
      wuzzuf-crawler.ts            — Cheerio crawler, 4 search URLs, max 20 requests
      evals/wuzzuf-golden-dataset.ts — 40 hand-labeled jobs (13 PASS, 26 FAIL, 1 POTENTIAL_MATCH)
      prompts/filter.old.md        — Historical per-site filter prompt, kept for reference (not loaded at runtime)
      prompts/report.old.md        — Historical per-site report prompt, kept for reference (not loaded at runtime)
      prompts/job-summary.md       — LLM job summary prompt
    indeed/
      index.ts                     — SiteConfig for Indeed Egypt
      indeed-crawler.ts            — Two-stage crawler (search + detail pages), max 20 requests
      evals/indeed-golden-dataset.ts — 14 hand-labeled jobs (2 PASS, 12 FAIL)
      prompts/job-summary.md       — LLM job summary prompt
  helpers/
    extractTextWithLineBreaks.ts   — HTML → text with preserved line breaks
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

- **Golden dataset labels** — 54 hand-labeled jobs aggregated by `src/evals/combined-golden-dataset.ts` from `src/sites/<site>/evals/<site>-golden-dataset.ts`; these are the ground truth
- **Filter rules** in `src/pipeline/prompts/filter.md` — these define "correct" behavior
- **Structural heuristic checks** in `src/evals/structural.ts` — these are rule-based, not AI-generated

## Common Gotchas

- **Import paths must use `.js` extension** even for `.ts` files (Node16 module resolution)
- **Zod v4 API differences from v3** — use `z.toJSONSchema()` not `zodToJsonSchema()`, and note other v4 breaking changes
- **`marked.use(markedTerminal())`** needs `@ts-ignore` — types are mismatched but it works at runtime
- **Golden dataset job matching is by URL** — synthetic/test jobs must use unique fake URLs
- **Wuzzuf golden jobs are numbered #1–#40 in comments** — keep numbering in sync when adding/removing jobs
- **Combined dataset is widened to `GoldenEntry<BaseJob>`** — per-site files preserve their concrete type (`GoldenEntry<WuzzufJob>` etc.) but the `goldenDatasetsBySite` registry widens to the base type so `getGoldenDataset()` returns `GoldenEntry[]`
- **`storage/` directory** is Crawlee internal state, gitignored, regenerated on each crawl

## Filter Rules Reference

| Category | Rule |
|----------|------|
| **Title** | Reject Senior/Lead/Manager/Head of/Director/Principal/Staff (unless description says 2-3yr OK) |
| **Internship** | Reject Intern/Internship |
| **Tech Stack** | Accept only JS/TS ecosystem (Node.js, React, Next.js, Vue, Angular, NestJS, Express, etc.) |
| **Experience** | Reject >3 years |
| **Role Type** | Dev roles only — reject PM, Designer, QA, Data Analyst, DevOps |
| **Location** | Remote → non-Egypt OK; Hybrid → only Egypt; On-site → FAIL |

## Eval Methodology

- **Primary metric**: PASS F1 (minority class, hardest to get right)
- **Accuracy threshold**: 80%
- Models are configured in `src/config.ts` — the set can change at any time, check the file for current keys
- `pnpm compare` runs all configured models and ranks by PASS F1
- `pnpm eval <model>` runs a single model (by its config key) against the golden dataset
- **`--site <name>`** scopes either script to one site's golden dataset (`wuzzuf` | `indeed` | `workable`) instead of the combined dataset — e.g. `pnpm eval qwenReason --site indeed`. Valid keys are the entries of `goldenDatasetsBySite` in `src/evals/combined-golden-dataset.ts`
- **Both scripts share the same filter pipeline** via `runFilterEval(modelKey, goldenDataset)` in `src/pipeline/run-filter.ts` — the caller resolves the dataset via `getGoldenDataset(site?)` and passes it in; `compare-models.ts` is literally "run `eval` on every configured model and rank the results", not a parallel implementation
- **Strict vs tolerant**: the production pipeline (`evaluate.ts`) calls `runFilterLLMCall(..., { mode: 'strict' })` which throws on unknown/duplicate/dropped URLs; eval scripts use `'tolerant'` mode (warn and continue) so noisy LLM output can still be scored