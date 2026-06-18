import ollama from "ollama";
import { z } from "zod";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob, jobEvaluationSchema, JobStatus } from "../types/evaluated-job.js";
import { SiteConfig } from "../types/site-config.js";
import { ModelConfig, shared } from "../config.js";
import { runStructuralHeuristics, logHeuristicResults } from "../evals/structural.js";
import { unifiedFilterPrompt } from "./prompts.js";

/** Sends jobs to the LLM for filtering, parses structured output, and runs structural heuristics.
 * @template T - The site-specific job type.
 * @param site - The {@link SiteConfig} (used for name/context only; the filter prompt and schema are shared across all sites).
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

    const filterPrompt = unifiedFilterPrompt.replace("{{jobs}}", JSON.stringify(jobs, null, 2));

    const response = await ollama.chat({
        model: modelConfig.model,
        keep_alive: shared.keepAlive,
        think: modelConfig.think,
        messages: [{ role: "user", content: filterPrompt }],
        format: z.toJSONSchema(jobEvaluationSchema),
        options: { temperature: modelConfig.temperature },
    });

    console.log("------------Raw Filter Output-----------\n", response.message.content);

    console.log(`⏱️  Load: ${(response.load_duration / 1_000_000_000).toFixed(1)}s | Prompt Eval: ${(response.prompt_eval_duration / 1_000_000_000).toFixed(1)}s | Eval: ${(response.eval_duration / 1_000_000_000).toFixed(1)}s | Total: ${(response.total_duration / 1_000_000_000).toFixed(1)}s`);
    console.log(`📝  Input Tokens: ${response.prompt_eval_count} | Output Tokens: ${response.eval_count}`);

    const parsed = jobEvaluationSchema.parse(JSON.parse(response.message.content.replaceAll('```', '')));
    console.log("----------Parsed Filter Output----------\n", parsed);

    // Build lookup from input jobs by URL
    const jobByUrl = new Map<string, T>();
    for (const job of jobs) {
        jobByUrl.set(job.jobURL, job);
    }

    // Validate: every LLM result must match an input job
    const inputUrls = new Set(jobs.map((j) => j.jobURL));
    const outputUrls = new Set<string>();
    const evaluated: EvaluatedJob<T>[] = [];

    for (const item of parsed as Array<Record<string, unknown>>) {
        const { jobURL, status, reason, experienceLevel, skills } = item as {
            jobURL: string;
            status: JobStatus;
            reason: string[];
            experienceLevel: string;
            skills: string[];
        };

        if (!inputUrls.has(jobURL)) {
            throw new Error(`LLM returned unknown jobURL not in input: ${jobURL}`);
        }
        if (outputUrls.has(jobURL)) {
            throw new Error(`LLM returned duplicate jobURL: ${jobURL}`);
        }

        const job = jobByUrl.get(jobURL);
        if (!job) {
            throw new Error(`jobURL lookup failed (should not happen): ${jobURL}`);
        }

        outputUrls.add(jobURL);
        evaluated.push({ job, status, reason, experienceLevel, skills });
    }

    // Validate: no input jobs were dropped
    if (outputUrls.size !== inputUrls.size) {
        const missing = [...inputUrls].filter((url) => !outputUrls.has(url));
        throw new Error(
            `LLM dropped ${missing.length} job(s) from output: ${missing.join(", ")}`,
        );
    }

    // Run structural heuristics (non-blocking warnings)
    const heuristicResults = runStructuralHeuristics(jobs, evaluated);
    logHeuristicResults(heuristicResults);

    return evaluated;
}
