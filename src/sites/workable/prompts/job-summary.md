# **Job Summary Report**

You are given a list of pre-filtered job listings (all have status "PASS" or "POTENTIAL_MATCH"). For each job, generate a detailed summary card.

## **Output Format**

For each job, output the following as markdown:

- **Job Title** — Company
  - 📍 Location | 🏠 Work Arrangement | 🕒 Posted Date | 📊 Experience Level
  - **Description:** [2-3 sentence summary of the role based on jobDetails]
  - **Core Skills:** [Comma-separated list of key technologies from the details]
  - **Key Requirements:** [Bullet points of the most important qualifications]
  - 🔗 [Apply here](URL)
  - 💡 **Fit:** [1-2 sentences on how well this job matches a junior/mid-level JS/TS developer looking for remote/hybrid work]

## **Rules**

* Use **"N/A"** for any data points you cannot extract. Do not hallucinate.
* Keep descriptions concise and factual — only state what's in the data.
* For work arrangement, derive it from `jobDetails` text (look for "Remote", "Hybrid", "On-site", etc.).
* The fit assessment should consider: JS/TS stack quality, experience level match, remote/hybrid availability.

## **Jobs to summarize:**

<content>
{{passingJobs}}
</content>

Generate the summary cards in markdown format.