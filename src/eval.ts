import { getCombinedGoldenDataset } from "./evals/combined-golden-dataset.js";
import { modelConfigs, ModelConfigKey } from "./config.js";
import { printGoldenResults } from "./evals/golden.js";
import { logHeuristicResults } from "./evals/structural.js";
import { writeEvalReport } from "./evals/report-writer.js";
import { runFilterEval } from "./pipeline/run-filter.js";

const modelArg = process.argv[2] as ModelConfigKey | undefined;
const failedOnlyArg = process.argv.includes("--failed-only");

if (!modelArg || !(modelArg in modelConfigs)) {
    const available = Object.keys(modelConfigs).join(", ");
    console.error(`Usage: pnpm eval <model>\nAvailable models: ${available}`);
    process.exit(1);
}

const validModelKey = modelArg;
const modelConfig = modelConfigs[validModelKey];

async function main() {
    console.log(`🧪 Running golden dataset eval with ${getCombinedGoldenDataset().length} jobs...`);
    console.log(`   Model: ${modelConfig.model}`);
    console.log(`   Temperature: ${modelConfig.temperature}\n`);

    const { comparison, heuristics } = await runFilterEval(validModelKey);

    console.log("\n── Structural Heuristics ──\n");
    logHeuristicResults(heuristics);

    printGoldenResults(comparison, failedOnlyArg);

    const reportPath = writeEvalReport({
        modelKey: validModelKey,
        modelConfig,
        comparison,
        heuristics,
        goldenDataset: getCombinedGoldenDataset(),
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
