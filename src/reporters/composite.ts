import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";
import { ReportContext, Reporter } from "./types.js";

/** Composes multiple reporters, running them sequentially in a single pipeline invocation.
 * Shares the same `ReportContext` across all reporters so `outputFiles` accumulates.
 */
export class CompositeReporter implements Reporter {
    constructor(private reporters: Reporter[]) { }

    async display(jobs: EvaluatedJob<BaseJob>[], summary: string, ctx: ReportContext): Promise<void> {
        for (const reporter of this.reporters) {
            await reporter.display(jobs, summary, ctx);
        }
    }
}
