import { wuzzufConfig } from "./sites/wuzzuf/index.js";
import { indeedConfig } from "./sites/indeed/index.js";
import { crawl } from "./pipeline/crawl.js";
import { evaluate } from "./pipeline/evaluate.js";
import { generateSummary } from "./pipeline/generate-summary.js";
import { createReporters } from "./reporters/index.js";
import { modelConfigs, shared } from "./config.js";

// Get site from CLI args (default: wuzzuf)
const siteName = process.argv[2] || 'wuzzuf';

const sites = {
    wuzzuf: wuzzufConfig,
    indeed: indeedConfig,
} as const;

const site = sites[siteName as keyof typeof sites];

if (!site) {
    console.error(`Unknown site: ${siteName}. Available sites: ${Object.keys(sites).join(', ')}`);
    process.exit(1);
}

console.log(`Using site: ${site.name}`);

const model = modelConfigs.qwenReason;

const jobs = await crawl(site);
const evaluated = await evaluate(site, jobs, model);
const summary = await generateSummary(site, evaluated, model);

const reporters = createReporters(shared.reporters);
await reporters.display(evaluated, summary, {
    site,
    model: model.model,
    timestamp: new Date(),
    outputFiles: [],
});
