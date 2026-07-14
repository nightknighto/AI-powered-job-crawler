import { GoldenEntry } from "../../types/GoldenEntry.js";

/**
 * Cases isolating the **Location Filter** (`filter.md` §Location): fully remote →
 * PASS (non-Egypt remote is OK); hybrid in Egypt → PASS; hybrid outside Egypt →
 * FAIL; fully on-site anywhere → FAIL.
 *
 * Every case here keeps title/role/stack/experience/internship green so location
 * is the only rule that can trigger.
 */
export const locationCases: GoldenEntry[] = [
    // ── Hybrid outside Egypt FAIL (junior Node.js, ~1yr, clean JS/TS) ──
    {
        id: "loc-hybrid-croatia-fail",
        category: "location",
        real: true,
        job: {
            site: "linkedin",
            jobTitle: "[Postani Dio Našeg Tima] Node.Js Backend Developer (Junior)",
            jobURL: "https://www.linkedin.com/jobs/view/postani-dio-na%C5%A1eg-tima-node-js-backend-developer-junior-at-nordia-digital-4438316573",
            company: "Nordia Digital",
            location: "Ţima, Asyut, Egypt",
            date: "2 days ago",
            jobDetails: [
                "UPDATE-natječaj završen\n\nPostani Dio Našeg Tima!\n\nTražimo Node.js Backend developera/developerku (Junior s određenim iskustvom). \n\nŠto Očekujemo\n\nSolidno razumijevanje JavaScript-a i TypeScript-a.\nPoželjno 1 godina iskustva u backend razvoju koristeći Node.js (ili neki drugi backend).\nIskustvo s Express (ili Nest.js) framework-om nije obavezno, ali je plus.\nRazumijevanje relacijskih i nerelacijskih baza podataka (SQL & NoSQL).\nZnanje izrade CRUD API endpoint-ova i integracija s drugim sustavima (integracije s nekim vanjskim servisima).\nRazumijevanje osnovnih WEB protokola i HTTP statusa.\nDobre analitičke vještine i sposobnost rješavanja problema.\nObraćanje pažnje na detalje.\nSolidno znanje engleskog jezika.\nBonus je ako si željan/željna naučiti i frontend s vremenom, tu maksimalno pomognemo, JavaScript predznanje koje imaš je odlična baza za početak .\n\nŠto Ćeš Raditi\n\nPisanje čistog i optimiziranog koda.\nRedovito koristiti Express framework u Node.js okruženju.\nPonajviše izrada API endpoint-ova, CRUD endpoint-ova .\nDokumentacija endpoint-ova, koristeći npr. Swagger.\nRad s Firebase-om.\nSudjelovanje u poslovnim procesima i odlukama vezanima za projekt.\nMoguća AWS implementacija (ili sličan servis).\n\nŠto Nudimo\n\nMentorstvo i zajednički profesionalni rast i rad na uzbudljivim novim projektima (nema održavanja prastarih kodova) .\nPo želji pomoć u učenju izrade mobilnih i web aplikacija koristeći JavaScript.\nRemote (3 dana u uredu/grad Prelog).\nBonusi-prigodne nagrade.\nMogučnost napredovanja.\nStimulativna primanja.\n\nKako Se Prijaviti\n\nSvi zainteresirani kandidati/kandidatkinje neka nam pošalju svoj životopis na info@nordia.hr.\n\nU predmetu e-maila naznačiti \"Prijava za posao\".\n\nOčekujte naš odgovor u najkraćem roku.\n\nNapomena: Iskustvo nije obavezno.\n\nSpremni smo podržati razvoj vaših vještina i pružiti priliku za rast u dinamičnom okruženju.",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "Hybrid office in Prelog, Croatia (outside Egypt) → location FAIL. Junior title, ~1yr (PASS), Node.js/TS stack, dev role. Only the hybrid-outside-Egypt location rule triggers. (Croatian-language body adds a language-robustness dimension.)",
    },

    // ── On-site FAIL, fully isolated (synthetic: real clean PASS job, location→on-site) ──
    {
        id: "loc-onsite-isolated-fail",
        category: "location",
        real: false,
        job: {
            site: "linkedin",
            jobTitle: "Frontend Developer",
            jobURL: "https://eval.synthetic/loc-onsite-isolated-fail",
            company: "SynthCorp",
            location: "Cairo, Egypt (On-site)",
            date: "posted 1 day ago",
            jobDetails: [
                "We are looking for a Frontend Developer to join our team building modern web applications with React and TypeScript. You will work closely with designers and backend engineers to deliver pixel-perfect, performant user interfaces.\n\nRequirements:\n2+ years of experience with React and TypeScript\nFamiliarity with Next.js and modern CSS\nUnderstanding of REST APIs and Git workflows\n\nThis is a fully on-site role at our Cairo office — no remote or hybrid option.",
            ],
        },
        expectedStatus: "FAIL",
        isolationNote:
            "SYNTHETIC gap-filler: a clean PASS job (React/TS, 2+yr, dev role, non-senior) with ONLY the location changed to fully on-site. Isolates the on-site rule when no real crawled job supplied a clean on-site-only case (every real on-site job also tripped seniority/tech/experience).",
    },
];
