import chalk from "chalk";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { ReportContext, Reporter } from "./types.js";
import { splitByStatus } from "./report-helpers.js";

/** Compact terminal summary — counts + passing job titles + file paths from sibling reporters.
 * Designed to complement file-writing reporters (html, markdown) in a composable setup.
 */
export class CliSummaryReporter implements Reporter {
    async display(jobs: EvaluatedJob<BaseJob>[], _summary: string, ctx: ReportContext): Promise<void> {
        const { passing, failing } = splitByStatus(jobs);

        console.log(
            `\n${chalk.green(`✅ ${passing.length} passing`)} ${chalk.dim("·")} ${chalk.red(`❌ ${failing.length} filtered`)}\n`,
        );

        if (passing.length > 0) {
            console.log(chalk.bold("Passing:"));
            for (const job of passing) {
                console.log(`  • ${job.job.jobTitle} — ${job.job.company}`);
            }
        }

        if (ctx.outputFiles.length > 0) {
            console.log();
            for (const path of ctx.outputFiles) {
                console.log(`📄 ${chalk.blue(chalk.underline(path))}`);
            }
        }
    }
}
