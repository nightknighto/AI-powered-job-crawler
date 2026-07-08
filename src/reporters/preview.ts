import { createReporters, availableReporters } from "./index.js";
import { sampleEvaluatedJobs } from "./fixtures/sample-evaluated-jobs.js";
import { ReportContext } from "./types.js";
import { wuzzufConfig } from "../sites/wuzzuf/index.js";

// Reporter names are positional; `--only-new` toggles the only-new view (tables filtered to new).
const onlyNew = process.argv.includes("--only-new");
const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (names.length === 0) {
    console.log("Usage: tsx src/reporters/preview.ts <reporter...> [--only-new]");
    console.log(`Available reporters: ${availableReporters.join(", ")}`);
    console.log('\nExample: tsx src/reporters/preview.ts html cli-summary');
    console.log('         tsx src/reporters/preview.ts html --only-new');
    process.exit(0);
}

// Mark two sample jobs as "new" so the 🆕 badge and new-to-top sort are previewable.
const newJobUrls = new Set([
    "https://wuzzuf.net/jobs/p/senior-react-developer-abc123",
    "https://wuzzuf.net/jobs/p/frontend-developer-def456",
]);

const mockContext: ReportContext = {
    siteName: wuzzufConfig.name,
    model: "preview-model",
    timestamp: new Date(),
    outputFiles: [],
    newJobUrls,
    onlyNew: onlyNew || undefined,
};

const reporter = createReporters(names);
const sampleSummary = `
- **Full Stack Developer** — Halo
  - 📍 Cairo, Egypt | 🏠 Fully Remote | 🕒 posted 3 hours ago | 📊 N/A
  - **Description:** This fintech company is seeking a Full Stack React developer to work on both backend and front-end using Next.js, JS, and React. The role offers full autonomy without meetings, involving sole ownership of the codebase and product, with mentorship from an experienced Ex-Google CTO.
  - **Core Skills:** Next.js, React, Node.js, Supabase, TypeScript
  - **Key Requirements:**
    - Node.js, Next.js, and React.js proficiency.
    - Autonomous work style with strong communication skills.
    - Attention to detail and a focus on bug management.
    - **LIVE experience** with a Next.js + React.js project is mandatory.
  - 🔗 [Apply here](https://wuzzuf.net/jobs/p/aokjdtvyhv4u-full-stack-developer-halo-cairo-egypt)
  - 💡 **Fit:** This role is an excellent match for a mid-level JS/TS developer due to its remote nature and modern stack (Next.js/React). While it requires "LIVE experience" with the specific stack, the absence of explicit seniority keywords like "Senior" and the emphasis on coding ownership make it suitable for someone with 2-4 years of experience, provided they have practical project experience.
`;

await reporter.display(sampleEvaluatedJobs, sampleSummary, mockContext);
