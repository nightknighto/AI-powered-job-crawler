import { GoldenEntry } from "../../types/GoldenEntry.js";

/**
 * Cases isolating the **Title Filter** (`filter.md` §Title): reject if the title
 * contains Senior/Lead/Manager/Head of/Director/Principal/Staff. (Note: per
 * `filter.md`, "Senior" is NOT an automatic title-reject on its own — seniority is
 * primarily enforced via the Experience Filter and the documented 2-3yr exception.
 * The hard title rejects here are Lead/Manager/Head of/Director/Principal/Staff,
 * which cannot be overridden.)
 *
 * Every case here keeps role/stack/experience/location/internship green (where a
 * real job permits) so the title keyword is the isolated trigger. Real Lead jobs
 * all carry 4+yr, so a synthetic isolated Lead (≤3yr) fills the gap.
 */
export const titleSeniorityCases: GoldenEntry[] = [
    // ── "Lead" title FAIL (no explicit years stated; JS/TS stack) ──
    {
        id: "title-lead-speechify-fail",
        category: "title-seniority",
        real: true,
        job: {
            site: "indeed",
            jobTitle: "Tech Lead, Web Core Product & Chrome Extension - Cairo, Egypt",
            jobURL: "https://eg.indeed.com/viewjob?jk=23ed8ad64c6876d8",
            company: "Speechify",
            location: "Cairo",
            date: "N/A",
            jobDetails: [
                "\n The mission of Speechify is to make sure that reading is never a barrier to learning.\n Over 50 million people use Speechify's text-to-speech products to turn whatever they're reading – PDFs, books, Google Docs, news articles, websites – into audio, so they can read faster, read more, and remember more. Speechify's text-to-speech reading products include its iOS app, Android App, Mac App, Chrome Extension, and Web App. Google recently named Speechify the Chrome Extension of the Year and Apple named Speechify its App of the Day.\n Today, nearly 200 people around the globe work on Speechify in a 100% distributed setting – Speechify has no office. These include frontend and backend engineers, AI research scientists, and others from Amazon, Microsoft, and Google, leading PhD programs like Stanford, high growth startups like Stripe, Vercel, Bolt, and many founders of their own companies.\n This is a key role and ideal for someone who thinks strategically, enjoys fast-paced environments, passionate about making product decisions, and has experience building great user experiences that delight users.\n We are a flat organization that allows anyone to become a leader by showing excellent technical skills and delivering results consistently and fast. Work ethic, solid communication skills, and obsession with winning are paramount.\n Our interview process involves several technical interviews and we aim to complete them within 1 week.\n  What You'll Do\n \n  Actively ship production code to the web products\n  Work closely with your dedicated product team\n  Participate in product discussions to shape the product roadmap\n  Have the opportunity to work on new and exciting features that will impact millions of lives\n \n An Ideal Candidate Should Have\n \n  Experience. You've built and ship products that have scaled to thousands or millions of users\n  Customer obsession. You are passionate about the field and have the desire to build high quality product that serves customer needs\n  Speed. You work quickly to generate ideas and know how to decide which things can ship now and what things need time\n  Focus. We're a high-growth startup with a busy, remote team. You know how and when to engage or be heads down\n  Collaboration. You know how to inspire, play, and negotiate with opinionated designers, marketers, and PMs\n  Tech Stack: Vanilla JS, ReactJS, Redux, Firebase, Typescript\n \n What We Offer \n \n  A fast-growing environment where you can help shape the culture\n  An entrepreneurial crew that supports risk, intuition, and hustle\n  A hands-off approach so you can focus and do your best work\n  The opportunity to make an impact in a transformative industry\n  A competitive salary, a collegiate atmosphere, and a commitment to building a great asynchronous culture\n \n Think you're a good fit for this job?\n Tell us more about yourself and why you're interested in the role when you apply. \n   And don't forget to include links to your portfolio and LinkedIn.\n  Not looking but know someone who would make a great fit?\n Refer them!\n  Speechify is committed to a diverse and inclusive workplace.\n Speechify does not discriminate on the basis of race, national origin, gender, gender identity, sexual orientation, protected veteran status, disability, age, or other legally protected status.\n",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "'Tech Lead' in title → title FAIL (Lead is a hard reject). JS/TS stack (Vanilla JS/React/TS), no explicit years stated, dev role, remote-eligible. No explicit 4+yr requirement, so the title keyword is the cleanest trigger. Isolates the Lead-title rule.",
    },

    // ── "Lead" title FAIL, fully isolated (synthetic: real clean JS dev, title→Lead, ≤3yr) ──
    {
        id: "title-lead-isolated-fail",
        category: "title-seniority",
        real: false,
        job: {
            site: "linkedin",
            jobTitle: "Lead Frontend Developer",
            jobURL: "https://eval.synthetic/title-lead-isolated-fail",
            company: "SynthCorp",
            location: "Egypt",
            date: "posted 1 day ago",
            jobDetails: [
                "We are looking for a Frontend Developer to join our team building modern web applications with React and TypeScript. You will work closely with designers and backend engineers to deliver pixel-perfect, performant user interfaces.\n\nRequirements:\n2+ years of experience with React and TypeScript\nFamiliarity with Next.js and modern CSS\nUnderstanding of REST APIs and Git workflows\n\nThis is a fully remote role.",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "SYNTHETIC gap-filler: a clean PASS job (React/TS, 2+yr → min 2 PASS, dev role, remote) with ONLY the title changed to 'Lead Frontend Developer'. Isolates the Lead keyword when experience is squarely in PASS range — no real crawled Lead job had ≤3yr (all were 4+yr), so this synthetic case closes the gap.",
    },
];
