import { modelConfigs, ModelConfigKey } from "./config.js";
import { CaseCategory, GoldenEntry } from "./types/GoldenEntry.js";
import { CASE_CATEGORIES, getAllCases, getCasesByIds } from "./evals/cases/index.js";
import { GoldenComparisonResult } from "./evals/golden.js";
import { HeuristicResult } from "./evals/structural.js";
import { writePromptCompareReport, PromptCompareDetail } from "./evals/report-writer.js";
import { runFilterEval, ModelCallMetrics } from "./pipeline/run-filter.js";
import { loadPromptVariants } from "./pipeline/prompts/prompts.js";

interface PromptVariantResult {
    variantName: string;
    accuracy: number;
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
    const { comparison, heuristics, aiOutput, metrics } = await runFilterEval(modelKey, goldenDataset, prompt);

    const errors: string[] = comparison.perJob
        .filter((job) => !job.statusMatch)
        .map((job) => {
            const actualDisplay = job.dropped ? "[DROPPED]" : job.actualStatus;
            return `  ${job.id} ${job.jobTitle}: expected ${job.expectedStatus}, got ${actualDisplay}`;
        });

    return {
        variantName,
        accuracy: comparison.overallAccuracy,
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
    const sorted = [...results].sort((a, b) => b.accuracy - a.accuracy);

    console.log("\n╔══════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                       PROMPT COMPARISON RESULTS                              ║");
    console.log("╠════════════════════╤══════════╤════════════════════╤════════╤═══════════════════╣");
    console.log("║ Prompt             │ Accuracy │ Correct            │ Time   │ Out Tok           ║");
    console.log("╠════════════════════╪══════════╪════════════════════╪════════╪═══════════════════╣");

    for (const r of sorted) {
        const rank = r === sorted[0] ? "🥇" : r === sorted[1] ? "🥈" : "🥉";
        const label = r.variantName === "filter" ? "filter (base)" : r.variantName;
        const time = (r.metrics.totalDurationMs / 1000).toFixed(1);
        const outputTokens = r.metrics.outputTokens.toString();
        console.log(
            `║ ${rank} ${label.padEnd(18)}│` +
            ` ${(r.accuracy * 100).toFixed(1).padStart(6)}% │` +
            ` ${r.correct.toString().padStart(2)}/${r.total}`.padEnd(20) +
            `│${time.padStart(7)}s│` +
            `${outputTokens.padStart(17)} ║`,
        );
    }

    console.log("╚════════════════════╧══════════╧════════════════════╧════════╧═══════════════════╝");

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

    console.log(`\n🏆 Best prompt: ${sorted[0].variantName} with accuracy = ${(sorted[0].accuracy * 100).toFixed(1)}%`);
}

async function main() {
    const modelArg = process.argv[2] as ModelConfigKey | undefined;
    const availableModels = Object.keys(modelConfigs).join(", ");
    const availableCategories = CASE_CATEGORIES.join(", ");

    if (!modelArg || !(modelArg in modelConfigs)) {
        console.error(
            `Usage: pnpm compare-prompts <model> [--category <name>] [--cases id1,id2,...] [--variants v1,v2,...]\n` +
            `Available models: ${availableModels}\n` +
            `Available categories: ${availableCategories}`,
        );
        process.exit(1);
    }

    const modelKey = modelArg as ModelConfigKey;
    const modelConfig = modelConfigs[modelKey];

    // Parse --category <name>
    const categoryFlagIdx = process.argv.indexOf("--category");
    let category: CaseCategory | undefined;
    if (categoryFlagIdx !== -1) {
        const categoryValue = process.argv[categoryFlagIdx + 1];
        if (!categoryValue) {
            console.error(`--category requires a value. Available categories: ${availableCategories}`);
            process.exit(1);
        }
        if (!CASE_CATEGORIES.includes(categoryValue as CaseCategory)) {
            console.error(`Unknown category: ${categoryValue}. Available categories: ${availableCategories}`);
            process.exit(1);
        }
        category = categoryValue as CaseCategory;
    }

    // Parse --cases id1,id2,...
    const casesFlagIdx = process.argv.indexOf("--cases");
    let caseIds: string[] | undefined;
    if (casesFlagIdx !== -1) {
        const casesValue = process.argv[casesFlagIdx + 1];
        if (!casesValue) {
            console.error("--cases requires a comma-separated list of case ids");
            process.exit(1);
        }
        caseIds = casesValue.split(",").map((c) => c.trim());
    }

    let goldenDataset: GoldenEntry[];
    try {
        goldenDataset = caseIds ? getCasesByIds(caseIds) : getAllCases(category);
    } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
    }

    // A 0-case selection (e.g. an empty category) would waste N LLM calls (one per
    // variant) and render a meaningless ranking — bail out early.
    if (goldenDataset.length === 0) {
        console.error(
            `No cases selected${category ? ` for category "${category}"` : ""}. ` +
            `That category currently has no cases; pick another category or omit --category.\n` +
            `Available categories: ${availableCategories}`,
        );
        process.exit(1);
    }

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
    const scope = caseIds ? `cases: ${caseIds.join(", ")}` : category ? `category: ${category}` : "all categories";
    console.log(`🔄 Running prompt comparison for ${modelConfig.model}...`);
    console.log(`   Dataset: ${scope} (${goldenDataset.length} cases)`);
    console.log(`   Variants: ${variantNames.join(", ")}\n`);

    const results: PromptVariantResult[] = [];

    for (const { name, prompt } of promptVariants) {
        const label = name === "filter" ? "filter (base)" : name;
        console.log(`\n▶ Variant: ${label}`);
        try {
            const result = await evalVariant(modelKey, name, goldenDataset, prompt);
            results.push(result);
            console.log(`  → Accuracy: ${(result.accuracy * 100).toFixed(1)}% | ${result.correct}/${result.total} correct | ${(result.metrics.totalDurationMs / 1000).toFixed(1)}s`);
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
        category,
        cases: caseIds,
    });
    console.log(`\n📄 Report saved: ${reportPath}`);
}

main().catch((err) => {
    console.error("Prompt comparison failed:", err);
    process.exit(1);
});
