import { z } from "zod";
import { SiteConfig } from "../../types/site-config.js";
import { WuzzufJob } from "../../types/WuzzufJob.js";
import { crawlWuzzuf } from "./wuzzuf-crawler.js";

const jobSchema = z.object({
    jobTitle: z.string(),
    jobURL: z.string(),
    company: z.string(),
    location: z.string(),
    date: z.string(),
    jobDetails: z.array(z.string()),
    tags: z.string(),
}) satisfies z.ZodType<Omit<WuzzufJob, "site">>;

export const wuzzufConfig: SiteConfig<WuzzufJob> = {
    key: "wuzzuf",
    crawl: crawlWuzzuf,
    jobSchema,
};
