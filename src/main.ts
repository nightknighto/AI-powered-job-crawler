import { wuzzufConfig } from "./sites/wuzzuf/index.js";
import { crawl } from "./pipeline/crawl.js";
import { evaluate } from "./pipeline/evaluate.js";
import { generateSummary } from "./pipeline/generate-summary.js";
import { createReporters } from "./reporters/index.js";
import { modelConfigs, shared } from "./config.js";

const model = modelConfigs.qwenReason;
const site = wuzzufConfig;

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
