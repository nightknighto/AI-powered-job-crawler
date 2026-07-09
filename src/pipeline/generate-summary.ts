import ollama from "ollama";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { ModelConfig, shared } from "../config.js";
import { jobSummaryPrompt } from "./prompts/prompts.js";

/** Generates an LLM summary for the given jobs using the shared `jobSummaryPrompt`.
 *
 * Pure template-applier: it summarizes **exactly** the jobs passed in. All filtering (passing-only,
 * `--only-new` narrowing) is the caller's responsibility — typically `main.ts` computes the exact
 * set to summarize and hands it over. The prompt's `{{passingJobs}}` placeholder receives these jobs
 * verbatim.
 *
 * Deterministic table generation is handled separately by reporters via `buildReportTables()`.
 *
 * @template T - The site-specific job type.
 * @param jobs - The evaluated jobs to summarize (caller filters as needed).
 * @param modelConfig - The Ollama model configuration to use.
 * @returns LLM-generated summary markdown (empty string if `jobs` is empty).
 */
export async function generateSummary<T extends BaseJob>(
    jobs: EvaluatedJob<T>[],
    modelConfig: ModelConfig,
): Promise<string> {
    if (jobs.length === 0) return "";

    console.log(`📝 Generating summary for ${jobs.length} jobs...`);
    const summaryPrompt = jobSummaryPrompt.replace(
        "{{passingJobs}}",
        JSON.stringify(jobs, null, 2),
    );

    const response = await ollama.chat({
        model: modelConfig.model,
        keep_alive: shared.keepAlive,
        think: modelConfig.think,
        messages: [{ role: "user", content: summaryPrompt }],
    });

    console.log(
        `⏱️  Load: ${(response.load_duration / 1_000_000_000).toFixed(1)}s | ` +
        `Prompt Eval: ${(response.prompt_eval_duration / 1_000_000_000).toFixed(1)}s | ` +
        `Eval: ${(response.eval_duration / 1_000_000_000).toFixed(1)}s | ` +
        `Total: ${(response.total_duration / 1_000_000_000).toFixed(1)}s`,
    );
    console.log(
        `📝  Input Tokens: ${response.prompt_eval_count} | Output Tokens: ${response.eval_count}`,
    );

    return response.message.content;
}
