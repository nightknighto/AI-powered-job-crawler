import { exec } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { Marked } from "marked";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { ReportContext, Reporter } from "./types.js";
import { splitByStatus, sortByDate } from "./report-helpers.js";

/** Generates a styled HTML report with full-width tables, auto-opens in the default browser.
 * Saved to `reports/YYYY-MM-DD_HH-MM-SS.html`.
 */
export class HtmlReporter implements Reporter {
    async display(jobs: EvaluatedJob<BaseJob>[], summary: string, ctx: ReportContext): Promise<void> {
        const timestamp = ctx.timestamp.toISOString().replace(/[T:]/g, "-").slice(0, 19);
        const filename = `${timestamp}.html`;
        const dir = "reports";
        const filePath = join(dir, filename);

        mkdirSync(dir, { recursive: true });

        const html = this.buildHtml(jobs, summary, ctx);
        writeFileSync(filePath, html, "utf-8");

        ctx.outputFiles.push(filePath);
        console.log(`📄 HTML report saved to ${filePath}`);

        this.openInBrowser(filePath);
    }

    private buildHtml(jobs: EvaluatedJob<BaseJob>[], summary: string, ctx: ReportContext): string {
        const { passing, failing } = splitByStatus(jobs);
        const passingSorted = sortByDate(passing);
        const failingSorted = sortByDate(failing);

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Job Search Report — ${ctx.timestamp.toLocaleDateString()}</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #f8f9fa; color: #212529; max-width: 1400px; margin: 0 auto; }
  h1 { margin-bottom: 8px; }
  .meta { color: #6c757d; margin-bottom: 32px; }
  h2 { margin: 32px 0 16px; }
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  th { background: #343a40; color: white; text-align: left; padding: 12px 16px; font-weight: 600; }
  td { padding: 10px 16px; border-bottom: 1px solid #dee2e6; vertical-align: top; word-wrap: break-word; }
  tr:nth-child(even) td { background: #f8f9fa; }
  tr:hover td { background: #e9ecef; }
  a { color: #0d6efd; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .pass { color: #198754; }
  .fail { color: #dc3545; }
  details { margin: 24px 0; }
  summary { cursor: pointer; font-size: 1.25em; font-weight: 600; padding: 8px 0; }
  .summary-section { background: white; padding: 24px; border-radius: 8px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); line-height: 1.7; }
  .counts { display: flex; gap: 24px; margin-bottom: 24px; }
  .count-box { background: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .count-box .number { font-size: 2em; font-weight: 700; }
  .count-box .label { color: #6c757d; }
</style>
</head>
<body>
<h1>Job Search Report</h1>
<p class="meta">${ctx.timestamp.toLocaleString()} · Model: ${ctx.model} · Site: ${ctx.site.name}</p>

<div class="counts">
  <div class="count-box"><div class="number pass">${passing.length}</div><div class="label">Passing</div></div>
  <div class="count-box"><div class="number fail">${failing.length}</div><div class="label">Filtered</div></div>
  <div class="count-box"><div class="number">${jobs.length}</div><div class="label">Total</div></div>
</div>

<h2 class="pass">✅ Passing Jobs (including Potential Matches)</h2>
<table>
<thead><tr><th>Job Title</th><th>Company</th><th>Location</th><th>Posted Date</th><th>Experience</th><th>Skills</th><th>Reason</th></tr></thead>
<tbody>
${passingSorted.map((j) => this.tableRow(j)).join("\n")}
</tbody>
</table>

<details>
<summary class="fail">❌ Filtered Out Jobs (${failing.length})</summary>
<table>
<thead><tr><th>Job Title</th><th>Company</th><th>Location</th><th>Posted Date</th><th>Experience</th><th>Skills</th><th>Reason</th></tr></thead>
<tbody>
${failingSorted.map((j) => this.tableRow(j)).join("\n")}
</tbody>
</table>
</details>

${summary ? `<h2>📝 Detailed Summary</h2><div class="summary-section">${new Marked().parse(summary)}</div>` : ""}
</body>
</html>`;
    }

    private tableRow(job: EvaluatedJob<BaseJob>): string {
        const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, " ").trim();
        const experience = job.experienceLevel ?? "N/A";
        const skills = job.skills?.join(", ") ?? "N/A";
        const reason = job.reason.join("; ");
        const title = `<a href="${esc(job.job.jobURL)}" target="_blank">${esc(job.job.jobTitle)}</a>`;

        return `<tr><td>${title}</td><td>${esc(job.job.company)}</td><td>${esc(job.job.location)}</td><td>${esc(job.job.date)}</td><td>${esc(experience)}</td><td>${esc(skills)}</td><td>${esc(reason)}</td></tr>`;
    }

    private escapeHtml(s: string): string {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    private openInBrowser(filePath: string): void {
        const absolutePath = join(process.cwd(), filePath);
        const command =
            process.platform === "win32" ? `start "chrome" "${absolutePath}"` :
                process.platform === "darwin" ? `open "${absolutePath}"` :
                    `xdg-open "${absolutePath}"`;

        exec(command, (err) => {
            if (err) console.warn(`Could not open browser: ${err.message}`);
        });
    }
}
