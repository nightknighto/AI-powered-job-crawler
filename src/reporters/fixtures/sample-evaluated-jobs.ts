import { EvaluatedJob } from "../../types/evaluated-job.js";
import { WuzzufJob } from "../../types/WuzzufJob.js";

/** Sample evaluated jobs for testing reporters without running the full pipeline.
 * Covers edge cases: long skills arrays, multiline reasons, missing optional fields.
 */
export const sampleEvaluatedJobs: EvaluatedJob<WuzzufJob>[] = [
    {
        job: {
            jobTitle: "Senior React Developer",
            jobURL: "https://wuzzuf.net/jobs/p/senior-react-developer-abc123",
            company: "TechCorp Egypt",
            location: "Cairo, Egypt · Remote",
            date: "posted 2 days ago",
            jobDetails: ["Build modern web apps", "React + TypeScript stack"],
            tags: "Full Time, Remote",
        },
        status: "PASS",
        reason: ["Matches JS/TS tech stack", "Remote eligible", "Experience level appropriate"],
        experienceLevel: "3+ years",
        skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS", "GraphQL", "Redis"],
    },
    {
        job: {
            jobTitle: "Frontend Developer",
            jobURL: "https://wuzzuf.net/jobs/p/frontend-developer-def456",
            company: "StartupHub",
            location: "Alexandria, Egypt · Hybrid",
            date: "posted 5 hours ago",
            jobDetails: ["Vue.js development", "Small team, fast pace"],
            tags: "Full Time, Hybrid",
        },
        status: "PASS",
        reason: ["JS/TS ecosystem match", "Hybrid in Egypt OK"],
        experienceLevel: "1-3 years",
        skills: ["Vue.js", "TypeScript", "Tailwind CSS"],
    },
    {
        job: {
            jobTitle: "Junior Backend Engineer",
            jobURL: "https://wuzzuf.net/jobs/p/junior-backend-engineer-ghi789",
            company: "DataFlow Solutions",
            location: "Giza, Egypt · On-site",
            date: "posted just now",
            jobDetails: ["Node.js microservices", "Entry level welcome"],
            tags: "Full Time, On-site",
        },
        status: "POTENTIAL_MATCH",
        reason: ["On-site but developer role", "Entry level, tech stack matches", "Worth reviewing"],
        experienceLevel: "0-1 years",
        skills: ["Node.js", "Express", "MongoDB"],
    },
    {
        job: {
            jobTitle: "DevOps Engineer",
            jobURL: "https://wuzzuf.net/jobs/p/devops-engineer-jkl012",
            company: "CloudNine",
            location: "Remote",
            date: "posted 1 day ago",
            jobDetails: ["CI/CD pipelines", "Infrastructure as code"],
            tags: "Full Time, Remote",
        },
        status: "FAIL",
        reason: ["DevOps role — not a developer position", "Does not match required role type"],
        experienceLevel: "2+ years",
        skills: ["Docker", "Kubernetes", "Terraform", "AWS"],
    },
    {
        job: {
            jobTitle: "Lead Product Designer",
            jobURL: "https://wuzzuf.net/jobs/p/lead-product-designer-mno345",
            company: "DesignFirst",
            location: "Dubai, UAE · Remote",
            date: "posted 3 days ago",
            jobDetails: ["Lead design team", "Figma expert"],
            tags: "Full Time, Remote",
        },
        status: "FAIL",
        reason: ["Designer role — not a developer position", "Lead title indicates senior level"],
    },
    {
        job: {
            jobTitle: "Data Analyst",
            jobURL: "https://wuzzuf.net/jobs/p/data-analyst-pqr678",
            company: "InsightMetrics",
            location: "Cairo, Egypt · On-site",
            date: "posted 1 week ago",
            jobDetails: ["Python data analysis", "SQL reporting"],
            tags: "Full Time, On-site",
        },
        status: "FAIL",
        reason: ["Data Analyst — not a developer role", "Python-heavy, not JS/TS ecosystem", "On-site non-Egypt location"],
        skills: ["Python", "SQL", "Tableau"],
    },
];
