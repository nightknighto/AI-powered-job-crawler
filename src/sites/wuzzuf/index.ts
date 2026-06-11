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

const [filterPrompt, reportPrompt, jobSummaryPrompt] = await Promise.all([
    loadPrompt("filter.md"),
    loadPrompt("report.md"),
    loadPrompt("job-summary.md"),
]);

const jobSchema = z.object({
    jobTitle: z.string(),
    jobURL: z.string(),
    company: z.string(),
    location: z.string(),
    date: z.string(),
    jobDetails: z.array(z.string()),
    tags: z.string(),
}) satisfies z.ZodType<WuzzufJob>;

/** Slim schema — LLM only outputs deduced fields + jobURL (matching key). */
const evaluationSchema = z.object({
    jobURL: z.string(),
    status: JobStatus,
    reason: z.array(z.string()),
    experienceLevel: z.string(),
    skills: z.array(z.string()),
}).array();

export const wuzzufConfig: SiteConfig<WuzzufJob> = {
    name: "wuzzuf",
    crawl: crawlWuzzuf,
    jobSchema,
    evaluationSchema,
    prompts: {
        filter: filterPrompt,
        report: reportPrompt,
        jobSummary: jobSummaryPrompt,
    },
};

