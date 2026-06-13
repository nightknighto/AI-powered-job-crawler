import { BaseJob } from "./base.js";

/** Indeed-specific job shape with company/location metadata. */
export interface IndeedJob extends BaseJob {
    company: string;
    location: string;
}