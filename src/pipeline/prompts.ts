import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { jobEvaluationSchema } from "../types/evaluated-job.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filterPath = path.join(__dirname, "prompts", "filter.md");

export const unifiedFilterPrompt = fs.readFileSync(filterPath, "utf-8");
