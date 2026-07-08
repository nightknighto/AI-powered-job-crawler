import { z } from "zod";
import { BaseJob } from "./base.js";
import type { SiteKey } from "../sites/registry.js";

/** Site-specific configuration that plugs into the crawl → evaluate → generateSummary pipeline.
 *
 * Sites only describe **crawling** and the **raw job shape** — the filter prompt and the
 * job-summary prompt are both shared site-wide (see `src/pipeline/prompts.ts`), and the
 * LLM-output evaluation schema is shared too (see `src/types/evaluated-job.ts`). This keeps
 * filtering and summarizing behavior identical across all sites.
 *
 * Crawlers return jobs **without** a `site` field; `src/pipeline/crawl.ts` stamps it centrally
 * from {@link SiteConfig.key} so every job's origin is derived from its registry slot.
 *
 * @template T - The site-specific job type extending {@link BaseJob}.
 */
export interface SiteConfig<T extends BaseJob = BaseJob> {
    /** Registry key that also serves as the human-readable site name in logs/reports (e.g. "wuzzuf"). */
    key: SiteKey;
    /** Crawls the site and returns raw job listings **without** a `site` field (stamped centrally). */
    crawl: () => Promise<Omit<T, "site">[]>;
    /** Zod schema for a single raw job's non-`site` fields (used for type inference). */
    jobSchema: z.ZodType<Omit<T, "site">>;
}
