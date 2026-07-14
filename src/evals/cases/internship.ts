import { GoldenEntry } from "../../types/GoldenEntry.js";

/**
 * Cases isolating the **Internship Filter** (`filter.md` §Internship): reject if
 * tagged Internship, or Intern appears in the title or description.
 *
 * No real crawled job in either source dataset carried an Intern/Internship
 * signal, so both cases here are synthetic gap-fillers. Each is constructed so
 * every OTHER filter is green (JS/TS dev role, ≤3yr, remote, non-senior title) —
 * only the internship rule can trigger.
 */
export const internshipCases: GoldenEntry[] = [
    // ── "Intern" in title FAIL ──
    {
        id: "intern-titled-fail",
        category: "internship",
        real: false,
        job: {
            site: "linkedin",
            jobTitle: "Frontend Developer Intern",
            jobURL: "https://eval.synthetic/intern-titled-fail",
            company: "SynthCorp",
            location: "Egypt",
            date: "posted 1 day ago",
            jobDetails: [
                "We are looking for a Frontend Developer Intern to join our team building modern web applications with React and TypeScript. You will work alongside senior engineers to deliver pixel-perfect, performant user interfaces.\n\nRequirements:\nFamiliarity with React and TypeScript\nUnderstanding of REST APIs and Git workflows\n0-1 years of experience\n\nThis is a fully remote, paid internship.",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "SYNTHETIC gap-filler: 'Intern' in the title → internship FAIL. JS/TS dev stack, remote, 0-1yr (experience green). Only the internship rule triggers via the title keyword.",
    },

    // ── "Internship" in tags/body only (title is clean) FAIL ──
    {
        id: "intern-in-body-fail",
        category: "internship",
        real: false,
        job: {
            site: "linkedin",
            jobTitle: "Frontend Developer",
            jobURL: "https://eval.synthetic/intern-in-body-fail",
            company: "SynthCorp",
            location: "Egypt",
            date: "posted 1 day ago",
            jobDetails: [
                "We are looking for a Frontend Developer to join our internship program, building modern web applications with React and TypeScript.\n\nRequirements:\nFamiliarity with React and TypeScript\nUnderstanding of REST APIs and Git workflows\n0-1 years of experience\n\nThis internship is fully remote and paid.",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "SYNTHETIC gap-filler: title is clean ('Frontend Developer') but 'internship' appears in the description → internship FAIL. JS/TS stack, remote, 0-1yr. Tests that the internship rule fires on the description signal, not just the title.",
    },
];
