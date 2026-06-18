import { GoldenEntry } from "../../../types/GoldenEntry.js";
import { WuzzufJob } from "../../../types/WuzzufJob.js";

// ─────────────────────────────────────────────────────────
// 9 real jobs from jobs.json, hand-labeled
// ─────────────────────────────────────────────────────────

const realJobs: GoldenEntry<WuzzufJob>[] = [
    // #1 — Senior Full Stack Developer (Doha, Qatar) → FAIL: Senior title + non-Egypt remote OK but Senior is hard reject
    {
        job: {
            jobTitle: "Senior Full Stack Developer",
            jobURL: "https://wuzzuf.net/jobs/p/lbuzsd9zelzl-senior-full-stack-developer-doha-qatar",
            company: "Confidential",
            location: "Doha, Qatar",
            date: "posted 2 days ago",
            jobDetails: [
                "Job Description\nWe are seeking an experienced Senior Full Stack Developer to lead the design, development, and maintenance of modern websites and digital platforms. The ideal candidate will have strong expertise in both front-end and back-end development, system architecture, API integrations, database management, and cloud deployment. The role requires excellent problem-solving skills, attention to detail, and the ability to work independently while collaborating with cross-functional teams.\nKey Responsibilities\nDesign, develop, test, and maintain scalable web applications.\nBuild responsive and user-friendly front-end interfaces.\nDevelop secure and efficient back-end services and APIs.\nIntegrate third-party services, payment gateways, CRM, ERP, and external APIs.\nOptimize application performance, security, and scalability.\nDesign and manage relational and non-relational databases.\nParticipate in system architecture and technical decision-making.\nTroubleshoot, debug, and resolve technical issues\nConduct code reviews and mentor junior developers.\nCollaborate with designers, project managers, and stakeholders.\nMaintain technical documentation and development standards.\nImplement CI/CD pipelines and deployment automation.",
                "Job Requirements\n5+ years of professional experience in Full Stack Development.\nExperience with modern front-end frameworks such as React, Next.js, Vue.js, or Angular.\nStrong back-end development experience using Node.js, PHP Laravel, Python Django, .NET, or similar frameworks.\nExperience with RESTful APIs and GraphQL.\nStrong knowledge of MySQL, PostgreSQL, MongoDB, or similar databases.\nExperience with Git version control and collaborative development workflows.\nFamiliarity with Docker, cloud platforms, and deployment processes.\nUnderstanding of software architecture, design patterns, and security best practices.\nExcellent communication and problem-solving skills.\nPreferred Qualifications\nExperience with WordPress development and custom plugin development.\nExperience with SaaS platforms and multi-tenant architectures.\nKnowledge of AWS, Google Cloud, or Azure.\nExperience with DevOps tools and CI/CD pipelines.\nExperience with AI integrations and automation platforms such as n8n, Make, or Zapier.\nExperience integrating CRM and ERP systems.",
            ],
            tags: "Full Time, Freelance / Project, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["senior"],
    },

    // #2 — Senior QA Engineer (London, UK) → FAIL: Senior + QA (non-dev role)
    {
        job: {
            jobTitle: "Senior QA Engineer",
            jobURL: "https://wuzzuf.net/jobs/p/itozuc6x5z7c-senior-qa-engineer-zealous-solutions-ltd-london-united-kingdom",
            company: "Zealous Solutions Ltd.",
            location: "London, United Kingdom",
            date: "posted 2 days ago",
            jobDetails: [
                "Job Description\nAbout the Job\nAre you the kind of tester who takes personal responsibility for the quality of what ships - someone who doesn't wait for a test plan but looks at a feature and already knows where the risks are? Then this role is for you.\n \nYour work will directly impact the 500+ organisations and 180,000+ creators who use Zealous. We're a submissions management platform trusted by clients like the Saatchi Gallery, British Library, and Cass Arts.\nWe've been around for 15 years and we're small on purpose - no layers of management, no unnecessary process. You'll join our existing development team in Egypt and report to our QA Lead.\n \nThe Role\nWe're looking for someone who is both strategic and happy to get their hands dirty. You'll own QA across the Zealous platform - building automated test suites, doing hands-on exploratory testing, and writing bug reports developers can act on. You'll decide what needs deep testing and what needs a quick smoke test. This is your function to shape; we'll give you context and support, but we won't micromanage how you do it.",
                "Job Requirements\nRequired:\n5+ years in software testing, comfortable with both manual and automated approaches\nHands-on browser-based automation (e.g. Selenium)\nSolid API testing (Postman, REST Assured, or similar)\nAbility to write and maintain test scripts (Java, JavaScript)\nCI/CD experience (Bitbucket Pipelines, Jenkins) and integrating tests into pipelines\nStrong spoken and written English\nAbility to manage your own time and priorities without being chased",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["QA", "senior"],
    },

    // #3 — Oracle APEX Developer (Cairo, Egypt, Hybrid) → FAIL: non-JS/TS stack (Oracle)
    {
        job: {
            jobTitle: "Oracle APEX Developer",
            jobURL: "https://wuzzuf.net/jobs/p/5fiergofyeuz-oracle-apex-developer-icis-cairo-egypt",
            company: "ICIS",
            location: "القاهرة الجديدة, القاهرة",
            date: "posted 52 minutes ago",
            jobDetails: [
                "Job Description\nWe are seeking an experienced Oracle APEX Developer with a minimum of 5 years of hands-on experience in designing, developing, and maintaining robust APEX applications. The ideal candidate will be responsible for translating business requirements into scalable and high-performance solutions, ensuring the reliability and security of the applications.",
                "Job Requirements\nExperience: Minimum of 5 years of hands-on experience in Oracle APEX development.\nEducation: Bachelor's degree in Computer Science, Information Technology, or a related field.\nProficiency in SQL and PL/SQL: In-depth knowledge and proficiency in writing complex SQL queries and PL/SQL code.\nAPEX Skills: Strong expertise in Oracle APEX development, including building interactive reports, forms, and charts.\nOracle Forms and Reports Experience: Proven experience in developing and maintaining applications using Oracle Forms and Reports.\nDatabase Knowledge: Solid understanding of Oracle Database concepts, design principles, and optimization techniques.",
            ],
            tags: "دوام كامل, عمل هجين",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["Oracle", "non-JS"],
    },

    // #4 — Full Stack Developer (Actum.cx, Cairo, Remote) → PASS: JS/TS stack, 0-10yr, remote, junior-friendly
    {
        job: {
            jobTitle: "Full Stack Developer",
            jobURL: "https://wuzzuf.net/jobs/p/lzugdm6ettas-full-stack-developer-actum-cx-cairo-egypt",
            company: "Actum.cx",
            location: "Cairo, Egypt",
            date: "posted 6 days ago",
            jobDetails: [
                "Job Description\nwe're Hiring Full Stack Developer (Full-Time / Part-Time)\nWe are seeking motivated and talented Full Stack Developers to join our growing engineering team. This is an opportunity to work on a high-impact product, contribute to meaningful technical challenges, and collaborate with a team focused on building scalable, reliable, and modern software solutions.\nTechnology Stack\n NestJS\n Go (Golang)\n React.js\n Next.js\n TypeScript",
                "Job Requirements\n0-10 Years of Experience",
            ],
            tags: "Full Time, Part Time, Remote",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["TypeScript", "React", "Next.js"],
    },

    // #5 — Technical SEO Specialist (Arlington, US, Remote) → FAIL: non-dev role (SEO)
    {
        job: {
            jobTitle: "Technical SEO Specialist",
            jobURL: "https://wuzzuf.net/jobs/p/cgylsyv5jf2u-technical-seo-specialist-harper-media-group-arlington-united-states",
            company: "Harper Media Group",
            location: "Arlington, United States",
            date: "posted 2 days ago",
            jobDetails: [
                "Job Description\nTechnical SEO Specialist - MID / SENIOR \nDeep technical execution is your zone. You're comfortable in server logs, Search Console, Screaming Frog, and the browser DevTools. You implement structured data, diagnose crawl issues, interpret Core Web Vitals data, and translate complex findings into clear recommendations.",
                "Job Requirements\nRequirements across all roles \nEvery candidate we hire shares a core set of qualities regardless of the specific role. This is our baseline.\n Proven, hands-on SEO experience — we hire practitioners, not theorists\n Comfort operating independently in a fully remote, async-first environment\n Strong written communication — you can translate technical findings into clear, client-ready language",
            ],
            tags: "Full Time, Part Time, Freelance / Project, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["SEO"],
    },

    // #6 — Full Stack Developer (Thobify, Riyadh Saudi Arabia, Remote) → PASS: Next.js/TS stack, remote OK (non-Egypt remote is OK), 3yr exp OK
    {
        job: {
            jobTitle: "Full Stack Developer",
            jobURL: "https://wuzzuf.net/saudi/jobs/p/cvujxzic6usq-full-stack-developer-thobify-riyadh-saudi-arabia",
            company: "Thobify",
            location: "Riyadh, Saudi Arabia",
            date: "تم النشر منذ 3 days",
            jobDetails: [
                "وصف الوظيفة\nThobify is an AI-powered custom thobe marketplace launching in Saudi Arabia. We connect customers with the country's finest tailors — letting them scan their body measurements, browse tailor portfolios, customize their thobe in 3D, and place an order in under 5 minutes.\nYou'll be the lead developer on a greenfield build. The architecture and design direction are ready — you bring it to life.\nStack: Next.js (App Router), TypeScript, Tailwind CSS, Supabase, Three.js, Vercel.\nThis is a fully remote, full-time role with direct access to the founder.",
                "متطلبات الوظيفة\n3+ years with React or Next.js\nTypeScript (strict mode)\nExperience with Supabase or Firebase\nComfortable building and consuming REST APIs",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["Next.js", "TypeScript", "React"],
    },

    // #7 — Backend Node.js Developer (Alexandria, Egypt, Hybrid) → FAIL: 4+ years experience (>3yr threshold)
    {
        job: {
            jobTitle: "Backend Node js Developer",
            jobURL: "https://wuzzuf.net/jobs/p/cphbhepphcek-backend-node-js-developer-objects-alexandria-egypt",
            company: "Objects",
            location: "Alexandria, Egypt",
            date: "posted 24 hours ago",
            jobDetails: [
                "Job Description\nBackend Development\nDevelop and maintain scalable backend services and APIs using Node.js.\nImplement business logic, integrations, and optimize system performance.\nTroubleshoot technical and production issues.\nOCS & System Integration\nBuild and maintain integrations with OCS, internal platforms, and third-party systems.",
                "Job Requirements\nBachelor's degree in Computer Science, Software Engineering, Information Systems, or related field.\n4+ years of experience in Node.js backend development.\nStrong experience building scalable microservices and distributed systems.\nExperience with REST APIs, integrations, and event-driven architectures.",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["experience", "4"],
    },

    // #8 — Technical Lead – Full Stack Developer (Makkah, Saudi Arabia) → FAIL: "Lead" in title
    {
        job: {
            jobTitle: "Technical Lead – Full Stack Developer",
            jobURL: "https://wuzzuf.net/saudi/jobs/p/v40yllbxu3v2-technical-lead-full-stack-developer-ayvo-makkah-saudi-arabia",
            company: "Ayvo",
            location: "مكة المكرمة, المملكة العربية السعودية",
            date: "تم النشر منذ 5 days",
            jobDetails: [
                "وصف الوظيفة\nWe are seeking an experienced and highly skilled Technical Lead – Full Stack Developer to join our team. The ideal candidate will lead the design and development of scalable web applications while providing technical guidance and mentorship to the development team. This role combines hands-on full-stack development with architectural ownership and team leadership, using modern technologies such as React, Next.js, Node.js, and AWS.",
                "متطلبات الوظيفة\nBachelor's degree in Computer Science, Engineering, or a related field (or equivalent practical experience).\nMinimum of 5 years of experience in full-stack web development, with experience in a technical leadership role.\nStrong proficiency in HTML, CSS, and JavaScript, with a primary focus on React.\nAdvanced experience with the Next.js framework.\nExpertise in back-end technologies including Node.js, Express, and NestJS.",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["lead"],
    },

    // #9 — Frontend Developer (Egypt, Hybrid) → PASS: React/TS stack, Egypt+Hybrid, 2yr exp
    {
        job: {
            jobTitle: "Frontend Developer",
            jobURL: "https://wuzzuf.net/jobs/p/frontend-developer-company-cairo-egypt",
            company: "TechCo",
            location: "Cairo, Egypt",
            date: "posted 1 day ago",
            jobDetails: [
                "Job Description\nWe are looking for a Frontend Developer to join our team building modern web applications with React and TypeScript. You will work closely with designers and backend engineers to deliver pixel-perfect, performant user interfaces.",
                "Job Requirements\n2+ years of experience with React and TypeScript\nFamiliarity with Next.js and modern CSS\nUnderstanding of REST APIs and Git workflows",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["React", "TypeScript"],
    },
];

// ─────────────────────────────────────────────────────────
// 23 synthetic jobs covering uncovered filter rules
// ─────────────────────────────────────────────────────────

const syntheticJobs: GoldenEntry<WuzzufJob>[] = [
    // ─── Internship Filter ───

    // #10 — Internship in title
    {
        job: {
            jobTitle: "Frontend Development Internship",
            jobURL: "https://wuzzuf.net/jobs/p/internship-frontend-dev-cairo",
            company: "StartupHub",
            location: "Cairo, Egypt",
            date: "posted 1 hour ago",
            jobDetails: [
                "Job Description\nJoin our team as a frontend development intern. You will work with React and TypeScript on real projects.",
                "Job Requirements\nBasic knowledge of HTML, CSS, and JavaScript\nWillingness to learn React and TypeScript\nAvailable for 3 months",
            ],
            tags: "Internship, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["intern"],
    },

    // #11 — Intern in description text (no intern in title)
    {
        job: {
            jobTitle: "Junior Web Developer",
            jobURL: "https://wuzzuf.net/jobs/p/junior-web-dev-intern-cairo",
            company: "WebAgency",
            location: "Giza, Egypt",
            date: "posted 3 hours ago",
            jobDetails: [
                "Job Description\nWe are offering a paid intern position for a junior web developer. You will assist the team in building web applications using modern JavaScript frameworks.",
                "Job Requirements\nBasic understanding of JavaScript and HTML\nEager to learn and grow\nThis is an intern role with potential for full-time conversion",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["intern"],
    },

    // ─── Senior Title Exception (title says Senior but 2-3yr acceptable) ───

    // #12 — Senior title but explicitly says 2-3 years acceptable
    {
        job: {
            jobTitle: "Senior Frontend Developer",
            jobURL: "https://wuzzuf.net/jobs/p/senior-frontend-dev-exception-cairo",
            company: "FlexiTech",
            location: "Cairo, Egypt",
            date: "posted 5 hours ago",
            jobDetails: [
                "Job Description\nWe are looking for a Senior Frontend Developer to lead our React projects. However, we consider 2-3 years of hands-on experience with React/TypeScript to be acceptable for this role if you demonstrate strong skills. The title is Senior but we value demonstrated ability over years.",
                "Job Requirements\n2-3 years of experience with React and TypeScript is acceptable\nStrong understanding of modern frontend practices\nExperience with Next.js is a plus",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["2-3 years", "acceptable"],
    },

    // ─── Manager / Head of / Principal / Director Titles ───

    // #13 — Manager in title
    {
        job: {
            jobTitle: "Engineering Manager",
            jobURL: "https://wuzzuf.net/jobs/p/engineering-manager-cairo",
            company: "CorpTech",
            location: "Cairo, Egypt",
            date: "posted 1 day ago",
            jobDetails: [
                "Job Description\nWe are looking for an Engineering Manager to lead our frontend team. You will manage a team of 8 developers working on React and Node.js applications.",
                "Job Requirements\n5+ years of experience in software development\n2+ years in a management role\nExperience with React and Node.js",
            ],
            tags: "Full Time, On-site",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["manager"],
    },

    // #14 — Head of in title
    {
        job: {
            jobTitle: "Head of Engineering",
            jobURL: "https://wuzzuf.net/jobs/p/head-of-engineering-cairo",
            company: "ScaleUp",
            location: "Cairo, Egypt",
            date: "posted 2 days ago",
            jobDetails: [
                "Job Description\nWe are hiring a Head of Engineering to oversee all technical operations. Our stack is primarily Node.js and React.",
                "Job Requirements\n8+ years of experience\nProven leadership in engineering teams",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["head of"],
    },

    // #15 — Principal in title
    {
        job: {
            jobTitle: "Principal Software Engineer",
            jobURL: "https://wuzzuf.net/jobs/p/principal-engineer-cairo",
            company: "BigCorp",
            location: "Cairo, Egypt",
            date: "posted 3 days ago",
            jobDetails: [
                "Job Description\nWe are seeking a Principal Software Engineer to set technical direction for our Node.js microservices platform.",
                "Job Requirements\n10+ years of experience\nDeep expertise in distributed systems",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["principal"],
    },

    // #16 — Director in title
    {
        job: {
            jobTitle: "Director of Software Development",
            jobURL: "https://wuzzuf.net/jobs/p/director-software-cairo",
            company: "EnterpriseCo",
            location: "Cairo, Egypt",
            date: "posted 4 days ago",
            jobDetails: [
                "Job Description\nDirector of Software Development needed to lead multiple engineering teams building web applications with React and TypeScript.",
                "Job Requirements\n10+ years of experience\n5+ years in leadership",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["director"],
    },

    // #17 — Staff in title
    {
        job: {
            jobTitle: "Staff Software Engineer",
            jobURL: "https://wuzzuf.net/jobs/p/staff-engineer-cairo",
            company: "MegaTech",
            location: "Cairo, Egypt",
            date: "posted 1 day ago",
            jobDetails: [
                "Job Description\nStaff Software Engineer role focused on building scalable backend services with Node.js and TypeScript.",
                "Job Requirements\n7+ years of experience\nExpert-level Node.js and TypeScript",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["staff"],
    },

    // ─── Non-JS/TS Tech Stack ───

    // #18 — Flutter / mobile-first
    {
        job: {
            jobTitle: "Mobile Developer",
            jobURL: "https://wuzzuf.net/jobs/p/flutter-mobile-dev-cairo",
            company: "AppHouse",
            location: "Cairo, Egypt",
            date: "posted 2 hours ago",
            jobDetails: [
                "Job Description\nWe are building a mobile-first product using Flutter and Dart. You will be responsible for the entire mobile app lifecycle.",
                "Job Requirements\n2+ years of Flutter/Dart experience\nExperience publishing apps to app stores",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["Flutter", "mobile"],
    },

    // #19 — React Native mobile-first
    {
        job: {
            jobTitle: "React Native Developer",
            jobURL: "https://wuzzuf.net/jobs/p/react-native-dev-cairo",
            company: "MobileFirst",
            location: "Cairo, Egypt",
            date: "posted 4 hours ago",
            jobDetails: [
                "Job Description\nJoin our mobile team building cross-platform apps with React Native. This is a mobile-first role focused entirely on iOS and Android app development.",
                "Job Requirements\n2+ years of React Native experience\nExperience with native modules and mobile deployments",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["React Native", "mobile"],
    },

    // #20 — PHP / Laravel
    {
        job: {
            jobTitle: "Backend Developer",
            jobURL: "https://wuzzuf.net/jobs/p/laravel-backend-dev-cairo",
            company: "PHPCorp",
            location: "Cairo, Egypt",
            date: "posted 6 hours ago",
            jobDetails: [
                "Job Description\nWe are looking for a Backend Developer to build and maintain our Laravel-based e-commerce platform. The primary stack is PHP with Laravel framework.",
                "Job Requirements\n2+ years of PHP/Laravel experience\nKnowledge of MySQL and Redis",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["PHP", "Laravel"],
    },

    // #21 — Python / Django
    {
        job: {
            jobTitle: "Backend Developer",
            jobURL: "https://wuzzuf.net/jobs/p/django-backend-dev-cairo",
            company: "PyShop",
            location: "Cairo, Egypt",
            date: "posted 8 hours ago",
            jobDetails: [
                "Job Description\nBackend Developer needed to build REST APIs using Python and Django. Our entire platform runs on Django with PostgreSQL.",
                "Job Requirements\n2+ years of Python/Django experience\nStrong understanding of REST API design",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["Python", "Django"],
    },

    // #22 — Java / Spring
    {
        job: {
            jobTitle: "Java Developer",
            jobURL: "https://wuzzuf.net/jobs/p/java-spring-dev-cairo",
            company: "EnterpriseSoft",
            location: "Cairo, Egypt",
            date: "posted 1 day ago",
            jobDetails: [
                "Job Description\nWe are hiring a Java Developer to work on our enterprise platform built with Spring Boot and microservices architecture.",
                "Job Requirements\n3+ years of Java/Spring Boot experience\nFamiliarity with Kafka and Docker",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["Java", "Spring"],
    },

    // #23 — .NET / C#
    {
        job: {
            jobTitle: ".NET Developer",
            jobURL: "https://wuzzuf.net/jobs/p/dotnet-developer-cairo",
            company: "DotNetCorp",
            location: "Cairo, Egypt",
            date: "posted 2 days ago",
            jobDetails: [
                "Job Description\nWe need a .NET Developer to build web APIs using C# and ASP.NET Core. The role involves working on our SaaS platform.",
                "Job Requirements\n2+ years of C#/.NET experience\nExperience with Entity Framework and SQL Server",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: [".NET", "C#"],
    },

    // #24 — Ruby / Rails
    {
        job: {
            jobTitle: "Ruby on Rails Developer",
            jobURL: "https://wuzzuf.net/jobs/p/rails-dev-cairo",
            company: "RailsShop",
            location: "Cairo, Egypt",
            date: "posted 3 days ago",
            jobDetails: [
                "Job Description\nRuby on Rails Developer to maintain and extend our e-commerce platform. Primary stack is Ruby with Rails framework and PostgreSQL.",
                "Job Requirements\n2+ years of Ruby on Rails experience\nFamiliarity with Sidekiq and Redis",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["Ruby", "Rails"],
    },

    // #25 — Kotlin
    {
        job: {
            jobTitle: "Kotlin Developer",
            jobURL: "https://wuzzuf.net/jobs/p/kotlin-dev-cairo",
            company: "KotlinShop",
            location: "Cairo, Egypt",
            date: "posted 1 day ago",
            jobDetails: [
                "Job Description\nKotlin Developer for building backend microservices using Ktor and Kotlin. This role focuses on server-side Kotlin development.",
                "Job Requirements\n2+ years of Kotlin backend experience\nExperience with Ktor or Spring (Kotlin)",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["Kotlin"],
    },

    // ─── Non-Dev Roles ───

    // #26 — Product Manager
    {
        job: {
            jobTitle: "Product Manager",
            jobURL: "https://wuzzuf.net/jobs/p/product-manager-cairo",
            company: "ProductCo",
            location: "Cairo, Egypt",
            date: "posted 5 hours ago",
            jobDetails: [
                "Job Description\nProduct Manager to lead our web platform roadmap. You will work with engineering teams building React and Node.js applications. Technical background in JS/TS is a plus.",
                "Job Requirements\n3+ years in product management\nUnderstanding of web development lifecycle",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["product manager"],
    },

    // #27 — UI/UX Designer
    {
        job: {
            jobTitle: "UI/UX Designer",
            jobURL: "https://wuzzuf.net/jobs/p/ui-ux-designer-cairo",
            company: "DesignStudio",
            location: "Cairo, Egypt",
            date: "posted 3 hours ago",
            jobDetails: [
                "Job Description\nUI/UX Designer to create beautiful interfaces for our React-based web application. Familiarity with front-end development is helpful but not required.",
                "Job Requirements\n2+ years of UI/UX design experience\nProficiency in Figma",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["designer"],
    },

    // #28 — Data Analyst
    {
        job: {
            jobTitle: "Data Analyst",
            jobURL: "https://wuzzuf.net/jobs/p/data-analyst-cairo",
            company: "DataCorp",
            location: "Cairo, Egypt",
            date: "posted 1 day ago",
            jobDetails: [
                "Job Description\nData Analyst to extract insights from our platform data. Some scripting with JavaScript/Python may be needed for data pipelines.",
                "Job Requirements\n2+ years of data analysis experience\nProficiency in SQL and Python",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["data analyst"],
    },

    // ─── Location Filters ───

    // #29 — On-site only (no remote/hybrid in tags)
    {
        job: {
            jobTitle: "Full Stack Developer",
            jobURL: "https://wuzzuf.net/jobs/p/fullstack-onsite-cairo",
            company: "OnSiteCo",
            location: "Cairo, Egypt",
            date: "posted 2 hours ago",
            jobDetails: [
                "Job Description\nFull Stack Developer needed for our Cairo office. You will work on-site with our team building applications with React and Node.js. No remote work option available.",
                "Job Requirements\n2+ years of experience with React and Node.js\nMust work from our Cairo office daily",
            ],
            tags: "Full Time",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["on-site"],
    },

    // #30 — Hybrid + non-Egypt location → FAIL
    {
        job: {
            jobTitle: "Frontend Developer",
            jobURL: "https://wuzzuf.net/jobs/p/frontend-hybrid-dubai",
            company: "DubaiTech",
            location: "Dubai, UAE",
            date: "posted 4 hours ago",
            jobDetails: [
                "Job Description\nFrontend Developer to work on our React application. This is a hybrid role requiring 3 days per week in our Dubai office.",
                "Job Requirements\n2+ years of React and TypeScript experience\nMust be able to commute to Dubai office 3 days/week",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "FAIL",
        expectedReasonKeywords: ["hybrid", "Dubai", "non-Egypt"],
    },

    // #31 — Remote + non-Egypt → PASS (remote from anywhere is OK)
    {
        job: {
            jobTitle: "Full Stack Developer",
            jobURL: "https://wuzzuf.net/jobs/p/fullstack-remote-berlin",
            company: "BerlinStart",
            location: "Berlin, Germany",
            date: "posted 6 hours ago",
            jobDetails: [
                "Job Description\nFull Stack Developer for a fully remote position. Our tech stack is Next.js, TypeScript, and Node.js. Work from anywhere in the world.",
                "Job Requirements\n2+ years of Next.js and TypeScript experience\nStrong Node.js backend skills",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["Next.js", "TypeScript", "remote"],
    },

    // #32 — Ambiguous stack (Node.js + Python equally prominent) → POTENTIAL_MATCH
    {
        job: {
            jobTitle: "Full Stack Developer",
            jobURL: "https://wuzzuf.net/jobs/p/fullstack-ambiguous-stack-cairo",
            company: "AmbigCorp",
            location: "Cairo, Egypt",
            date: "posted 3 hours ago",
            jobDetails: [
                "Job Description\nFull Stack Developer to work on both our Node.js microservices and Python data processing pipelines. The role involves equal time between the Node.js API layer and the Python ML pipeline. Our frontend is React with TypeScript.",
                "Job Requirements\n2+ years of experience with both Node.js and Python\nFamiliarity with React and TypeScript\nWilling to work across both stacks equally",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "POTENTIAL_MATCH",
        expectedReasonKeywords: ["Python"],
    },

    // ─── Challenging PASS jobs (edge cases the LLM might misclassify) ───

    // #33 — Vue.js + TypeScript → PASS: Vue is JS/TS ecosystem, LLM might not recognize it
    {
        job: {
            jobTitle: "Frontend Developer",
            jobURL: "https://wuzzuf.net/jobs/p/vue-frontend-dev-cairo",
            company: "VueHouse",
            location: "Cairo, Egypt",
            date: "posted 2 hours ago",
            jobDetails: [
                "Job Description\nWe are building a modern SaaS dashboard using Vue 3, TypeScript, Pinia for state management, and Vite as our build tool. You will own the frontend architecture and collaborate with our backend team consuming REST APIs.",
                "Job Requirements\n2+ years of experience with Vue.js and TypeScript\nExperience with Pinia or Vuex\nFamiliarity with Vite and modern CSS",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["Vue", "TypeScript"],
    },

    // #34 — Angular + TypeScript, Egypt Hybrid → PASS: Angular is JS/TS, but LLMs sometimes don't categorize it
    {
        job: {
            jobTitle: "Frontend Developer",
            jobURL: "https://wuzzuf.net/jobs/p/angular-frontend-giza",
            company: "AngularCorp",
            location: "Giza, Egypt",
            date: "posted 5 hours ago",
            jobDetails: [
                "Job Description\nJoin our team building enterprise-grade web applications with Angular and TypeScript. You will work on complex forms, data tables, and real-time dashboards using RxJS and NgRx.",
                "Job Requirements\n2+ years of Angular and TypeScript experience\nStrong understanding of RxJS\nExperience with Angular Material or PrimeNG",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["Angular", "TypeScript"],
    },

    // #35 — Generic "Software Engineer" title, JS/TS primary but buried among DevOps/cloud buzzwords → PASS
    {
        job: {
            jobTitle: "Software Engineer",
            jobURL: "https://wuzzuf.net/jobs/p/software-engineer-cloud-cairo",
            company: "CloudScale",
            location: "Cairo, Egypt",
            date: "posted 1 day ago",
            jobDetails: [
                "Job Description\nSoftware Engineer to join our platform team. You will design and implement microservices deployed on Kubernetes, manage CI/CD pipelines, configure Terraform modules, optimize Docker images, monitor with Grafana and Prometheus, and develop our core API services in Node.js with TypeScript using Express and PostgreSQL.",
                "Job Requirements\n2+ years of backend development with Node.js and TypeScript\nExperience with Docker, Kubernetes, and CI/CD\nFamiliarity with PostgreSQL and Redis",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["Node.js", "TypeScript"],
    },

    // #36 — Next.js job where Python is "nice to have" → PASS: tests ignoring secondary tech
    {
        job: {
            jobTitle: "Full Stack Developer",
            jobURL: "https://wuzzuf.net/jobs/p/nextjs-fullstack-alex",
            company: "DataWeb",
            location: "Alexandria, Egypt",
            date: "posted 3 hours ago",
            jobDetails: [
                "Job Description\nFull Stack Developer to build and maintain our customer-facing web platform. Our core stack is Next.js (App Router), TypeScript, Tailwind CSS, and Prisma with PostgreSQL. You will build features end-to-end from database schema to UI components.",
                "Job Requirements\n2+ years with Next.js and TypeScript\nExperience with Prisma or similar ORMs\nExperience with Python and FastAPI is a plus but not required\nFamiliarity with REST APIs and Git",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["Next.js", "TypeScript"],
    },

    // #37 — Express.js + MongoDB backend only, no frontend → PASS: pure backend JS is still dev
    {
        job: {
            jobTitle: "Backend Developer",
            jobURL: "https://wuzzuf.net/jobs/p/express-backend-mansoura",
            company: "APIShop",
            location: "Mansoura, Egypt",
            date: "posted 4 hours ago",
            jobDetails: [
                "Job Description\nBackend Developer to build and maintain our REST API serving mobile and web clients. Our backend is built with Express.js, TypeScript, and MongoDB with Mongoose ODM. No frontend work required.",
                "Job Requirements\n2+ years of Node.js/Express.js experience\nStrong TypeScript skills\nExperience with MongoDB and Mongoose\nUnderstanding of REST API design patterns",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["Express", "Node.js", "TypeScript"],
    },

    // #38 — Arabic description + Arabic tags, NestJS/TS → PASS: tests Arabic location parsing
    {
        job: {
            jobTitle: "Backend Developer",
            jobURL: "https://wuzzuf.net/jobs/p/nestjs-backend-arabic-cairo",
            company: "تكنو.sol",
            location: "القاهرة, مصر",
            date: "تم النشر منذ 2 hours",
            jobDetails: [
                "وصف الوظيفة\nنبحث عن مطور Backend للانضمام لفريقنا. مكدس التقنيات يشمل NestJS و TypeScript و PostgreSQL. سنقوم ببناء واجهات برمجة تطبيقات REST و GraphQL لتخدم تطبيقات الويب والموبايل الخاصة بنا.",
                "متطلبات الوظيفة\nسنتان أو أكثر من الخبرة في NestJS و TypeScript\nخبرة في PostgreSQL و TypeORM\nفهم جيد لمبادئ REST و GraphQL",
            ],
            tags: "دوام كامل, عمل هجين",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["NestJS", "TypeScript"],
    },

    // #39 — "Mid-level" title (not senior), 3yr exp → PASS: mid-level ≠ senior, 3yr is the boundary and acceptable
    {
        job: {
            jobTitle: "Mid-level Full Stack Developer",
            jobURL: "https://wuzzuf.net/jobs/p/midlevel-fullstack-cairo",
            company: "GrowthTech",
            location: "Cairo, Egypt",
            date: "posted 6 hours ago",
            jobDetails: [
                "Job Description\nWe are hiring a Mid-level Full Stack Developer to work on our React and Node.js platform. You will build new features, write tests, and participate in code reviews. This is not a senior or lead position — you will receive mentorship and guidance.",
                "Job Requirements\n3 years of experience with React and Node.js\nExperience with TypeScript and PostgreSQL\nComfortable with Git and CI/CD workflows",
            ],
            tags: "Full Time, Remote",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["React", "Node.js"],
    },

    // #40 — "JavaScript Developer" with vanilla JS + Node.js, no framework → PASS: plain JS counts
    {
        job: {
            jobTitle: "JavaScript Developer",
            jobURL: "https://wuzzuf.net/jobs/p/vanilla-js-dev-cairo",
            company: "PlainJS",
            location: "Cairo, Egypt",
            date: "posted 8 hours ago",
            jobDetails: [
                "Job Description\nJavaScript Developer to build custom browser-based tools and Node.js CLI utilities. We don't use any frontend framework — you will work with vanilla JavaScript, the DOM API, and Node.js for backend scripting. Strong understanding of core JS concepts is essential.",
                "Job Requirements\n2+ years of professional JavaScript experience\nDeep understanding of closures, promises, async/await, and the event loop\nExperience with Node.js for backend/scripting\nNo React/Angular/Vue experience required",
            ],
            tags: "Full Time, Hybrid",
        },
        expectedStatus: "PASS",
        expectedReasonKeywords: ["JavaScript", "Node.js"],
    },
];

/** Hand-labeled dataset of 40 jobs (9 real + 31 synthetic) for benchmarking LLM filter accuracy. */
export const wuzzufGoldenDataset = [...realJobs, ...syntheticJobs];
