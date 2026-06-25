import { getGoldenDataset, goldenDatasetsBySite, GoldenSiteKey } from "./evals/combined-golden-dataset.js";
import { modelConfigs, ModelConfigKey } from "./config.js";
import { printGoldenResults } from "./evals/golden.js";
import { logHeuristicResults } from "./evals/structural.js";
import { writeEvalReport } from "./evals/report-writer.js";
import { runFilterEval } from "./pipeline/run-filter.js";

const modelArg = process.argv[2] as ModelConfigKey | undefined;
const failedOnlyArg = process.argv.includes("--failed-only");

const availableSites = Object.keys(goldenDatasetsBySite).join(", ");

if (!modelArg || !(modelArg in modelConfigs)) {
    const availableModels = Object.keys(modelConfigs).join(", ");
    console.error(`Usage: pnpm eval <model> [--site <site>] [--failed-only]\nAvailable models: ${availableModels}\nAvailable sites:  ${availableSites}`);
    process.exit(1);
}

const validModelKey = modelArg;
const modelConfig = modelConfigs[validModelKey];

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

async function main() {
    console.log(`🧪 Running golden dataset eval (${siteKey ?? "combined"}, ${goldenDataset.length} jobs)...`);
    console.log(`   Model: ${modelConfig.model}`);
    console.log(`   Temperature: ${modelConfig.temperature}\n`);

    const { comparison, heuristics } = await runFilterEval(validModelKey, goldenDataset);

    console.log("\n── Structural Heuristics ──\n");
    logHeuristicResults(heuristics);

    printGoldenResults(comparison, failedOnlyArg);

    const reportPath = writeEvalReport({
        modelKey: validModelKey,
        modelConfig,
        comparison,
        heuristics,
        goldenDataset,
        site: siteKey,
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
