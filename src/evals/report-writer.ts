import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ModelConfig } from "../config.js";
import { GoldenComparisonResult } from "./golden.js";
import { HeuristicResult } from "./structural.js";
import { GoldenEntry } from "../types/GoldenEntry.js";
import { ModelCallMetrics } from "../pipeline/run-filter.js";

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

export interface PromptCompareDetail {
    variantName: string;
    accuracy: number;
    passF1: number;
    failF1: number;
    potentialMatchF1: number;
    correct: number;
    total: number;
    comparison: GoldenComparisonResult;
    heuristics: HeuristicResult[];
    aiOutputJobs: string[];
    metrics: ModelCallMetrics;
}

export interface PromptCompareReportArgs {
    modelKey: string;
    modelName: string;
    variants: PromptCompareDetail[];
    goldenDataset: GoldenEntry[];
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
            modelConfig: { model: m.modelName, temperature: 0.2, think: false, num_ctx: 0 },
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

export function writePromptCompareReport(args: PromptCompareReportArgs): string {
    const dir = ensureEvalResultsDir();
    const ts = formatTimestamp();
    const siteSuffix = args.site ? `_site-${args.site}` : "";
    const filename = `${ts}_prompt-compare_${args.modelKey}${siteSuffix}.md`;
    const filepath = join(dir, filename);

    const sorted = [...args.variants].sort((a, b) => b.passF1 - a.passF1);

    // Rankings table with timing/token columns
    const rankings: string[] = [
        "| Rank | Prompt | PASS F1 | FAIL F1 | P.M. F1 | Accuracy | Correct | Time (s) | Out Tok |",
        "|------|--------|---------|---------|---------|----------|---------|----------|---------|",
    ];
    for (let i = 0; i < sorted.length; i++) {
        const v = sorted[i];
        const medal = medalForIndex(i);
        const time = (v.metrics.totalDurationMs / 1_000).toFixed(1);
        const label = v.variantName === "filter" ? "filter (base)" : v.variantName;
        rankings.push(
            `| ${medal} | ${label} | ${(v.passF1 * 100).toFixed(1)}% | ${(v.failF1 * 100).toFixed(1)}% | ${(v.potentialMatchF1 * 100).toFixed(1)}% | ${(v.accuracy * 100).toFixed(1)}% | ${v.correct}/${v.total} | ${time} | ${v.metrics.outputTokens} |`,
        );
    }

    // Timing/token summary table
    const timingRows = sorted.map((v) => {
        const label = v.variantName === "filter" ? "filter (base)" : v.variantName;
        return [
            `| ${label} |`,
            ` ${(v.metrics.promptEvalDurationMs / 1_000_000_000).toFixed(1)}s |`,
            ` ${(v.metrics.evalDurationMs / 1_000_000_000).toFixed(1)}s |`,
            ` ${(v.metrics.totalDurationMs / 1_000).toFixed(1)}s |`,
            ` ${v.metrics.inputTokens} |`,
            ` ${v.metrics.outputTokens} |`,
        ].join("");
    });
    const timingSection = [
        "## Timing / Token Summary",
        "",
        "| Prompt | P.Eval (s) | Eval (s) | Total (s) | In Tok | Out Tok |",
        "|--------|-----------|----------|-----------|--------|---------|",
        ...timingRows,
    ].join("\n");

    // Per-variant details
    const perVariantSections: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
        const v = sorted[i];
        const label = v.variantName === "filter" ? "filter (base)" : v.variantName;
        const metricsBlock = [
            `**Timing:** ${(v.metrics.totalDurationMs / 1_000).toFixed(1)}s total |`,
            `P.Eval ${(v.metrics.promptEvalDurationMs / 1_000_000_000).toFixed(1)}s |`,
            `Eval ${(v.metrics.evalDurationMs / 1_000_000_000).toFixed(1)}s`,
        ].join(" ");
        const tokensBlock = `**Tokens:** ${v.metrics.inputTokens} in / ${v.metrics.outputTokens} out`;

        const section = [
            `### ${medalForIndex(i)} ${label} (PASS F1: ${(v.passF1 * 100).toFixed(1)}%, Accuracy: ${(v.accuracy * 100).toFixed(1)}%)`,
            "",
            metricsBlock,
            "",
            tokensBlock,
            "",
            "#### Per-Class Metrics",
            "",
            renderClassMetricsTable(v.comparison.classMetrics),
            "",
            "#### Structural Heuristics",
            "",
            renderHeuristics(v.heuristics),
            "",
            "#### Per-Job Breakdown",
            "",
            renderPerJobBreakdown(v.comparison),
        ].join("\n");
        perVariantSections.push(section);
        if (i < sorted.length - 1) {
            perVariantSections.push("", "---", "");
        }
    }

    // Prompt disagreements
    const disagreements = renderPromptDisagreements(sorted, args.goldenDataset);

    const content = [
        `# Prompt Comparison: ${args.modelKey}`,
        "",
        `**Date:** ${formatTimestampReadable()} | **Model:** ${args.modelName} | **Jobs:** ${args.goldenDataset.length}`,
        `**Site:** ${args.site ?? "combined"} | **Variants:** ${args.variants.length} (baseline + ${args.variants.length - 1} custom)`,
        "",
        "## Rankings (by PASS F1)",
        "",
        rankings.join("\n"),
        "",
        timingSection,
        "",
        "## Per-Variant Details",
        "",
        perVariantSections.join("\n"),
        "",
        "## Prompt Disagreements",
        "",
        disagreements,
    ].join("\n") + "\n";

    writeFileSync(filepath, content, "utf-8");
    return filepath;
}

function medalForIndex(i: number): string {
    return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
}

function renderPromptDisagreements(
    sortedVariants: PromptCompareDetail[],
    goldenDataset: GoldenEntry[],
): string {
    if (sortedVariants.length < 2) return "Need at least 2 variants to show disagreements.";

    const disagreementRows: string[] = [];
    for (let i = 0; i < goldenDataset.length; i++) {
        const statuses = sortedVariants.map((v) => v.comparison.perJob[i]?.actualStatus);
        const uniqueStatuses = new Set(statuses);
        if (uniqueStatuses.size <= 1) continue;

        const job = goldenDataset[i];
        const expected = sortedVariants[0].comparison.perJob[i]?.expectedStatus ?? "?";
        const variantCells = sortedVariants.map((v) => v.comparison.perJob[i]?.actualStatus ?? "?");
        disagreementRows.push(
            `| #${i + 1} ${job.job.jobTitle} | ${expected} | ${variantCells.join(" | ")} |`,
        );
    }

    if (disagreementRows.length === 0) {
        return "No disagreements — all prompts produced identical results ✅";
    }

    const header = sortedVariants.map((v) => v.variantName).join(" | ");
    const separator = "|" + sortedVariants.map(() => "---|").join("");
    return [
        `| Job | Expected | ${header} |`,
        `|-----|----------|${separator}`,
        ...disagreementRows,
    ].join("\n");
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
