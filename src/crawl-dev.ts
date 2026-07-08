/**
 * Crawl-only dev tool (`pnpm crawl <site>`).
 *
 * Runs ONLY the crawler for a site (or `all`, or a comma-list) and dumps the
 * raw jobs to a JSON file, then prints a quick summary — skipping the LLM
 * filter, summary, and reporter stages entirely. Intended for iterating on a
 * crawler's extraction logic without paying for the rest of the pipeline.
 *
 * Mirrors the `pnpm preview-reporter` standalone-script pattern: top-level
 * await, a `Usage:` banner on bad args, reuses the shared `crawl()` helper so
 * the `🕷️/✅` logging is identical to the production pipeline.
 *
 * Pass `--verbose` to print the full JSON of the first 10 jobs per site
 * (instead of just title — company), for a closer look at extraction output.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sites } from "./sites/registry.js";
import { crawl } from "./pipeline/crawl.js";
import { BaseJob } from "./types/base.js";
import { SiteConfig } from "./types/site-config.js";

// `--verbose` may appear anywhere; the positional site arg is the first
// non-flag element, so both `pnpm crawl wuzzuf --verbose` and
// `pnpm crawl --verbose wuzzuf` work.
const verbose = process.argv.includes("--verbose");
const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));

if (!arg) {
    console.error(`Usage: pnpm crawl <site | all | site1,site2,...> [--verbose]\nAvailable sites: ${Object.keys(sites).join(", ")}`);
    process.exit(1);
}

// Resolve the CLI arg into a list of site configs (same logic as main.ts).
// - `all`           → every registered site
// - `wuzzuf`        → a single site
// - `wuzzuf,indeed` → a subset of sites (comma-separated)
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

console.log(`Crawling site(s): ${selectedSites.map((s) => s.name).join(", ")} (crawl-only, no LLM filter)`);

/** Timestamp matching the reporters' filename convention: `YYYY-MM-DD-HH-MM-SS` (UTC). */
function formatTimestamp(date: Date): string {
    return date.toISOString().replace(/[T:]/g, "-").slice(0, 19);
}

const dir = "reports";
let total = 0;

for (const site of selectedSites) {
    const jobs = await crawl(site); // stamps each job's `site` field
    total += jobs.length;

    mkdirSync(dir, { recursive: true });
    const filename = `crawl-${site.name}-${formatTimestamp(new Date())}.json`;
    const filePath = join(dir, filename);
    writeFileSync(filePath, JSON.stringify(jobs, null, 2), "utf-8");

    // Quick on-screen sanity check: count + first ~10 titles. With `--verbose`,
    // print the full JSON of those jobs instead of just the title line.
    console.log(`\n${site.name}: ${jobs.length} job${jobs.length === 1 ? "" : "s"}`);
    const preview = jobs.slice(0, 10);
    if (verbose) {
        console.log(JSON.stringify(preview, null, 2));
    } else {
        for (const job of preview) {
            console.log(`  • ${job.jobTitle} — ${job.company || "(no company)"}`);
        }
    }
    if (jobs.length > 10) {
        console.log(`  …and ${jobs.length - 10} more`);
    }
    console.log(`📄 Saved ${jobs.length} jobs → ${filePath}`);
}

if (selectedSites.length > 1) {
    console.log(`\nTotal: ${total} jobs across ${selectedSites.length} sites`);
}
