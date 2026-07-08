import chalk from "chalk";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { ReportContext, Reporter } from "./types.js";
import { splitByStatus, sortByNewThenDate } from "./report-helpers.js";

// @ts-ignore marked-terminal types are incompatible with marked v12
marked.use(markedTerminal({
    strong: chalk.blueBright.bold,
    listitem: (text: string) => `${text}\n`,
}));

/** Renders jobs as stacked cards — one job per block, each field on its own line.
 * No table layout, so long fields (skills, reason) get full terminal width.
 */
export class CliCardReporter implements Reporter {
    async display(jobs: EvaluatedJob<BaseJob>[], summary: string, ctx: ReportContext): Promise<void> {
        const { passing, failing } = splitByStatus(jobs);
        const newUrls = ctx.newJobUrls;
        // `--only-new` filters table bodies; dropped jobs are all-new by definition and stay as-is.
        const showPassing = ctx.onlyNew ? passing.filter((j) => newUrls?.has(j.job.jobURL)) : passing;
        const showFailing = ctx.onlyNew ? failing.filter((j) => newUrls?.has(j.job.jobURL)) : failing;

        if (ctx.droppedJobs?.length) {
            console.log(chalk.bold.yellow(`\n🫥 Dropped by LLM (${ctx.droppedJobs.length})\n`));
            for (const d of ctx.droppedJobs) {
                console.log(`  ${chalk.dim(`[${d.site}]`)} ${d.jobTitle} — ${chalk.dim(d.jobURL)}`);
            }
        }

        if (showPassing.length > 0) {
            console.log(chalk.bold.green("\n✅ Passing Jobs (including Potential Matches)\n"));
            for (const job of sortByNewThenDate(showPassing, newUrls)) {
                this.renderCard(job, true, newUrls);
            }
        }

        if (showFailing.length > 0) {
            console.log(chalk.bold.red("\n❌ Filtered Out Jobs\n"));
            for (const job of sortByNewThenDate(showFailing, newUrls)) {
                this.renderCard(job, false, newUrls);
            }
        }

        if (summary) {
            console.log(chalk.bold.blueBright("\n📝 Detailed Summary\n"));
            console.log(marked.parse(summary));
        }
    }

    private renderCard(job: EvaluatedJob<BaseJob>, passed: boolean, newUrls?: Set<string>): void {
        const color = passed ? chalk.bold.green : chalk.bold.red;
        const isNew = newUrls?.has(job.job.jobURL);
        const title = color(isNew ? `🆕 ${job.job.jobTitle}` : job.job.jobTitle);
        const sep = chalk.dim("━").repeat(50);
        console.log(`\n${sep}`);
        console.log(`  ${title} - ${chalk.blueBright(job.job.company)}`);
        console.log(`${sep}`);
        console.log(`  ${chalk.dim("Site:")}        ${job.job.site}`);
        console.log(`  ${chalk.dim("Location:")}   ${job.job.location}`);
        console.log(`  ${chalk.dim("Date:")}       ${job.job.date}`);;
        console.log(`  ${chalk.dim("Experience:")} ${job.experienceLevel ?? "N/A"}`);
        console.log(`  ${chalk.dim("Skills:")}     ${job.skills?.join(", ") ?? "N/A"}`);
        console.log(`  ${chalk.dim("Reason:")}     ${job.reason.join("; ")}`);
    }
}
