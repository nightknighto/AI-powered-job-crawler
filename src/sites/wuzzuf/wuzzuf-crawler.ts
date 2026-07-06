import { CheerioCrawler } from "crawlee";
import { extractTextWithLineBreaks } from "../../helpers/extractTextWithLineBreaks.js";
import { WuzzufJob } from "../../types/WuzzufJob.js";
import fs from 'fs/promises';

const START_URLS = [
    'https://wuzzuf.net/search/jobs?q=javascript&filters%5Bworkplace_arrangement%5D%5B0%5D=hybrid&filters%5Bworkplace_arrangement%5D%5B1%5D=remote&filters%5Bpost_date%5D%5B0%5D=within_1_week&filters%5Broles%5D%5B0%5D=IT%2FSoftware%20Development&a=navbg%7Cspbg',
    'https://wuzzuf.net/search/jobs?q=node&filters%5Bworkplace_arrangement%5D%5B0%5D=hybrid&filters%5Bworkplace_arrangement%5D%5B1%5D=remote&filters%5Bpost_date%5D%5B0%5D=within_1_week&filters%5Broles%5D%5B0%5D=IT%2FSoftware%20Development&a=navbg%7Cspbg',
    'https://wuzzuf.net/search/jobs?q=react&filters%5Bworkplace_arrangement%5D%5B0%5D=hybrid&filters%5Bworkplace_arrangement%5D%5B1%5D=remote&filters%5Bpost_date%5D%5B0%5D=within_1_week&filters%5Broles%5D%5B0%5D=IT%2FSoftware%20Development&a=navbg%7Cspbg',
    'https://wuzzuf.net/search/jobs?q=typescript&filters%5Bworkplace_arrangement%5D%5B0%5D=hybrid&filters%5Bworkplace_arrangement%5D%5B1%5D=remote&filters%5Bpost_date%5D%5B0%5D=within_1_week&filters%5Broles%5D%5B0%5D=IT%2FSoftware%20Development&a=navbg%7Cspbg',
];

export async function crawlWuzzuf(): Promise<WuzzufJob[]> {
    const crawler = new CheerioCrawler({
        async requestHandler({ request, $, enqueueLinks, log, pushData }) {
            const title = $('title').text();
            log.info(`Crawling '${title}' - from ${request.userData?.source || 'seed URL'}`);

            if (request.crawlDepth === 0) {
                await enqueueLinks({
                    globs: [
                        'https://wuzzuf.net/jobs/p/*',
                        'https://wuzzuf.net/saudi/jobs/p/*'
                    ],
                    forefront: true,
                    userData: { source: title },
                });
            } else {
                const jobDetails = $('section.css-5pnqc5');
                const company = extractTextWithLineBreaks($, $('div.css-9iujih').first()).replace(' -', ''); // Get company name (first line before any location info)

                await pushData({
                    site: "wuzzuf",
                    jobTitle: $('h1.css-gkdl1m').text(),
                    jobURL: request.url,
                    company: company === '-' ? 'Confidential' : company, // Handle cases where company is hidden
                    location: extractTextWithLineBreaks($, $('strong.css-1vlp604')).split('\n').at(-1)!,
                    date: $('span.css-154erwh').text(),
                    jobDetails: jobDetails.map((_i, job) => extractTextWithLineBreaks($, $(job))).get(),
                    tags: $('.css-5kov97 a').map((_i, tag) => extractTextWithLineBreaks($, $(tag))).get().join(", "),
                } satisfies WuzzufJob);
            }
        },
        maxRequestsPerCrawl: 20,
    });

    await crawler.run(START_URLS);

    const files = await fs.readdir("./storage/datasets/default");
    const jobsList: WuzzufJob[] = [];

    for (const file of files) {
        const content = await fs.readFile(`./storage/datasets/default/${file}`, "utf-8");
        const json = JSON.parse(content);
        jobsList.push(json);
    }

    // await fs.writeFile("./storage/datasets/wuzzuf-jobs.json", JSON.stringify(jobsList, null, 2), "utf-8");

    return jobsList;
}
