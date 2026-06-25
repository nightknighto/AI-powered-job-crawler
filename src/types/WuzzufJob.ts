import { BaseJob } from "./base.js";

/** Wuzzuf-specific job shape with tag metadata. */
export interface WuzzufJob extends BaseJob {
    /** Comma-separated tag string (e.g. `'Full Time, Remote'`). */
    tags: string;
}
