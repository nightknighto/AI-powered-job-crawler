import { BaseJob } from "./base.js";

/** Wuzzuf-specific job shape with company/location and tag metadata. */
export interface WuzzufJob extends BaseJob {
    /** Raw company name and location string (often multi-line). */
    companyAndLocation: string;
    /** Comma-separated tag string (e.g. `'Full Time, Remote'`). */
    tags: string;
}
