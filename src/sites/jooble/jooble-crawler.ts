import { PlaywrightCrawler, sleep, Dataset } from "crawlee";
import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import { JoobleJob } from "../../types/JoobleJob.js";

chromium.use(stealthPlugin());

const START_URL = 'https://eg.jooble.org/SearchResult?date=3&loc=6&rgns=Cairo&ukw=javascript%20typescript%20react%20node.js'

export async function crawlJooble(): Promise<Omit<JoobleJob, "site">[]> {
    // Named dataset, dropped each run so multi-site runs don't collide on `default`.
    const dataset = await Dataset.open("jooble");
    await dataset.drop();
    const store = await Dataset.open("jooble");

    const crawler = new PlaywrightCrawler({
        launchContext: {
            launcher: chromium,
        },
        postNavigationHooks: [
            async ({ handleCloudflareChallenge }) => {
                await handleCloudflareChallenge();
            },
        ],
        async requestHandler({ request, page, enqueueLinks, log }) {
            const title = await page.title();
            log.info(`Crawling '${title}' - from ${request.userData?.source || 'seed URL'}`);

            if (request.crawlDepth === 0) {
                await enqueueLinks({
                    globs: ['https://eg.jooble.org/desc/*'],
                    forefront: true,
                    userData: { source: title },
                });
            } else {
                await store.pushData({
                    jobTitle: await page.locator('[data-test-name="_jdpHeaderBlock"] h1').textContent() || 'N/A',
                    jobURL: request.url,
                    company: await page.locator('div[style*="translate3d(0%"] [data-test-name="_companyName"]').textContent() || 'N/A',
                    location: await page.locator('div[style*="translate3d(0%"] [data-test-name="_regionLink"]').textContent() || 'N/A',
                    date: await page.locator('div:has(> button[data-test-name="_reportJobModalJDP"]) div').textContent() || 'N/A',
                    jobDetails: [
                        await page.locator('div[style*="translate3d(0%"] [data-test-name="_jobDescriptionBlock"]').innerText() || 'N/A',
                    ],
                } satisfies Omit<JoobleJob, "site">);
            }
        },

        async errorHandler({ request }, error) {
            console.warn(`Error on ${request.url}: ${error.message}. Waiting 5 seconds...`);

            // Wait for 5000 milliseconds (5 seconds) before allowing the retry
            await sleep(5000);
        },
        maxRequestsPerCrawl: 20,
        headless: false,
    });

    await crawler.run([START_URL]);

    const { items } = await store.getData();
    return items as Omit<JoobleJob, "site">[];
}