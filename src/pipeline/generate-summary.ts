import ollama from "ollama";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { ModelConfig, shared } from "../config.js";
import { splitByStatus } from "./report-helpers.js";
import { jobSummaryPrompt } from "./prompts/prompts.js";

/** Generates an LLM summary for passing jobs using the shared `jobSummaryPrompt`.
 *
 * Deterministic table generation is handled separately by reporters via `buildReportTables()`.
 *
 * @template T - The site-specific job type.
 * @param evaluatedJobs - Evaluated jobs to include in the summary (only PASS / POTENTIAL_MATCH are summarized).
 * @param modelConfig - The Ollama model configuration to use.
 * @returns LLM-generated summary markdown (empty string if no passing jobs).
 */
export async function generateSummary<T extends BaseJob>(
    evaluatedJobs: EvaluatedJob<T>[],
    modelConfig: ModelConfig,
): Promise<string> {
    console.log(`📝 Generating summary for ${evaluatedJobs.length} jobs...`);

    const { passing } = splitByStatus(evaluatedJobs);

    if (passing.length === 0) return "";

    console.log(`   Generating detailed summaries for ${passing.length} passing jobs...`);
    const summaryPrompt = jobSummaryPrompt.replace(
        "{{passingJobs}}",
        JSON.stringify(passing, null, 2),
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
