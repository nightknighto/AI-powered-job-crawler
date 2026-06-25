import { z } from "zod";
import { BaseJob } from "./base.js";

/** Site-specific configuration that plugs into the crawl → evaluate → generateSummary pipeline.
 *
 * Sites only describe **crawling** and the **raw job shape** — the filter prompt and the
 * job-summary prompt are both shared site-wide (see `src/pipeline/prompts.ts`), and the
 * LLM-output evaluation schema is shared too (see `src/types/evaluated-job.ts`). This keeps
 * filtering and summarizing behavior identical across all sites.
 *
 * @template T - The site-specific job type extending {@link BaseJob}.
 */
export interface SiteConfig<T extends BaseJob = BaseJob> {
    /** Human-readable site name (used in logs). */
    name: string;
    /** Crawls the site and returns raw job listings. */
    crawl: () => Promise<T[]>;
    /** Zod schema for a single raw job (used for type inference). */
    jobSchema: z.ZodType<T>;
}
