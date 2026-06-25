import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ModelConfig } from "../config.js";
import { GoldenComparisonResult } from "./golden.js";
import { HeuristicResult } from "./structural.js";
import { GoldenEntry } from "../types/GoldenEntry.js";

const EVAL_RESULTS_DIR = "eval-results";

export interface EvalReportArgs {
    modelKey: string;
    modelConfig: ModelConfig;
    comparison: GoldenComparisonResult;
    heuristics: HeuristicResult[];
    goldenDataset: GoldenEntry[];
    /** Site scope when the run was filtered via `--site <name>`. Omit for a combined run. */
    site?: string;
}

export interface CompareModelDetail {
    modelKey: string;
    modelName: string;
    accuracy: number;
    passF1: number;
    failF1: number;
    potentialMatchF1: number;
    correct: number;
    total: number;
    comparison: GoldenComparisonResult;
    heuristics: HeuristicResult[];
    aiOutputJobs: string[];
}

export interface CompareReportArgs {
    models: CompareModelDetail[];
    goldenDataset: GoldenEntry[];
    /** Site scope when the run was filtered via `--site <name>`. Omit for a combined run. */
    site?: string;
}

function formatTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

function formatTimestampReadable(): string {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function ensureEvalResultsDir(): string {
    const dir = join(process.cwd(), EVAL_RESULTS_DIR);
    mkdirSync(dir, { recursive: true });
    return dir;
}

function renderClassMetricsTable(classMetrics: GoldenComparisonResult["classMetrics"]): string {
    const lines: string[] = [
        "| Class | Precision | Recall | F1 | Support |",
        "|-------|-----------|--------|----|---------|",
    ];
    for (const [status, m] of Object.entries(classMetrics)) {
        lines.push(
            `| ${status} | ${(m.precision * 100).toFixed(1)}% | ${(m.recall * 100).toFixed(1)}% | ${(m.f1 * 100).toFixed(1)}% | ${m.support} |`,
        );
    }
    return lines.join("\n");
}

function renderHeuristics(heuristics: HeuristicResult[]): string {
    const allPassed = heuristics.every((h) => h.passed);
    if (allPassed) {
        return `All ${heuristics.length} checks passed ✅`;
    }
    const lines: string[] = [
        "| Status | Rule | Details |",
        "|--------|------|---------|",
    ];
    for (const h of heuristics) {
        const icon = h.passed ? "✅" : "❌";
        lines.push(`| ${icon} | ${h.rule} | ${h.details} |`);
    }
    return lines.join("\n");
}

function renderPerJobBreakdown(comparison: GoldenComparisonResult): string {
    const lines: string[] = [];
    for (const job of comparison.perJob) {
        const icon = job.statusMatch ? "✅" : "❌";
        const droppedTag = job.dropped ? " **[DROPPED]**" : "";
        const actualDisplay = job.dropped ? "**[DROPPED]**" : job.actualStatus;
        lines.push(`### ${icon} #${job.jobIndex}: ${job.jobTitle}${droppedTag}`);
        lines.push("");
        lines.push(`- **Expected:** ${job.expectedStatus} | **Got:** ${actualDisplay}`);
        if (job.dropped) {
            lines.push(`- **⚠️ Job was not returned by the AI**`);
        }
        if (job.reasonText) {
            lines.push(`- **Reason:** "${job.reasonText}"`);
        }
        if (job.matchedKeywords.length > 0) {
            lines.push(`- **Matched keywords:** ${job.matchedKeywords.join(", ")}`);
        }
        if (job.unmatchedKeywords.length > 0) {
            lines.push(`- **Unmatched keywords:** ${job.unmatchedKeywords.join(", ")}`);
        }
        lines.push("");
    }
    return lines.join("\n");
}

function renderEvalSection(args: EvalReportArgs): string {
    const { modelKey, modelConfig, comparison, heuristics } = args;
    const threshold = 0.8;
    const passed = comparison.overallAccuracy >= threshold;
    const lines: string[] = [
        `### ${modelKey} (${modelConfig.model} @ ${modelConfig.temperature})`,
        "",
        `**Accuracy:** ${(comparison.overallAccuracy * 100).toFixed(1)}% (${comparison.summary.correct}/${comparison.summary.total}) | **Threshold:** ${(threshold * 100).toFixed(0)}% → ${passed ? "✅ PASS" : "❌ FAIL"}`,
        "",
        "#### Per-Class Metrics",
        "",
        renderClassMetricsTable(comparison.classMetrics),
        "",
        "#### Structural Heuristics",
        "",
        renderHeuristics(heuristics),
        "",
        "#### Per-Job Breakdown",
        "",
        renderPerJobBreakdown(comparison),
    ];
    return lines.join("\n");
}

export function writeEvalReport(args: EvalReportArgs): string {
    const dir = ensureEvalResultsDir();
    const ts = formatTimestamp();
    const siteSuffix = args.site ? `_site-${args.site}` : "";
    const filename = `${ts}_${args.modelKey}${siteSuffix}.md`;
    const filepath = join(dir, filename);

    const threshold = 0.8;
    const passed = args.comparison.overallAccuracy >= threshold;

    const content = [
        `# Eval: ${args.modelKey}`,
        "",
        `**Date:** ${formatTimestampReadable()} | **Model:** ${args.modelConfig.model} | **Temperature:** ${args.modelConfig.temperature}`,
        `**Site:** ${args.site ?? "combined"} (${args.goldenDataset.length} jobs)`,
        "",
        "## Summary",
        "",
        `- **Accuracy:** ${(args.comparison.overallAccuracy * 100).toFixed(1)}% (${args.comparison.summary.correct}/${args.comparison.summary.total})`,
        `- **Threshold:** ${(threshold * 100).toFixed(0)}% → ${passed ? "✅ PASS" : "❌ FAIL"}`,
        "",
        "## Per-Class Metrics",
        "",
        renderClassMetricsTable(args.comparison.classMetrics),
        "",
        "## Structural Heuristics",
        "",
        renderHeuristics(args.heuristics),
        "",
        "## Per-Job Breakdown",
        "",
        renderPerJobBreakdown(args.comparison),
    ].join("\n") + "\n";

    writeFileSync(filepath, content, "utf-8");
    return filepath;
}

export function writeCompareReport(args: CompareReportArgs): string {
    const dir = ensureEvalResultsDir();
    const ts = formatTimestamp();
    const siteSuffix = args.site ? `_site-${args.site}` : "";
    const filename = `${ts}_compare${siteSuffix}.md`;
    const filepath = join(dir, filename);

    const sorted = [...args.models].sort((a, b) => b.passF1 - a.passF1);

    // Rankings table
    const rankings: string[] = [
        "| Rank | Model | Accuracy | PASS F1 | FAIL F1 | POT.M F1 | Correct |",
        "|------|-------|----------|---------|---------|----------|---------|",
    ];
    for (let i = 0; i < sorted.length; i++) {
        const m = sorted[i];
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
        rankings.push(
            `| ${medal} | ${m.modelKey} | ${(m.accuracy * 100).toFixed(1)}% | ${(m.passF1 * 100).toFixed(1)}% | ${(m.failF1 * 100).toFixed(1)}% | ${(m.potentialMatchF1 * 100).toFixed(1)}% | ${m.correct}/${m.total} |`,
        );
    }

    // Per-model details
    const perModelSections = sorted.map((m) =>
        renderEvalSection({
            modelKey: m.modelKey,
            modelConfig: { model: m.modelName, temperature: 0.2, think: false },
            comparison: m.comparison,
            heuristics: m.heuristics,
            goldenDataset: args.goldenDataset,
        }),
    );

    // Model disagreements
    const disagreements = renderDisagreements(args);

    const content = [
        `# Model Comparison`,
        "",
        `**Date:** ${formatTimestampReadable()} | **Models:** ${args.models.length} | **Jobs:** ${args.goldenDataset.length}`,
        `**Site:** ${args.site ?? "combined"}`,
        "",
        "## Rankings (by PASS F1)",
        "",
        ...rankings,
        "",
        "## Per-Model Details",
        "",
        ...perModelSections,
        "",
        "## Model Disagreements",
        "",
        disagreements,
    ].join("\n") + "\n";

    writeFileSync(filepath, content, "utf-8");
    return filepath;
}

function renderDisagreements(args: CompareReportArgs): string {
    if (args.models.length < 2) return "Not enough models to compare.";

    const jobCount = args.goldenDataset.length;
    const disagreementRows: string[] = [];

    for (let i = 0; i < jobCount; i++) {
        const statuses = args.models.map((m) => m.comparison.perJob[i]?.actualStatus);
        const uniqueStatuses = new Set(statuses);
        if (uniqueStatuses.size <= 1) continue;

        const job = args.goldenDataset[i];
        const expected = args.models[0].comparison.perJob[i]?.expectedStatus ?? "?";
        const modelCells = args.models.map((m) => m.comparison.perJob[i]?.actualStatus ?? "?");

        disagreementRows.push(
            `| #${i + 1} ${job.job.jobTitle} | ${expected} | ${modelCells.join(" | ")} |`,
        );
    }

    if (disagreementRows.length === 0) {
        return "No disagreements — all models produced identical results ✅";
    }

    const header = args.models.map((m) => m.modelKey).join(" | ");
    const lines: string[] = [
        `| Job | Expected | ${header} |`,
        `|-----|----------|${args.models.map(() => "----------|").join("")}`,
        ...disagreementRows,
    ];
    return lines.join("\n");
}
