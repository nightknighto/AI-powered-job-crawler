import ollama from "ollama";
import { z } from "zod";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob, JobStatus } from "../types/evaluated-job.js";
import { SiteConfig } from "../types/site-config.js";
import { ModelConfig, shared } from "../config.js";
import { runStructuralHeuristics, logHeuristicResults } from "../evals/structural.js";

/** Sends jobs to the LLM for filtering, parses structured output, and runs structural heuristics.
 * @template T - The site-specific job type.
 * @param site - The {@link SiteConfig} providing the filter prompt and evaluation schema.
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

    const filterPrompt = site.prompts.filter.replace("{{jobs}}", JSON.stringify(jobs, null, 2));

    const response = await ollama.chat({
        model: modelConfig.model,
        keep_alive: shared.keepAlive,
        think: modelConfig.think,
        messages: [{ role: "user", content: filterPrompt }],
        format: z.toJSONSchema(site.evaluationSchema),
        options: { temperature: modelConfig.temperature },
    });

    console.log("------------Raw Filter Output-----------\n", response.message.content);

    const parsed = site.evaluationSchema.parse(JSON.parse(response.message.content));
    console.log("----------Parsed Filter Output----------\n", parsed);

    const evaluated: EvaluatedJob<T>[] = parsed.map((item: any) => {
        const { status, reason, ...job } = item;
        return { job: job as T, status, reason };
    });

    // Run structural heuristics (non-blocking warnings)
    const heuristicResults = runStructuralHeuristics(jobs, evaluated);
    logHeuristicResults(heuristicResults);

    return evaluated;
}
