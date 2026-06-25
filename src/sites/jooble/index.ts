import { z } from "zod";
import { SiteConfig } from "../../types/site-config.js";
import { crawlJooble } from "./jooble-crawler.js";
import { JoobleJob } from "../../types/JoobleJob.js";

const jobSchema = z.object({
    jobTitle: z.string(),
    jobURL: z.string(),
    company: z.string(),
    location: z.string(),
    date: z.string(),
    jobDetails: z.array(z.string()),
}) satisfies z.ZodType<JoobleJob>;

export const joobleConfig: SiteConfig<JoobleJob> = {
    name: "jooble",
    crawl: crawlJooble,
    jobSchema,
};
