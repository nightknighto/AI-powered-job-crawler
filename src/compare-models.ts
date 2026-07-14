import { modelConfigs, ModelConfigKey } from "./config.js";
import { CaseCategory, GoldenEntry } from "./types/GoldenEntry.js";
import { CASE_CATEGORIES, getAllCases, getCasesByIds } from "./evals/cases/index.js";
import { GoldenComparisonResult } from "./evals/golden.js";
import { HeuristicResult } from "./evals/structural.js";
import { writeCompareReport, CompareModelDetail } from "./evals/report-writer.js";
import { runFilterEval } from "./pipeline/run-filter.js";

interface ModelResult {
    modelKey: string;
    modelName: string;
    accuracy: number;
    correct: number;
    total: number;
    errors: string[];
    comparison: GoldenComparisonResult;
    heuristics: HeuristicResult[];
    aiOutputJobTitles: string[];
}

async function evalModel(modelKey: ModelConfigKey, goldenDataset: GoldenEntry[]): Promise<ModelResult> {
    const config = modelConfigs[modelKey];
    const { comparison, heuristics, aiOutput } = await runFilterEval(modelKey, goldenDataset);

    const errors: string[] = comparison.perJob
        .filter((job) => !job.statusMatch)
        .map((job) => {
            const actualDisplay = job.dropped ? "[DROPPED]" : job.actualStatus;
            return `  ${job.id} ${job.jobTitle}: expected ${job.expectedStatus}, got ${actualDisplay}`;
        });

    return {
        modelKey,
        modelName: config.model,
        accuracy: comparison.overallAccuracy,
        correct: comparison.summary.correct,
        total: comparison.summary.total,
        errors,
        comparison,
        heuristics,
        aiOutputJobTitles: aiOutput.map((e) => e.job.jobTitle),
    };
}

function printComparison(results: ModelResult[]) {
    // Rank by overall accuracy (primary metric)
    const sorted = [...results].sort((a, b) => b.accuracy - a.accuracy);

    console.log("\n╔══════════════════════════════════════════════════════════════════╗");
    console.log("║                   MODEL COMPARISON RESULTS                      ║");
    console.log("╠════════════════════╤══════════╤═════════════════════════════════╣");
    console.log("║ Model              │ Accuracy │ Correct                          ║");
    console.log("╠════════════════════╪══════════╪═════════════════════════════════╣");

    for (const r of sorted) {
        const rank = r === sorted[0] ? "🥇" : r === sorted[1] ? "🥈" : "🥉";
        console.log(
            `║ ${rank} ${r.modelKey.padEnd(17)}│` +
            ` ${(r.accuracy * 100).toFixed(1).padStart(6)}% │` +
            ` ${r.correct.toString().padStart(2)}/${r.total}                            ║`,
        );
    }

    console.log("╚════════════════════╧══════════╧═════════════════════════════════╝");

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

    console.log(`\n🏆 Winner: ${sorted[0].modelKey} (${sorted[0].modelName}) with accuracy = ${(sorted[0].accuracy * 100).toFixed(1)}%`);
}

async function main() {
    const models = Object.keys(modelConfigs) as ModelConfigKey[];
    const results: ModelResult[] = [];

    const availableCategories = CASE_CATEGORIES.join(", ");

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
    // model) and render a meaningless ranking — bail out early.
    if (goldenDataset.length === 0) {
        console.error(
            `No cases selected${category ? ` for category "${category}"` : ""}. ` +
            `That category currently has no cases; pick another category or omit --category.\n` +
            `Available categories: ${availableCategories}`,
        );
        process.exit(1);
    }

    const scope = caseIds ? `cases: ${caseIds.join(", ")}` : category ? `category: ${category}` : "all categories";
    console.log(`🔄 Running eval for ${models.length} models on ${scope} (${goldenDataset.length} cases)...\n`);

    for (const modelKey of models) {
        const config = modelConfigs[modelKey];
        console.log(`\n▶ Running ${modelKey} (${config.model})...`);
        try {
            const result = await evalModel(modelKey, goldenDataset);
            results.push(result);
            console.log(`  → Accuracy: ${(result.accuracy * 100).toFixed(1)}% | ${result.correct}/${result.total} correct`);
        } catch (err) {
            console.error(`  ❌ Failed: ${err}`);
        }
    }

    printComparison(results);

    const details: CompareModelDetail[] = results.map((r) => ({
        modelKey: r.modelKey,
        modelName: r.modelName,
        accuracy: r.accuracy,
        correct: r.correct,
        total: r.total,
        comparison: r.comparison,
        heuristics: r.heuristics,
        aiOutputJobs: r.aiOutputJobTitles,
    }));
    const reportPath = writeCompareReport({ models: details, goldenDataset, category, cases: caseIds });
    console.log(`\n📄 Report saved: ${reportPath}`);
}

main().catch((err) => {
    console.error("Comparison failed:", err);
    process.exit(1);
});
