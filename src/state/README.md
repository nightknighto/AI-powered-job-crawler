# State

Persistent cross-run state for the production pipeline.

## `verdict-cache.ts` — LLM verdict cache

Stores filter verdicts (PASS/FAIL/POTENTIAL_MATCH + reasoning) keyed by `jobURL`, so daily runs
skip re-filtering jobs seen before. Only genuinely-new postings are sent to the LLM.

### Store location & shape

- **File:** `state/verdict-cache.json` (gitignored; created on first run)
- **Scope:** one global store — job URLs are unique across sites
- **Shape:** `{ version: 1, entries: { [jobURL]: CachedVerdict } }`
- **Pruning:** entries older than 30 days (`PRUNE_AFTER_DAYS`) are dropped on each `save()`

### API

```ts
VerdictCache.load()                                       // missing/corrupt → empty (warns)
cache.has(url)                                            // boolean
cache.toEvaluatedJob(job)                                 // EvaluatedJob | undefined (fresh body + cached verdict)
cache.set(evaluatedJob)                                   // record a fresh verdict; preserves firstSeenAt on update
cache.save()                                              // atomic write (temp + rename) + prune
```

### Design rules

- **Mechanics only** — this module loads, looks up, reconstructs, records, and persists. It does
  NOT decide when to call the LLM or how to merge cached vs fresh results. That orchestration is
  a visible stage in `main.ts`'s per-site loop.
- **`evaluate.ts` is never aware of the cache.** The cache stage calls `evaluate()` with only the
  new jobs; cached jobs are reconstructed via `toEvaluatedJob()` and merged in `main.ts`.
- **Dropped jobs are never cached** — a job the LLM omitted gets no `set()` call and is
  re-evaluated next run (guards against transient LLM hiccups permanently burying a job).
- **`--refresh` preserves `firstSeenAt`** — it updates verdict fields for known URLs but keeps the
  original first-seen timestamp, so pruning age is from first evaluation, not last refresh. It
  does NOT clear the store; entries for jobs not crawled today age out via pruning.
- **Eval path is cache-free** — `eval.ts`, `compare-models.ts`, `compare-prompts.ts` never
  construct a `VerdictCache`, so golden-dataset evaluation stays deterministic.

### `--refresh` flag

`pnpm start <site> --refresh` ignores cached verdicts, re-evaluates ALL crawled jobs through the
LLM, and updates the store (preserving `firstSeenAt` for known URLs). Run this after editing
`src/pipeline/prompts/filter.md` — cached verdicts would otherwise reflect the old rules.
