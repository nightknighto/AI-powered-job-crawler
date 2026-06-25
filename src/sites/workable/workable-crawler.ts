import { PlaywrightCrawler } from "crawlee";
import fs from 'fs/promises';
import { WorkableJob } from "../../types/WorkableJob.js";

const START_URL = 'https://jobs.workable.com/search?location=Cairo%2C+Egypt&query=javascript+react+node.js+typescript&workplace=remote&workplace=hybrid&day_range=7&selectedJobId=01faf769-3f4f-48eb-832e-d9c16fd1dced';

export async function crawlWorkable(): Promise<WorkableJob[]> {
    const crawler = new PlaywrightCrawler({
        async requestHandler({ request, page, enqueueLinks, log, pushData }) {
            const title = await page.title();
            log.info(`Crawling '${title}' - from ${request.userData?.source || 'seed URL'}`);

            if (request.crawlDepth === 0) {
                await enqueueLinks({
                    selector: 'ul > li > div > a', // Select job links from the search results page
                    forefront: true,
                    userData: { source: title },
                });
            } else {
                // Extract job description and requirements from .jobBreakdown__job-breakdown--31MGR sections
                const breakdownSections = await page.locator('.jobBreakdown__job-breakdown--31MGR > section').all();
                const jobDetails = await Promise.all(breakdownSections.map(async (section) => await section.innerText() || 'N/A'));

                await pushData({
                    jobTitle: await page.locator('[data-ui="overview-title"]').textContent() || 'N/A',
                    jobURL: request.url,
                    company: await page.locator('[data-ui="overview-company"] a').textContent() || 'N/A',
                    location: await page.locator('[data-ui="overview-location"]').textContent() || 'N/A',
                    date: await page.locator('[data-ui="overview-date-posted"]').textContent() || 'N/A',
                    jobDetails,
                } satisfies WorkableJob);
            }
        },
        maxRequestsPerCrawl: 20,
    });

    await crawler.run([START_URL]);

    const files = await fs.readdir("./storage/datasets/default");
    const jobsList: WorkableJob[] = [];

    for (const file of files) {
        const content = await fs.readFile(`./storage/datasets/default/${file}`, "utf-8");
        const json = JSON.parse(content);
        jobsList.push(json);
    }

    return jobsList;
}