import { CheerioCrawler, Dataset } from "crawlee";
import { IndeedJob } from "../../types/IndeedJob.js";
import { extractTextWithLineBreaks } from "../../helpers/extractTextWithLineBreaks.js";

const START_URL = 'https://eg.indeed.com/jobs?q=react%2C+node%2C+typescript&l=Cairo&fromage=3&from=searchOnDesktopSerp&vjk=298dd0a9993ccb9b';

export async function crawlIndeed(): Promise<IndeedJob[]> {
    // Named dataset, dropped each run so multi-site runs don't collide on `default`.
    const dataset = await Dataset.open("indeed");
    await dataset.drop();
    const store = await Dataset.open("indeed");

    const crawler = new CheerioCrawler({
        async requestHandler({ request, $, enqueueLinks, log }) {
            const title = $('title').text();
            log.info(`Crawling '${title}' - from ${request.userData?.source || 'seed URL'}`);

            if (request.crawlDepth === 0) {
                // This is a search page - extract job IDs and construct URLs
                const jobLinks = $('.cardOutline:not([aria-hidden="true"]) h3.jobTitle a');

                log.info(`Found ${jobLinks.length} job cards on search page`);

                const jobURLs = jobLinks.map((i, el) => {
                    const $el = $(el);
                    const jobId = $el.attr('data-jk');
                    if (jobId) {
                        return `https://eg.indeed.com/viewjob?jk=${jobId}`;
                    }
                    return null;
                }).get().filter(Boolean);

                log.info(`Constructed ${jobURLs.length} job detail URLs`);

                // Enqueue job detail pages
                // await crawler.addRequests(jobURLs);
                await enqueueLinks({
                    urls: jobURLs,
                })
            } else {
                // This is a job detail page - extract data
                const jobTitle = extractTextWithLineBreaks($, $('h1.jobsearch-JobInfoHeader-title'));

                const company = extractTextWithLineBreaks($, $('div[data-company-name=true]'));

                const location = $('div[data-testid="jobsearch-JobInfoHeader-companyLocation"]').text()

                const jobDescription = $('#jobDescriptionText').text()

                await store.pushData({
                    site: "indeed",
                    jobTitle: jobTitle || 'N/A',
                    jobURL: request.url,
                    company: company.trim() || 'N/A',
                    location: location.trim() || 'N/A',
                    date: 'N/A',
                    jobDetails: jobDescription ? [jobDescription] : ['N/A'],
                } satisfies IndeedJob);
            }
        },
        maxRequestsPerCrawl: 20,
    });

    await crawler.run([START_URL]);

    const { items } = await store.getData();
    return items as IndeedJob[];
}