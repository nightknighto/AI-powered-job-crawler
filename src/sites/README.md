# Sites

Each job site is defined by a `SiteConfig<T extends BaseJob>` object that abstracts crawling and the per-site job-summary prompt. The **filter prompt is shared site-wide** (see [`src/pipeline/prompts/filter.md`](../pipeline/prompts/filter.md)) and the **evaluation schema is shared** (see [`src/types/evaluated-job.ts`](../types/evaluated-job.ts)).

## SiteConfig Interface

```ts
interface SiteConfig<T extends BaseJob> {
  name: string;                    // Display name
  crawl: () => Promise<T[]>;       // Crawling function using Crawlee CheerioCrawler
  jobSchema: ZodType<T>;           // Zod schema for individual job structure
  prompts: {
    jobSummary: string;            // Prompt for generating detailed job summaries
  };
}
```

> The filter prompt and the LLM-output evaluation schema are intentionally **not** part of `SiteConfig` — they are unified across all sites so the filtering pipeline behaves identically no matter which site is crawled.

## Current Sites

### Wuzzuf (`src/sites/wuzzuf/`)

| File | Purpose |
|------|---------|
| `index.ts` | SiteConfig definition. Loads the `job-summary.md` template via `fs.readFile`. Defines a Zod schema for the `WuzzufJob` structure. |
| `wuzzuf-crawler.ts` | Cheerio crawler targeting 4 search URLs (react, nextjs, vue, node). Extracts: jobTitle, jobURL, date, company, location, tags, jobDetails. Max 20 requests. |
| `evals/wuzzuf-golden-dataset.ts` | 40 hand-labeled jobs (9 real + 31 synthetic) for evaluation. |
| `prompts/filter.old.md` | Historical filter prompt kept for reference — **not used at runtime**. The active filter prompt lives at `src/pipeline/prompts/filter.md`. |
| `prompts/report.old.md` | Historical report prompt kept for reference — **not used at runtime**. Reports are code-driven. |
| `prompts/job-summary.md` | LLM prompt for generating detailed job summaries. |

### Indeed Egypt (`src/sites/indeed/`)

| File | Purpose |
|------|---------|
| `index.ts` | SiteConfig definition. Loads the `job-summary.md` template via `fs.readFile`. Defines a Zod schema for the `IndeedJob` structure. |
| `indeed-crawler.ts` | Two-stage crawler using CheerioCrawler. Stage 1: Extract job cards from search page. Stage 2: Visit each job detail page for full description. Max 20 requests total. |
| `evals/indeed-golden-dataset.ts` | 14 hand-labeled jobs (12 real + 2 synthetic) for evaluation. |
| `prompts/job-summary.md` | LLM prompt for generating detailed job summaries. |

**Key Differences from Wuzzuf:**

- Indeed uses a fixed search URL (not configurable)
- Two-stage crawl: search page → individual detail pages
- Stores job description as one string (no `tags` field)

## Adding a New Site

1. Create `src/sites/<site-name>/` directory
2. Create `<site-name>-crawler.ts` with a crawl function using CheerioCrawler
3. Create `index.ts` exporting a `SiteConfig<YourJobType>` (define `YourJobType` in `src/types/`)
4. Create `prompts/job-summary.md` (the filter prompt is shared site-wide — do **not** create a per-site `filter.md`)
5. *(Optional but recommended)* Create `evals/<site-name>-golden-dataset.ts` with hand-labeled test jobs, then register it in `goldenDatasetsBySite` in `src/evals/combined-golden-dataset.ts` so `pnpm eval` and `pnpm compare` pick it up (both the combined run and the `--site <name>` filter)
6. Import and register the new site config in `main.ts`

## Prompt Convention

- Templates use `{{placeholder}}` for runtime substitution (replaced via `.replace()`)
- **Filter prompt** (shared): lives at `src/pipeline/prompts/filter.md`, loaded by `src/pipeline/prompts.ts` and consumed by `src/pipeline/evaluate.ts`, `src/eval.ts`, and `src/compare-models.ts`
- **Job-summary prompt** (per-site): instructs the LLM to produce a detailed markdown summary for passing jobs, expanded via `{{passingJobs}}`
