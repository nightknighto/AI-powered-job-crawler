import { z } from "zod";
import { SiteConfig } from "../../types/site-config.js";
import { WuzzufJob } from "../../types/WuzzufJob.js";
import { crawlWuzzuf } from "./wuzzuf-crawler.js";
import { siteKeySchema } from "../../evals/combined-golden-dataset.js";

const jobSchema = z.object({
    site: siteKeySchema,
    jobTitle: z.string(),
    jobURL: z.string(),
    company: z.string(),
    location: z.string(),
    date: z.string(),
    jobDetails: z.array(z.string()),
    tags: z.string(),
}) satisfies z.ZodType<WuzzufJob>;

export const wuzzufConfig: SiteConfig<WuzzufJob> = {
    name: "wuzzuf",
    crawl: crawlWuzzuf,
    jobSchema,
};
