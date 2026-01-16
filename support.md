# Support for Kessel

Welcome to the Kessel project! To ensure we provide high-quality assistance while maintaining a focus on core service development, we follow an **Asynchronous Support Model**.

Our goal is to eliminate "untracked consulting" and move toward a scalable, self-service and documentation-driven process.

---

## 1. Before You Reach Out

To help us help you, please verify that you have completed the core setup steps. Most onboarding issues are resolved by checking these specific sections:

### **Self-Service Checklist**

1. **Follow the [Getting Started Guide](https://improved-adventure-16jykz5.pages.github.io/start-here/getting-started/)**:
   * Have you met all the **Prerequisites**?
   * Did you complete the **Installation** steps successfully?
   * Have you walked through the **Quick Start** example?

2. **Search Jira**: Check the [RHCLOUD Board](https://issues.redhat.com/projects/RHCLOUD/issues) and filter by the `mgmt-fabric-kessel` label to see if your issue is already known.

---

## 2. Help Channels

### Slack: [`#forum-mgmt-fabric`](https://redhat.enterprise.slack.com/archives/C064X43CMLK)

Use Slack for quick Q&A, architectural advice, or to check if an issue is a known bug.

* **The 15-Minute Rule**: If a discussion requires troubleshooting or consulting that takes longer than 15 minutes, you will be required to **open a Jira ticket**.
* **Traceability**: Slack is for triage; Jira is for tracking and resolution.

### Office Hours: Management Fabric Architecture

Weekly office hours are dedicated to high-level architecture reviews and unblocking existing tickets. Please file a ticket *before* attending if you have a specific technical issue.

* **When**: Tuesdays @ 8:30 am ET (7:30 am CT)
* **Video Call**: <https://meet.google.com/syp-usic-ijd>
* **Phone**: ‪+1 208-614-3969‬ PIN: ‪520 441 013‬#
* **SIP**: sip:6868058160388@gmeet.redhat.com

---

## 3. Creating a Jira Ticket

All non-trivial requests must be tracked in Jira. This ensures your request is triaged, prioritized, and results in a documentation update.

* **Instance**: [issues.redhat.com](https://issues.redhat.com)
* **Project**: `RHCLOUD`
* **Required Label**: `mgmt-fabric-kessel` (Always include this for routing)

### **Manual Ticket Selection Guide**

When creating a new issue, please select the following **Issue Type** and apply the corresponding **Labels**:

| Request Type | Jira Issue Type | Additional Labels | Purpose |
| :--- | :--- | :--- | :--- |
| **Bug** | `Bug` | None | Service errors, broken features, or documentation inaccuracies. |
| **RFE** | `Epic` | `rfe` | New feature requests or custom development needs. |
| **Documentation** | `Story` | None | Missing docs, unanswered questions, or request for tooling/templates. |
| **Consultation/Onboarding** | `Story` | `consultation` | Request for onboarding or integration consulting. |

### **Required Information**

* **Bugs**: Provide a clear summary and detailed Steps to Reproduce.
* **Requests for Enhancement (RFEs)**: To help us prioritize, please provide:
  * **Descriptive Epic Name**: A concise title for the feature.
  * **Business Justification**: What specific problem does this solve?
  * **Customer Benefit & Impact**: How many teams/users benefit? What is the risk of not having this?
  * **Strategic/Revenue Value**: Does this unblock a specific deal or internal milestone?
* **Onboarding/Consultation**: Provide your desired integration timeline and specific use-case details.
  * **Context**: Paste the URL of any relevant Slack threads into the Forum Reference field.

---

## 4. Triage & SLA

1. **Weekly Triage**: New tickets labeled `mgmt-fabric-kessel` are reviewed every Monday for prioritization.
2. **Consulting**: Deep-dive engagement only begins once a ticket is created and assigned.
3. **Definition of Done**: A ticket is considered "Resolved" or "Closed" only when the following criteria are met based on the request type:

| Request Type | Definition of Done |
| :--- | :--- |
| **Bug** | Issue resolved, verified unable to reproduce, or a formal decision is made to not fix. |
| **Documentation** | Updates have been made to the Kessel Docs site or relevant runbooks. |
| **RFE** | RFE accepted and prioritized in the roadmap, or the request is explicitly rejected. |
| **Onboarding/Consultation** | Initial session completed with the team including a gap analysis of requirements not native to Kessel or documented. |
