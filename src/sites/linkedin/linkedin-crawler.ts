import { CheerioCrawler, PlaywrightCrawler, sleep, Dataset } from "crawlee";
import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import { BaseJob } from "../../types/base.js";
import { extractTextWithLineBreaks } from "../../helpers/extractTextWithLineBreaks.js";

chromium.use(stealthPlugin());

const START_URL = 'https://www.linkedin.com/jobs/search/?distance=25&f_E=2%2C3%2C4&f_TPR=r604800&f_WT=2%2C3&geoId=106155005&keywords=%28React%20OR%20Node.js%20OR%20TypeScript%29%20AND%20%28NOT%20senior%29&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&spellCorrectionEnabled=true'

export async function crawlLinkedIn(): Promise<Omit<BaseJob, "site">[]> {
    // Named dataset, dropped each run so multi-site runs don't collide on `default`.
    const dataset = await Dataset.open("linkedin");
    await dataset.drop();
    const store = await Dataset.open("linkedin");

    const crawler = new CheerioCrawler({

        preNavigationHooks: [
            async ({ request }, gotOptions) => {
                gotOptions.headers = {
                    ...gotOptions.headers,
                    'Accept-Language': 'en-US,en;q=0.9'
                };
            }
        ],

        async requestHandler({ request, $, enqueueLinks, log }) {
            const title = $('title').text();
            log.info(`Crawling '${title}' - from ${request.userData?.source || 'seed URL'}`);

            if (request.crawlDepth === 0) {
                await enqueueLinks({
                    regexps: [
                        /https:\/\/(?:[a-z]{2}\.|www\.)?linkedin\.com\/jobs\/view\/.*/,
                    ],
                    transformRequestFunction(request) {
                        // Force replace any local country subdomains (like eg.linkedin.com) with www.linkedin.com
                        request.url = request.url.replace(/https:\/\/[a-z]{2}\.linkedin\.com/, 'https://www.linkedin.com');
                        return request;
                    },
                    forefront: true,
                    userData: { source: title },
                });
            } else {

                const jobDescription = extractTextWithLineBreaks($, $('.show-more-less-html__markup'));
                await store.pushData({
                    jobTitle: $('.topcard__title').text(),
                    jobURL: normalizeURL(request.url),
                    company: extractTextWithLineBreaks($, $('.topcard__org-name-link')),
                    location: extractTextWithLineBreaks($, $('span.topcard__flavor--bullet:not(.num-applicants__caption)')),
                    date: extractTextWithLineBreaks($, $('.posted-time-ago__text')),
                    jobDetails: [
                        jobDescription,
                    ],
                } satisfies Omit<BaseJob, "site">);
            }
        },
        maxRequestsPerCrawl: 30,
    });

    await crawler.run([START_URL]);

    const { items } = await store.getData();
    return items as Omit<BaseJob, "site">[];
}

/** Normalizes a URL by removing query parameters and fragment identifiers. */
function normalizeURL(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.origin + parsed.pathname;
    } catch {
        return url;
    }
}
