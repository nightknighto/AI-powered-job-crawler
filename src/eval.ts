import { CaseCategory, GoldenEntry } from "./types/GoldenEntry.js";
import { CASE_CATEGORIES, getAllCases, getCasesByIds } from "./evals/cases/index.js";
import { modelConfigs, ModelConfigKey } from "./config.js";
import { printGoldenResults } from "./evals/golden.js";
import { logHeuristicResults } from "./evals/structural.js";
import { writeEvalReport } from "./evals/report-writer.js";
import { runFilterEval } from "./pipeline/run-filter.js";

const modelArg = process.argv[2] as ModelConfigKey | undefined;
const printFailedOnlyArg = process.argv.includes("--print-failed-only");

const availableCategories = CASE_CATEGORIES.join(", ");

if (!modelArg || !(modelArg in modelConfigs)) {
    const availableModels = Object.keys(modelConfigs).join(", ");
    console.error(
        `Usage: pnpm eval <model> [--category <name>] [--cases id1,id2,...] [--print-failed-only]\n` +
        `Available models: ${availableModels}\n` +
        `Available categories: ${availableCategories}`,
    );
    process.exit(1);
}

const validModelKey = modelArg;
const modelConfig = modelConfigs[validModelKey];

// Parse --category <name> (scope to one rule file)
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

// Parse --cases id1,id2,... (cherry-pick specific cases by ID)
const casesFlagIdx = process.argv.indexOf("--cases");
let caseIds: string[] | undefined;
if (casesFlagIdx !== -1) {
    const casesValue = process.argv[casesFlagIdx + 1];
    if (!casesValue) {
        console.error("--cases requires a comma-separated list of case ids (e.g. --cases exp-threshold-4yr-fail,role-qa-junior-fail)");
        process.exit(1);
    }
    caseIds = casesValue.split(",").map((c) => c.trim());
}

// Resolve the golden case set: start from all (or one category), then narrow by IDs if present.
let goldenDataset: GoldenEntry[];
try {
    if (caseIds) {
        goldenDataset = getCasesByIds(caseIds);
    } else {
        goldenDataset = getAllCases(category);
    }
} catch (err) {
    console.error((err as Error).message);
    process.exit(1);
}

async function main() {
    const scope = caseIds ? `cases: ${caseIds.join(", ")}` : category ? `category: ${category}` : "all categories";
    console.log(`🧪 Running golden dataset eval (${scope}, ${goldenDataset.length} cases)...`);
    console.log(`   Model: ${modelConfig.model}`);
    console.log(`   Temperature: ${modelConfig.temperature}\n`);

    const { comparison, heuristics } = await runFilterEval(validModelKey, goldenDataset);

    console.log("\n── Structural Heuristics ──\n");
    logHeuristicResults(heuristics);

    printGoldenResults(comparison, printFailedOnlyArg);

    const reportPath = writeEvalReport({
        modelKey: validModelKey,
        modelConfig,
        comparison,
        heuristics,
        goldenDataset,
        category,
        cases: caseIds,
    });
    console.log(`\n📄 Report saved: ${reportPath}`);

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
