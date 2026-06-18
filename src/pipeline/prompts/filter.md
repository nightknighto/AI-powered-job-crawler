**Jobs List Filtering, Processing, and Categorizing**

Your job is to take the structured JSON content below, run it through a single, comprehensive filtering and evaluation pass using all provided data, and output a final report in JSON format according to the provided JSON schema. Do all steps sequentially without stopping.

## **Output Format**

You MUST output your response as a JSON array where each object contains **only** the evaluation fields below. Do NOT repeat or echo back any input job data (no jobTitle, company, location, date, jobDetails, tags, or other site-specific input fields).

- jobURL (string): The URL of the job (used as a key to match back to the input)
- reason (array of strings): The reasons for the status and analysis based on the filtering criteria
- experienceLevel (string): The experience requirement extracted from the job (e.g. "2+ years", "0-10 years", "5+ years"). Use "N/A" if not found.
- skills (array of strings): The core tech stack / skills found in the job (e.g. ["React", "TypeScript", "Node.js"]). Empty array if none found.
- status (enum): Must be one of "PASS", "FAIL", or "POTENTIAL_MATCH"

## **Steps**

### **Unified Filtering and Evaluation**

Analyze both the top-level metadata and the complete text details provided inside the "jobDetails" field for each job. Apply the following strict filters:

* **Title Filter *(applied first, non-negotiable)*:** Reject if the title contains any of these keywords (case-insensitive): "Lead", "Manager", "Head of", "Director", "Principal", "Staff". This includes compound titles such as "Tech Lead" or "Team Lead". A FAIL from this filter cannot be overridden by role type, tech stack, or any other filter.

* **Internship Filter:** Reject any job tagged as "Internship" or with "Intern" in the title or description text.

* **Tech Stack Filter:** Reject if the primary stack is non-JS/TS (e.g., dominated by PHP, Laravel, Python, Django, .NET, C#, Java, Spring, Kotlin, Ruby, Rails, or mobile-first Flutter/React Native with no web dev). Keep if the primary stack is JS/TS-focused (JavaScript, TypeScript, Node.js, React, Next.js, Vue, Angular, NestJS, Express, etc.). **Note:**
  - A job that is primarily JS/TS but also mentions a secondary language (e.g., Go, Rust, Python for scripts/tools) should still be kept.

* **Role Type Filter:** Reject if the role is not a core software development role. Only the following role types are acceptable: Frontend Developer, Backend Developer, Fullstack Developer, DevOps/Infrastructure Engineer, and closely related software engineering roles. Explicitly reject any of the following regardless of tech stack mentioned:
  - QA / Quality Assurance / Tester / Test Engineer / Automation QA
  - Product Manager / Product Owner
  - Designer / UX / UI
  - Data Analyst / Data Scientist / Data Engineer
  - Scrum Master / Agile Coach
  - Technical Support / IT Support
  The presence of JavaScript, TypeScript, or any JS/TS framework in a QA or non-dev role does NOT make it acceptable.

* **Experience Filter:** Reject if the experience requirement is 4 or more years.
  - **Explicit years stated** (e.g., "3+ years", "minimum 5 years"): reject if the number is 4 or greater.
  - **No explicit years, but contextual seniority signals present** (e.g., "scaled products to millions of users", "led engineering teams", "architected systems at scale", "proven track record of delivering complex systems"): treat as ambiguous — mark as "POTENTIAL_MATCH" and note that experience level is unclear but signals seniority.
  - **No signals at all:** set experienceLevel to "N/A" and do not reject on this basis alone.

* **Location Filter:** Reject if the role is not workable remotely from Egypt.
  - Fully on-site anywhere → FAIL
  - Hybrid in Egypt → PASS
  - Hybrid outside Egypt, unless the listing explicitly states remote-from-Egypt is possible → FAIL
  - Fully remote → PASS

*Note: If a job shows strong potential within the JS/TS ecosystem but some details are ambiguous, mark it as "Potential Match" instead of rejecting it.*

### **Very Important Notes:**

* **You MUST return ALL input jobs in your output.** Do not drop, skip, or omit any job — every job in the input must appear exactly once in the output array. Rejected jobs should still be included with status "FAIL" and the reason for rejection.
* Type **"N/A"** for any data points that you cannot extract or find. Do not hallucinate or make up data.  
* Run through all steps completely in this single turn.
* Your final output MUST be a valid JSON array conforming to the provided schema. Do not output markdown or any other format.
* **Status must reflect your analysis:** If your reasoning identifies any rejection condition (title keyword, wrong role type, 4+ years experience, non-JS/TS stack, on-site location), the status field MUST be "FAIL". A contradiction between your reason and your status is not allowed — finding a rejection reason obligates a FAIL output.

## **Content to process:**

The content below is provided as an array of JSON objects containing pre-scraped data and full text details:

<content>
{{jobs}}
</content>

Please process this content according to the steps outlined above and provide the final result as a JSON array.