import { BaseJob } from "../types/base.js";
import { EvaluatedJob, JobStatus } from "../types/evaluated-job.js";
import { CaseCategory, GoldenEntry } from "../types/GoldenEntry.js";
import { CASE_CATEGORIES } from "./cases/index.js";

/** Result of comparing a single golden-dataset case against AI output. */
export interface PerJobResult {
    /** Signal-descriptive case id (e.g. `exp-threshold-4yr-fail`). */
    id: string;
    /** The filter rule this case isolates. */
    category: CaseCategory;
    jobTitle: string;
    jobURL: string;
    expectedStatus: JobStatus;
    actualStatus: JobStatus;
    statusMatch: boolean;
    /** Whether the AI output did not include this job at all (silently dropped). */
    dropped: boolean;
    /**
     * The model's full reason text (joined). Never scored — kept purely for human
     * inspection when investigating a mismatch.
     */
    reasonText: string;
    /** Why this case exists / what it isolates (from the golden entry). */
    isolationNote: string;
    /** Whether the case was sourced from a real job or is a synthetic gap-filler. */
    real: boolean;
}

/** Accuracy for a single rule category. */
export interface CategoryMetrics {
    correct: number;
    total: number;
    accuracy: number;
}

/**
 * Full comparison result: per-case details, overall accuracy, and per-category
 * accuracy. Per-category accuracy is the centerpiece — it pinpoints which filter
 * rules a model mishandles, in plain English (no F1/precision/recall).
 */
export interface GoldenComparisonResult {
    perJob: PerJobResult[];
    overallAccuracy: number;
    categoryMetrics: Record<CaseCategory, CategoryMetrics>;
    summary: {
        total: number;
        correct: number;
        byStatus: Record<string, { expected: number; predicted: number }>;
    };
}

/**
 * Compare golden-dataset cases against AI evaluation output. Matches cases by
 * URL, checks status correctness, and rolls accuracy up per rule category.
 *
 * Reasons are NEVER keyword-matched or scored — the model's `reason[]` is kept
 * as `reasonText` on each {@link PerJobResult} purely for human inspection. The
 * per-category accuracy already pinpoints which rules a model gets wrong.
 *
 * @param dataset - Golden cases (each tagged with the rule it isolates).
 * @param aiOutput - Evaluated jobs from the LLM pipeline.
 */
export function compareGolden(
    dataset: GoldenEntry[],
    aiOutput: EvaluatedJob<BaseJob>[],
): GoldenComparisonResult {
    // Build lookup by URL
    const aiByUrl = new Map<string, EvaluatedJob<BaseJob>>();
    for (const entry of aiOutput) {
        aiByUrl.set(entry.job.jobURL, entry);
    }

    const perJob: PerJobResult[] = [];

    for (const golden of dataset) {
        const aiEntry = aiByUrl.get(golden.job.jobURL);

        const actualStatus: JobStatus = aiEntry?.status ?? "FAIL";
        const dropped = !aiEntry;
        const reasonText = aiEntry?.reason?.join(" ") ?? "";

        perJob.push({
            id: golden.id,
            category: golden.category,
            jobTitle: golden.job.jobTitle,
            jobURL: golden.job.jobURL,
            expectedStatus: golden.expectedStatus,
            actualStatus,
            statusMatch: !dropped && golden.expectedStatus === actualStatus,
            dropped,
            reasonText,
            isolationNote: golden.isolationNote,
            real: golden.real,
        });
    }

    // Overall accuracy
    const correct = perJob.filter((r) => r.statusMatch).length;
    const overallAccuracy = perJob.length > 0 ? correct / perJob.length : 0;

    // Per-category accuracy
    const categoryMetrics = {} as Record<CaseCategory, CategoryMetrics>;
    for (const category of CASE_CATEGORIES) {
        const inCat = perJob.filter((r) => r.category === category);
        const catCorrect = inCat.filter((r) => r.statusMatch).length;
        categoryMetrics[category] = {
            correct: catCorrect,
            total: inCat.length,
            accuracy: inCat.length > 0 ? catCorrect / inCat.length : 0,
        };
    }

    // by-status tally (diagnostic only)
    const allStatuses: JobStatus[] = ["PASS", "FAIL", "POTENTIAL_MATCH"];
    const byStatus: Record<string, { expected: number; predicted: number }> = {};
    for (const status of allStatuses) {
        byStatus[status] = {
            expected: perJob.filter((r) => r.expectedStatus === status).length,
            predicted: perJob.filter((r) => r.actualStatus === status).length,
        };
    }

    return {
        perJob,
        overallAccuracy,
        categoryMetrics,
        summary: { total: perJob.length, correct, byStatus },
    };
}

/**
 * Pretty-print the golden comparison results.
 *
 * Layout: per-category accuracy table (centerpiece), overall accuracy, then
 * mismatches-only with the case id, isolation note, and the model's reason text
 * (clearly marked as inspection-only — never scored).
 *
 * @param result - The comparison result to print.
 * @param printFailedOnly - When true, only prints cases that mismatched or were dropped.
 */
export function printGoldenResults(result: GoldenComparisonResult, printFailedOnly: boolean = false): void {
    console.log("\n═══════════════════════════════════════════════════");
    console.log("  GOLDEN DATASET EVALUATION RESULTS");
    console.log("═══════════════════════════════════════════════════\n");

    // Per-category accuracy (the centerpiece)
    console.log("── Per-Category Accuracy ──\n");
    console.log("  Category          Accuracy    Correct/Total");
    console.log("  ─────────────────────────────────────────────────");
    for (const [category, metrics] of Object.entries(result.categoryMetrics)) {
        if (metrics.total === 0) continue; // category not in this run
        const pct = (metrics.accuracy * 100).toFixed(1).padStart(5);
        console.log(
            `  ${category.padEnd(18)} ${pct}%      ${metrics.correct}/${metrics.total}`,
        );
    }
    console.log();

    // Overall accuracy
    console.log("── Overall ──\n");
    console.log(`  ${result.summary.correct}/${result.summary.total} = ${(result.overallAccuracy * 100).toFixed(1)}%\n`);

    // Mismatches (with id, isolation note, and model reason for inspection)
    const mismatches = result.perJob.filter((r) => !r.statusMatch);
    if (printFailedOnly && mismatches.length === 0) {
        console.log("── Mismatches ──\n  (none — all cases matched)\n");
        return;
    }
    if (mismatches.length === 0) {
        console.log("── Mismatches ──\n  (none — all cases matched)\n");
        return;
    }

    console.log(`── Mismatches (${mismatches.length}) ──\n`);
    for (const job of mismatches) {
        const realTag = job.real ? "" : " [SYNTHETIC]";
        const droppedTag = job.dropped ? " [DROPPED]" : "";
        const actualDisplay = job.dropped ? "[DROPPED]" : job.actualStatus;
        console.log(`  ❌ ${job.id}${realTag}${droppedTag}  "${job.jobTitle}"`);
        console.log(`     Expected: ${job.expectedStatus} | Got: ${actualDisplay}`);
        if (job.dropped) {
            console.log(`     ⚠️  Job was not returned by the model`);
        }
        console.log(`     isolationNote: ${job.isolationNote}`);
        if (job.reasonText) {
            console.log(`     model reason (inspection only): ${job.reasonText}`);
        }
        console.log();
    }
}
