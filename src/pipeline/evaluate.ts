import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { SiteConfig } from "../types/site-config.js";
import { ModelConfig } from "../config.js";
import { logHeuristicResults, runStructuralHeuristics } from "../evals/structural.js";
import { runFilterLLMCall } from "./run-filter.js";

/** Sends jobs to the LLM for filtering, parses structured output, and runs structural heuristics.
 *
 * Thin production wrapper around {@link runFilterLLMCall}. Uses `'strict'` mode so any LLM
 * misbehavior (unknown/duplicate/dropped URLs) throws immediately. The filter prompt and
 * evaluation schema are shared site-wide — see `src/pipeline/run-filter.ts`.
 *
 * @template T - The site-specific job type.
 * @param site - The {@link SiteConfig} (used for name/context only).
 * @param jobs - Raw crawled jobs to evaluate.
 * @param modelConfig - The Ollama model configuration to use.
 * @returns Evaluated jobs with status and reasoning.
 */
export async function evaluate<T extends BaseJob>(
    site: SiteConfig<T>,
    jobs: T[],
    modelConfig: ModelConfig,
): Promise<EvaluatedJob<T>[]> {
    console.log(`🤖 Evaluating ${jobs.length} jobs with ${modelConfig.model}...`);

    const { aiOutput } = await runFilterLLMCall(jobs, modelConfig, { mode: "strict" });

    const heuristicResults = runStructuralHeuristics(jobs, aiOutput);
    logHeuristicResults(heuristicResults);

    return aiOutput;
}
