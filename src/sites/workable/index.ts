import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { SiteConfig } from "../../types/site-config.js";
import { IndeedJob } from "../../types/IndeedJob.js";
import { crawlWorkable } from "./workable-crawler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadPrompt(name: string): Promise<string> {
    return fs.readFile(path.join(__dirname, "prompts", name), "utf-8");
}

const jobSummaryPrompt = await loadPrompt('job-summary.md');

const jobSchema = z.object({
    jobTitle: z.string(),
    jobURL: z.string(),
    company: z.string(),
    location: z.string(),
    date: z.string(),
    jobDetails: z.array(z.string()),
}) satisfies z.ZodType<IndeedJob>;

export const workableConfig: SiteConfig<IndeedJob> = {
    name: "workable",
    crawl: crawlWorkable,
    jobSchema,
    prompts: {
        jobSummary: jobSummaryPrompt,
    },
};