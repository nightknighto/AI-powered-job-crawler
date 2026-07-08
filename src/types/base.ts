import type { SiteKey } from "../sites/registry.js";

/** Minimal representation of a crawled job listing. Extended by site-specific types.
 *
 * Every job carries its origin `site` as a {@link SiteKey} — one of the keys of the production
 * `sites` registry in `src/sites/registry.ts` (e.g. `'wuzzuf' | 'indeed' | 'workable' | 'jooble' |
 * 'linkedin'`). Production jobs are stamped centrally by `src/pipeline/crawl.ts` from
 * `SiteConfig.key`; golden-dataset jobs declare `site` as a literal instead. This lets a
 * multi-site run merge jobs from several sites into one report while preserving each job's origin.
 */
export interface BaseJob {
    jobTitle: string;
    jobURL: string;
    company: string;
    location: string;
    date: string;
    jobDetails: string[];
    /** Origin site key. Stamped centrally in `crawl.ts` (production) from `SiteConfig.key`,
     *  or declared as a literal in golden datasets. */
    site: SiteKey;
}
