import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { SiteConfig } from "../../types/site-config.js";
import { WuzzufJob } from "../../types/WuzzufJob.js";
import { JobStatus } from "../../types/evaluated-job.js";
import { crawlWuzzuf } from "./wuzzuf-crawler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadPrompt(name: string): Promise<string> {
    return fs.readFile(path.join(__dirname, "prompts", name), "utf-8");
}

const [filterPrompt, reportPrompt] = await Promise.all([
    loadPrompt("filter.md"),
    loadPrompt("report.md"),
]);

const jobSchema = z.object({
    jobTitle: z.string(),
    jobURL: z.string(),
    companyAndLocation: z.string(),
    date: z.string(),
    jobDetails: z.array(z.string()),
    tags: z.string(),
}) satisfies z.ZodType<WuzzufJob>;

export const wuzzufConfig: SiteConfig<WuzzufJob> = {
    name: "wuzzuf",
    crawl: crawlWuzzuf,
    jobSchema,
    evaluationSchema: jobSchema.extend({
        status: JobStatus,
        reason: z.array(z.string()),
    }).array(),
    prompts: {
        filter: filterPrompt,
        report: reportPrompt,
    },
};

