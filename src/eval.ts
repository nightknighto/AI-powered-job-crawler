import ollama from "ollama";
import { z } from "zod";
import { goldenDataset } from "./sites/wuzzuf/evals/golden-dataset.js";
import { wuzzufConfig } from "./sites/wuzzuf/index.js";
import { modelConfigs, ModelConfigKey, shared } from "./config.js";
import { compareGolden, printGoldenResults } from "./evals/golden.js";
import { runStructuralHeuristics, logHeuristicResults } from "./evals/structural.js";
import { writeEvalReport } from "./evals/report-writer.js";
import { EvaluatedJob, JobStatus } from "./types/evaluated-job.js";
import { WuzzufJob } from "./types/WuzzufJob.js";

const modelArg = process.argv[2] as ModelConfigKey | undefined;

if (!modelArg || !(modelArg in modelConfigs)) {
    const available = Object.keys(modelConfigs).join(", ");
    console.error(`Usage: pnpm eval <model>\nAvailable models: ${available}`);
    process.exit(1);
}

const validModelKey = modelArg;
const modelConfig = modelConfigs[validModelKey];

async function main() {
    // Extract just the jobs from the golden dataset (no labels)
    const jobs: WuzzufJob[] = goldenDataset.map((entry) => entry.job);

    console.log(`🧪 Running golden dataset eval with ${jobs.length} jobs...`);
    console.log(`   Model: ${modelConfig.model}`);
    console.log(`   Temperature: ${modelConfig.temperature}\n`);

    // Run filter through ollama (same pipeline as evaluate.ts, but no crawling)
    const filterPrompt = wuzzufConfig.prompts.filter.replace(
        "{{jobs}}",
        JSON.stringify(jobs, null, 2),
    );

    console.log("🤖 Sending jobs to LLM...");
    const response = await ollama.chat({
        model: modelConfig.model,
        keep_alive: shared.keepAlive,
        think: modelConfig.think,
        messages: [{ role: "user", content: filterPrompt }],
        format: z.toJSONSchema(wuzzufConfig.evaluationSchema),
        options: { temperature: modelConfig.temperature },
    });

    // Parse LLM output
    const parsed = wuzzufConfig.evaluationSchema.parse(JSON.parse(response.message.content));
    const aiOutput: EvaluatedJob<WuzzufJob>[] = parsed.map((item: any) => {
        const { status, reason, ...job } = item;
        return { job: job as WuzzufJob, status, reason };
    });

    console.log(`✅ Received ${aiOutput.length} evaluated jobs\n`);

    // Run structural heuristics
    console.log("── Structural Heuristics ──\n");
    const heuristicResults = runStructuralHeuristics(jobs, aiOutput);
    logHeuristicResults(heuristicResults);

    // Run golden comparison
    const comparison = compareGolden(goldenDataset, aiOutput);
    printGoldenResults(comparison);

    // Write report to eval-results/
    const reportPath = writeEvalReport({
        modelKey: validModelKey,
        modelConfig,
        comparison,
        heuristics: heuristicResults,
        goldenDataset,
    });
    console.log(`\n📄 Report saved: ${reportPath}`);

    // Exit with code based on accuracy threshold
    const threshold = 0.8;
    if (comparison.overallAccuracy >= threshold) {
        console.log(`\n✅ PASSED: Accuracy ${(comparison.overallAccuracy * 100).toFixed(1)}% meets threshold ${(threshold * 100).toFixed(0)}%`);
    } else {
        console.log(`\n❌ FAILED: Accuracy ${(comparison.overallAccuracy * 100).toFixed(1)}% below threshold ${(threshold * 100).toFixed(0)}%`);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error("Eval failed:", err);
    process.exit(1);
});
