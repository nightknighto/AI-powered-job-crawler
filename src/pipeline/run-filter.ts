import ollama, { type ChatResponse } from "ollama";
import { z } from "zod";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob, jobEvaluationSchema, JobStatus } from "../types/evaluated-job.js";
import { ModelConfig, ModelConfigKey, modelConfigs, shared } from "../config.js";
import { GoldenComparisonResult, compareGolden } from "../evals/golden.js";
import { HeuristicResult, runStructuralHeuristics } from "../evals/structural.js";
import { GoldenEntry } from "../types/GoldenEntry.js";
import { filterPrompt } from "./prompts/prompts.js";

/** Type alias for the LLM's filter output after Zod validation. */
type ParsedLlmEvaluation = z.infer<typeof jobEvaluationSchema>;

/** Strict-tolerant mode for {@link mergeJobsByUrl}. */
type MergeMode = "strict" | "tolerant";

/** Strip ``` fences, JSON-parse, and Zod-validate against {@link jobEvaluationSchema}.
 * @param content - Raw LLM response content.
 * @returns Parsed and validated evaluation array.
 * @throws If the content is not valid JSON or fails schema validation.
 */
function parseLlmOutput(content: string): ParsedLlmEvaluation {
    try {
        const cleaned = content.replaceAll("```", "");
        return jobEvaluationSchema.parse(JSON.parse(cleaned));
    } catch (error) {
        console.error("Failed to parse LLM output:", error);
        console.error("Raw LLM output:\n\n", content);
        throw error;
    }
}

/** Log timing and token-usage stats as a single compact line.
 * @param response - The Ollama {@link ChatResponse} to log stats from.
 */
function logTimingAndTokens(response: ChatResponse): void {
    console.log(
        `⏱️  Load: ${(response.load_duration / 1_000_000_000).toFixed(1)}s | ` +
        `Prompt Eval: ${(response.prompt_eval_duration / 1_000_000_000).toFixed(1)}s | ` +
        `Eval: ${(response.eval_duration / 1_000_000_000).toFixed(1)}s | ` +
        `Total: ${(response.total_duration / 1_000_000_000).toFixed(1)}s`,
    );
    console.log(
        `📝  Input Tokens: ${response.prompt_eval_count} | Output Tokens: ${response.eval_count}`,
    );
}

/** A job the LLM dropped from its filter output (input job with no corresponding verdict). */
export interface DroppedJob {
    jobURL: string;
    jobTitle: string;
}

/** Re-attach original jobs to LLM output via URL matching, with dedup and dropped-job detection.
 *
 * - `'strict'` mode: throws on **unknown or duplicate** URLs (genuine LLM malfunction). Used by the
 *   production pipeline (`src/pipeline/evaluate.ts`).
 * - `'tolerant'` mode: warns and continues on unknown/duplicate URLs. Used by eval scripts
 *   (`src/eval.ts`, `src/compare-models.ts`) so noisy LLM output can still be scored against the
 *   golden dataset.
 *
 * **Dropped jobs are always non-fatal**: any input URL the LLM omitted from its output is collected
 * into the returned `dropped` array (and logged as a warning) regardless of mode. The caller decides
 * whether/how to surface dropped jobs (e.g. the production report lists them). This is a common LLM
 * hiccup and should not throw away an entire site's worth of results over a few missing URLs.
 *
 * @template T - The site-specific job type.
 * @param jobs - The original input jobs fed to the LLM.
 * @param parsed - The parsed LLM filter output.
 * @param mode - Strict (throw on unknown/duplicate) or tolerant (warn).
 * @returns Evaluated jobs (with original job data re-attached), in LLM-output order, plus any dropped jobs.
 */
function mergeJobsByUrl<T extends BaseJob>(
    jobs: T[],
    parsed: ParsedLlmEvaluation,
    mode: MergeMode,
): { evaluated: EvaluatedJob<T>[]; dropped: DroppedJob[] } {
    const jobByUrl = new Map<string, T>();
    for (const job of jobs) {
        jobByUrl.set(job.jobURL, job);
    }

    const inputUrls = new Set(jobs.map((j) => j.jobURL));
    const outputUrls = new Set<string>();
    const evaluated: EvaluatedJob<T>[] = [];

    for (const item of parsed) {
        const { jobURL, status, reason, experienceLevel, skills }: ParsedLlmEvaluation[number] = item;

        if (!inputUrls.has(jobURL)) {
            const msg = `LLM returned unknown jobURL not in input: ${jobURL}`;
            if (mode === "strict") throw new Error(msg);
            console.warn(`⚠️  ${msg}, skipping`);
            continue;
        }
        if (outputUrls.has(jobURL)) {
            const msg = `LLM returned duplicate jobURL: ${jobURL}`;
            if (mode === "strict") throw new Error(msg);
            console.warn(`⚠️  ${msg}, skipping`);
            continue;
        }

        const job = jobByUrl.get(jobURL);
        if (!job) {
            const msg = `jobURL lookup failed (should not happen): ${jobURL}`;
            if (mode === "strict") throw new Error(msg);
            console.warn(`⚠️  ${msg}, skipping`);
            continue;
        }

        outputUrls.add(jobURL);
        evaluated.push({ job, status, reason, experienceLevel, skills });
    }

    // Dropped jobs are always non-fatal: collect them for the caller to surface.
    const dropped: DroppedJob[] = [];
    if (outputUrls.size !== inputUrls.size) {
        for (const job of jobs) {
            if (!outputUrls.has(job.jobURL)) {
                dropped.push({ jobURL: job.jobURL, jobTitle: job.jobTitle });
            }
        }
        if (dropped.length > 0) {
            console.warn(`⚠️  LLM dropped ${dropped.length} job(s) from output: ${dropped.map((d) => d.jobTitle).join(", ")}`);
        }
    }

    return { evaluated, dropped };
}

/** Core: build the filter prompt, call Ollama, log timing, parse output, and merge back to jobs.
 *
 * This is the single source of truth for the LLM filter call. The production pipeline
 * (`src/pipeline/evaluate.ts`) uses it in `'strict'` mode; the eval scripts use it (via
 * {@link runFilterEval}) in `'tolerant'` mode. The mode governs unknown/duplicate-URL handling only;
 * dropped jobs are always collected (non-fatal) and returned in `dropped`.
 *
 * @template T - The site-specific job type.
 * @param jobs - Raw jobs to filter.
 * @param modelConfig - The Ollama model configuration to use.
 * @param options.mode - `'strict'` (throw on unknown/duplicate URLs) or `'tolerant'` (warn and continue).
 * @returns The evaluated jobs, any dropped jobs, plus the raw Ollama response (for callers that need extra fields).
 */
export async function runFilterLLMCall<T extends BaseJob>(
    jobs: T[],
    modelConfig: ModelConfig,
    options: { mode: MergeMode; prompt?: string },
): Promise<{ aiOutput: EvaluatedJob<T>[]; dropped: DroppedJob[]; response: ChatResponse }> {
    const promptContent = (options.prompt ?? filterPrompt).replace("{{jobs}}", JSON.stringify(jobs, null, 2));

    const response = await ollama.chat({
        model: modelConfig.model,
        keep_alive: shared.keepAlive,
        think: modelConfig.think,
        messages: [{ role: "user", content: promptContent }],
        format: z.toJSONSchema(jobEvaluationSchema),
        options: {
            temperature: modelConfig.temperature,
            num_ctx: modelConfig.num_ctx,
        },
    });

    logTimingAndTokens(response);

    const parsed = parseLlmOutput(response.message.content);
    const { evaluated: aiOutput, dropped } = mergeJobsByUrl(jobs, parsed, options.mode);

    return { aiOutput, dropped, response };
}

/** Timing and token metrics extracted from an Ollama {@link ChatResponse}. */
export interface ModelCallMetrics {
    /** Total request duration in milliseconds. */
    totalDurationMs: number;
    /** Prompt evaluation duration in milliseconds. */
    promptEvalDurationMs: number;
    /** Token-generation duration in milliseconds. */
    evalDurationMs: number;
    /** Number of input (prompt) tokens consumed. */
    inputTokens: number;
    /** Number of output (generated) tokens produced. */
    outputTokens: number;
}

/** Run the full filter eval on a golden dataset for one model.
 *
 * Convenience wrapper used by `src/eval.ts` and `src/compare-models.ts`. Calls
 * {@link runFilterLLMCall} in `'tolerant'` mode on the supplied golden dataset, then runs
 * golden comparison and structural heuristics.
 *
 * The caller controls which dataset is evaluated: pass the combined dataset for a full run
 * (via `getGoldenDataset()`) or a single site's dataset (via `getGoldenDataset('wuzzuf')`) —
 * this is how the `--site <name>` CLI flag scopes a run. See
 * `src/evals/combined-golden-dataset.ts`.
 *
 * @param modelKey - The configured model key (entry in `modelConfigs`).
 * @param goldenDataset - The golden dataset to evaluate against (jobs + expected labels).
 * @returns The evaluated jobs, golden comparison result, and heuristic results.
 */
export async function runFilterEval(
    modelKey: ModelConfigKey,
    goldenDataset: GoldenEntry[],
    prompt?: string,
): Promise<{
    aiOutput: EvaluatedJob<BaseJob>[];
    dropped: DroppedJob[];
    comparison: GoldenComparisonResult;
    heuristics: HeuristicResult[];
    metrics: ModelCallMetrics;
}> {
    const modelConfig = modelConfigs[modelKey];
    const jobs: BaseJob[] = goldenDataset.map((entry) => entry.job);

    console.log(`🤖 Evaluating ${jobs.length} jobs with ${modelConfig.model}...`);
    const { aiOutput, dropped, response } = await runFilterLLMCall(jobs, modelConfig, { mode: "tolerant", prompt });

    const metrics: ModelCallMetrics = {
        totalDurationMs: response.total_duration / 1_000_000,
        promptEvalDurationMs: response.prompt_eval_duration / 1_000_000,
        evalDurationMs: response.eval_duration / 1_000_000,
        inputTokens: response.prompt_eval_count,
        outputTokens: response.eval_count,
    };

    const comparison = compareGolden(goldenDataset, aiOutput);
    const heuristics = runStructuralHeuristics(jobs, aiOutput);

    return { aiOutput, dropped, comparison, heuristics, metrics };
}
