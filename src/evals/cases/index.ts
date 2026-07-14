import { CaseCategory, GoldenEntry } from "../../types/GoldenEntry.js";
import { titleSeniorityCases } from "./title-seniority.js";
import { internshipCases } from "./internship.js";
import { techStackCases } from "./tech-stack.js";
import { roleTypeCases } from "./role-type.js";
import { experienceCases } from "./experience.js";
import { locationCases } from "./location.js";
import { ambiguousCases } from "./ambiguous.js";
import { multiCauseCases } from "./multi-cause.js";

/**
 * Every filter-rule category the case library covers. Mirrors `filter.md`'s rule
 * sections plus the two special categories `ambiguous` (POTENTIAL_MATCH fallback)
 * and `multi-cause` (compound-rejection behavior). Order is stable for report
 * rendering.
 */
export const CASE_CATEGORIES: CaseCategory[] = [
    "title-seniority",
    "internship",
    "tech-stack",
    "role-type",
    "experience",
    "location",
    "ambiguous",
    "multi-cause",
];

/**
 * All cases grouped by category. This is the single source of truth for the
 * golden dataset — `eval.ts`, `compare-models.ts`, and `compare-prompts.ts`
 * resolve their case set through {@link getAllCases} / {@link getCasesByIds}.
 */
export const casesByCategory: Record<CaseCategory, GoldenEntry[]> = {
    "title-seniority": titleSeniorityCases,
    internship: internshipCases,
    "tech-stack": techStackCases,
    "role-type": roleTypeCases,
    experience: experienceCases,
    location: locationCases,
    ambiguous: ambiguousCases,
    "multi-cause": multiCauseCases,
};

/** Flat list of every case across all categories. */
const ALL_CASES: GoldenEntry[] = Object.values(casesByCategory).flat();

/**
 * Lookup by case ID. Constructed once at module load; a duplicate ID anywhere in
 * the library throws here, surfacing the collision immediately rather than
 * silently corrupting a run.
 */
export const casesById: Map<string, GoldenEntry> = (() => {
    const map = new Map<string, GoldenEntry>();
    for (const entry of ALL_CASES) {
        if (map.has(entry.id)) {
            throw new Error(
                `Duplicate golden case id "${entry.id}" — each case id must be globally unique.`,
            );
        }
        map.set(entry.id, entry);
    }
    return map;
})();

/**
 * Resolve the case set for a benchmark run.
 *
 * @param category - When set, scope to a single rule category (the `--category`
 *   CLI flag). When omitted, returns every case across all categories.
 * @returns The selected golden cases.
 */
export function getAllCases(category?: CaseCategory): GoldenEntry[] {
    return category ? casesByCategory[category] : ALL_CASES;
}

/**
 * Resolve a cherry-picked case set by ID (the `--cases id1,id2` CLI flag).
 *
 * @param ids - Case IDs to include. Order is preserved.
 * @throws if any ID is unknown (typo / removed case).
 */
export function getCasesByIds(ids: string[]): GoldenEntry[] {
    const missing = ids.filter((id) => !casesById.has(id));
    if (missing.length > 0) {
        throw new Error(
            `Unknown case id(s): ${missing.join(", ")}. Valid ids: ${[...casesById.keys()].join(", ")}.`,
        );
    }
    return ids.map((id) => casesById.get(id)!);
}
