import chalk from "chalk";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { ReportContext, Reporter } from "./types.js";
import { splitByStatus, sortByDate } from "./report-helpers.js";

// @ts-ignore marked-terminal types are incompatible with marked v12
marked.use(markedTerminal({
    strong: chalk.blueBright.bold,
    listitem: (text: string) => `${text}\n`,
}));

/** Renders jobs as stacked cards — one job per block, each field on its own line.
 * No table layout, so long fields (skills, reason) get full terminal width.
 */
export class CliCardReporter implements Reporter {
    async display(jobs: EvaluatedJob<BaseJob>[], summary: string, _ctx: ReportContext): Promise<void> {
        const { passing, failing } = splitByStatus(jobs);

        if (passing.length > 0) {
            console.log(chalk.bold.green("\n✅ Passing Jobs (including Potential Matches)\n"));
            for (const job of sortByDate(passing)) {
                this.renderCard(job, true);
            }
        }

        if (failing.length > 0) {
            console.log(chalk.bold.red("\n❌ Filtered Out Jobs\n"));
            for (const job of sortByDate(failing)) {
                this.renderCard(job, false);
            }
        }

        if (summary) {
            console.log(chalk.bold.blueBright("\n📝 Detailed Summary\n"));
            console.log(marked.parse(summary));
        }
    }

    private renderCard(job: EvaluatedJob<BaseJob>, passed: boolean): void {
        const color = passed ? chalk.bold.green : chalk.bold.red;
        const title = color(job.job.jobTitle);
        const sep = chalk.dim("━").repeat(50);
        console.log(`\n${sep}`);
        console.log(`  ${title} - ${chalk.blueBright(job.job.company)}`);
        console.log(`${sep}`);
        console.log(`  ${chalk.dim("Location:")}   ${job.job.location}`);
        console.log(`  ${chalk.dim("Date:")}       ${job.job.date}`);;
        console.log(`  ${chalk.dim("Experience:")} ${job.experienceLevel ?? "N/A"}`);
        console.log(`  ${chalk.dim("Skills:")}     ${job.skills?.join(", ") ?? "N/A"}`);
        console.log(`  ${chalk.dim("Reason:")}     ${job.reason.join("; ")}`);
    }
}
