/** Minimal representation of a crawled job listing. Extended by site-specific types. */
export interface BaseJob {
    jobTitle: string;
    jobURL: string;
    date: string;
    jobDetails: string[];
}
