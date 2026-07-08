import type { SiteKey } from "../sites/registry.js";
import { indeedGoldenDataset } from "../sites/indeed/evals/indeed-golden-dataset.js";
import { joobleGoldenDataset } from "../sites/jooble/evals/jooble-golden-dataset.js";
import { workableGoldenDataset } from "../sites/workable/evals/workable-golden-dataset.js";
import { wuzzufGoldenDataset } from "../sites/wuzzuf/evals/wuzzuf-golden-dataset.js";
import { GoldenEntry } from "../types/GoldenEntry.js";

/**
 * Registry of every per-site golden dataset, keyed by site name.
 *
 * This is the single source of truth for which sites contribute to the
 * combined dataset. New sites that ship their own
 * `evals/<site>-golden-dataset.ts` should be appended here so they are
 * automatically picked up by `eval.ts` and `compare-models.ts` (both the
 * combined run and the per-site `--site <name>` filter).
 *
 * Per-site files preserve their concrete job type (e.g.
 * `GoldenEntry<WuzzufJob>`); the registry widens entries to the base type so
 * the comparison engine stays generic.
 */
export const goldenDatasetsBySite = {
    wuzzuf: wuzzufGoldenDataset,
    indeed: indeedGoldenDataset,
    workable: workableGoldenDataset,
    jooble: joobleGoldenDataset,
} as const satisfies Record<string, GoldenEntry[]>;

/** Subset of {@link SiteKey} restricted to sites that have a golden dataset (e.g.
 *  `'wuzzuf' | 'indeed' | 'workable' | 'jooble'`). Production sites without a golden dataset
 *  (like `linkedin`) are excluded — they can be crawled but not eval-benchmarked. */
export type GoldenSiteKey = Extract<SiteKey, keyof typeof goldenDatasetsBySite>;

/**
 * Resolve the golden dataset for a benchmark run.
 *
 * @param site - When omitted, returns the **combined** dataset across all
 *   sites (the default behavior of `eval.ts` / `compare-models.ts`). When set
 *   to a {@link GoldenSiteKey}, returns only that site's golden dataset — used
 *   by the `--site <name>` CLI flag to scope a run to a single site.
 * @returns The selected golden dataset entries.
 */
export function getGoldenDataset(site?: GoldenSiteKey): GoldenEntry[] {
    return site
        ? goldenDatasetsBySite[site]
        : Object.values(goldenDatasetsBySite).flat();
}
