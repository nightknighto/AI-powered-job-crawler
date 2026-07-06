import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { SiteConfig } from "../types/site-config.js";
import { ModelConfig } from "../config.js";
import { logHeuristicResults, runStructuralHeuristics } from "../evals/structural.js";
import { DroppedJob, runFilterLLMCall } from "./run-filter.js";

/** Sends jobs to the LLM for filtering, parses structured output, and runs structural heuristics.
 *
 * Thin production wrapper around {@link runFilterLLMCall}. Uses `'strict'` mode, which throws on
 * unknown or duplicate URLs (genuine LLM malfunction). **Dropped jobs are non-fatal**: any input
 * job the LLM omitted is collected into `dropped` (and logged) rather than throwing — a common
 * hiccup that should not throw away a whole site's worth of results. The filter prompt and
 * evaluation schema are shared site-wide — see `src/pipeline/run-filter.ts`.
 *
 * @template T - The site-specific job type.
 * @param site - The {@link SiteConfig} (used for name/context only).
 * @param jobs - Raw crawled jobs to evaluate.
 * @param modelConfig - The Ollama model configuration to use.
 * @returns Evaluated jobs with status and reasoning, plus any dropped jobs (input jobs the LLM omitted).
 */
export async function evaluate<T extends BaseJob>(
    site: SiteConfig<T>,
    jobs: T[],
    modelConfig: ModelConfig,
): Promise<{ evaluated: EvaluatedJob<T>[]; dropped: DroppedJob[] }> {
    console.log(`🤖 Evaluating ${jobs.length} jobs with ${modelConfig.model}...`);

    const { aiOutput, dropped } = await runFilterLLMCall(jobs, modelConfig, { mode: "strict" });

    const heuristicResults = runStructuralHeuristics(jobs, aiOutput);
    logHeuristicResults(heuristicResults);

    return { evaluated: aiOutput, dropped };
}
