import { modelConfigs, ModelConfigKey } from "./config.js";
import { getGoldenDataset, goldenDatasetsBySite, GoldenSiteKey } from "./evals/combined-golden-dataset.js";
import { GoldenComparisonResult } from "./evals/golden.js";
import { HeuristicResult } from "./evals/structural.js";
import { writePromptCompareReport, PromptCompareDetail } from "./evals/report-writer.js";
import { runFilterEval, ModelCallMetrics } from "./pipeline/run-filter.js";
import { loadPromptVariants } from "./pipeline/prompts/prompts.js";
import { GoldenEntry } from "./types/GoldenEntry.js";

interface PromptVariantResult {
    variantName: string;
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
    metrics: ModelCallMetrics;
}

async function evalVariant(
    modelKey: ModelConfigKey,
    variantName: string,
    goldenDataset: GoldenEntry[],
    prompt: string,
): Promise<PromptVariantResult> {
    const config = modelConfigs[modelKey];
    const { comparison, heuristics, aiOutput, metrics } = await runFilterEval(modelKey, goldenDataset, prompt);

    const errors: string[] = comparison.perJob
        .filter((job) => !job.statusMatch)
        .map((job) => {
            const actualDisplay = job.dropped ? "[DROPPED]" : job.actualStatus;
            return `  #${job.jobIndex} ${job.jobTitle}: expected ${job.expectedStatus}, got ${actualDisplay}`;
        });

    return {
        variantName,
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
        metrics,
    };
}

function printComparison(results: PromptVariantResult[]) {
    const sorted = [...results].sort((a, b) => b.passF1 - a.passF1);

    console.log("\n╔══════════════════════════════════════════════════════════════════════════╗");
    console.log("║                     PROMPT COMPARISON RESULTS                            ║");
    console.log("╠════════════════════╪══════════╪═════════╪═════════╪════════╪══════╪══════╪════════╣");
    console.log("║ Prompt             │ Accuracy │ PASS F1 │ FAIL F1 │ P.M.F1 │ ✓    │ Time │ OutTok ║");
    console.log("╠════════════════════╪══════════╪═════════╪═════════╪════════╪══════╪══════╪════════╣");

    for (const r of sorted) {
        const rank = r === sorted[0] ? "🥇" : r === sorted[1] ? "🥈" : "🥉";
        const label = r.variantName === "filter" ? "filter (base)" : r.variantName;
        const time = (r.metrics.totalDurationMs / 1000).toFixed(1);
        const outputTokens = r.metrics.outputTokens.toString();
        console.log(
            `║ ${rank} ${label.padEnd(18)}│` +
            `${(r.accuracy * 100).toFixed(1).padStart(6)}% │` +
            `${(r.passF1 * 100).toFixed(1).padStart(6)}% │` +
            `${(r.failF1 * 100).toFixed(1).padStart(6)}% │` +
            `${(r.potentialMatchF1 * 100).toFixed(1).padStart(5)}% │` +
            `${r.correct.toString().padStart(2)}/${r.total} │` +
            `${time.padStart(5)}s │` +
            `${outputTokens.padStart(6)} ║`,
        );
    }

    console.log("╚════════════════════╧══════════╧═════════╧═════════╧════════╧══════╧══════╧════════╝");

    for (const r of sorted) {
        const label = r.variantName === "filter" ? "filter (base)" : r.variantName;
        console.log(`\n── ${label} — ${r.errors.length} mismatches ──`);
        if (r.errors.length === 0) {
            console.log("  ✅ Perfect!");
        } else {
            for (const err of r.errors) {
                console.log(err);
            }
        }
    }

    console.log(`\n🏆 Best prompt: ${sorted[0].variantName} with PASS F1 = ${(sorted[0].passF1 * 100).toFixed(1)}%`);
}

async function main() {
    const modelArg = process.argv[2] as ModelConfigKey | undefined;
    const availableModels = Object.keys(modelConfigs).join(", ");
    const availableSites = Object.keys(goldenDatasetsBySite).join(", ");

    if (!modelArg || !(modelArg in modelConfigs)) {
        console.error(`Usage: pnpm compare-prompts <model> [--site <site>] [--variants v1,v2,...]\nAvailable models: ${availableModels}\nAvailable sites:  ${availableSites}`);
        process.exit(1);
    }

    const modelKey = modelArg as ModelConfigKey;
    const modelConfig = modelConfigs[modelKey];

    const siteFlagIdx = process.argv.indexOf("--site");
    let siteKey: GoldenSiteKey | undefined;
    if (siteFlagIdx !== -1) {
        const siteValue = process.argv[siteFlagIdx + 1];
        if (!siteValue) {
            console.error(`--site requires a value. Available sites: ${availableSites}`);
            process.exit(1);
        }
        if (!(siteValue in goldenDatasetsBySite)) {
            console.error(`Unknown site: ${siteValue}. Available sites: ${availableSites}`);
            process.exit(1);
        }
        siteKey = siteValue as GoldenSiteKey;
    }

    const goldenDataset = getGoldenDataset(siteKey);
    const allVariants = loadPromptVariants();

    // Parse --variants filter (comma-separated, default: all custom variants)
    const variantsFlagIdx = process.argv.indexOf("--variants");
    let requestedVariants: string[] | undefined;
    if (variantsFlagIdx !== -1) {
        const variantsValue = process.argv[variantsFlagIdx + 1];
        if (!variantsValue) {
            console.error("--variants requires a comma-separated list of variant names (e.g. --variants v1,v2)");
            process.exit(1);
        }
        requestedVariants = variantsValue.split(",").map((v) => v.trim());
    }

    // Filter: always include baseline "filter", then match requested (or all) custom variants
    const customVariants = allVariants.filter((v) => v.name !== "filter");
    const promptVariants = allVariants.filter((v) => {
        if (v.name === "filter") return true;
        if (requestedVariants) return requestedVariants.includes(v.name);
        return true;
    });

    if (requestedVariants) {
        const notFound = requestedVariants.filter((name) => !customVariants.some((v) => v.name === name));
        if (notFound.length > 0) {
            const available = customVariants.map((v) => v.name).join(", ");
            console.error(`Unknown variant(s): ${notFound.join(", ")}\nAvailable custom variants: ${available}`);
            process.exit(1);
        }
    }

    const variantNames = promptVariants.map((v) => v.name === "filter" ? "filter (base)" : v.name);
    console.log(`🔄 Running prompt comparison for ${modelConfig.model}...`);
    console.log(`   Dataset: ${siteKey ?? "combined"} (${goldenDataset.length} jobs)`);
    console.log(`   Variants: ${variantNames.join(", ")}\n`);

    const results: PromptVariantResult[] = [];

    for (const { name, prompt } of promptVariants) {
        const label = name === "filter" ? "filter (base)" : name;
        console.log(`\n▶ Variant: ${label}`);
        try {
            const result = await evalVariant(modelKey, name, goldenDataset, prompt);
            results.push(result);
            console.log(`  → Accuracy: ${(result.accuracy * 100).toFixed(1)}% | PASS F1: ${(result.passF1 * 100).toFixed(1)}% | ${result.correct}/${result.total} correct | ${(result.metrics.totalDurationMs / 1000).toFixed(1)}s`);
        } catch (err) {
            console.error(`  ❌ Failed: ${err}`);
        }
    }

    if (results.length === 0) {
        console.error("No variants completed successfully.");
        process.exit(1);
    }

    printComparison(results);

    const details: PromptCompareDetail[] = results.map((r) => ({
        variantName: r.variantName,
        accuracy: r.accuracy,
        passF1: r.passF1,
        failF1: r.failF1,
        potentialMatchF1: r.potentialMatchF1,
        correct: r.correct,
        total: r.total,
        comparison: r.comparison,
        heuristics: r.heuristics,
        aiOutputJobs: r.aiOutputJobTitles,
        metrics: r.metrics,
    }));

    const reportPath = writePromptCompareReport({
        modelKey,
        modelName: modelConfig.model,
        variants: details,
        goldenDataset,
        site: siteKey,
    });
    console.log(`\n📄 Report saved: ${reportPath}`);
}

main().catch((err) => {
    console.error("Prompt comparison failed:", err);
    process.exit(1);
});
