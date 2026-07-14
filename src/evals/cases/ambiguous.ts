import { GoldenEntry } from "../../types/GoldenEntry.js";

/**
 * Cases isolating the **POTENTIAL_MATCH fallback** (`filter.md` §fallback): when a
 * job shows strong JS/TS potential but the details are ambiguous (dual-stack
 * where it's unclear which is primary, a non-dev title that nonetheless does JS
 * dev work, or a multi-backend listing where Node.js is one acceptable option
 * among disallowed ones), the correct verdict is POTENTIAL_MATCH rather than a
 * hard PASS or FAIL.
 *
 * These are the only cases in the library with an expected `POTENTIAL_MATCH`
 * status. They test the model's calibration on genuine ambiguity drawn from real
 * listings.
 */
export const ambiguousCases: GoldenEntry[] = [
    // ── Dual-stack ambiguity: React frontend + Ruby/Node backend ──
    {
        id: "ambig-dualstack-pm",
        category: "ambiguous",
        real: true,
        job: {
            site: "workable",
            jobTitle: "Full Stack Developer",
            jobURL: "https://jobs.workable.com/view/gKiRGiMooTRASDT9sbVkdc",
            company: "Nawy",
            location: "Qesm El Maadi, Cairo, Egypt",
            date: "5 days ago",
            jobDetails: [
                "Develop front end website architecture\nDesign user interactions on web pages\nDevelop back-end website applications\nCreate servers and databases for functionality\nEnsure cross-platform optimization for mobile phones\nEnsure responsiveness of applications\nWork alongside with graphic designers for web design features\n Observe a project from conception to a finished product\nDesign and develop APIs\nMeet both technical and consumer needs\nStay up to date with developments in web applications and programming languages\n\nRequirements\n\n1-3 years of experience in software engineering or a related field\nProficiency with fundamental front-end\n languages such as HTML, CSS\nFamiliarity with JavaScript frameworks such as JS and React\nProficiency with server-side languages such as Ruby, Node js\nFamiliarity with database technology such as MySQL, PostgreSQL\nAttention to details\nExcellent written and verbal communication skills\nExcellent written and spoken in both English and Arabic",
            ],
        },
        expectedStatus: "POTENTIAL_MATCH",
        isolationNote:
            "React frontend (JS/TS, allowed) but backend lists 'Ruby, Node js' together — Ruby/Rails is a reject stack while Node.js is allowed, and it's unclear which is primary. 1-3yr (PASS), hybrid Egypt (PASS), non-senior title. Genuine dual-stack ambiguity → POTENTIAL_MATCH.",
    },

    // ── Non-dev title doing real JS/TS dev work ──
    {
        id: "ambig-nontitle-impl-eng-pm",
        category: "ambiguous",
        real: true,
        job: {
            site: "linkedin",
            jobTitle: "Junior Implementation Engineer, MENA",
            jobURL: "https://www.linkedin.com/jobs/view/junior-implementation-engineer-mena-at-lua-ai-yc-f25-4439328386",
            company: "Lua AI (YC F25)",
            location: "Cairo, Egypt",
            date: "2 days ago",
            jobDetails: [
                "Location: Cairo, Egypt (remote / hybrid)\nReports to: Head of Operations - MENA\n\nLua is the Agent OS. We build digital employees — agents that do a real job end to end. We're a small team shipping fast, and we're looking for someone who can own implementation work across our MENA client base.\n\nResponsibilities\nBuild agent skills and tools in TypeScript using the Lua CLI — the functions that let agents take real actions like API calls, data lookups, and webhook triggers.\nSet up and configure agent environments, connect data sources, and wire up integrations for customers.\nConfigure and manage client knowledge bases.\nRun QA and testing cycles to ensure agents behave correctly in production.\nWork closely with engineering and ops to turn customer feedback into product improvements.\n\nRequirements\n1–2 years writing code (personal, academic, or professional).\nYou need to be comfortable in TypeScript or JavaScript.\nFamiliarity with REST APIs, JSON, and basic web architecture.\nStrong attention to detail — you'll be responsible for agents that act on behalf of real customers.\nFluent in Arabic and English (you'll work directly with MENA clients).\n\nGrowth Path\nMonths 1–3: Shadow implementations, ship your first agent skills.\nMonths 3–6: Own client implementations end-to-end with guidance.\nMonths 6–12: Own an implementation end-to-end.",
            ],
        },
        expectedStatus: "POTENTIAL_MATCH",
        isolationNote:
            "Title is 'Implementation Engineer' (not Frontend/Backend/Fullstack/DevOps) but the actual work is writing TypeScript agent skills/tools — real dev work. 1-2yr (PASS), remote/hybrid Egypt (PASS). The non-standard title vs. real JS dev work is the ambiguity → POTENTIAL_MATCH.",
    },

    // ── Multi-backend ambiguity: React frontend + (.NET OR Node OR PHP) backend ──
    {
        id: "ambig-multibackend-pm",
        category: "ambiguous",
        real: true,
        job: {
            site: "linkedin",
            jobTitle: "Web Developer",
            jobURL: "https://www.linkedin.com/jobs/view/web-developer-at-egic-egyptian-german-industrial-corporate-4439169233",
            company: "EGIC - Egyptian German Industrial Corporate",
            location: "Cairo, Egypt",
            date: "1 hour ago",
            jobDetails: [
                "Job Summary\n\nEGIC is seeking a talented and experienced Web Developer to design, develop, and maintain scalable web applications and internal digital solutions that support business operations and enhance user experience. The ideal candidate will have hands-on experience in both front-end and back-end development, with the ability to build secure, high-performance applications and collaborate with cross-functional teams to deliver innovative solutions.\n\nKey Responsibilities\nDesign, develop, test, and maintain web applications and internal business systems.\nDevelop responsive and user-friendly interfaces using modern front-end technologies.\nBuild and maintain back-end services, APIs, and databases.\nIntegrate third-party applications and APIs to support business requirements.\nCollaborate with business stakeholders to gather requirements and translate them into technical solutions.\nTroubleshoot, debug, and optimize application performance.\nEnsure application security, scalability, and reliability.\nParticipate in system architecture discussions, code reviews, and technical documentation.\nManage application deployments and support production environments.\nMaintain source code using version control systems and follow development best practices.\nStay up to date with emerging technologies and recommend improvements to existing applications and processes.\nProvide technical support and user training when required.\n\nQualifications\nBachelor's degree in Computer Science, Computer Engineering, Information Systems, or a related field.\n3–6 years of experience in web development, including both front-end and back-end technologies.\nExperience in developing enterprise applications and business systems is preferred.\n\nTechnical Requirements\n\nFront-End Technologies\nHTML5, CSS3, JavaScript, and TypeScript.\nExperience with React.js, Angular, or Vue.js.\nResponsive web design and Bootstrap frameworks.\nBack-End Technologies\nExperience with .NET Core / ASP.NET Core, Node.js, or PHP Laravel.\nStrong knowledge of RESTful APIs and web services.\nUnderstanding of authentication and authorization mechanisms (JWT, OAuth).\n\nDatabase Technologies\nMicrosoft SQL Server, MySQL, or PostgreSQL.\nDatabase design, optimization, and stored procedures.\nTools & Platforms\nGit and version control systems.\nAzure DevOps, Jira, or similar project management tools.\nCI/CD pipelines and deployment methodologies.\nDocker and containerization concepts.\nIIS and web server administration.\nPreferred Qualifications\nExperience with Microsoft Azure or other cloud platforms.\nKnowledge of microservices architecture.\nExperience integrating ERP systems and third-party applications.\nUnderstanding of cybersecurity best practices and secure coding standards.\nExperience with AI-driven solutions and automation tools is considered an advantage.\nCompetencies\nStrong analytical and problem-solving skills.\nExcellent communication and stakeholder management abilities.\nAbility to work independently and within cross-functional teams.\nStrong attention to detail and commitment to quality.\nProactive mindset with a focus on continuous improvement and innovation.",
            ],
        },
        expectedStatus: "POTENTIAL_MATCH",
        isolationNote:
            "Frontend is React/Angular/Vue (JS/TS, allowed) but backend options are '.NET Core / ASP.NET Core, Node.js, or PHP Laravel' — Node.js is allowed but .NET/PHP are not, and the primary is unspecified. 3-6yr (min 3 PASS), dev role, no on-site signal. Multi-backend ambiguity → POTENTIAL_MATCH.",
    },
];
