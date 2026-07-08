import { BaseJob } from "../types/base.js";
import { SiteConfig } from "../types/site-config.js";

/** Delegates to the site's crawl function, then stamps each job's `site` field centrally.
 *
 * Crawlers return jobs **without** a `site` field (raw extraction only); this function derives
 * the origin from `site.key` so every job's `site` is guaranteed to match the registry slot it
 * was crawled under. Golden-dataset jobs (the eval path) bypass this and declare `site` as a
 * literal in their per-site dataset file.
 *
 * @template T - The site-specific job type.
 * @param site - The {@link SiteConfig} to crawl.
 * @returns Raw job listings from the site, each carrying its stamped `site` field.
 */
export async function crawl<T extends BaseJob>(site: SiteConfig<T>): Promise<T[]> {
    console.log(`🕷️  Crawling ${site.key}...`);
    const raw = await site.crawl();
    const jobs = raw.map((j) => ({ ...j, site: site.key }) as T);
    console.log(`✅ Found ${jobs.length} jobs from ${site.key}`);
    return jobs;
}
