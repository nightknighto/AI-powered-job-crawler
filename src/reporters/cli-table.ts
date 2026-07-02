import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import chalk from "chalk";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { ReportContext, Reporter } from "./types.js";
import { buildReportTables } from "./report-helpers.js";

// @ts-ignore marked-terminal types are incompatible with marked v12
marked.use(markedTerminal({
    strong: chalk.blueBright.bold,
    listitem: (text: string) => `${text}\n`,
}));

/** Renders the full report as formatted terminal markdown tables.
 * Preserves the original display behavior — uses `marked-terminal` + `chalk`.
 */
export class CliTableReporter implements Reporter {
    async display(jobs: EvaluatedJob<BaseJob>[], summary: string, _ctx: ReportContext): Promise<void> {
        const tablesMarkdown = buildReportTables(jobs);
        const fullMarkdown = `${tablesMarkdown}\n\n${summary}`;
        console.log(marked.parse(fullMarkdown));
    }
}
