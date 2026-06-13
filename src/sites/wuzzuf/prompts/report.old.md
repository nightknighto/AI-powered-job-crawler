# **Jobs List Final Report Generation**

Your job is to take the pre-evaluated JSON content below (which has already been filtered and categorized) and generate a final report. The data includes status information: "PASS", "FAIL", or "POTENTIAL_MATCH" along with reasons.

## **Steps**

### **1. Write Triage Summary**

Using the pre-evaluated data, write a markdown summary with 2 separate tables: the first table for passing jobs (including potential matches with "PASS" or "POTENTIAL_MATCH" status), and the second table for filtered/failed jobs. Order both tables by post date (newest first).

Format:

## ✅ Passing JS/TS Jobs (including Potential Matches)

| Job Title | Company | Location | Posted Date | Experience Level | Skills Tag / Core Tech | Reason for passing or flagging |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Full Stack Developer | Thobify | Riyadh, Saudi Arabia | 9 hours ago | 3+ Yrs | Next.js, TS, Three.js | PASS - Pure JS/TS stack, Remote, Title clean |

## ❌ Filtered Out Jobs

| Job Title | Company | Location | Posted Date | Experience Level | Skills Tag / Core Tech | Reason for failing |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Senior Backend Engineer | OldTech Co. | Cairo, Egypt | 2 days ago | 5+ Yrs | Java, Spring Boot, SQL | FAIL - Senior title, Non-JS stack, On-site requirement |

### **2. Write Final Report of Verified Matches**

Directly below your triage tables, output a final structured report containing the extracted deep-dive details for every job with "PASS" or "POTENTIAL_MATCH" status:

# Wuzzuf JS/TS Job Report — [Date]

**Search:** React, Node, JavaScript, TypeScript | **Filter:** ≤14 days, Remote/Hybrid, ≤3 yrs, JS/TS only

## ✅ Verified Matches ([N])

For each verified match (extract information directly from the `"jobDetails"` array):  
- **Job Title** — Company  
  - 📍 Location | 🏠 Remote/Hybrid / On-site Status | 🕒 Posted X days ago | 📊 X-Y Yrs  
  - **Description:** [2-3 sentence summary of the role]
  - **Extracted Skills:** [List core skills/tech stack found in the details]
  - **Job Requirements:** [Bullet points of key qualifications and experience required from the details]
  - 🔗 [Direct apply link](URL)
  - 💡 **Fit:** [1-2 sentences on match quality]

## Final Summary  
- Total searched: [Total from the array]
- Matched after comprehensive review: [N] (PASS + POTENTIAL_MATCH)
- Filtered out total: [N] (FAIL)

### **Very Important Notes:**

* Type **"N/A"** for any data points that you cannot extract or find. Do not hallucinate or make up data.  
* The status and reason fields in the data are already determined - use them directly in your tables.

## **Content to process:**

The content below is provided as an array of JSON objects that have already been evaluated with status and reason fields:

<content>
{{evaluatedJobs}}
</content>

Please process this content according to the steps outlined above and provide the final report in markdown format.
