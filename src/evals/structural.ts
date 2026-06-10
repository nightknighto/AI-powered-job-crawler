import { BaseJob } from "../types/base.js";
import { EvaluatedJob, JobStatus } from "../types/evaluated-job.js";

/** Result of a single structural heuristic check. */
export interface HeuristicResult {
    rule: string;
    passed: boolean;
    details: string;
}

/** Title keywords that should cause a FAIL (unless the prompt's 2-3yr exception applies) */
const SENIOR_TITLE_KEYWORDS = ["senior", "lead", "manager", "head of", "director", "principal", "staff"];
const INTERNSHIP_KEYWORDS = ["intern", "internship"];

/**
 * Check that every input job URL appears in the evaluated output.
 * The AI should never silently drop jobs.
 */
export function checkNoDroppedJobs<T extends BaseJob>(
    input: T[],
    output: EvaluatedJob<T>[],
): HeuristicResult {
    const outputUrls = new Set(output.map((e) => e.job.jobURL));
    const dropped = input.filter((j) => !outputUrls.has(j.jobURL));

    return {
        rule: "No dropped jobs",
        passed: dropped.length === 0,
        details: dropped.length === 0
            ? `All ${input.length} jobs accounted for`
            : `Missing ${dropped.length} jobs: ${dropped.map((j) => j.jobTitle).join(", ")}`,
    };
}

/**
 * Check that every evaluated job has a valid status.
 */
export function checkValidStatuses<T extends BaseJob>(
    output: EvaluatedJob<T>[],
): HeuristicResult {
    const validStatuses = new Set<string>(["PASS", "FAIL", "POTENTIAL_MATCH"]);
    const invalid = output.filter((e) => !validStatuses.has(e.status));

    return {
        rule: "Valid statuses",
        passed: invalid.length === 0,
        details: invalid.length === 0
            ? `All ${output.length} jobs have valid statuses`
            : `${invalid.length} jobs with invalid status: ${invalid.map((e) => `${e.job.jobTitle}=${e.status}`).join(", ")}`,
    };
}

/**
 * Check that every evaluated job has at least one reason.
 */
export function checkNonEmptyReasons<T extends BaseJob>(
    output: EvaluatedJob<T>[],
): HeuristicResult {
    const empty = output.filter((e) => !e.reason || e.reason.length === 0);

    return {
        rule: "Non-empty reasons",
        passed: empty.length === 0,
        details: empty.length === 0
            ? "All jobs have at least one reason"
            : `${empty.length} jobs with no reasons: ${empty.map((e) => e.job.jobTitle).join(", ")}`,
    };
}

/**
 * Check that PASS/POTENTIAL_MATCH jobs don't contain senior-level keywords in their title.
 * This catches cases where the AI approved a job it should have rejected by title alone.
 */
export function checkTitleFilterConsistency<T extends BaseJob>(
    output: EvaluatedJob<T>[],
): HeuristicResult {
    const violations: string[] = [];

    for (const entry of output) {
        if (entry.status === "FAIL") continue;

        const titleLower = entry.job.jobTitle.toLowerCase();
        const matchedKeyword = SENIOR_TITLE_KEYWORDS.find((kw) => titleLower.includes(kw));
        if (matchedKeyword) {
            violations.push(`${entry.job.jobTitle} (contains "${matchedKeyword}")`);
        }
    }

    return {
        rule: "Title filter consistency",
        passed: violations.length === 0,
        details: violations.length === 0
            ? "No senior/lead keywords found in PASS/POTENTIAL_MATCH titles"
            : `${violations.length} suspicious approvals: ${violations.join("; ")}`,
    };
}

/**
 * Check that PASS/POTENTIAL_MATCH jobs don't look like internships.
 */
export function checkInternshipFilterConsistency<T extends BaseJob>(
    output: EvaluatedJob<T>[],
): HeuristicResult {
    const violations: string[] = [];

    for (const entry of output) {
        if (entry.status === "FAIL") continue;

        const titleLower = entry.job.jobTitle.toLowerCase();
        const matchedKeyword = INTERNSHIP_KEYWORDS.find((kw) => titleLower.includes(kw));
        if (matchedKeyword) {
            violations.push(`${entry.job.jobTitle} (contains "${matchedKeyword}")`);
        }
    }

    return {
        rule: "Internship filter consistency",
        passed: violations.length === 0,
        details: violations.length === 0
            ? "No internship keywords found in PASS/POTENTIAL_MATCH titles"
            : `${violations.length} suspicious approvals: ${violations.join("; ")}`,
    };
}

/**
 * Check that required job fields aren't empty or "N/A".
 */
export function checkNoEmptyFields<T extends BaseJob>(
    output: EvaluatedJob<T>[],
): HeuristicResult {
    const emptyFields: string[] = [];

    for (const entry of output) {
        if (!entry.job.jobTitle || entry.job.jobTitle.trim() === "") {
            emptyFields.push(`${entry.job.jobURL}: empty jobTitle`);
        }
        if (!entry.job.jobURL || entry.job.jobURL.trim() === "") {
            emptyFields.push(`${entry.job.jobTitle}: empty jobURL`);
        }
        if (!entry.job.jobDetails || entry.job.jobDetails.length === 0) {
            emptyFields.push(`${entry.job.jobTitle}: empty jobDetails`);
        }
    }

    return {
        rule: "No empty required fields",
        passed: emptyFields.length === 0,
        details: emptyFields.length === 0
            ? "All required fields populated"
            : `${emptyFields.length} issues: ${emptyFields.join("; ")}`,
    };
}

/** Run all structural heuristics against the evaluated output.
 * @template T - The site-specific job type.
 * @param input - Raw jobs that were fed into the LLM.
 * @param output - Evaluated jobs returned by the LLM.
 * @returns Array of heuristic results (pass/fail with details).
 */
export function runStructuralHeuristics<T extends BaseJob>(
    input: T[],
    output: EvaluatedJob<T>[],
): HeuristicResult[] {
    return [
        checkNoDroppedJobs(input, output),
        checkValidStatuses(output),
        checkNonEmptyReasons(output),
        checkTitleFilterConsistency(output),
        checkInternshipFilterConsistency(output),
        checkNoEmptyFields(output),
    ];
}

/** Log heuristic results as warnings. Non-blocking — never throws.
 * @param results - Heuristic results to log.
 */
export function logHeuristicResults(results: HeuristicResult[]): void {
    const failures = results.filter((r) => !r.passed);

    if (failures.length === 0) {
        console.log("\n✅ All structural heuristics passed\n");
        return;
    }

    console.log(`\n⚠️  ${failures.length}/${results.length} heuristic(s) failed:`);
    for (const f of failures) {
        console.log(`   ❌ ${f.rule}: ${f.details}`);
    }
    console.log();
}
