import { BaseJob } from "../types/base.js";
import { SiteConfig } from "../types/site-config.js";
import { wuzzufConfig } from "./wuzzuf/index.js";
import { indeedConfig } from "./indeed/index.js";
import { workableConfig } from "./workable/index.js";
import { joobleConfig } from "./jooble/index.js";

/** Registry of all available sites, keyed by their CLI identifier.
 *
 * Single source of truth — imported by `main.ts` (production pipeline) and
 * `crawl-dev.ts` (crawl-only dev tool, `pnpm crawl`), so adding a site here
 * makes it available everywhere at once. */
export const sites = {
    wuzzuf: wuzzufConfig,
    indeed: indeedConfig,
    workable: workableConfig,
    jooble: joobleConfig,
} as const satisfies Record<string, SiteConfig<BaseJob>>;

/** CLI identifier for a registered site (e.g. `"wuzzuf"`, `"indeed"`). */
export type SiteKey = keyof typeof sites;
