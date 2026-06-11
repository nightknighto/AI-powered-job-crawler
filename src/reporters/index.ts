import { Reporter } from "./types.js";
import { CompositeReporter } from "./composite.js";
import { CliTableReporter } from "./cli-table.js";
import { CliCardReporter } from "./cli-card.js";
import { CliSummaryReporter } from "./cli-summary.js";
import { HtmlReporter } from "./html.js";
import { MarkdownReporter } from "./markdown.js";

/** Map of reporter names to their constructors. */
export const reporterMap = {
    "cli-table": () => new CliTableReporter(),
    "cli-card": () => new CliCardReporter(),
    "cli-summary": () => new CliSummaryReporter(),
    "html": () => new HtmlReporter(),
    "markdown": () => new MarkdownReporter(),
} as const satisfies Record<string, () => Reporter>;

/** Available reporter names for validation and help text. */
export const availableReporters = Object.keys(reporterMap);

/** Create a single reporter or composite from an array of reporter names.
 * @param names - Reporter names to activate (e.g. `["html", "cli-summary"]`).
 * @returns A single Reporter (if one name) or CompositeReporter (if multiple).
 * @throws Error if any name is not in the reporter map.
 */
export function createReporters(names: string[]): Reporter {
    const reporters = names.map((name) => {
        const factory = (reporterMap as Record<string, () => Reporter>)[name];
        if (!factory) {
            throw new Error(`Unknown reporter: "${name}". Available: ${availableReporters.join(", ")}`);
        }
        return factory();
    });

    return reporters.length === 1 ? reporters[0] : new CompositeReporter(reporters);
}

export type { Reporter, ReportContext, ReportOutput } from "./types.js";
