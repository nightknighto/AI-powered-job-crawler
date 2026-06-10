import { z } from "zod";

/** Zod enum for the three possible job evaluation outcomes. */
export const JobStatus = z.enum(["PASS", "FAIL", "POTENTIAL_MATCH"]);

/** String union type derived from {@link JobStatus} zod enum. */
export type JobStatus = z.infer<typeof JobStatus>;

/** A job that has been evaluated by the LLM, attaching a status and reasoning.
 * @template T - The site-specific job type (e.g. {@link WuzzufJob}).
 */
export interface EvaluatedJob<T> {
    job: T;
    status: JobStatus;
    reason: string[];
}
