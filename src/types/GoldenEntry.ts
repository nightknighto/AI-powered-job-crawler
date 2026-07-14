import { BaseJob } from "./base.js";
import { JobStatus } from "./evaluated-job.js";

/**
 * The one filter rule a golden-dataset case exists to test.
 *
 * Each value maps to a file under `src/evals/cases/<category>.ts` and is
 * independently selectable via the `--category` CLI flag, so a run can be
 * scoped to a single rule at a time.
 */
export type CaseCategory =
    | "title-seniority"
    | "internship"
    | "tech-stack"
    | "role-type"
    | "experience"
    | "location"
    | "ambiguous"
    | "multi-cause";

/**
 * A single hand-labeled case in the unified golden dataset.
 *
 * The eval library is organized one file per {@link CaseCategory}; each case
 * isolates exactly one filter rule (single-causal by construction) so that
 * per-category accuracy directly pinpoints which rules a model mishandles.
 * `multi-cause` is the deliberate exception — its cases carry several valid
 * failure reasons and are scored on status only.
 *
 * Cases are sourced from REAL crawled jobs wherever possible (verbatim from
 * `storage/datasets/*.json` or historical `realJobs` arrays). Synthetic
 * gap-fillers (`real: false`) exist only for rule coverage that no real job
 * supplies — e.g. internship titles — and use clearly-fake URLs.
 */
export interface GoldenEntry {
    /**
     * Signal-descriptive slug, globally unique, stable under insert/remove.
     *
     * Format: `<category-prefix>-<what-makes-this-case-unique>[-status]`
     * (e.g. `exp-threshold-4yr-fail`, `role-qa-junior-fail`,
     * `ambig-dualstack-pm`). The suffix describes the case's signal — never a
     * sequence number — so adding or removing a sibling case never forces a
     * renumber.
     */
    id: string;
    /** The ONE filter rule this case isolates. Also determines its file. */
    category: CaseCategory;
    /**
     * `true` if sourced from a real crawled job (storage/datasets or
     * historical realJobs); `false` if a synthetic gap-filler.
     */
    real: boolean;
    /** The job listing to feed into the LLM (minimal `BaseJob` shape, no `tags`). */
    job: BaseJob;
    /** The expected evaluation status (ground truth). */
    expectedStatus: JobStatus;
    /**
     * What signal this case isolates and why it is single-causal — which
     * filters are deliberately green so only the target rule can trigger.
     * Shown in the eval report on mismatch to aid human inspection.
     */
    isolationNote: string;
}
