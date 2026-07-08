# Sites

Each job site is defined by a `SiteConfig<T extends BaseJob>` object that abstracts **crawling** and the **raw job shape**. The **filter prompt**, **job-summary prompt**, and **evaluation schema** are all shared site-wide — sites carry no prompt files of their own.

- Filter prompt: [`src/pipeline/prompts/filter.md`](../pipeline/prompts/filter.md)
- Job-summary prompt: [`src/pipeline/prompts/job-summary.md`](../pipeline/prompts/job-summary.md)
- Evaluation schema: [`src/types/evaluated-job.ts`](../types/evaluated-job.ts)

## SiteConfig Interface

```ts
interface SiteConfig<T extends BaseJob> {
  key: SiteKey;                              // Registry key + display name (e.g. "wuzzuf")
  crawl: () => Promise<Omit<T, "site">[]>;   // Crawling function — returns jobs WITHOUT a `site` field
  jobSchema: ZodType<Omit<T, "site">>;       // Zod schema for the non-`site` fields only
}
```

> The `site` field is deliberately **not** part of `SiteConfig`. Crawlers return jobs without it, and `src/pipeline/crawl.ts` stamps `site` centrally from `key` — so every job's origin is derived from its registry slot and a site can be crawled without first shipping a golden dataset.
>
> The filter prompt, job-summary prompt, and LLM-output evaluation schema are intentionally **not** part of `SiteConfig` either — they are unified across all sites so the filtering and summarizing pipelines behave identically no matter which site is crawled.

## Dataset convention (required for every crawler)

Every crawler must write its results into a **per-site named dataset** (`Dataset.open("<site>")`), not the default dataset. Crawlee's automatic storage purge only clears the *default* (unnamed) storages once per process — so in a multi-site run (`pnpm start all`), if every crawler used the default dataset via `pushData`, all sites would collide on the same files and each crawler would read back a contaminated mix of every site's jobs.

Because **named datasets are not auto-purged**, each crawler also drops its own dataset at the start of every run so it starts clean. The canonical pattern:

```ts
import { CheerioCrawler, Dataset } from "crawlee";

export async function crawlWuzzuf(): Promise<Omit<WuzzufJob, "site">[]> {
    const dataset = await Dataset.open("wuzzuf");
    await dataset.drop();                       // named ≠ auto-purged → clear prior run
    const store = await Dataset.open("wuzzuf"); // reopen the now-empty dataset

    const crawler = new CheerioCrawler({
        async requestHandler({ request, $, log }) {
            // ...extract... (NO `site` field — stamped centrally by crawl())
            await store.pushData({ jobTitle: "...", ... } satisfies Omit<WuzzufJob, "site">);
        },
        maxRequestsPerCrawl: 20,
    });
    await crawler.run(START_URLS);

    const { items } = await store.getData();
    return items as Omit<WuzzufJob, "site">[];
}
```

Read results back via `store.getData()` (returns `{ items, ... }`) — do not `readdir`/`JSON.parse` the `storage/` directory directly.

## Current Sites

### Wuzzuf (`src/sites/wuzzuf/`)

| File | Purpose |
|------|---------|
| `index.ts` | SiteConfig definition. Defines a Zod schema for the `WuzzufJob` structure. |
| `wuzzuf-crawler.ts` | Cheerio crawler targeting 4 search URLs (react, nextjs, vue, node). Extracts: jobTitle, jobURL, date, company, location, tags, jobDetails. Max 20 requests. |
| `evals/wuzzuf-golden-dataset.ts` | 40 hand-labeled jobs (9 real + 31 synthetic) for evaluation. |
| `prompts/filter.old.md` | Historical filter prompt kept for reference — **not used at runtime**. The active filter prompt lives at `src/pipeline/prompts/filter.md`. |
| `prompts/report.old.md` | Historical report prompt kept for reference — **not used at runtime**. Reports are code-driven. |

### Indeed Egypt (`src/sites/indeed/`)

| File | Purpose |
|------|---------|
| `index.ts` | SiteConfig definition. Defines a Zod schema for the `IndeedJob` structure. |
| `indeed-crawler.ts` | Two-stage crawler using CheerioCrawler. Stage 1: Extract job cards from search page. Stage 2: Visit each job detail page for full description. Max 20 requests total. |
| `evals/indeed-golden-dataset.ts` | 14 hand-labeled jobs (12 real + 2 synthetic) for evaluation. |

**Key Differences from Wuzzuf:**

- Indeed uses a fixed search URL (not configurable)
- Two-stage crawl: search page → individual detail pages
- Stores job description as one string (no `tags` field)

### Workable (`src/sites/workable/`)

| File | Purpose |
|------|---------|
| `index.ts` | SiteConfig definition. Defines a Zod schema for the `WorkableJob` structure. |
| `workable-crawler.ts` | Playwright crawler (Workable is a JS-heavy SPA that Cheerio can't render). Two-stage: search results → detail pages. Max 20 requests. |
| `evals/workable-golden-dataset.ts` | Hand-labeled jobs for evaluation. |

**Key Differences from Wuzzuf/Indeed:**

- Uses `PlaywrightCrawler` instead of `CheerioCrawler` (the site is a JS-rendered SPA)
- `WorkableJob` currently extends `BaseJob` with no extra fields

### LinkedIn (`src/sites/linkedin/`)

| File | Purpose |
|------|---------|
| `index.ts` | SiteConfig definition. Uses `BaseJob` directly (no site-specific fields). |
| `linkedin-crawler.ts` | Cheerio crawler. Seed page enqueues detail pages via regexp; `transformRequestFunction` normalizes country subdomains to `www.linkedin.com`. Max 30 requests. |

**Key Differences from the other sites:**

- **No golden dataset yet** — LinkedIn is production-only. It can be crawled and filtered, but `pnpm eval --site linkedin` is rejected until a golden dataset ships and is registered in `goldenDatasetsBySite`. This is the intended decoupling: production is no longer gated on eval.

## Adding a New Site

1. Create `src/sites/<site-name>/` directory
2. Create `<site-name>-crawler.ts` with a crawl function returning `Omit<YourJobType, "site">[]` using `CheerioCrawler` (or `PlaywrightCrawler` for JS-heavy SPAs, like Workable). **Do not stamp a `site` field** — `crawl()` derives it centrally from `SiteConfig.key`. **Follow the dataset convention above** — each crawler writes to its own named dataset (`Dataset.open("<site>")`), drops it at the start of each run, and reads back via `getData()`. Do not use the default `pushData` or read `storage/datasets/default` directly, or multi-site runs will cross-contaminate.
3. Create `index.ts` exporting a `SiteConfig<YourJobType>` (define `YourJobType` in `src/types/`). Set `key` to the same lowercase string you'll use as the registry slot (it must match). Define `jobSchema` over the non-`site` fields only (`satisfies z.ZodType<Omit<YourJobType, "site">>`). Do **not** create any per-site prompt files — both the filter and job-summary prompts are shared site-wide at `src/pipeline/prompts/`.
4. Import and register the new site config in `src/sites/registry.ts` (the shared `sites` map). The `key` must equal the registry slot (convention — `crawl.ts` stamps every job's `site` from `key`, so a mismatch mislabels all jobs and surfaces in reports). This single registration makes the site available to both `pnpm start <site>` (full pipeline) and `pnpm crawl <site>` (crawl-only dev tool).
5. *(Optional but recommended)* Create `evals/<site-name>-golden-dataset.ts` with hand-labeled test jobs, then register it in `goldenDatasetsBySite` in `src/evals/combined-golden-dataset.ts` so `pnpm eval` and `pnpm compare` pick it up (both the combined run and the `--site <name>` filter). A site works in production **without** this step — the golden dataset only gates eval benchmarking.

## Testing a crawler in isolation

While developing a crawler, use `pnpm crawl <site>` (→ `tsx src/crawl-dev.ts`) to run **only** the crawler and dump the raw jobs to `reports/crawl-<site>-<timestamp>.json`, skipping the LLM filter, summary, and reporters. It accepts the same `all` / comma-list args as `pnpm start`. The script prints a quick summary (count + first ~10 titles) to the terminal and writes the full pretty-printed JSON for inspection. Pass `--verbose` (e.g. `pnpm crawl wuzzuf --verbose`) to print the full JSON of those first 10 jobs instead of just their titles — handy for inspecting extraction output. This is the fast inner loop for iterating on extraction selectors.

## Prompt Convention

- Templates use `{{placeholder}}` for runtime substitution (replaced via `.replace()`)
- **Filter prompt** (shared): lives at `src/pipeline/prompts/filter.md`, loaded by `src/pipeline/prompts.ts`, consumed by `src/pipeline/run-filter.ts` (and therefore by `evaluate.ts`, `eval.ts`, `compare-models.ts`)
- **Job-summary prompt** (shared): lives at `src/pipeline/prompts/job-summary.md`, loaded by `src/pipeline/prompts.ts`, consumed by `src/pipeline/generate-summary.ts`. Expanded via `{{passingJobs}}`.
