import { wuzzufConfig } from "./sites/wuzzuf/index.js";
import { indeedConfig } from "./sites/indeed/index.js";
import { crawl } from "./pipeline/crawl.js";
import { evaluate } from "./pipeline/evaluate.js";
import { generateSummary } from "./pipeline/generate-summary.js";
import { createReporters } from "./reporters/index.js";
import { modelConfigs, shared } from "./config.js";
import { workableConfig } from "./sites/workable/index.js";
import { joobleConfig } from "./sites/jooble/index.js";
import { BaseJob } from "./types/base.js";
import { EvaluatedJob } from "./types/evaluated-job.js";
import { SiteConfig } from "./types/site-config.js";

// Registry of all available sites, keyed by their CLI identifier.
const sites = {
    wuzzuf: wuzzufConfig,
    indeed: indeedConfig,
    workable: workableConfig,
    jooble: joobleConfig,
} as const satisfies Record<string, SiteConfig<BaseJob>>;

const arg = process.argv[2];

if (!arg) {
    console.error(`Usage: pnpm start <site | all | site1,site2,...>\nAvailable sites: ${Object.keys(sites).join(", ")}`);
    process.exit(1);
}

// Resolve the CLI arg into a list of site configs.
// - `all`              → every registered site
// - `wuzzuf`           → a single site (unchanged behavior, flat path)
// - `wuzzuf,indeed`    → a subset of sites (comma-separated)
let selectedSites: readonly SiteConfig<BaseJob>[];
if (arg === "all") {
    selectedSites = Object.values(sites);
} else {
    const keys = arg.split(",").map((s) => s.trim());
    for (const k of keys) {
        if (!(k in sites)) {
            console.error(`Unknown site: ${k}. Available sites: ${Object.keys(sites).join(", ")}`);
            process.exit(1);
        }
    }
    selectedSites = keys.map((k) => sites[k as keyof typeof sites]);
}

// Derive a filesystem-safe report label from the resolved site names: `all`, `wuzzuf`, or `wuzzuf-indeed`.
const reportName = selectedSites.map((s) => s.name).join("-");

console.log(`Using site(s): ${selectedSites.map((s) => s.name).join(", ")}`);

const model = modelConfigs.qwenReason;

const evaluatedAll: EvaluatedJob<BaseJob>[] = [];
/** Sites that failed mid-run and were skipped (multi-site runs only). */
const skipped: { site: string; reason: string }[] = [];
/** Jobs the LLM dropped from its filter output, accumulated across all sites. */
const droppedAll: { site: string; jobURL: string; jobTitle: string }[] = [];

for (const site of selectedSites) {
    try {
        const jobs = await crawl(site);                 // stamps each job's `site` field
        const { evaluated, dropped } = await evaluate(site, jobs, model);
        evaluatedAll.push(...evaluated);
        // Tag each dropped job with its origin site for the report.
        droppedAll.push(...dropped.map((d) => ({ site: site.name, ...d })));
    } catch (e: unknown) {
        const reason = e instanceof Error ? e.message : String(e);
        console.warn(`⚠️  Site ${site.name} failed (${reason}). Skipping.`);
        skipped.push({ site: site.name, reason });
    }
}

// One combined summary across every passing job from every site that succeeded.
const summary = await generateSummary(evaluatedAll, model);

const reporters = createReporters(shared.reporters);
await reporters.display(evaluatedAll, summary, {
    siteName: reportName,
    model: model.model,
    timestamp: new Date(),
    outputFiles: [],
    skippedSites: skipped.length > 0 ? skipped : undefined,
    droppedJobs: droppedAll.length > 0 ? droppedAll : undefined,
});
