import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { ReportContext, Reporter } from "./types.js";
import { buildDroppedJobsSection, buildReportTables } from "./report-helpers.js";

/** Writes the full markdown report to a timestamped `.md` file.
 * Uses the same deterministic tables + LLM summary as cli-table renders, plus a "Dropped by LLM"
 * section listing any input jobs the LLM omitted from its output.
 */
export class MarkdownReporter implements Reporter {
    async display(jobs: EvaluatedJob<BaseJob>[], summary: string, ctx: ReportContext): Promise<void> {
        const timestamp = ctx.timestamp.toISOString().replace(/[T:]/g, "-").slice(0, 19);
        const filename = `${ctx.siteName}-${timestamp}.md`;
        const dir = "reports";
        const filePath = join(dir, filename);

        mkdirSync(dir, { recursive: true });

        const tablesMarkdown = buildReportTables(jobs);
        const droppedSection = buildDroppedJobsSection(ctx.droppedJobs);
        const droppedBlock = droppedSection ? `\n\n${droppedSection}` : "";
        const content = `${tablesMarkdown}${droppedBlock}\n\n${summary}`;

        writeFileSync(filePath, content, "utf-8");

        ctx.outputFiles.push(filePath);
        console.log(`📄 Markdown report saved to ${filePath}`);
    }
}
