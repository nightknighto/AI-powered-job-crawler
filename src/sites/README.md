# Sites

Each job site is defined by a `SiteConfig<T extends BaseJob>` object that abstracts crawling, schemas, and prompts.

## SiteConfig Interface

```ts
interface SiteConfig<T extends BaseJob> {
  name: string;                    // Display name
  crawl: () => Promise<T[]>;       // Crawling function using Crawlee CheerioCrawler
  evaluationSchema: ZodSchema;     // Zod schema for validating LLM filter response
  jobSchema: ZodSchema;            // Zod schema for individual job structure
  prompts: {
    filter: string;                // Filter prompt template with {{jobs}} placeholder
    report: string;                // Report prompt template with {{evaluatedJobs}} placeholder
  };
}
```

## Current Sites

### Wuzzuf (`src/sites/wuzzuf/`)

| File | Purpose |
|------|---------|
| `index.ts` | SiteConfig definition. Loads prompt templates from `prompts/` via `fs.readFile`. Defines Zod schemas for WuzzufJob structure and LLM evaluation response. |
| `wuzzuf-crawler.ts` | Cheerio crawler targeting 4 search URLs (react, nextjs, vue, node). Extracts: jobTitle, jobURL, date, companyAndLocation, tags, jobDetails. Max 20 requests. |
| `evals/golden-dataset.ts` | 40 hand-labeled jobs for evaluation. |
| `prompts/filter.md` | LLM filtering prompt with 6 rule categories (title, internship, tech stack, experience, role type, location). |
| `prompts/report.md` | LLM report generation prompt. |

## Adding a New Site

1. Create `src/sites/<site-name>/` directory
2. Create `<site-name>-crawler.ts` with a crawl function using CheerioCrawler
3. Create `index.ts` exporting a `SiteConfig<YourJobType>` (define `YourJobType` in `src/types/`)
4. Create `prompts/filter.md` and `prompts/report.md` templates
5. *(Optional)* Create `evals/golden-dataset.ts` with hand-labeled test jobs
6. Import and use the new site config in `main.ts`

## Prompt Convention

- Templates use `{{placeholder}}` for runtime substitution (replaced via `.replace()`)
- **Filter prompt** must instruct the LLM to return structured JSON matching the `evaluationSchema`
- **Report prompt** receives evaluated jobs as JSON and should produce a markdown summary
