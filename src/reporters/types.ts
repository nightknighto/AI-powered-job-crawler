import { BaseJob } from "../types/base.js";
import { EvaluatedJob } from "../types/evaluated-job.js";

/** Context passed to all reporters during display.
 * Shared across composable reporters — `outputFiles` accumulates paths from file-writing reporters.
 */
export interface ReportContext {
    /** Report label derived from the run (e.g. `'all'`, `'wuzzuf'`, `'wuzzuf-indeed'`).
     * Used for output filenames and headers. For per-job origin, read each job's `job.site` field. */
    siteName: string;
    /** The Ollama model tag used for evaluation. */
    model: string;
    /** Timestamp of the pipeline run. */
    timestamp: Date;
    /** Mutable list of file paths written by file-output reporters.
     * File-writing reporters push their paths here; display-only reporters read them. */
    outputFiles: string[];
    /** Sites that failed and were skipped during a multi-site run (omitted when nothing was skipped). */
    skippedSites?: { site: string; reason: string }[];
    /** Jobs the LLM dropped from its filter output (input jobs with no verdict). Omitted when none. */
    droppedJobs?: { site: string; jobURL: string; jobTitle: string }[];
    /** URLs of jobs newly evaluated or dropped this run (cached jobs are absent).
     * Drives the 🆕 badge and new-to-top sort. Omitted on the eval/preview paths
     * (no cache → no newness distinction). */
    newJobUrls?: Set<string>;
    /** When true, job tables show only new jobs; count boxes stay total. Set by `--only-new`. */
    onlyNew?: boolean;
}

/** Interface for all output reporters. Each reporter handles one output format. */
export interface Reporter {
    /** Render evaluated jobs in this reporter's output format.
     * @param jobs - All evaluated jobs from the pipeline.
     * @param summary - LLM-generated summary text for passing jobs (may be empty).
     * @param ctx - Shared context with site info, model, timestamp, and output file paths.
     */
    display(jobs: EvaluatedJob<BaseJob>[], summary: string, ctx: ReportContext): Promise<void>;
}

/** LLM-generated summary text returned by `report()`. Reporters build their own tables via `buildReportTables()`. */
export type ReportOutput = string;
