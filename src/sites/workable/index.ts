import { z } from "zod";
import { SiteConfig } from "../../types/site-config.js";
import { WorkableJob } from "../../types/WorkableJob.js";
import { crawlWorkable } from "./workable-crawler.js";

const jobSchema = z.object({
    jobTitle: z.string(),
    jobURL: z.string(),
    company: z.string(),
    location: z.string(),
    date: z.string(),
    jobDetails: z.array(z.string()),
}) satisfies z.ZodType<Omit<WorkableJob, "site">>;

export const workableConfig: SiteConfig<WorkableJob> = {
    key: "workable",
    crawl: crawlWorkable,
    jobSchema,
};
