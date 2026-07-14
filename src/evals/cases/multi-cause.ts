import { GoldenEntry } from "../../types/GoldenEntry.js";

/**
 * Cases for the **multi-cause** category: jobs that fail for several valid reasons
 * at once. Unlike the single-causal categories, these deliberately carry 2+ clear
 * failing conditions, so the model may cite ANY of them — we assert status only,
 * never a specific reason.
 *
 * This category tests the model's behavior on compound-rejection jobs: does it
 * still reach the right FAIL verdict when signals overlap, and does it avoid
 * inventing a single narrow reason that ignores the other real failures?
 */
export const multiCauseCases: GoldenEntry[] = [
    // ── Senior + on-site + 8-10yr + PHP (every filter red) ──
    {
        id: "mul-senior-onsite-php-fail",
        category: "multi-cause",
        real: true,
        job: {
            site: "jooble",
            jobTitle: "Senior Web Developer - Egypt - On Site",
            jobURL: "https://eg.jooble.org/desc/5855674478867921648",
            company: "Digital Virgo",
            location: "New Cairo",
            date: "Vacancy posted 3 days ago",
            jobDetails: [
                "\n\n\n\nThe Digital Virgo Group  are global specialists in mobile payment through telecom operator billing solutions. By connecting merchants to operators, we meet the growing demand for digital payments via a simple transactional channel that is fast, secure, and available worldwide.\n\nWhen you join Digital Virgo, you become part of an innovative, international group with local teams who collaborate daily, leveraging their complementary skills. Our teams come from multicultural and diverse backgrounds - a richness that enhances our company. We’re known for our work environment, which strikes the perfect balance between ambitious projects and good humour. We take pride in encouraging individual development and initiative.\n\nFind out more about our business and the group at  digitalvirgo.com .\n\nJob Description\n\n\n\n\nDigital Virgo is looking for a Senior Web Developer to lead the production and optimization of high-performing Landing Pages (LPs) designed for Conversion Rate Optimization (CRO) . The goal is to maximize sales and margin while ensuring flawless technical execution (speed, stability, compatibility) and continuous marketing iteration (A/B testing, UX flow, wording).\n\nYou will organize and grow the local MarTech team, manage workflows with autonomy, and serve as a central interface between regional and group stakeholders.\n\nKey Responsibilities\n\nProduct & Delivery\n\nPrioritize, plan, and deliver new LPs, variants, and market/operator adaptations with fast time-to-market and stable quality.\nBuild and maintain a CRO experimentation backlog: hypotheses, variants, success criteria, A/B testing calendar.\nStandardize winning UX patterns into reusable templates, components, and QA checklists.\n\nTechnical Excellence (Performance & Quality)\n\nGuarantee ultra-light, high-performing pages (minimal weight, optimized requests), fully responsive and cross-device.\nOrganize code reviews, systematic QA (functional + analytics), post-mortems, and incident follow-ups.\nStay up-to-date on technical innovations (web performance, operator compatibility, security, antifraud) and benchmark competitors.\n\nCRO & Data-Driven Optimization\n\nDesign and execute A/B tests at scale, analyze results with the Data team, and industrialize winning variations.\nContinuously optimize copywriting, visual hierarchy, micro-interactions, and payment/consent funnels.\nBuild actionable performance dashboards (per country, offer, acquisition source).\n\nTeam Management & Development\n\nProvide structure and clarity: rituals (daily/weekly), objectives, ownership rules, definition of done.\nCoach and develop team members: skill progression, peer programming, knowledge sharing.\nSelect and manage external providers when needed (peak workloads, design, illustrations).\n\nGovernance & Communication\n\nAct as the daily interface with Advertising (traffic needs, iterations), Product (post-signup handoff), IT (billing, operator specs), BizOps (country priorities), and Data (tracking, modeling).\nProvide regular reporting to the Regional Operations Director (business) and the MarTech Director (methodology, standards, best practices).\n\nSuccess Metrics (Examples)\n\n≥ 4 CRO experiments per month on each priority country.\nMedian CR uplift on key verticals vs. baseline: +X% (to be defined per market).\nWeb performance: LCP p75 < 2.5s (on realistic mobile networks), INP p75 < 200ms.\nQuality: < 1% of releases with blocking bugs in production; 100% tracking coverage of critical events.\nDelivery: average turnaround from brief → first LP iteration ≤ 5 working days.\nKnowledge capitalization: updated templates and playbooks with inter-country reusability.\nQualifications\n\n\n\n\nRequired Skills  :\n\nExperienced web developer oriented towards CRO/Business, able to lead a team and drive iterative delivery.\n8-10   years of overall professional experience, with at least three years of proven experience leading and managing a team.\nProficient in vanilla JS, HTML5/CSS3, PHP , with knowledge of Memcached and API/AJAX calls.\nStrong expertise in web performance optimization (network, rendering, minimal bundling).\nSolid understanding of A/B testing and analytics (ideally Snowplow) with ability to interpret acquisition KPIs.\nPragmatic leadership: sets the pace, makes decisions, documents, and drives alignment.\nStrong cross-functional communication, results-oriented, and highly autonomous.",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "MULTI-CAUSE: Senior title + on-site + 8-10yr + PHP stack. Four independent failing conditions overlap. Status-only assertion — any one of these reasons is valid; the test is reaching FAIL on a compound-rejection job.",
    },

    // ── Senior + 5+yr (Qatar, remote-eligible) ──
    {
        id: "mul-senior-5yr-qatar-fail",
        category: "multi-cause",
        real: true,
        job: {
            site: "wuzzuf",
            jobTitle: "Senior Full Stack Developer",
            jobURL: "https://wuzzuf.net/jobs/p/lbuzsd9zelzl-senior-full-stack-developer-doha-qatar",
            company: "Confidential",
            location: "Doha, Qatar",
            date: "posted 2 days ago",
            jobDetails: [
                "Job Description\nWe are seeking an experienced Senior Full Stack Developer to lead the design, development, and maintenance of modern websites and digital platforms. The ideal candidate will have strong expertise in both front-end and back-end development, system architecture, API integrations, database management, and cloud deployment. The role requires excellent problem-solving skills, attention to detail, and the ability to work independently while collaborating with cross-functional teams.\nKey Responsibilities\nDesign, develop, test, and maintain scalable web applications.\nBuild responsive and user-friendly front-end interfaces.\nDevelop secure and efficient back-end services and APIs.\nIntegrate third-party services, payment gateways, CRM, ERP, and external APIs.\nOptimize application performance, security, and scalability.\nDesign and manage relational and non-relational databases.\nParticipate in system architecture and technical decision-making.\nTroubleshoot, debug, and resolve technical issues\nConduct code reviews and mentor junior developers.\nCollaborate with designers, project managers, and stakeholders.\nMaintain technical documentation and development standards.\nImplement CI/CD pipelines and deployment automation.",
                "Job Requirements\n5+ years of professional experience in Full Stack Development.\nExperience with modern front-end frameworks such as React, Next.js, Vue.js, or Angular.\nStrong back-end development experience using Node.js, PHP Laravel, Python Django, .NET, or similar frameworks.\nExperience with RESTful APIs and GraphQL.\nStrong knowledge of MySQL, PostgreSQL, MongoDB, or similar databases.\nExperience with Git version control and collaborative development workflows.\nFamiliarity with Docker, cloud platforms, and deployment processes.\nUnderstanding of software architecture, design patterns, and security best practices.\nExcellent communication and problem-solving skills.\nPreferred Qualifications\nExperience with WordPress development and custom plugin development.\nExperience with SaaS platforms and multi-tenant architectures.\nKnowledge of AWS, Google Cloud, or Azure.\nExperience with DevOps tools and CI/CD pipelines.\nExperience with AI integrations and automation platforms such as n8n, Make, or Zapier.\nExperience integrating CRM and ERP systems.",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "MULTI-CAUSE: Senior title + 5+ years experience. Two independent failing conditions (title and experience); location is remote-eligible so PASS. Status-only assertion — both Senior-title and 5+yr-experience are valid reasons to FAIL.",
    },
];
