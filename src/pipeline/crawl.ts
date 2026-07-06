import { BaseJob } from "../types/base.js";
import { SiteConfig } from "../types/site-config.js";

/** Delegates to the site's crawl function and logs progress.
 * Each crawler stamps its jobs' `site` field (see the per-site crawler files
 * under `src/sites`); golden dataset jobs declare `site` as a literal instead.
 * @template T - The site-specific job type.
 * @param site - The {@link SiteConfig} to crawl.
 * @returns Raw job listings from the site, each carrying its `site` field.
 */
export async function crawl<T extends BaseJob>(site: SiteConfig<T>): Promise<T[]> {
    console.log(`🕷️  Crawling ${site.name}...`);
    const jobs = await site.crawl();
    console.log(`✅ Found ${jobs.length} jobs from ${site.name}`);
    return jobs;
}
