import { z } from "zod";
import { SiteConfig } from "../../types/site-config.js";
import { IndeedJob } from "../../types/IndeedJob.js";
import { crawlIndeed } from "./indeed-crawler.js";

const jobSchema = z.object({
    jobTitle: z.string(),
    jobURL: z.string(),
    company: z.string(),
    location: z.string(),
    date: z.string(),
    jobDetails: z.array(z.string()),
}) satisfies z.ZodType<IndeedJob>;

export const indeedConfig: SiteConfig<IndeedJob> = {
    name: "indeed",
    crawl: crawlIndeed,
    jobSchema,
};
