# Prompt Variant Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `pnpm compare-prompts <modelKey>` script that benchmarks multiple filter prompt variants against the same model on the golden dataset.

**Architecture:** New `loadPromptVariants()` in `prompts.ts` loads baseline `filter.md` + all `.md` files from `prompts/variants/`. `runFilterEval` and `runFilterLLMCall` gain an optional prompt parameter. New `compare-prompts.ts` iterates variants, collects timing/token metrics alongside accuracy, ranks by PASS F1, and writes a comparison report. New `writePromptCompareReport()` in `report-writer.ts` generates the markdown output.

**Tech Stack:** TypeScript ESM, Node16 module resolution, existing infra (Zod, Ollama, golden dataset pipeline)

---

### Task 1: Add `loadPromptVariants()` + create variants directory

**Files:**
- Modify: `src/pipeline/prompts/prompts.ts`
- Create: `src/pipeline/prompts/variants/.gitkeep`

**Steps:**

1. Create the empty variants directory (`src/pipeline/prompts/variants/`)
2. Add `loadPromptVariants()` to `prompts.ts` after line 14

The function:
- Pushes baseline `filterPrompt` as `{ name: "filter", prompt: filterPrompt }`
- Reads all `.md` files from `variants/` directory (if it exists)
- Validates at least 2 total variants exist (baseline + ≥1 custom)
- Validates no duplicate names
- Warns on missing `{{jobs}}` placeholder
- Returns `{ name: string; prompt: string }[]`

```typescript
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
```

3. Verify with `npx tsc --noEmit`
4. Commit

---

### Task 2: Parameterize prompt in `runFilterLLMCall` and `runFilterEval`

**Files:**
- Modify: `src/pipeline/run-filter.ts`

**Steps:**

1. Add `prompt?: string` to `runFilterLLMCall`'s `options` parameter. Change line 125 to use `options.prompt ?? filterPrompt` instead of `filterPrompt`.

```typescript
// Line 123: extend options type
options: { mode: MergeMode; prompt?: string },

// Line 125: use custom prompt when provided
const promptContent = (options.prompt ?? filterPrompt).replace("{{jobs}}", JSON.stringify(jobs, null, 2));
```

2. Add `ModelCallMetrics` interface (after `runFilterLLMCall`, before `runFilterEval`):

```typescript
export interface ModelCallMetrics {
    totalDurationMs: number;
    promptEvalDurationMs: number;
    evalDurationMs: number;
    inputTokens: number;
    outputTokens: number;
}
```

3. Update `runFilterEval` to accept optional `prompt` param, pass it through, extract metrics from `response`, and include `metrics` in return type:

```typescript
export async function runFilterEval(
    modelKey: ModelConfigKey,
    goldenDataset: GoldenEntry[],
    prompt?: string,
): Promise<{
    aiOutput: EvaluatedJob<BaseJob>[];
    comparison: GoldenComparisonResult;
    heuristics: HeuristicResult[];
    metrics: ModelCallMetrics;
}> {
    const modelConfig = modelConfigs[modelKey];
    const jobs: BaseJob[] = goldenDataset.map((entry) => entry.job);

    console.log(`🤖 Evaluating ${jobs.length} jobs with ${modelConfig.model}...`);
    const { aiOutput, response } = await runFilterLLMCall(jobs, modelConfig, { mode: "tolerant", prompt });

    const metrics: ModelCallMetrics = {
        totalDurationMs: response.total_duration,
        promptEvalDurationMs: response.prompt_eval_duration,
        evalDurationMs: response.eval_duration,
        inputTokens: response.prompt_eval_count,
        outputTokens: response.eval_count,
    };

    const comparison = compareGolden(goldenDataset, aiOutput);
    const heuristics = runStructuralHeuristics(jobs, aiOutput);

    return { aiOutput, comparison, heuristics, metrics };
}
```

4. Verify with `npx tsc --noEmit`
5. Commit

---

### Task 3: Add `writePromptCompareReport()` to report-writer

**Files:**
- Modify: `src/evals/report-writer.ts`

**Steps:**

1. Import `ModelCallMetrics` from `../pipeline/run-filter.js`
2. Add `PromptCompareDetail` and `PromptCompareReportArgs` interfaces after `CompareReportArgs`
3. Add `writePromptCompareReport()` function after `writeCompareReport`
4. Add `renderPromptDisagreements()` helper function
5. Add `medalForIndex()` helper function

**Interfaces:**

```typescript
export interface PromptCompareDetail {
    variantName: string;
    accuracy: number;
    passF1: number;
    failF1: number;
    potentialMatchF1: number;
    correct: number;
    total: number;
    comparison: GoldenComparisonResult;
    heuristics: HeuristicResult[];
    aiOutputJobs: string[];
    metrics: ModelCallMetrics;
}

export interface PromptCompareReportArgs {
    modelKey: string;
    modelName: string;
    variants: PromptCompareDetail[];
    goldenDataset: GoldenEntry[];
    site?: string;
}
```

**writePromptCompareReport():** See full code in the plan above. Structure:
- Rankings table with timing/token columns
- Timing/Token summary table
- Per-variant details (metrics, class metrics, heuristics, per-job)
- Prompt disagreements table

6. Verify with `npx tsc --noEmit`
7. Commit

---

### Task 4: Create `compare-prompts.ts`

**Files:**
- Create: `src/compare-prompts.ts`

Structure mirrors `compare-models.ts` but iterates prompt variants instead of models. See the full script in the plan above.

Key points:
- CLI: `pnpm compare-prompts <modelKey> [--site <site>]`
- Validates model key, site key (same as eval.ts/compare-models.ts)
- Loads prompt variants via `loadPromptVariants()`
- For each variant, calls `evalVariant()` which runs `runFilterEval`
- Sorts by PASS F1, prints comparison table with timing
- Writes report via `writePromptCompareReport()`

Verify with `npx tsc --noEmit` and commit.

---

### Task 5: Add npm script + update docs

**Files:**
- Modify: `package.json`
- Modify: `AGENTS.md`

**Steps:**

1. Add `"compare-prompts": "tsx src/compare-prompts.ts"` to package.json scripts
2. Update AGENTS.md file structure: add `compare-prompts.ts` to src tree, add `variants/` under `src/pipeline/prompts/`
3. Verify with `npx tsc --noEmit`
4. Test CLI parsing:
   - `pnpm compare-prompts` → should show usage
   - `pnpm compare-prompts invalidModel` → should show error
5. Commit
