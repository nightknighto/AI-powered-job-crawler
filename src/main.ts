import { wuzzufConfig } from "./sites/wuzzuf/index.js";
import { crawl } from "./pipeline/crawl.js";
import { evaluate } from "./pipeline/evaluate.js";
import { report } from "./pipeline/report.js";
import { display } from "./pipeline/display.js";
import { modelConfigs } from "./config.js";

const model = modelConfigs.qwenReason;
const site = wuzzufConfig;

const jobs = await crawl(site);
const evaluated = await evaluate(site, jobs, model);
const markdown = await report(site, evaluated, model);
display("", markdown);
