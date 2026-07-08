import { z } from "zod";
import { SiteConfig } from "../../types/site-config.js";
import { crawlLinkedIn } from "./linkedin-crawler.js";
import { BaseJob } from "../../types/base.js";

const jobSchema = z.object({
    jobTitle: z.string(),
    jobURL: z.string(),
    company: z.string(),
    location: z.string(),
    date: z.string(),
    jobDetails: z.array(z.string()),
}) satisfies z.ZodType<Omit<BaseJob, "site">>;

export const linkedInConfig: SiteConfig<BaseJob> = {
    key: "linkedin",
    crawl: crawlLinkedIn,
    jobSchema,
};
