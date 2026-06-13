**Jobs List Filtering, Processing, and Categorizing**

Your job is to take the structured JSON content below, run it through a single, comprehensive filtering and evaluation pass using all provided data, and output a final report in JSON format according to the provided JSON schema. Do all steps sequentially without stopping.

## **Output Format**

You MUST output your response as a JSON array where each object contains **only** the evaluation fields below. Do NOT repeat or echo back any input job data (no jobTitle, company, location, date, jobDetails).

- jobURL (string): The URL of the job (used as a key to match back to the input)
- status (enum): Must be one of "PASS", "FAIL", or "POTENTIAL_MATCH"
- reason (array of strings): The reasons for the status and analysis based on the filtering criteria
- experienceLevel (string): The experience requirement extracted from the job (e.g. "2+ years", "0-10 years", "5+ years"). Use "N/A" if not found.
- skills (array of strings): The core tech stack / skills found in the job (e.g. ["React", "TypeScript", "Node.js"]). Empty array if none found.

## **Steps**

### **1. Unified Filtering and Evaluation**

Analyze both the top-level metadata and the complete text details provided inside the "jobDetails" field for each job. Apply the following strict filters immediately in a single pass:

* **Title Filter:** Reject if the title contains any of these keywords (case-insensitive): "Senior" (unless the text explicitly says 2-3 years is acceptable), "Lead", "Manager", "Head of", "Director", "Principal", "Staff".  
* **Internship Filter:** Reject any job tagged as "Internship" or with "Intern" in the title or description text.  
* **Tech Stack Filter:** Reject if the primary stack is non-JS/TS and JS/TS plays no meaningful role (e.g., dominated by PHP, Laravel, Python, Django, .NET, C#, Java, Spring, Kotlin, Ruby, Rails, or mobile-first Flutter/React Native with no web dev). Keep if the primary stack is JS/TS-focused (JavaScript, TypeScript, Node.js, React, Next.js, Vue, Angular, NestJS, Express, etc.). **Note:**
  - A job that is primarily JS/TS but also mentions a secondary language (e.g., Go, Rust, Python for scripts/tools) should still be kept.
  - A job where the primary stack is non-JS/TS but JS/TS is mentioned prominently in responsibilities or requirements should be marked as "POTENTIAL_MATCH" rather than rejected — the candidate may still do meaningful JS/TS work.  
* **Depth & Experience Filter:** Reject if the full text in "jobDetails" reveals:
  * **Experience requirement is 4+ years or more** (3 years or less is acceptable; 4+ years is rejected).
  * **The job requires fully on-site work** (fully on-site is always rejected; hybrid work in Egypt is acceptable even with office days; hybrid work in non-Egypt locations is rejected unless the text explicitly states remote work is possible from Egypt).
  * The primary daily stack is actually non-JS/TS.
  * The role is not a development role (e.g., product manager, designer, QA, data analyst) even if it mentions JS/TS as a plus.

*Note: If a job shows strong potential within the JS/TS ecosystem but some details are ambiguous, mark it as "Potential Match" instead of rejecting it.*

### **Very Important Notes:**

* **You MUST return ALL input jobs in your output.** Do not drop, skip, or omit any job — every job in the input must appear exactly once in the output array. Rejected jobs should still be included with status "FAIL" and the reason for rejection.
* Type **"N/A"** for any data points that you cannot extract or find. Do not hallucinate or make up data.  
* Run through all steps completely in this single turn.
* Your final output MUST be a valid JSON array conforming to the provided schema. Do not output markdown or any other format.

## **Content to process:**

The content below is provided as an array of JSON objects containing pre-scraped data and full text details:

<content>
{{jobs}}
</content>

Please process this content according to the steps outlined above and provide the final result as a JSON array.