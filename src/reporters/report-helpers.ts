import { BaseJob } from "../types/base.js";
import { EvaluatedJob, JobStatus } from "../types/evaluated-job.js";

/** Parse a relative date string into a numeric value (in days) for sorting.
 * Returns Infinity for unparseable dates (sorts to end).
 * Handles English ("posted 2 days ago") and Arabic ("تم النشر منذ 3 days") patterns.
 */
export function parseRelativeDate(dateStr: string): number {
    const str = dateStr.toLowerCase().trim();

    // Arabic pattern: "تم النشر منذ X days/hours/minutes"
    const arabicMatch = str.match(/منذ\s+(\d+)\s*(?:days?|أيام?)/);
    if (arabicMatch) return Number(arabicMatch[1]);

    // English patterns
    const dayMatch = str.match(/(\d+)\s*days?\s*ago/);
    if (dayMatch) return Number(dayMatch[1]);

    const hourMatch = str.match(/(\d+)\s*hours?\s*ago/);
    if (hourMatch) return Number(hourMatch[1]) / 24;

    const minuteMatch = str.match(/(\d+)\s*minutes?\s*ago/);
    if (minuteMatch) return Number(minuteMatch[1]) / 1440;

    // "posted today" => estimate to 8 hours ago
    if (str.includes("today")) return 8 / 24;

    // "few hours ago" => estimate to 3 hours ago
    if (str.includes("few hours ago")) return 3 / 24;

    // "a few minutes ago" => estimate to 5 minutes ago
    if (str.includes("few minutes ago")) return 5 / 1440;

    // "posted just now" or similar
    if (str.includes("just now") || str.includes("moment ago")) return 0;


    return Infinity;
}

/** Split evaluated jobs into passing and failing groups. */
export function splitByStatus<T extends BaseJob>(jobs: EvaluatedJob<T>[]) {
    const passing = jobs.filter((j) => j.status === "PASS" || j.status === "POTENTIAL_MATCH");
    const failing = jobs.filter((j) => j.status === "FAIL");
    return { passing, failing };
}

/** Sort jobs by date (newest first = smallest relative value first). */
export function sortByDate<T extends BaseJob>(jobs: EvaluatedJob<T>[]): EvaluatedJob<T>[] {
    return [...jobs].sort((a, b) => parseRelativeDate(a.job.date) - parseRelativeDate(b.job.date));
}

/** Sort jobs newest-date-first, with new jobs (in `newUrls`) promoted to the top.
 * When `newUrls` is undefined/empty, behaves identically to {@link sortByDate}. */
export function sortByNewThenDate<T extends BaseJob>(
    jobs: EvaluatedJob<T>[],
    newUrls?: Set<string>,
): EvaluatedJob<T>[] {
    if (!newUrls || newUrls.size === 0) return sortByDate(jobs);
    return [...jobs].sort((a, b) => {
        const aNew = newUrls.has(a.job.jobURL) ? 0 : 1;
        const bNew = newUrls.has(b.job.jobURL) ? 0 : 1;
        if (aNew !== bNew) return aNew - bNew;
        return parseRelativeDate(a.job.date) - parseRelativeDate(b.job.date);
    });
}

/** Escape pipe characters in a string for safe use in markdown tables. */
function esc(str: string): string {
    return str.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

/** Build a markdown table row for a single job. Prepends a 🆕 badge to the title
 * when the job's URL is in `newUrls` (newly evaluated or dropped this run). */
function tableRow<T extends BaseJob>(job: EvaluatedJob<T>, newUrls?: Set<string>): string {
    const titlePrefix = newUrls?.has(job.job.jobURL) ? "🆕 " : "";
    const experience = job.experienceLevel ?? "N/A";
    const skills = job.skills?.join(", ") ?? "N/A";
    const reason = job.reason.join("; ");

    return `| ${esc(job.job.site)} | ${titlePrefix}${esc(job.job.jobTitle)} | ${esc(job.job.company)} | ${esc(job.job.location)} | ${esc(job.job.date)} | ${esc(experience)} | ${esc(skills)} | ${esc(reason)} |`;
}

/** Build the deterministic report section: two tables + summary counts.
 * No LLM calls — pure data formatting.
 *
 * @param jobs     - All evaluated jobs (new + cached).
 * @param newUrls  - URLs of jobs newly evaluated or dropped this run. Drives the 🆕 badge and new-to-top sort.
 *                   When omitted, no badges render and sort falls back to date-only.
 * @param onlyNew  - When true, table bodies show only new jobs. Count boxes always reflect the full set.
 */
export function buildReportTables<T extends BaseJob>(
    jobs: EvaluatedJob<T>[],
    newUrls?: Set<string>,
    onlyNew?: boolean,
): string {
    const { passing, failing } = splitByStatus(jobs);
    // Counts always reflect the FULL split, even under `--only-new`.
    const totalPassing = passing.length;
    const totalFailing = failing.length;

    const showPassing = onlyNew ? passing.filter((j) => newUrls?.has(j.job.jobURL)) : passing;
    const showFailing = onlyNew ? failing.filter((j) => newUrls?.has(j.job.jobURL)) : failing;

    const passingSorted = sortByNewThenDate(showPassing, newUrls);
    const failingSorted = sortByNewThenDate(showFailing, newUrls);

    const header =
        "| Site | Job Title | Company | Location | Posted Date | Experience | Skills | Reason |\n" +
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |";
    const emptyRow = "|  | _No new jobs in this group._ |  |  |  |  |  |  |";

    const passingTable =
        `## ✅ Passing Jobs (including Potential Matches)\n\n` +
        (onlyNew ? `> Showing ${showPassing.length} new of ${totalPassing} total.\n\n` : "") +
        header + "\n" +
        (passingSorted.length > 0
            ? passingSorted.map((j) => tableRow(j, newUrls)).join("\n")
            : emptyRow);

    const failingTable =
        `## ❌ Filtered Out Jobs\n\n` +
        (onlyNew ? `> Showing ${showFailing.length} new of ${totalFailing} total.\n\n` : "") +
        header + "\n" +
        (failingSorted.length > 0
            ? failingSorted.map((j) => tableRow(j, newUrls)).join("\n")
            : emptyRow);

    const summary =
        `## Final Summary\n\n` +
        `- Total searched: ${jobs.length}\n` +
        `- Matched after review: ${totalPassing} (PASS + POTENTIAL_MATCH)\n` +
        `- Filtered out: ${totalFailing} (FAIL)`;

    return `${passingTable}\n\n${failingTable}\n\n${summary}`;
}

/** Build a markdown section listing jobs the LLM dropped from its filter output.
 * Returns an empty string when there are no dropped jobs (so callers can append unconditionally).
 * @param droppedJobs - Dropped jobs with their origin site, URL, and title.
 */
export function buildDroppedJobsSection(
    droppedJobs: { site: string; jobURL: string; jobTitle: string }[] | undefined,
): string {
    if (!droppedJobs || droppedJobs.length === 0) return "";

    const header =
        "| Site | Job Title | URL |\n" +
        "| :--- | :--- | :--- |";
    const rows = droppedJobs
        .map((d) => `| ${esc(d.site)} | ${esc(d.jobTitle)} | ${esc(d.jobURL)} |`)
        .join("\n");

    return `## 🫥 Dropped by LLM (${droppedJobs.length})\n\nThese input jobs received no verdict from the LLM and are absent from the tables above.\n\n${header}\n${rows}`;
}
