import { z } from "zod";
import { BaseJob } from "./base.js";
import { JobStatus } from "./evaluated-job.js";

/** Site-specific configuration that plugs into the crawl → evaluate → report pipeline.
 * @template T - The site-specific job type extending {@link BaseJob}.
 */
export interface SiteConfig<T extends BaseJob = BaseJob> {
    /** Human-readable site name (used in logs). */
    name: string;
    /** Crawls the site and returns raw job listings. */
    crawl: () => Promise<T[]>;
    /** Zod schema for a single evaluated job (all job fields + status + reason) */
    evaluationSchema: z.ZodArray<z.ZodObject<any>>;
    /** Zod schema for a single raw job (used for type inference) */
    jobSchema: z.ZodType<T>;
    /** Prompt templates with `{{placeholder}}` substitution. */
    prompts: {
        filter: string;
        report: string;
        /** Prompt for generating detailed job summaries (LLM phase). */
        jobSummary: string;
    };
}

