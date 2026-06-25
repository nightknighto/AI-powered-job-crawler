import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filterPath = path.join(__dirname, "filter.md");
const jobSummaryPath = path.join(__dirname, "job-summary.md");

/** Shared LLM filter prompt with `{{jobs}}` placeholder. Used by all sites — see `prompts/filter.md`. */
export const filterPrompt = fs.readFileSync(filterPath, "utf-8");

/** Shared LLM job-summary prompt with `{{passingJobs}}` placeholder. Used by all sites — see `prompts/job-summary.md`. */
export const jobSummaryPrompt = fs.readFileSync(jobSummaryPath, "utf-8");
