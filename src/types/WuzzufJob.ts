import { BaseJob } from "./base.js";

/** Wuzzuf-specific job shape with company/location and tag metadata. */
export interface WuzzufJob extends BaseJob {
    company: string;
    location: string;
    /** Comma-separated tag string (e.g. `'Full Time, Remote'`). */
    tags: string;
}
