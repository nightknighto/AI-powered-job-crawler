import { z } from "zod";

/** Zod enum for the three possible job evaluation outcomes. */
export const JobStatus = z.enum(["PASS", "FAIL", "POTENTIAL_MATCH"]);

/** String union type derived from {@link JobStatus} zod enum. */
export type JobStatus = z.infer<typeof JobStatus>;

/** A job that has been evaluated by the LLM, attaching a status, reasoning, and enriched fields.
 * @template T - The site-specific job type (e.g. {@link WuzzufJob}).
 */
export interface EvaluatedJob<T> {
    job: T;
    status: JobStatus;
    reason: string[];
    /** Experience level extracted by the LLM (e.g. "2+ years", "0-10 years"). */
    experienceLevel?: string;
    /** Core tech stack identified by the LLM (e.g. ["React", "TypeScript"]). */
    skills?: string[];
}


/** Shared Zod schema for LLM filter output � used across all sites. */
export const jobEvaluationSchema = z.object({
    jobURL: z.string(),
    reason: z.array(z.string()),
    experienceLevel: z.string(),
    skills: z.array(z.string()),
    status: JobStatus,
}).array();

