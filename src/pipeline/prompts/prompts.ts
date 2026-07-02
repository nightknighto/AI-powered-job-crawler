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

const variantsDir = path.join(__dirname, "variants");

export function loadPromptVariants(): { name: string; prompt: string }[] {
    const variants: { name: string; prompt: string }[] = [];

    variants.push({ name: "filter", prompt: filterPrompt });

    if (fs.existsSync(variantsDir)) {
        const files = fs.readdirSync(variantsDir)
            .filter((f) => f.endsWith(".md"))
            .sort();
        for (const file of files) {
            const name = file.replace(/\.md$/, "");
            const prompt = fs.readFileSync(path.join(variantsDir, file), "utf-8");
            variants.push({ name, prompt });
        }
    }

    if (variants.length < 2) {
        throw new Error("Need at least one variant file in prompts/variants/ to compare against baseline.");
    }

    const names = variants.map((v) => v.name);
    if (new Set(names).size !== names.length) {
        const dups = names.filter((n, i) => names.indexOf(n) !== i);
        throw new Error(`Duplicate variant names: ${dups.join(", ")}`);
    }

    for (const v of variants) {
        if (!v.prompt.includes("{{jobs}}")) {
            console.warn(`⚠️  Variant "${v.name}" is missing the {{jobs}} placeholder`);
        }
    }

    return variants;
}
