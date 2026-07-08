import { sites } from "./sites/registry.js";
import { crawl } from "./pipeline/crawl.js";
import { evaluate } from "./pipeline/evaluate.js";
import { generateSummary } from "./pipeline/generate-summary.js";
import { createReporters } from "./reporters/index.js";
import { modelConfigs, shared } from "./config.js";
import { BaseJob } from "./types/base.js";
import { EvaluatedJob } from "./types/evaluated-job.js";
import { SiteConfig } from "./types/site-config.js";
import { DroppedJob } from "./pipeline/run-filter.js";
import { VerdictCache } from "./state/verdict-cache.js";

const arg = process.argv[2];

if (!arg) {
    console.error(`Usage: pnpm start <site | all | site1,site2,...> [--refresh] [--only-new]\nAvailable sites: ${Object.keys(sites).join(", ")}`);
    process.exit(1);
}

/** `--refresh` ignores cached verdicts, re-evaluates ALL crawled jobs, and updates the store
 * (preserving `firstSeenAt` for known URLs). Run this after editing `filter.md`. */
const refresh = process.argv.slice(3).includes("--refresh");

/** `--only-new` hides cached jobs from the report tables (passing/failing/dropped show only jobs
 * newly evaluated or dropped this run). Count boxes stay total. Badges still render in either mode. */
const onlyNew = process.argv.slice(3).includes("--only-new");

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

/** Persistent verdict cache — skips re-filtering jobs seen in prior runs. Constructed once,
 * mutated per-site (new verdicts recorded via `set()`), flushed once after all sites via `save()`.
 * The eval path never constructs one of these. */
const cache = VerdictCache.load();
if (refresh) {
    console.log("🔄  --refresh: ignoring cached verdicts, re-evaluating all crawled jobs.");
}

const evaluatedAll: EvaluatedJob<BaseJob>[] = [];
/** Sites that failed mid-run and were skipped (multi-site runs only). */
const skipped: { site: string; reason: string }[] = [];
/** Jobs the LLM dropped from its filter output, accumulated across all sites. */
const droppedAll: { site: string; jobURL: string; jobTitle: string }[] = [];
/** URLs of jobs evaluated or dropped this run — drives the 🆕 badge + new-to-top sort in reports.
 * Cached jobs are absent. First run / `--refresh` badges everything (all jobs are newly evaluated). */
const newJobUrls = new Set<string>();

for (const site of selectedSites) {
    try {
        // Stage 1: Crawl (unchanged — Crawlee fetches up to 7 days of postings).
        const jobs = await crawl(site);                 // stamps each job's `site` field

        // Stage 2: Partition into cached (already has a verdict) vs new (needs LLM evaluation).
        // `--refresh` forces everything to new so all crawled jobs are re-evaluated.
        const toEvaluate = refresh ? jobs : jobs.filter((j) => !cache.has(j.jobURL));
        const cachedJobs = refresh ? [] : jobs.filter((j) => cache.has(j.jobURL));
        console.log(
            `📦 ${toEvaluate.length} new, ${cachedJobs.length} cached` +
            (toEvaluate.length === 0 ? " — skipping LLM filter" : ""),
        );

        // Stage 3: Evaluate ONLY new jobs. `evaluate()` is unchanged — always evaluates, 3 params.
        let newlyEvaluated: EvaluatedJob<BaseJob>[] = [];
        let dropped: DroppedJob[] = [];
        if (toEvaluate.length > 0) {
            const result = await evaluate(site, toEvaluate, model);
            newlyEvaluated = result.evaluated;
            dropped = result.dropped;
        }
        // Collect URLs of everything the LLM saw this run (newly evaluated + dropped) for the 🆕 badge.
        // Cached jobs are absent → they never badge. `--refresh` re-evaluates all, so all badge as new.
        for (const ev of newlyEvaluated) newJobUrls.add(ev.job.jobURL);
        for (const d of dropped) newJobUrls.add(d.jobURL);

        // Stage 4: Reuse cached verdicts for already-seen jobs (reattach today's fresh job body).
        const cachedEvaluated: EvaluatedJob<BaseJob>[] = [];
        for (const job of cachedJobs) {
            const ev = cache.toEvaluatedJob(job);
            if (ev) cachedEvaluated.push(ev);
        }

        // Stage 5: Merge fresh + cached verdicts, accumulate dropped jobs.
        evaluatedAll.push(...newlyEvaluated, ...cachedEvaluated);
        droppedAll.push(...dropped.map((d) => ({ site: site.name, ...d })));

        // Stage 6: Record new verdicts in the in-memory cache (persisted once after all sites).
        // Dropped jobs are intentionally NOT recorded — they are re-evaluated next run.
        for (const ev of newlyEvaluated) cache.set(ev);
    } catch (e: unknown) {
        const reason = e instanceof Error ? e.message : String(e);
        console.warn(`⚠️  Site ${site.name} failed (${reason}). Skipping.`);
        skipped.push({ site: site.name, reason });
    }
}

// Stage 7: Persist the cache once after all sites (atomic write + 30-day prune).
cache.save();

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
    newJobUrls,
    onlyNew: onlyNew || undefined,
});
