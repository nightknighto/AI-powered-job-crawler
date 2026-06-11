import ollama from "ollama";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { SiteConfig } from "../types/site-config.js";
import { ModelConfig, shared } from "../config.js";
import { buildReportTables, splitByStatus } from "./report-helpers.js";

/** Generates a markdown report for evaluated jobs.
 * Phase 1 (deterministic): builds triage tables + summary counts — no LLM.
 * Phase 2 (LLM): generates detailed job summaries for passing jobs only.
 * @template T - The site-specific job type.
 * @param site - The {@link SiteConfig} providing the job summary prompt template.
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

    // Phase 1: Deterministic tables + counts (no LLM, instant)
    const tablesMarkdown = buildReportTables(evaluatedJobs);

    // Phase 2: LLM deep-dive for passing jobs only
    const { passing } = splitByStatus(evaluatedJobs);

    let summaryMarkdown = "";
    if (passing.length > 0) {
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

        summaryMarkdown = response.message.content;
    }

    return `${tablesMarkdown}\n\n${summaryMarkdown}`;
}
