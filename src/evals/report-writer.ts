import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ModelConfig } from "../config.js";
import { GoldenComparisonResult } from "./golden.js";
import { HeuristicResult } from "./structural.js";
import { CaseCategory, GoldenEntry } from "../types/GoldenEntry.js";
import { ModelCallMetrics } from "../pipeline/run-filter.js";

const EVAL_RESULTS_DIR = "eval-results";

export interface EvalReportArgs {
    modelKey: string;
    modelConfig: ModelConfig;
    comparison: GoldenComparisonResult;
    heuristics: HeuristicResult[];
    goldenDataset: GoldenEntry[];
    /** Category scope when the run was filtered via `--category <name>`. */
    category?: CaseCategory;
    /** Case IDs when the run was cherry-picked via `--cases id1,id2`. */
    cases?: string[];
}

export interface CompareModelDetail {
    modelKey: string;
    modelName: string;
    accuracy: number;
    correct: number;
    total: number;
    comparison: GoldenComparisonResult;
    heuristics: HeuristicResult[];
    aiOutputJobs: string[];
}

export interface CompareReportArgs {
    models: CompareModelDetail[];
    goldenDataset: GoldenEntry[];
    category?: CaseCategory;
    cases?: string[];
}

export interface PromptCompareDetail {
    variantName: string;
    accuracy: number;
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
    category?: CaseCategory;
    cases?: string[];
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

/** Human-readable label for the dataset scope, e.g. "category: experience". */
function scopeLabel(args: { category?: CaseCategory; cases?: string[] }): string {
    if (args.cases && args.cases.length > 0) return `cases: ${args.cases.join(", ")}`;
    if (args.category) return `category: ${args.category}`;
    return "all categories";
}

/** Filename suffix for the dataset scope. */
function scopeSuffix(args: { category?: CaseCategory; cases?: string[] }): string {
    if (args.cases && args.cases.length > 0) return `_cases-${args.cases.length}`;
    if (args.category) return `_category-${args.category}`;
    return "";
}

function renderCategoryAccuracyTable(categoryMetrics: GoldenComparisonResult["categoryMetrics"]): string {
    const lines: string[] = [
        "| Category | Accuracy | Correct/Total |",
        "|----------|----------|---------------|",
    ];
    for (const [category, m] of Object.entries(categoryMetrics)) {
        if (m.total === 0) continue;
        lines.push(`| ${category} | ${(m.accuracy * 100).toFixed(1)}% | ${m.correct}/${m.total} |`);
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

function renderPerCaseBreakdown(comparison: GoldenComparisonResult): string {
    const lines: string[] = [];
    for (const job of comparison.perJob) {
        const icon = job.statusMatch ? "✅" : "❌";
        const realTag = job.real ? "" : " [SYNTHETIC]";
        const droppedTag = job.dropped ? " **[DROPPED]**" : "";
        const actualDisplay = job.dropped ? "**[DROPPED]**" : job.actualStatus;
        lines.push(`### ${icon} \`${job.id}\`${realTag}${droppedTag}: ${job.jobTitle}`);
        lines.push("");
        lines.push(`- **Category:** ${job.category}`);
        lines.push(`- **Expected:** ${job.expectedStatus} | **Got:** ${actualDisplay}`);
        if (job.dropped) {
            lines.push(`- **⚠️ Job was not returned by the model**`);
        }
        lines.push(`- **Isolates:** ${job.isolationNote}`);
        if (job.reasonText) {
            lines.push(`- **Model reason** *(inspection only — never scored)*: "${job.reasonText}"`);
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
        "#### Per-Category Accuracy",
        "",
        renderCategoryAccuracyTable(comparison.categoryMetrics),
        "",
        "#### Structural Heuristics",
        "",
        renderHeuristics(heuristics),
        "",
        "#### Per-Case Breakdown",
        "",
        renderPerCaseBreakdown(comparison),
    ];
    return lines.join("\n");
}

export function writeEvalReport(args: EvalReportArgs): string {
    const dir = ensureEvalResultsDir();
    const ts = formatTimestamp();
    const filename = `${ts}_${args.modelKey}${scopeSuffix(args)}.md`;
    const filepath = join(dir, filename);

    const threshold = 0.8;
    const passed = args.comparison.overallAccuracy >= threshold;

    const content = [
        `# Eval: ${args.modelKey}`,
        "",
        `**Date:** ${formatTimestampReadable()} | **Model:** ${args.modelConfig.model} | **Temperature:** ${args.modelConfig.temperature}`,
        `**Scope:** ${scopeLabel(args)} (${args.goldenDataset.length} cases)`,
        "",
        "## Summary",
        "",
        `- **Accuracy:** ${(args.comparison.overallAccuracy * 100).toFixed(1)}% (${args.comparison.summary.correct}/${args.comparison.summary.total})`,
        `- **Threshold:** ${(threshold * 100).toFixed(0)}% → ${passed ? "✅ PASS" : "❌ FAIL"}`,
        "",
        "## Per-Category Accuracy",
        "",
        renderCategoryAccuracyTable(args.comparison.categoryMetrics),
        "",
        "## Structural Heuristics",
        "",
        renderHeuristics(args.heuristics),
        "",
        "## Per-Case Breakdown",
        "",
        renderPerCaseBreakdown(args.comparison),
    ].join("\n") + "\n";

    writeFileSync(filepath, content, "utf-8");
    return filepath;
}

export function writeCompareReport(args: CompareReportArgs): string {
    const dir = ensureEvalResultsDir();
    const ts = formatTimestamp();
    const filename = `${ts}_compare${scopeSuffix(args)}.md`;
    const filepath = join(dir, filename);

    // Rank by overall accuracy (primary metric)
    const sorted = [...args.models].sort((a, b) => b.accuracy - a.accuracy);

    // Rankings table
    const rankings: string[] = [
        "| Rank | Model | Accuracy | Correct |",
        "|------|-------|----------|---------|",
    ];
    for (let i = 0; i < sorted.length; i++) {
        const m = sorted[i];
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
        rankings.push(`| ${medal} | ${m.modelKey} | ${(m.accuracy * 100).toFixed(1)}% | ${m.correct}/${m.total} |`);
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
        `**Date:** ${formatTimestampReadable()} | **Models:** ${args.models.length} | **Cases:** ${args.goldenDataset.length}`,
        `**Scope:** ${scopeLabel(args)}`,
        "",
        "## Rankings (by Accuracy)",
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
    const filename = `${ts}_prompt-compare_${args.modelKey}${scopeSuffix(args)}.md`;
    const filepath = join(dir, filename);

    // Rank by overall accuracy
    const sorted = [...args.variants].sort((a, b) => b.accuracy - a.accuracy);

    // Rankings table with timing/token columns
    const rankings: string[] = [
        "| Rank | Prompt | Accuracy | Correct | Time (s) | Out Tok |",
        "|------|--------|----------|---------|----------|---------|",
    ];
    for (let i = 0; i < sorted.length; i++) {
        const v = sorted[i];
        const medal = medalForIndex(i);
        const time = (v.metrics.totalDurationMs / 1_000).toFixed(1);
        const label = v.variantName === "filter" ? "filter (base)" : v.variantName;
        rankings.push(`| ${medal} | ${label} | ${(v.accuracy * 100).toFixed(1)}% | ${v.correct}/${v.total} | ${time} | ${v.metrics.outputTokens} |`);
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
            `### ${medalForIndex(i)} ${label} (Accuracy: ${(v.accuracy * 100).toFixed(1)}%)`,
            "",
            metricsBlock,
            "",
            tokensBlock,
            "",
            "#### Per-Category Accuracy",
            "",
            renderCategoryAccuracyTable(v.comparison.categoryMetrics),
            "",
            "#### Structural Heuristics",
            "",
            renderHeuristics(v.heuristics),
            "",
            "#### Per-Case Breakdown",
            "",
            renderPerCaseBreakdown(v.comparison),
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
        `**Date:** ${formatTimestampReadable()} | **Model:** ${args.modelName} | **Cases:** ${args.goldenDataset.length}`,
        `**Scope:** ${scopeLabel(args)} | **Variants:** ${args.variants.length} (baseline + ${args.variants.length - 1} custom)`,
        "",
        "## Rankings (by Accuracy)",
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
        disagreementRows.push(`| \`${job.id}\` ${job.job.jobTitle} | ${expected} | ${variantCells.join(" | ")} |`);
    }

    if (disagreementRows.length === 0) {
        return "No disagreements — all prompts produced identical results ✅";
    }

    const header = sortedVariants.map((v) => v.variantName).join(" | ");
    const separator = "|" + sortedVariants.map(() => "---|").join("");
    return [
        `| Case | Expected | ${header} |`,
        `|------|----------|${separator}`,
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

        disagreementRows.push(`| \`${job.id}\` ${job.job.jobTitle} | ${expected} | ${modelCells.join(" | ")} |`);
    }

    if (disagreementRows.length === 0) {
        return "No disagreements — all models produced identical results ✅";
    }

    const header = args.models.map((m) => m.modelKey).join(" | ");
    const lines: string[] = [
        `| Case | Expected | ${header} |`,
        `|------|----------|${args.models.map(() => "----------|").join("")}`,
        ...disagreementRows,
    ];
    return lines.join("\n");
}
