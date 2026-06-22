# QAScope BPO Prospect Targeting Strategy

## ⚠️ Important Note on Scraping Emails & Phones
As an AI, I do not have direct backend access to bypass Apollo.io or ZoomInfo's paywalls to extract verified personal emails or direct mobile numbers. "Scraping" private contact info from the open web yields outdated or fake data (which ruins your email domain reputation). 

To do this correctly and securely, you need to use an Apollo.io account. Below is the exact list of Target Accounts to search, and the precise Apollo configuration to extract verified C-Suite contacts.

---

## 🎯 Target Account List (Indian Mid-Market BPOs)

These are tier-2 and specialized mid-market BPOs in India. They are large enough to have severe QA pain points, but small enough that you can still reach the founders directly without going through a massive corporate procurement board.

| Company Name | Focus Area | Location | Ideal Target Persona |
|--------------|------------|----------|----------------------|
| **VentureSathi** | Customer Support, Back Office | Noida | CEO, Head of Operations |
| **The Octopus Tech** | E-commerce Support, Voice | Gurgaon | Founder, Director Ops |
| **PinnacleWorks** | Customer Support, Tech Support | Gurgaon | Co-Founder, VP Operations |
| **Go4Customer** | Inbound/Outbound Call Center | Noida / UK | CEO, Quality Head |
| **Aarav Solutions** | Telecom, IT BPO | Ahmedabad | Founder, Operations Director |
| **JindalX** | CX, Revenue Cycle Management | Delhi NCR | CEO, VP Customer Success |
| **TechSpeed Inc** | Data Processing, Back Office | Pune | Director of Operations |
| **Plaxonic Technologies** | BPO, Tech Support | Noida | Founder, Quality Assurance Manager |
| **Suntec India** | Multi-process BPO | New Delhi | VP Operations, Director |
| **Invensis Technologies** | Call Center, Back Office | Bangalore | CEO, Head of Delivery |

---

## 🛠️ The Apollo.io Extraction Playbook

To pull the exact names, verified emails, and phone numbers for multiple decision-makers at these companies, follow this process in your Apollo.io dashboard:

### 1. The Search Filters
Go to Apollo **Search > People** and apply these exact filters:

*   **Location:** India
*   **Company:** (Paste the names from the table above, or filter by Industry: `Outsourcing / Offshoring` and Employee count: `50 - 500`)
*   **Job Titles (Include):**
    *   `Chief Executive Officer`
    *   `Founder` OR `Co-Founder`
    *   `Director of Operations` OR `VP of Operations`
    *   `Head of Quality` OR `Quality Assurance Manager`
    *   `Head of Delivery`
*   **Email Status:** Verified Only (Do not export "Guessed" emails).

### 2. Extraction & Verification
*   Select the contacts that appear. 
*   Click **Export**. 
*   Apollo will ping the mail server to guarantee the email won't bounce. This protects your email domain from being marked as spam.

### 3. The Outreach Sequence
Once you export the CSV from Apollo, do not mass-email them all at once. Use the Parkinson's Law Strategy:
*   Email the **Founders/CEOs** using the "Margin Squeeze & Blind Spot" messaging we created.
*   Email the **Quality Assurance Managers** using a different angle: *"I built an AI tool that does the 95% of manual sampling you don't have time to do."*
