import { BaseJob } from "../types/base.js";
import { SiteConfig } from "../types/site-config.js";

/** Delegates to the site's crawl function and logs progress.
 * @template T - The site-specific job type.
 * @param site - The {@link SiteConfig} to crawl.
 * @returns Raw job listings from the site.
 */
export async function crawl<T extends BaseJob>(site: SiteConfig<T>): Promise<T[]> {
    console.log(`🕷️  Crawling ${site.name}...`);
    const jobs = await site.crawl();
    console.log(`✅ Found ${jobs.length} jobs from ${site.name}`);
    return jobs;
}
