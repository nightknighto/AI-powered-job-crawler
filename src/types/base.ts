import type { GoldenSiteKey } from "../evals/combined-golden-dataset.js";

/** Minimal representation of a crawled job listing. Extended by site-specific types.
 *
 * Every job carries its origin `site` as a {@link GoldenSiteKey} (one of the
 * registered site keys: `'wuzzuf' | 'indeed' | 'workable' | 'jooble'`).
 * Production jobs are stamped centrally in `src/pipeline/crawl.ts`; golden
 * dataset jobs declare it as a literal in their per-site dataset file. This
 * lets a multi-site run merge jobs from several sites into one report while
 * preserving each job's origin.
 */
export interface BaseJob {
    jobTitle: string;
    jobURL: string;
    company: string;
    location: string;
    date: string;
    jobDetails: string[];
    /** Origin site key. Stamped in `crawl.ts` (production) or as a literal (golden datasets). */
    site: GoldenSiteKey;
}
