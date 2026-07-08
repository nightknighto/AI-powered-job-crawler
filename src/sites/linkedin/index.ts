import { z } from "zod";
import { SiteConfig } from "../../types/site-config.js";
import { crawlLinkedIn } from "./linkedin-crawler.js";
import { siteKeySchema } from "../../evals/combined-golden-dataset.js";
import { BaseJob } from "../../types/base.js";

const jobSchema = z.object({
    site: siteKeySchema,
    jobTitle: z.string(),
    jobURL: z.string(),
    company: z.string(),
    location: z.string(),
    date: z.string(),
    jobDetails: z.array(z.string()),
}) satisfies z.ZodType<BaseJob>;

export const linkedInConfig: SiteConfig<BaseJob> = {
    name: "linkedIn",
    crawl: crawlLinkedIn,
    jobSchema,
};
