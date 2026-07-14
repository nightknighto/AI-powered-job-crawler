import { GoldenEntry } from "../../types/GoldenEntry.js";

/**
 * Cases isolating the **Experience Filter** (`filter.md` §Experience): reject if the
 * minimum of any stated experience range is 4+ years; keep at 0-3; POTENTIAL_MATCH
 * only when no explicit years but contextual seniority signals are present.
 *
 * Every case here keeps every OTHER filter green (junior/non-lead title, JS/TS
 * stack, dev role, remote/hybrid-Egypt location, not an internship) so experience
 * is the only rule that can trigger. The experience boundary is the isolated
 * variable.
 */
export const experienceCases: GoldenEntry[] = [
    // ── Experience-threshold FAIL (4+ years stated, everything else green) ──
    {
        id: "exp-threshold-4yr-fail",
        category: "experience",
        real: true,
        job: {
            site: "jooble",
            jobTitle: "Node.js Developer",
            jobURL: "https://eg.jooble.org/desc/-6202297379795509143",
            company: "Capgemini",
            location: "Cairo",
            date: "Vacancy posted 4 days ago",
            jobDetails: [
                "Job Description\n\nJob Requirements:\n\nBachelor’s Degree in Computer Engineering, Computer Science or any related field\n4-6 years of experience working in software development\nStrong Proficiency in Back-end Development using NodeJS, Restful APIs, OOP Concepts\nExperience in Front-end Development (Preferably Vue) and familiarity with front-end frameworks in general (Angular, React)\nGood Experience in Cloud Development, preferably Google Cloud Platform (GCP) (Serverless Development, Logging and Monitoring, CloudSQL and Analytics (BigQuery))\nExperience working with Relational Databases (preferably Postgres SQL)\nTerraform (IaC) and General CI/CD knowledge is a plus.\nExperience/Familiarity with Java & Spring Boot is a plus\nExcellent debugging and problem-solving skills.\nExcellent communication skills and the ability to contribute to 360 constructive feedback cycles.\nExperience working in Agile teams and familiarity with agile ceremonies and practices.\nFluent in English",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "4-6 years → min 4 → FAIL. Non-senior title ('Node.js Developer'), clean JS/TS primary stack (Node.js/Vue; Java/Spring only 'a plus'), dev role, no location signal. Only the experience threshold can trigger.",
    },

    // ── Experience-threshold FAIL (second variant: 4+ years, hybrid Egypt) ──
    {
        id: "exp-threshold-4yr-hybrid-fail",
        category: "experience",
        real: true,
        job: {
            site: "wuzzuf",
            jobTitle: "Backend Node js Developer",
            jobURL: "https://wuzzuf.net/jobs/p/cphbhepphcek-backend-node-js-developer-objects-alexandria-egypt",
            company: "Objects",
            location: "Alexandria, Egypt",
            date: "posted 24 hours ago",
            jobDetails: [
                "Job Description\nBackend Development\nDevelop and maintain scalable backend services and APIs using Node.js.\nImplement business logic, integrations, and optimize system performance.\nTroubleshoot technical and production issues.\nOCS & System Integration\nBuild and maintain integrations with OCS, internal platforms, and third-party systems.",
                "Job Requirements\nBachelor's degree in Computer Science, Software Engineering, Information Systems, or related field.\n4+ years of experience in Node.js backend development.\nStrong experience building scalable microservices and distributed systems.\nExperience with REST APIs, integrations, and event-driven architectures.",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "4+ years → FAIL. Non-senior title, pure Node.js stack, dev role, hybrid Egypt (location PASS). Only experience triggers.",
    },

    // ── Experience boundary PASS (2-5 years → min 2; clean JS/TS) ──
    {
        id: "exp-boundary-2yr-pass",
        category: "experience",
        real: true,
        job: {
            site: "linkedin",
            jobTitle: "Java Front End Developer",
            jobURL: "https://www.linkedin.com/jobs/view/java-front-end-developer-at-network-international-4437420383",
            company: "Network International",
            location: "Egypt",
            date: "6 days ago",
            jobDetails: [
                "Job Description\n\nAbout Us:\n\nNetwork International is the largest Financial Technology company in Middle East and Africa. Payments is our core business where we provide services in more than 50 countries – UAE, Jordan, South Africa, Egypt are some of our key markets. Apart from payments, we provide services on Data and Insights, Lending, Insurance, Risk Solutions, etc. Our core customers are businesses at every scale and segment, though recently we are growing in direct-to-consumer card segment as well.\n\nOur EVP's\n\nAt Network International, we always stay ahead. . In the fast-paced world of financial services, we thrive on innovation, agility, and purposeful collaboration. We invest first in our people, empowering you to make bold decisions, learn fast, and grow your expertise alongside industry leaders. Here, solving complex problems means more than using cutting-edge technology; it’s about creating meaningful value for our customers, together. We foster a culture where trust, accountability, and achievement go hand in hand—because success isn’t just a goal; it’s how we work, every day, as one team.\n\nJob Description\n\nWe are seeking a skilled and experienced Middle Frontend Developer to join our innovative team. You will play a crucial role in designing and developing robust web applications.\n\nThis is an exciting opportunity to contribute to challenging projects and collaborate with a talented group of developers.\n\nResponsibilities\n\nCollaborate with cross-functional teams to gather and analyze requirements, translating them into technical specifications. \nDevelop and implement high-quality frontend solutions using JavaScript, React, and related technologies. \nWrite clean, maintainable, and scalable code. \nOptimize applications for maximum performance and scalability. \nConduct code reviews and provide constructive feedback to maintain code quality and ensure adherence to architectural guidelines. \nCollaborate with UX/UI designers to create intuitive and visually appealing user interfaces.\nTroubleshoot and debug issues, identifying and implementing effective solutions.\n\nEducation\n\nBachelor’s degree in computer science, Software Engineering, or a related field (or equivalent practical experience).\n\nExperience\n\n2-5 YEARS of Experience in frontend development with a focus on JavaScript and React.\nProficient understanding of web markup languages such as HTML5 and CSS3. \nStrong knowledge of frontend builds tools and module bundlers (Webpack, Babel, etc.)\nExperience with state management libraries like Redux or MobX. \nFamiliarity with frontend testing frameworks and tools (Jest, react-test-library, Cypress, etc.). \nUnderstanding of RESTful APIs and asynchronous programming. \nProficient understanding Git. \nStrong problem-solving and analytical skills with excellent attention to detail. \nAbility to work both independently and collaboratively, excellent communication and interpersonal skills. \nA strong portfolio or examples of previous work demonstrating frontend development skills.\nAbility to work both independently and collaboratively, excellent communication and interpersonal skills. \nA strong portfolio or examples of previous work demonstrating frontend development skills.\n\nKnowledge/Skills:\n\nExperience with backend technologies such as Node.js, Express, or similar frameworks. \nKnowledge of server-side rendering (SSR). \nFamiliarity with UI/UX design principles and collaboration with designers. \nExposure to mobile app development using React Native or similar frameworks. \n\n Network International is an equal opportunity employer. We welcome and encourage applications from candidates of all backgrounds, nationalities, and experience levels. We are committed to creating an inclusive workplace where innovation, diversity, and performance thrive.",
            ],
        },
        expectedStatus: "PASS",
        isolationNote:
            "2-5 years → min 2 → PASS. Title says 'Java' but body is pure JS/React ('Middle' ≠ senior/lead), Node.js/Express secondary (allowed). Dev role, no on-site signal. The experience range lower bound is the boundary under test; every other filter is green.",
    },

    // ── No explicit years, no seniority signals → PASS (do not invent rejection) ──
    {
        id: "exp-no-signals-pass",
        category: "experience",
        real: true,
        job: {
            site: "linkedin",
            jobTitle: "(AI pilled) Software developer",
            jobURL: "https://www.linkedin.com/jobs/view/ai-pilled-software-developer-at-stackdrop-4439521752",
            company: "Stackdrop",
            location: "Egypt",
            date: "2 days ago",
            jobDetails: [
                "At Stackdrop, we help organizations turn messy operations into sleek, scalable internal tools. Using platforms like Retool, we build the kind of software that makes businesses faster, smarter, and a whole lot less frustrated with spreadsheets.\n\nWe believe that great software doesn’t just run - it empowers people. As part of our dev team, you won’t just write code, you’ll craft solutions that help real businesses work better every single day.\nHave many careers in one company.\nEnjoy flexibility and autonomy in your work.\nLearn and grow alongside seasoned architects and product experts.\n\nWhat will your typical day look like?\nBuild with Retool: Design and ship custom internal apps that automate, simplify, and delight.\nShape the data: Design robust schemas, manage SQL databases, and keep performance sharp and scalable.\nWrite clean JavaScript​: Build intuitive, maintainable functionality that makes our Retool apps sing.\nOwn your projects: Take part in client discovery, translate technical needs into solutions, and deliver on time with quality.\nTest like you mean it: Debug and QA your own work to ensure smooth, reliable deployments.\nCollaborate & level up: Pair with architects, PMs, and teammates to learn fast, ask questions, and master new tools and integrations.\n\nAbout the team\nWe’re a growing agency that thrives on solving real-world problems for SMEs and enterprises. Our work spans automation, integrations, and internal platforms, always with a focus on delivering practical impact.\nAt Stackdrop, developers aren’t stuck in silos. You’ll have ownership, visibility, and the chance to influence how we build, not just what we build.\n\nEnough about us, let’s talk about you\nFluent in English - confident working directly with clients and teammates.\nStrong JavaScript skills, with the willingness (or eagerness) to master Retool.\nProficient in database design, SQL, and data management best practices.\nIndependent problem-solver, able to manage your own priorities in an agile workflow.\nMeticulous about testing, QA, and documentation.\nBonus if you:\nLove learning new tools and frameworks quickly\nHave experience with integrations, APIs, or automation platforms\nGeek out over building tools that make businesses run smoother\n\nOur promise to you\nYou’ll get to work on meaningful projects, sharpen your technical chops, and have a direct impact on how businesses operate day-to-day. No endless feature bloat, no busywork - just solving real problems with smart software.\nWe value curiosity, accountability, and collaboration. You’ll be trusted with ownership and encouraged to experiment, fail fast, and learn faster.\n\nIf you can refactor chaos into clean queries, ship tools that make life easier, and still find joy in a well-placed console.log ~ we want you in our repo 🚀",
            ],
        },
        expectedStatus: "PASS",
        isolationNote:
            "No years stated and no seniority signals (no 'led teams', 'scaled to millions', etc.) → must NOT invent an experience rejection. JS primary, dev role, non-senior title, no on-site signal. Tests the rule that absent experience info means PASS, not FAIL.",
    },

    // ── Clean PASS baseline (0-8 years, pure JS/TS) ──
    {
        id: "exp-zero-to-eight-pass",
        category: "experience",
        real: true,
        job: {
            site: "linkedin",
            jobTitle: "Frontend Developer",
            jobURL: "https://www.linkedin.com/jobs/view/frontend-developer-at-datamatics-technologies-4435938762",
            company: "Datamatics Technologies",
            location: "Cairo, Cairo, Egypt",
            date: "3 days ago",
            jobDetails: [
                "Frontend Developer (0–8 Years Experience)Job Title: Frontend DeveloperExperience: 0–8 YearsLocation: Job Summary\nWe are seeking a passionate and skilled Frontend Developer to build modern, responsive, and high-performance web applications. The ideal candidate should have experience developing user interfaces using modern JavaScript frameworks, collaborating with cross-functional teams, and delivering scalable frontend solutions.\nKey Responsibilities\nDesign, develop, and maintain responsive web applications\nBuild reusable UI components and optimize applications for maximum performance\nCollaborate with UX/UI designers, backend developers, and product teams\nIntegrate frontend applications with RESTful APIs and backend services\nWrite clean, maintainable, and well-tested code following industry best practices\nTroubleshoot, debug, and improve application performance\nParticipate in code reviews and contribute to continuous improvement initiatives\nMust Have Skills\nJavaScript (ES6+) AND TypeScript\nReact.js OR Next.js OR Vue.js OR Angular OR Svelte OR Nuxt.js\nWebpack OR Vite OR Rollup OR Parcel OR esbuild OR Turbopack\nHTML5 AND CSS3 AND Responsive Web Design\nREST APIs AND JSON AND API Integration\nGit AND GitHub OR GitLab OR Bitbucket\nnpm OR Yarn OR pnpm\nUnderstanding of frontend architecture, reusable components, and responsive design principles\nStrong debugging, problem-solving, and communication skills\nGood to Have Skills\nRedux OR Context API OR Zustand OR Pinia OR Vuex\nJest OR Vitest OR React Testing Library OR Cypress\nCI/CD tools such as GitHub Actions OR GitLab CI OR Jenkins\nCloud platforms such as AWS OR Azure OR Google Cloud Platform (GCP)\nCSS frameworks such as Tailwind CSS OR Bootstrap OR Material UI (MUI) OR Chakra UI\nBuild optimization and performance tuning techniques\nKnowledge of accessibility standards (WCAG) and SEO best practices\nExperience working in Agile/Scrum environments\nPreferred Qualifications\nBachelor's degree in Computer Science, Software Engineering, or a related field\n0–8 years of frontend development experience\nAbility to work independently as well as collaboratively in a team environment\nPassion for learning new frontend technologies and best practices",
            ],
        },
        expectedStatus: "PASS",
        isolationNote:
            "0-8 years → min 0 → PASS. Pure JS/TS stack, dev role, non-senior title. The cleanest positive baseline in the library — every filter is green, including experience.",
    },
];
