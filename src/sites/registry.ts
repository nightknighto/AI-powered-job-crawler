import { BaseJob } from "../types/base.js";
import { SiteConfig } from "../types/site-config.js";
import { wuzzufConfig } from "./wuzzuf/index.js";
import { indeedConfig } from "./indeed/index.js";
import { workableConfig } from "./workable/index.js";
import { joobleConfig } from "./jooble/index.js";
import { linkedInConfig } from "./linkedin/index.js";

/** Registry of all available sites, keyed by their CLI identifier.
 *
 * Single source of truth for site identity — `SiteKey` (below) is derived directly from this
 * object's keys, and `BaseJob.site` is typed as `SiteKey`. Imported by `main.ts` (production
 * pipeline), `crawl-dev.ts` (crawl-only dev tool), and type-only by `src/types/base.ts` and
 * `src/types/site-config.ts`, so adding a site here makes it available everywhere at once. */
export const sites = {
    wuzzuf: wuzzufConfig,
    indeed: indeedConfig,
    workable: workableConfig,
    jooble: joobleConfig,
    linkedin: linkedInConfig,
} as const satisfies Record<string, SiteConfig<BaseJob>>;

/** CLI identifier for a registered site (e.g. `"wuzzuf"`, `"linkedin"`). Source of truth for
 *  `BaseJob.site`. Derived directly from the `sites` registry so the two can never drift. */
export type SiteKey = keyof typeof sites;

/** Convention: each config's `key` must equal its registry slot above. This isn't compiler-enforced
 *  (a `SiteConfig`'s `key` is typed as the broad `SiteKey` union, so the type system can't know
 *  which slot a config is destined for), but it's load-bearing: `src/pipeline/crawl.ts` stamps
 *  every crawled job's `site` from `SiteConfig.key`, so a mismatched `key` would mislabel every
 *  job's origin and surface immediately in reports. */
