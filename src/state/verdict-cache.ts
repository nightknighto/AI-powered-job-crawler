import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import type { BaseJob } from "../types/base.js";
import type { EvaluatedJob, JobStatus } from "../types/evaluated-job.js";

/** Path to the on-disk verdict cache, relative to cwd (same convention as `reports/`). */
export const VERDICT_CACHE_PATH = "state/verdict-cache.json";

/** Entries older than this (by `firstSeenAt`) are pruned on `save()`. */
export const PRUNE_AFTER_DAYS = 30;

/** One stored verdict. Verdict fields mirror the LLM-output fields of {@link EvaluatedJob}. */
export interface CachedVerdict {
    status: JobStatus;
    reason: string[];
    experienceLevel?: string;
    skills?: string[];
    /** ISO timestamp of the run that first evaluated this URL. Used for pruning + debugging. */
    firstSeenAt: string;
    /** Origin site key (GoldenSiteKey value). For debugging/pruning only — not a lookup key. */
    site: string;
}

/** On-disk shape. `version` enables future migrations. */
export interface VerdictStore {
    version: 1;
    entries: Record<string, CachedVerdict>;
}

/** Persists LLM filter verdicts by `jobURL` so daily runs skip re-filtering seen jobs.
 *
 * This class owns **mechanics only**: loading, lookup, reconstruction, recording, and persisting
 * verdicts. It does NOT decide when to call the LLM or how to merge cached vs fresh results —
 * that orchestration lives in `main.ts` as an explicit pipeline stage. `evaluate.ts` is never
 * aware of the cache.
 *
 * - Missing or corrupt store file → empty cache (warns, does not throw).
 * - Dropped jobs are never recorded (no `set()` call); they are re-evaluated next run.
 * - `set()` on an existing URL updates verdict fields but **preserves the original `firstSeenAt`**
 *   (pruning age is from first evaluation, not last refresh).
 * - `save()` prunes entries older than {@link PRUNE_AFTER_DAYS} days, then writes atomically
 *   (temp file + rename) so a crash mid-write cannot corrupt the store.
 */
export class VerdictCache {
    private entries: Map<string, CachedVerdict>;

    private constructor(entries: Map<string, CachedVerdict>) {
        this.entries = entries;
    }

    /** Load the cache from {@link VERDICT_CACHE_PATH}. Missing/corrupt → empty cache (warn). */
    static load(): VerdictCache {
        if (!existsSync(VERDICT_CACHE_PATH)) {
            return new VerdictCache(new Map());
        }
        try {
            const raw = readFileSync(VERDICT_CACHE_PATH, "utf-8");
            const parsed = JSON.parse(raw) as VerdictStore;
            if (!parsed || typeof parsed !== "object" || !parsed.entries || typeof parsed.entries !== "object") {
                throw new Error("store JSON is not a valid VerdictStore");
            }
            const map = new Map<string, CachedVerdict>();
            for (const [url, v] of Object.entries(parsed.entries)) {
                if (v && typeof v.status === "string" && Array.isArray(v.reason) && typeof v.firstSeenAt === "string") {
                    map.set(url, v as CachedVerdict);
                }
            }
            return new VerdictCache(map);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`⚠️  Verdict cache unreadable (${msg}), starting fresh.`);
            return new VerdictCache(new Map());
        }
    }

    /** True if the URL has a stored verdict. */
    has(url: string): boolean {
        return this.entries.has(url);
    }

    /** Reconstruct an {@link EvaluatedJob} from a cached verdict + a freshly-crawled job body.
     *
     * The `job` argument is TODAY's crawl (fresh `date`/`jobDetails`/etc.); the cached verdict
     * fields (`status`, `reason`, `experienceLevel`, `skills`) are stamped onto it. Returns
     * `undefined` if the URL isn't cached (shouldn't happen if `has()` was checked first). */
    toEvaluatedJob<T extends BaseJob>(job: T): EvaluatedJob<T> | undefined {
        const v = this.entries.get(job.jobURL);
        if (!v) return undefined;
        return {
            job,
            status: v.status,
            reason: v.reason,
            ...(v.experienceLevel !== undefined ? { experienceLevel: v.experienceLevel } : {}),
            ...(v.skills !== undefined ? { skills: v.skills } : {}),
        };
    }

    /** Record a fresh verdict extracted from an {@link EvaluatedJob}.
     *
     * If the URL already has an entry, updates verdict fields but **preserves the original
     * `firstSeenAt`** (so pruning age is measured from first evaluation, not last refresh).
     * If new, sets `firstSeenAt = now` (default: current time). */
    set<T extends BaseJob>(evaluatedJob: EvaluatedJob<T>, now: Date = new Date()): void {
        const url = evaluatedJob.job.jobURL;
        const existing = this.entries.get(url);
        const verdict: CachedVerdict = {
            status: evaluatedJob.status,
            reason: evaluatedJob.reason,
            ...(evaluatedJob.experienceLevel !== undefined ? { experienceLevel: evaluatedJob.experienceLevel } : {}),
            ...(evaluatedJob.skills !== undefined ? { skills: evaluatedJob.skills } : {}),
            firstSeenAt: existing?.firstSeenAt ?? now.toISOString(),
            site: evaluatedJob.job.site,
        };
        this.entries.set(url, verdict);
    }

    /** Persist to disk atomically: prune old entries, write a temp file, then rename. */
    save(now: Date = new Date()): void {
        // Prune entries older than PRUNE_AFTER_DAYS.
        const cutoff = now.getTime() - PRUNE_AFTER_DAYS * 24 * 60 * 60 * 1000;
        for (const [url, v] of this.entries) {
            const ts = Date.parse(v.firstSeenAt);
            if (Number.isNaN(ts) || ts < cutoff) {
                this.entries.delete(url);
            }
        }

        const store: VerdictStore = {
            version: 1,
            entries: Object.fromEntries(this.entries),
        };

        const absDir = join(process.cwd(), dirname(VERDICT_CACHE_PATH));
        const absPath = join(process.cwd(), VERDICT_CACHE_PATH);
        const absTmp = absPath + ".tmp";
        try {
            mkdirSync(absDir, { recursive: true });
            writeFileSync(absTmp, JSON.stringify(store, null, 2), "utf-8");
            renameSync(absTmp, absPath);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`⚠️  Could not persist verdict cache: ${msg}`);
        }
    }
}
