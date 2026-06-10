import { BaseJob } from "../types/base.js";
import { EvaluatedJob, JobStatus } from "../types/evaluated-job.js";
import { GoldenEntry } from "../sites/wuzzuf/evals/golden-dataset.js";

/** Result of comparing a single golden-dataset job against AI output. */
export interface PerJobResult {
    /** 1-based index matching the golden dataset comment numbering (e.g. #1, #2...) */
    jobIndex: number;
    jobTitle: string;
    jobURL: string;
    expectedStatus: JobStatus;
    actualStatus: JobStatus;
    statusMatch: boolean;
    /** Whether the AI output did not include this job at all (silently dropped). */
    dropped: boolean;
    expectedKeywords: string[];
    matchedKeywords: string[];
    unmatchedKeywords: string[];
    reasonText: string;
}

/** Precision, recall, F1, and support for a single status class. */
export interface ClassMetrics {
    precision: number;
    recall: number;
    f1: number;
    support: number;
}

/** Full comparison result including per-job details, overall accuracy, and per-class metrics. */
export interface GoldenComparisonResult {
    perJob: PerJobResult[];
    overallAccuracy: number;
    classMetrics: Record<JobStatus, ClassMetrics>;
    summary: {
        total: number;
        correct: number;
        byStatus: Record<string, { expected: number; predicted: number }>;
    };
}

/** Compare golden dataset labels against AI evaluation output.
 * Matches jobs by URL, then checks status match + reason keyword coverage.
 * @template T - The site-specific job type.
 * @param dataset - Hand-labeled golden dataset entries.
 * @param aiOutput - Evaluated jobs from the LLM pipeline.
 * @returns Full comparison result with per-job and aggregate metrics.
 */
export function compareGolden<T extends BaseJob>(
    dataset: GoldenEntry[],
    aiOutput: EvaluatedJob<T>[],
): GoldenComparisonResult {
    // Build lookup by URL
    const aiByUrl = new Map<string, EvaluatedJob<T>>();
    for (const entry of aiOutput) {
        aiByUrl.set(entry.job.jobURL, entry);
    }

    const perJob: PerJobResult[] = [];
    const statusConfusion: Record<string, Record<string, number>> = {};

    for (let i = 0; i < dataset.length; i++) {
        const golden = dataset[i];
        const aiEntry = aiByUrl.get(golden.job.jobURL);

        const actualStatus: JobStatus = aiEntry?.status ?? "FAIL";
        const reasonText = aiEntry?.reason?.join(" ").toLowerCase() ?? "";
        const expectedStatus = golden.expectedStatus;

        // A dropped job is always a mismatch — the AI didn't evaluate it at all
        const dropped = !aiEntry;

        // Check keyword coverage
        const matchedKeywords: string[] = [];
        const unmatchedKeywords: string[] = [];

        for (const keyword of golden.expectedReasonKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (reasonText.includes(keywordLower)) {
                matchedKeywords.push(keyword);
            } else {
                unmatchedKeywords.push(keyword);
            }
        }

        perJob.push({
            jobIndex: i + 1,
            jobTitle: golden.job.jobTitle,
            jobURL: golden.job.jobURL,
            expectedStatus,
            actualStatus,
            statusMatch: !dropped && expectedStatus === actualStatus,
            dropped,
            expectedKeywords: golden.expectedReasonKeywords,
            matchedKeywords,
            unmatchedKeywords,
            reasonText,
        });

        // Track confusion matrix
        if (!statusConfusion[expectedStatus]) statusConfusion[expectedStatus] = {};
        statusConfusion[expectedStatus][actualStatus] = (statusConfusion[expectedStatus][actualStatus] ?? 0) + 1;
    }

    // Compute metrics
    const correct = perJob.filter((r) => r.statusMatch).length;
    const allStatuses: JobStatus[] = ["PASS", "FAIL", "POTENTIAL_MATCH"];

    const classMetrics: Record<string, ClassMetrics> = {};
    const byStatus: Record<string, { expected: number; predicted: number }> = {};

    for (const status of allStatuses) {
        const tp = statusConfusion[status]?.[status] ?? 0;
        const fp = perJob.filter((r) => r.actualStatus === status && r.expectedStatus !== status).length;
        const fn = perJob.filter((r) => r.expectedStatus === status && r.actualStatus !== status).length;
        const support = perJob.filter((r) => r.expectedStatus === status).length;

        const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
        const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
        const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

        classMetrics[status] = { precision, recall, f1, support };
        byStatus[status] = {
            expected: support,
            predicted: perJob.filter((r) => r.actualStatus === status).length,
        };
    }

    return {
        perJob,
        overallAccuracy: correct / perJob.length,
        classMetrics: classMetrics as Record<JobStatus, ClassMetrics>,
        summary: { total: perJob.length, correct, byStatus },
    };
}

/**
 * Pretty-print the golden comparison results.
 */
export function printGoldenResults(result: GoldenComparisonResult): void {
    console.log("\n═══════════════════════════════════════════════════");
    console.log("  GOLDEN DATASET EVALUATION RESULTS");
    console.log("═══════════════════════════════════════════════════\n");

    // Per-job results
    console.log("── Per-Job Results ──\n");
    for (const job of result.perJob) {
        const statusIcon = job.statusMatch ? "✅" : "❌";
        const droppedTag = job.dropped ? " [DROPPED]" : "";
        const actualDisplay = job.dropped ? "[DROPPED]" : job.actualStatus;
        console.log(`${statusIcon} #${job.jobIndex} ${job.jobTitle}${droppedTag}`);
        console.log(`   Expected: ${job.expectedStatus} | Got: ${actualDisplay}`);

        if (job.dropped) {
            console.log(`   ⚠️  Job was not returned by the AI`);
        }
        if (job.unmatchedKeywords.length > 0) {
            console.log(`   ⚠️  Unmatched keywords: ${job.unmatchedKeywords.join(", ")}`);
        }
        if (job.matchedKeywords.length > 0) {
            console.log(`   ✓  Matched keywords: ${job.matchedKeywords.join(", ")}`);
        }
        console.log();
    }

    // Overall accuracy
    console.log("── Overall Accuracy ──\n");
    console.log(`  ${result.summary.correct}/${result.summary.total} = ${(result.overallAccuracy * 100).toFixed(1)}%\n`);

    // Per-class metrics
    console.log("── Per-Class Metrics ──\n");
    console.log("  Status            Precision  Recall    F1        Support");
    console.log("  ─────────────────────────────────────────────────────────");
    for (const [status, metrics] of Object.entries(result.classMetrics)) {
        console.log(
            `  ${status.padEnd(18)} ${(metrics.precision * 100).toFixed(1).padStart(5)}%    ${(metrics.recall * 100).toFixed(1).padStart(5)}%    ${(metrics.f1 * 100).toFixed(1).padStart(5)}%    ${metrics.support}`,
        );
    }

    // Keyword coverage
    const totalKeywords = result.perJob.reduce((sum, j) => sum + j.expectedKeywords.length, 0);
    const matchedKwCount = result.perJob.reduce((sum, j) => sum + j.matchedKeywords.length, 0);
    console.log(`\n── Reason Keyword Coverage ──\n`);
    console.log(`  ${matchedKwCount}/${totalKeywords} keywords matched = ${((matchedKwCount / totalKeywords) * 100).toFixed(1)}%\n`);
}
