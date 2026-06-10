**Jobs List Filtering, Processing, and Categorizing**

Your job is to take the structured JSON content below, run it through a single, comprehensive filtering and evaluation pass using all provided data, and output a final report in JSON format according to the provided JSON schema. Do all steps sequentially without stopping.

## **Output Format**

You MUST output your response as a JSON array where each object matches the following schema:
- jobTitle (string): The title of the job
- jobURL (string): The URL of the job posting
- companyAndLocation (string): The company name and location
- tags (string): The tags associated with the job posting
- date (string): The date the job was posted
- jobDetails (array of strings): The details about the job from the input data
- status (enum): Must be one of "PASS", "FAIL", or "POTENTIAL_MATCH"
- reason (array of strings): The reasons for the status and analysis based on the filtering criteria

## **Steps**

### **1. Unified Filtering and Evaluation**

Analyze both the top-level metadata and the complete text details provided inside the "jobDetails" field for each job. Apply the following strict filters immediately in a single pass:

* **Title Filter:** Reject if the title contains any of these keywords (case-insensitive): "Senior" (unless the text explicitly says 2-3 years is acceptable), "Lead", "Manager", "Head of", "Director", "Principal", "Staff".  
* **Internship Filter:** Reject any job tagged as "Internship" or with "Intern" in the title or description text.  
* **Tech Stack Filter:** Reject if the primary stack is non-JS/TS (e.g., dominated by PHP, Laravel, Python, Django, .NET, C#, Java, Spring, Kotlin, Ruby, Rails, or mobile-first Flutter/React Native). Keep if the primary stack is JS/TS-focused (JavaScript, TypeScript, Node.js, React, Next.js, Vue, Angular, NestJS, Express, etc.).  
* **Depth & Experience Filter:** Reject if the full text in "jobDetails" reveals:  
  * Actual experience requirements are higher than acceptable (>3 years or strict senior/management expectations).
  * The company requires full on-site work despite an initial remote/hybrid tag.
  * The company requires hybrid work and the location is not in Egypt (unless the text explicitly states remote work is possible from Egypt).
  * The primary daily stack is actually non-JS/TS.
  * The role is not a development role (e.g., product manager, designer, QA, data analyst) even if it mentions JS/TS as a plus.

*Note: If a job shows strong potential within the JS/TS ecosystem but some details are ambiguous, mark it as "Potential Match" instead of rejecting it.*

### **Very Important Notes:**

* Type **"N/A"** for any data points that you cannot extract or find. Do not hallucinate or make up data.  
* Run through all steps completely in this single turn.
* Your final output MUST be a valid JSON array conforming to the provided schema. Do not output markdown or any other format.

## **Content to process:**

The content below is provided as an array of JSON objects containing pre-scraped data and full text details:

<content>
{{jobs}}
</content>

Please process this content according to the steps outlined above and provide the final result as a JSON array.
