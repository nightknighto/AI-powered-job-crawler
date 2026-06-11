import ollama from "ollama";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { SiteConfig } from "../types/site-config.js";
import { ModelConfig, shared } from "../config.js";
import { splitByStatus } from "./report-helpers.js";

/** Generates an LLM summary for passing jobs.
 * Deterministic table generation is handled by reporters via `buildReportTables()`.
 * @template T - The site-specific job type.
 * @param site - The {@link SiteConfig} providing the job summary prompt template.
 * @param evaluatedJobs - Evaluated jobs to include in the summary.
 * @param modelConfig - The Ollama model configuration to use.
 * @returns LLM-generated summary markdown (empty string if no passing jobs).
 */
export async function generateSummary<T extends BaseJob>(
    site: SiteConfig<T>,
    evaluatedJobs: EvaluatedJob<T>[],
    modelConfig: ModelConfig,
): Promise<string> {
    console.log(`📝 Generating summary for ${evaluatedJobs.length} jobs...`);

    const { passing } = splitByStatus(evaluatedJobs);

    if (passing.length === 0) return "";

    console.log(`   Generating detailed summaries for ${passing.length} passing jobs...`);
    const summaryPrompt = site.prompts.jobSummary.replace(
        "{{passingJobs}}",
        JSON.stringify(passing, null, 2),
    );

    const response = await ollama.chat({
        model: modelConfig.model,
        keep_alive: shared.keepAlive,
        think: modelConfig.think,
        messages: [{ role: "user", content: summaryPrompt }],
    });

    console.log(`⏱️  Load: ${(response.load_duration / 1_000_000_000).toFixed(1)}s | Prompt Eval: ${(response.prompt_eval_duration / 1_000_000_000).toFixed(1)}s | Eval: ${(response.eval_duration / 1_000_000_000).toFixed(1)}s | Total: ${(response.total_duration / 1_000_000_000).toFixed(1)}s`);
    console.log(`📝  Input Tokens: ${response.prompt_eval_count} | Output Tokens: ${response.eval_count}`);

    return response.message.content;
}
