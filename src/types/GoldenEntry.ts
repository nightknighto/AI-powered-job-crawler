import { BaseJob } from "./base.js";
import { JobStatus } from "./evaluated-job.js";

/**
 * A single hand-labeled entry in the golden dataset for eval benchmarking.
 * 
 * @template T - The site-specific job type.
 */
export interface GoldenEntry<T extends BaseJob = BaseJob> {
    /** The job listing to feed into the LLM. */
    job: T;
    /** The expected evaluation status (ground truth). */
    expectedStatus: JobStatus;
    /** Keywords that should appear in the AI's reason array */
    expectedReasonKeywords: string[];
}