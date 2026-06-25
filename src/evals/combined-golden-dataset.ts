import { indeedGoldenDataset } from "../sites/indeed/evals/indeed-golden-dataset.js";
import { workableGoldenDataset } from "../sites/workable/evals/workable-golden-dataset.js";
import { wuzzufGoldenDataset } from "../sites/wuzzuf/evals/wuzzuf-golden-dataset.js";
import { GoldenEntry } from "../types/GoldenEntry.js";

/**
 * Combined golden dataset for benchmarking LLM filter accuracy across all job sites.
 *
 * Aggregates every per-site golden dataset into a single array. New sites that
 * ship their own `evals/<site>-golden-dataset.ts` should be appended here so
 * they are automatically picked up by `eval.ts` and `compare-models.ts`.
 */
export function getCombinedGoldenDataset(): GoldenEntry[] {
    return [
        ...wuzzufGoldenDataset,
        ...indeedGoldenDataset,
        ...workableGoldenDataset,
    ];
}
