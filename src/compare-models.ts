import ollama from "ollama";
import { z } from "zod";
import { modelConfigs, ModelConfigKey, shared } from "./config.js";
import { compareGolden, GoldenComparisonResult } from "./evals/golden.js";
import { runStructuralHeuristics, HeuristicResult } from "./evals/structural.js";
import { writeCompareReport, CompareModelDetail } from "./evals/report-writer.js";
import { EvaluatedJob, jobEvaluationSchema, JobStatus } from "./types/evaluated-job.js";
import { getCombinedGoldenDataset } from "./evals/combined-golden-dataset.js";
import { BaseJob } from "./types/base.js";
import { unifiedFilterPrompt } from "./pipeline/prompts.js";

interface ModelResult {
    modelKey: string;
    modelName: string;
    accuracy: number;
    passF1: number;
    failF1: number;
    potentialMatchF1: number;
    correct: number;
    total: number;
    errors: string[];
    comparison: GoldenComparisonResult;
    heuristics: HeuristicResult[];
    aiOutputJobTitles: string[];
}

async function evalModel(modelKey: ModelConfigKey): Promise<ModelResult> {
    const config = modelConfigs[modelKey];
    const jobs = getCombinedGoldenDataset().map((entry) => entry.job);

    const filterPrompt = unifiedFilterPrompt.replace(
        "{{jobs}}",
        JSON.stringify(jobs, null, 2),
    );

    const response = await ollama.chat({
        model: config.model,
        think: config.think,
        messages: [{ role: "user", content: filterPrompt }],
        format: z.toJSONSchema(jobEvaluationSchema),
        options: { temperature: config.temperature },
    });

    // Log timing and token usage
    console.log(`⏱️  Load: ${(response.load_duration / 1_000_000_000).toFixed(1)}s | Prompt Eval: ${(response.prompt_eval_duration / 1_000_000_000).toFixed(1)}s |
    Eval: ${(response.eval_duration / 1_000_000_000).toFixed(1)}s | Total: ${(response.total_duration / 1_000_000_000).toFixed(1)}s`);
    console.log(`📝  Input Tokens: ${response.prompt_eval_count} | Output Tokens: ${response.eval_count}`);

    let parsed: ReturnType<typeof jobEvaluationSchema.parse>;
    try {
        parsed = jobEvaluationSchema.parse(JSON.parse(response.message.content.replaceAll('```', '')));
    } catch (err) {
        console.warn("⚠️  Failed to parse LLM output:");
        console.warn(err);
        console.warn("Raw LLM response:");
        console.warn(response.message.content);
        process.exit(1);
    }

    const jobByUrl = new Map<string, BaseJob>();
    for (const job of jobs) {
        jobByUrl.set(job.jobURL, job);
    }

    const inputUrls = new Set(jobs.map((j) => j.jobURL));
    const outputUrls = new Set<string>();
    const aiOutput: EvaluatedJob<BaseJob>[] = [];

    for (const item of parsed) {
        const { jobURL, status, reason, experienceLevel, skills } = item

        if (!inputUrls.has(jobURL)) {
            console.warn(`⚠️  LLM returned unknown jobURL not in input, skipping: ${jobURL}`);
            continue;
        }
        if (outputUrls.has(jobURL)) {
            console.warn(`⚠️  LLM returned duplicate jobURL, skipping: ${jobURL}`);
            continue;
        }

        const job = jobByUrl.get(jobURL);
        if (!job) {
            console.warn(`⚠️  jobURL lookup failed (should not happen), skipping: ${jobURL}`);
            continue;
        }

        outputUrls.add(jobURL);
        aiOutput.push({ job, status, reason, experienceLevel, skills });
    }

    if (outputUrls.size !== inputUrls.size) {
        const missing = [...inputUrls].filter((url) => !outputUrls.has(url));
        console.warn(
            `⚠️  LLM dropped ${missing.length} job(s) from output: ${missing.join(", ")}`,
        );
    }

    const goldenDataset = getCombinedGoldenDataset();

    const comparison = compareGolden(goldenDataset, aiOutput);

    const heuristics = runStructuralHeuristics(jobs, aiOutput);

    const errors: string[] = [];
    for (const job of comparison.perJob) {
        if (!job.statusMatch) {
            const actualDisplay = job.dropped ? "[DROPPED]" : job.actualStatus;
            errors.push(`  #${job.jobIndex} ${job.jobTitle}: expected ${job.expectedStatus}, got ${actualDisplay}`);
        }
    }

    return {
        modelKey,
        modelName: config.model,
        accuracy: comparison.overallAccuracy,
        passF1: comparison.classMetrics.PASS?.f1 ?? 0,
        failF1: comparison.classMetrics.FAIL?.f1 ?? 0,
        potentialMatchF1: comparison.classMetrics.POTENTIAL_MATCH?.f1 ?? 0,
        correct: comparison.summary.correct,
        total: comparison.summary.total,
        errors,
        comparison,
        heuristics,
        aiOutputJobTitles: aiOutput.map((e) => e.job.jobTitle),
    };
}

function printComparison(results: ModelResult[]) {
    // Sort by PASS F1 (primary metric)
    const sorted = [...results].sort((a, b) => b.passF1 - a.passF1);

    console.log("\n╔══════════════════════════════════════════════════════════════════╗");
    console.log("║                   MODEL COMPARISON RESULTS                      ║");
    console.log("╠══════════════════════════════════════════════════════════════════╣");
    console.log("║ Model              │ Accuracy │ PASS F1 │ FAIL F1 │ POT.F1 │ ✓  ║");
    console.log("╠════════════════════╪══════════╪═════════╪═════════╪════════╪════╣");

    for (const r of sorted) {
        const rank = r === sorted[0] ? "🥇" : r === sorted[1] ? "🥈" : "🥉";
        console.log(
            `║ ${rank} ${r.modelKey.padEnd(17)}│` +
            ` ${(r.accuracy * 100).toFixed(1).padStart(6)}% │` +
            ` ${(r.passF1 * 100).toFixed(1).padStart(6)}% │` +
            ` ${(r.failF1 * 100).toFixed(1).padStart(6)}% │` +
            ` ${(r.potentialMatchF1 * 100).toFixed(1).padStart(5)}% │` +
            `${r.correct.toString().padStart(2)}/${r.total} ║`,
        );
    }

    console.log("╚══════════════════════════════════════════════════════════════════╝");

    // Print per-model errors
    for (const r of sorted) {
        console.log(`\n── ${r.modelKey} (${r.modelName}) — ${r.errors.length} mismatches ──`);
        if (r.errors.length === 0) {
            console.log("  ✅ Perfect!");
        } else {
            for (const err of r.errors) {
                console.log(err);
            }
        }
    }

    console.log(`\n🏆 Winner: ${sorted[0].modelKey} (${sorted[0].modelName}) with PASS F1 = ${(sorted[0].passF1 * 100).toFixed(1)}%`);
}

async function main() {
    const models = Object.keys(modelConfigs) as ModelConfigKey[];
    const results: ModelResult[] = [];

    const goldenDataset = getCombinedGoldenDataset();
    console.log(`🔄 Running eval for ${models.length} models on ${goldenDataset.length} jobs...\n`);

    for (const modelKey of models) {
        const config = modelConfigs[modelKey];
        console.log(`\n▶ Running ${modelKey} (${config.model})...`);
        try {
            const result = await evalModel(modelKey);
            results.push(result);
            console.log(`  → Accuracy: ${(result.accuracy * 100).toFixed(1)}% | PASS F1: ${(result.passF1 * 100).toFixed(1)}% | ${result.correct}/${result.total} correct`);
        } catch (err) {
            console.error(`  ❌ Failed: ${err}`);
        }
    }

    printComparison(results);

    // Write report to eval-results/
    const details: CompareModelDetail[] = results.map((r) => ({
        modelKey: r.modelKey,
        modelName: r.modelName,
        accuracy: r.accuracy,
        passF1: r.passF1,
        failF1: r.failF1,
        potentialMatchF1: r.potentialMatchF1,
        correct: r.correct,
        total: r.total,
        comparison: r.comparison,
        heuristics: r.heuristics,
        aiOutputJobs: r.aiOutputJobTitles,
    }));
    const reportPath = writeCompareReport({ models: details, goldenDataset });
    console.log(`\n📄 Report saved: ${reportPath}`);
}

main().catch((err) => {
    console.error("Comparison failed:", err);
    process.exit(1);
});
