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

/** Escape pipe characters in a string for safe use in markdown tables. */
function esc(str: string): string {
    return str.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

/** Build a markdown table row for a single job. */
function tableRow<T extends BaseJob>(job: EvaluatedJob<T>): string {
    const experience = job.experienceLevel ?? "N/A";
    const skills = job.skills?.join(", ") ?? "N/A";
    const reason = job.reason.join("; ");

    return `| ${esc(job.job.jobTitle)} | ${esc(job.job.company)} | ${esc(job.job.location)} | ${esc(job.job.date)} | ${esc(experience)} | ${esc(skills)} | ${esc(reason)} |`;
}

/** Build the deterministic report section: two tables + summary counts.
 * No LLM calls — pure data formatting.
 */
export function buildReportTables<T extends BaseJob>(jobs: EvaluatedJob<T>[]): string {
    const { passing, failing } = splitByStatus(jobs);
    const passingSorted = sortByDate(passing);
    const failingSorted = sortByDate(failing);

    const header =
        "| Job Title | Company | Location | Posted Date | Experience | Skills | Reason |\n" +
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |";

    const passingTable =
        `## ✅ Passing Jobs (including Potential Matches)\n\n` +
        header + "\n" +
        passingSorted.map(tableRow).join("\n");

    const failingTable =
        `## ❌ Filtered Out Jobs\n\n` +
        header + "\n" +
        failingSorted.map(tableRow).join("\n");

    const summary =
        `## Final Summary\n\n` +
        `- Total searched: ${jobs.length}\n` +
        `- Matched after review: ${passing.length} (PASS + POTENTIAL_MATCH)\n` +
        `- Filtered out: ${failing.length} (FAIL)`;

    return `${passingTable}\n\n${failingTable}\n\n${summary}`;
}
