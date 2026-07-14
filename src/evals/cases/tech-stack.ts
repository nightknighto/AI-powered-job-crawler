import { GoldenEntry } from "../../types/GoldenEntry.js";

/**
 * Cases isolating the **Tech Stack Filter** (`filter.md` §Tech Stack): accept only
 * JS/TS-ecosystem primary stacks; reject PHP/Laravel, Python/Django, .NET/C#,
 * Java/Spring, Kotlin, Ruby/Rails, and mobile-first Flutter/React Native. A
 * JS/TS primary job that mentions a secondary language (Go, Rust, Python for
 * scripts) is still kept.
 *
 * Every case here keeps title/role/experience/location/internship green so the
 * stack is the only rule that can trigger. PASS cases isolate the
 * secondary-language exception; FAIL cases isolate a disallowed primary stack.
 */
export const techStackCases: GoldenEntry[] = [
    // ── .NET primary FAIL (junior title, hybrid Egypt, fresh grads welcome) ──
    {
        id: "tech-dotnet-junior-fail",
        category: "tech-stack",
        real: true,
        job: {
            site: "wuzzuf",
            jobTitle: "Full Stack Developer (all genders) – Junior Level",
            jobURL: "https://wuzzuf.net/jobs/p/htssgf3jpal4-full-stack-developer-all-genders-junior-level-datenlotsen-cairo-egypt",
            company: "Datenlotsen",
            location: "Nasr City, Cairo",
            date: "posted 2 days ago",
            jobDetails: [
                "Job Description\nocto education GmbH supports universities, higher education institutions, and education providers across the DACH region with software solutions that digitize and automate administrative and educational processes. As an independent IT service provider with offices in Germany, Switzerland, and Egypt, octo currently employs around 60 highly skilled and dedicated people. Our international teams collaborate closely across locations, with English as our daily working language. We follow an AI-first approach and integrate modern AI tools such as Cursor and Claude into our day-to-day development workflow. We expect all new team members to embrace this way of working and to use AI as an integral part of their daily work. \n \n \nAbout the Role \n \nBuild backend and frontend features across the product stack. \nBuild features end-to-end — backend, frontend, or both — in a product that real education providers use every day. \nUnderstand what a feature needs to do, build it cleanly, and ensure it works for the people using it. \nWork directly with a small team of developers and a product designer, shipping in sprints. \nWork from product specifications and, increasingly, define implementation approaches yourself. \nWrite tests (unit, integration, and end-to-end), including AI-generated test coverage. \nDebug with AI-assisted root cause analysis, not just gut instinct. \nDocument what you build so the next person doesn't have to reverse-engineer it. \nAsk questions about the functional domain, not just the technical requirements. \nParticipate in sprint planning, code reviews, customer demos, and sprint ceremonies. \nUse AI tools throughout your daily workflow to write code, generate tests, debug, and document.",
                "Job Requirements\n\nYour Profil  \n \nMust Have \nSolid .NET (C#) skills — our backend runs exclusively on .NET Framework. \nFrontend experience with TypeScript/JavaScript — you can build UI as well as APIs. \nUnderstanding of REST APIs, relational databases, and how frontend and backend connect. \nGit and CI/CD basics — you know how code gets from your machine to production. \nComfortable using AI development tools (Cursor, Copilot, or equivalent) as part of your daily workflow, including test generation and documentation. \nFluent written and spoken English — stand-ups, code reviews, and documentation are all in English. \nAbility to read a product specification and identify what is missing before writing a single line of code. \nWillingness to participate in sprint ceremonies and occasionally in customer demos. \n \n \n \n \n \n \n \n \n \n \n \n \nGood to Have \nFamiliarity with test automation in .NET (xUnit, NUnit, or similar). \nExperience with component-based UI development (HTML/CSS/components). \nExperience with education software, SaaS, or B2B software. \nYou care more about whether a feature works for the user than whether the code is clever. \nYou've already used Cursor, Copilot, or similar AI tools and want to use them as an integral part of your work. \nYou enjoy understanding the business problem behind a ticket, not just the acceptance criteria. \nYou're comfortable asking \"Why are we building this?\" before \"How do we build this?\" \nYou want to grow quickly in a small team rather than waiting for assignments in a large organization. \nFresh graduates are welcome. Strong graduation projects that demonstrate you can build and ship a real product—not just complete tutorials—are exactly what we're looking for. \n \nOur Offer \nReal features in a real product used by education providers across Europe — not demo projects. \nAI-first development workflow with tools, licenses, and the expectation that you'll use them. \nDirect collaboration with product, design, and senior developers from day one. \nInternational team with daily English communication. \nMedical and social insurance. \nHybrid working model: 2 days in our Nasr City office, the remaining days remote. \nClear career path: Builder Junior → Professional → Senior as you take on increasing ownership. \n \nWe look at code, not just credentials. Show us something you've built—a side project, graduation project, or anything that runs. A GitHub repository with a README is worth more than a long CV.",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "Backend 'runs exclusively on .NET Framework (C#)' → tech-stack FAIL. Junior title, fresh-grad welcome (experience green), hybrid Egypt (location PASS), dev role. The TS/JS frontend is present but secondary — primary stack is the disallowed .NET.",
    },

    // ── Mobile-first FAIL (Flutter/React Native primary, 0-11yr PASS) ──
    {
        id: "tech-mobile-flutter-fail",
        category: "tech-stack",
        real: true,
        job: {
            site: "indeed",
            jobTitle: "Mobile App Developer",
            jobURL: "https://eg.indeed.com/viewjob?jk=5d5fb30a8960195d",
            company: "Datamatics Technologies",
            location: "Cairo",
            date: "N/A",
            jobDetails: [
                "\n Mobile App Developer (0–11 Years Experience)\n  Job Title: Mobile App Developer\n  Experience: 0–11 Years\n  Location:\n  Job Summary\n We are looking for a talented Mobile App Developer to design, develop, and maintain high-quality mobile applications for Android and iOS platforms. The ideal candidate should have experience with cross-platform and/or native mobile development frameworks, strong programming fundamentals, and the ability to deliver scalable, user-friendly mobile solutions.\n  Key Responsibilities\n \n  Design, develop, test, and maintain mobile applications for Android and iOS.\n  Build reusable, maintainable, and scalable application components.\n  Collaborate with product managers, designers, backend developers, and QA teams to deliver high-quality applications.\n  Integrate mobile applications with RESTful APIs and backend services.\n  Optimize applications for performance, security, and scalability.\n  Troubleshoot, debug, and resolve application issues.\n  Participate in code reviews and contribute to architecture and design discussions.\n  Publish and maintain applications on app stores following platform best practices.\n \n  Must Have Skills\n \n   Flutter OR React Native OR React Expo OR Swift OR Kotlin OR Xamarin OR Ionic OR .NET MAUI\n   Dart OR JavaScript OR TypeScript OR Swift OR Kotlin\n   Android SDK AND iOS SDK\n   REST APIs AND JSON AND API Integration\n   Git AND GitHub OR GitLab OR Bitbucket\n  Knowledge of mobile application architecture and design patterns (MVVM OR MVC OR Clean Architecture OR BLoC).\n  Experience with mobile debugging, performance optimization, and memory management.\n  Understanding of mobile application lifecycle, deployment, and release management.\n  Strong problem-solving and communication skills.\n \n  Good to Have Skills\n \n   Firebase OR Supabase OR AWS Amplify\n   SQLite OR Hive OR Realm OR Core Data OR Room\n   Redux OR Provider OR Riverpod OR GetX OR MobX OR BLoC\n   Jest OR Flutter Test OR XCTest OR Espresso OR Detox\n  Push notifications using Firebase Cloud Messaging (FCM) OR Apple Push Notification Service (APNs)\n  CI/CD tools such as GitHub Actions OR GitLab CI OR Jenkins OR Bitrise OR Codemagic\n  Experience with Google Maps, location services, camera, Bluetooth, biometrics, or payment gateway integrations.\n  Familiarity with Agile/Scrum methodologies.\n  Experience publishing applications to Google Play Store AND Apple App Store.\n \n  Preferred Qualifications\n \n  Bachelor's degree in Computer Science, Software Engineering, or a related field.\n  0–11 years of experience in mobile application development.\n  Experience developing and maintaining production-grade mobile applications.\n  Understanding of secure coding practices and mobile application security.\n  Passion for learning emerging mobile technologies and industry best practices.\n \n \n dejhBKOLYl\n",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "Mobile-first role (Flutter/React Native/Swift/Kotlin primary) → tech-stack FAIL. 0-11yr (min 0, experience PASS), non-senior title, no on-site signal. Isolates the mobile-first rejection independent of years.",
    },

    // ── JS/TS primary + Go secondary → PASS (secondary-language exception) ──
    {
        id: "tech-secondary-go-pass",
        category: "tech-stack",
        real: true,
        job: {
            site: "wuzzuf",
            jobTitle: "Full Stack Developer",
            jobURL: "https://wuzzuf.net/jobs/p/lzugdm6ettas-full-stack-developer-actum-cx-cairo-egypt",
            company: "Actum.cx",
            location: "Cairo, Egypt",
            date: "posted 6 days ago",
            jobDetails: [
                "Job Description\nwe're Hiring Full Stack Developer (Full-Time / Part-Time)\nWe are seeking motivated and talented Full Stack Developers to join our growing engineering team. This is an opportunity to work on a high-impact product, contribute to meaningful technical challenges, and collaborate with a team focused on building scalable, reliable, and modern software solutions.\nTechnology Stack\n NestJS\n Go (Golang)\n React.js\n Next.js\n TypeScript",
                "Job Requirements\n0-10 Years of Experience",
            ],
        },
        expectedStatus: "PASS",
        isolationNote:
            "Primary stack is NestJS/React/Next.js/TypeScript (JS/TS) with Go as a secondary language → PASS (secondary-language exception). 0-10yr (min 0), non-senior title, dev role, remote-eligible. Isolates the rule that a JS/TS-primary job stays accepted even when a non-JS language appears.",
    },
];
