import ollama from "ollama";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { SiteConfig } from "../types/site-config.js";
import { ModelConfig, shared } from "../config.js";

/** Generates a markdown report for evaluated jobs via the LLM.
 * @template T - The site-specific job type.
 * @param site - The {@link SiteConfig} providing the report prompt template.
 * @param evaluatedJobs - Evaluated jobs to include in the report.
 * @param modelConfig - The Ollama model configuration to use.
 * @returns Markdown string of the generated report.
 */
export async function report<T extends BaseJob>(
    site: SiteConfig<T>,
    evaluatedJobs: EvaluatedJob<T>[],
    modelConfig: ModelConfig,
): Promise<string> {
    console.log(`📝 Generating report for ${evaluatedJobs.length} jobs...`);

    const reportPrompt = site.prompts.report.replace(
        "{{evaluatedJobs}}",
        JSON.stringify(evaluatedJobs, null, 2),
    );

    const response = await ollama.chat({
        model: modelConfig.model,
        keep_alive: shared.keepAlive,
        think: modelConfig.think,
        messages: [{ role: "user", content: reportPrompt }],
    });

    return response.message.content;
}
