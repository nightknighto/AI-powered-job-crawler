import { GoldenEntry } from "../../types/GoldenEntry.js";

/**
 * Cases isolating the **Role Type Filter** (`filter.md` §Role Type): only
 * Frontend/Backend/Fullstack Developer and DevOps/Infra Engineer roles are
 * acceptable. Reject QA/Tester, Product Manager/Owner, Designer/UX/UI, Data
 * Analyst/Scientist/Engineer, Scrum Master, Support — AND vendor/low-code/no-code
 * platform specialists (ServiceNow, Salesforce, SAP, Workday, MS Power Platform,
 * Dynamics 365, OutSystems, Mendix) even when the title says "Developer"/"Engineer".
 *
 * Every case here keeps title-seniority, tech-stack, experience, location, and
 * internship green so role type is the only rule that can trigger. The vendor
 * cases specifically isolate the "disguised-as-Developer" trap.
 */
export const roleTypeCases: GoldenEntry[] = [
    // ── QA/Test role FAIL (junior title, remote, JS/Node stack — all else green) ──
    {
        id: "role-qa-junior-fail",
        category: "role-type",
        real: true,
        job: {
            site: "workable",
            jobTitle: "Junior Test Engineer",
            jobURL: "https://jobs.workable.com/view/nLxQJnpNnWrjFf2iDonPyJ/remote-junior-test-engineer-in-cairo-at-cequens",
            company: "CEQUENS",
            location: "Cairo, Cairo Governorate, Egypt",
            date: "Posted 5 days ago",
            jobDetails: [
                "Description\n\nCEQUENS is a leading global communications platform as a service (CPaaS, SaaS, AI) provider that simplifies customer engagement for businesses through its innovative, reliable, and secure communication solutions. Established in 2011, CEQUENS offers a comprehensive suite of APIs, including SMS, WhatsApp for Business, Voice, Push Notifications, and more, enabling seamless and personalized interactions across multiple channels.\n\nOur partner network covers MEA region with international access to messaging hubs worldwide and our clients include major banks, credit cards, digital payments, OTT applications, government authorities, health and education, and other industry verticals.\n\nIf you have the passion for success and are ready to constantly challenge yourself within a collaborative team-environment join our team.\n\nCEQUENS is seeking a Junior Test Engineer to support the quality assurance process across web applications and APIs. You’ll work closely with developers and product teams to ensure reliable, scalable software\n\nKey Responsibilities\nDesign, write, and execute test cases and test plans\nPerform manual and automated testing of web applications and APIs\nTest backend services built with Node.js (RESTful APIs, microservices)\nIdentify, log, and track bugs using tools like Jira\nCollaborate with developers to reproduce and resolve issues\nWrite and maintain automated test scripts\nParticipate in code reviews and sprint ceremonies (Agile/Scrum)\nPerform regression, integration, and smoke testing\nAssist in CI/CD pipeline testing process",
                "Requirements\n\nGood understanding of software testing principles\nFamiliarity with JavaScript and Node.js\nUnderstanding of API testing (REST, JSON)\nKnowledge of tools like:\nPostman / Insomnia (API testing)\nSelenium, Playwright, or Cypress (automation)\nBasic knowledge of version control (Git)\nUnderstanding of HTTP/HTTPS protocols",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "Test/QA role → role-type FAIL. Junior title (no senior/lead), JS/Node stack present, remote (location PASS), no years stated. Only the QA role triggers — isolates the non-dev-role rejection when every other filter is green.",
    },

    // ── Vendor-platform FAIL (MS Dynamics, titled "Developer", 3+yr PASS) ──
    {
        id: "role-vendor-dynamics-fail",
        category: "role-type",
        real: true,
        job: {
            site: "jooble",
            jobTitle: "MS Dynamics CRM Developer",
            jobURL: "https://eg.jooble.org/desc/7369167652908063462",
            company: "Capgemini",
            location: "Cairo",
            date: "Vacancy posted 1 day ago",
            jobDetails: [
                "Long Description\n\nCapgemini is looking for a skilled Microsoft Dynamics 365 CRM Developer to design, develop, and implement high‑quality CRM solutions as part of our Microsoft Business Applications practice. The role involves working closely with functional consultants and clients to deliver scalable, secure, and high‑performing Dynamics 365 Customer Engagement solutions.\n\nThe developer will be responsible for custom development, integrations, and extending Dynamics 365 using the Power Platform and Azure services.\n\nKey Responsibilities\nDynamics 365 Development\nDesign, develop, and maintain custom solutions on Microsoft Dynamics 365 CE\nImplement customizations including:\nPlugins (C#)\nCustom workflows\nJavaScript (Client‑side scripting)\nCustom APIs and actions\nDevelop and customize:\nEntities / Tables\nForms, Views, Dashboards\nBusiness Process Flows\nPower Platform & Extensions\nDevelop Power Platform components including:\nPower Apps (Model‑driven and Canvas – as required)\nPower Automate flows\nImplement security roles, field‑level security, and access control\nSupport Power BI integrations from Dynamics 365 data sources\nIntegrations & Data\nDevelop and support integrations with external systems using:\nWeb APIs (REST / OData)\nAzure Logic Apps / Azure Functions\nService Bus (nice to have)\nParticipate in data migration activities using tools such as:\nData Import Wizard\nKingswaySoft / SSIS (preferred)\nCollaboration & Delivery\nWork closely with functional consultants to translate functional designs into technical solutions\nParticipate in Agile ceremonies including sprint planning, reviews, and retrospectives\nSupport testing phases (SIT, UAT) and production deployments\nTroubleshoot and resolve technical issues across environments\nDocumentation & Best Practices\nCreate and maintain technical design documents\nFollow Capgemini development standards and Microsoft best practices\nEnsure solution quality, performance optimization, and maintainability\nRequired Qualifications\nExperience\n3+ years of experience developing on Microsoft Dynamics 365 CRM / CE\nHands‑on experience with at least one end‑to‑end Dynamics 365 implementation\nExperience working within a consulting or project‑based delivery model\nTechnical Skills\nStrong proficiency in:\nC# / .NET\nJavaScript\nDynamics 365 SDK and Web API\nSolid understanding of:\nDynamics 365 solution architecture\nPower Platform development concepts\nFamiliarity with:\nAzure DevOps\nCI/CD pipelines for Dynamics 365\nKnowledge of Agile / Scrum methodologies",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "Titled 'Developer' but the role is Microsoft Dynamics 365 / Power Platform specialization → vendor-platform role-type FAIL. 3+ years (min 3, experience PASS), non-senior title. Isolates the 'disguised-as-Developer' vendor trap; JavaScript appears but does not rescue it.",
    },

    // ── Data Engineer role FAIL (remote, Node/TS/React stack — all else green) ──
    {
        id: "role-data-eng-fail",
        category: "role-type",
        real: true,
        job: {
            site: "linkedin",
            jobTitle: "Full Stack Data Engineer ",
            jobURL: "https://www.linkedin.com/jobs/view/full-stack-data-engineer-at-aspire-jordan-4434885058",
            company: "Aspire, Jordan",
            location: "Egypt",
            date: "4 days ago",
            jobDetails: [
                "Job Description\nThis is a remote position.\nAbout the Role\nAs a Full Stack Data Engineer at Aspire, you will be responsible for working across the full data lifecycle—from ingestion and transformation to surfacing insights via web applications—while taking end-to-end ownership of features. You will collaborate closely with product, engineering, and data teams to build modern data pipelines and user-facing interfaces, with a strong focus on reliability and incident communication during on-call rotations.\nWhat You'll Do\nDesign, build, and maintain modern ELT pipelines and data transformation workflows.\nDevelop and enhance web applications using Node.js, TypeScript, GraphQL, and React.\nOwn work end-to-end—from raw data ingestion to user-facing interfaces.\nWrite clean, maintainable code and collaborate with cross-functional teams (Product, Engineering, Data).\nUse dbt (data build tool) for data transformation and modeling.\nImplement and manage cloud infrastructure using Terraform.\nParticipate in a weekly on-call rotation, ensuring system reliability and prompt incident response.\nStay current with the modern data stack and continuously improve our data architecture.\nCollaborate effectively with a distributed team primarily based in Mountain Time (Salt Lake City, UT).\n What You'll Need\nSolid experience with ELT processes and modern data pipeline design.\nProficiency in dbt (data build tool) for data transformation and modeling.\nStrong SQL skills across analytical and operational workloads.\nInfrastructure as Code experience using Terraform.\nBackend development experience with Node.js and TypeScript.\nAPI design and implementation experience with GraphQL.\nFrontend development experience with React.\nExperience with Snowflake as a cloud data warehouse.\nHands-on experience with AWS cloud services.\nFamiliarity with Apache Airflow for workflow orchestration.\nExperience with Looker for data visualization and BI.\nPython scripting for data tasks and automation.\nVersion control and collaboration using GitHub.\nWhy Aspire\nIn addition to a competitive long-term total compensation package with salary and performance-based bonus, we have a reward philosophy that goes beyond compensation.\nBe part of a remote-first organization where flexibility is embraced.\nWork and learn alongside talented engineers and technology leaders.\nExplore opportunities to learn and grow through technical and non-technical training programs.\nGain global exposure by working on products with international teams and clients.\nAttend virtual and in-person international technology conferences to expand your knowledge and network.",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "Data Engineer role → role-type FAIL (data roles are explicitly rejected even with a JS/TS stack). Fully remote (location PASS), no years stated, non-senior title, Node/TS/React stack present. Isolates the non-dev-role rejection independent of stack.",
    },
];
