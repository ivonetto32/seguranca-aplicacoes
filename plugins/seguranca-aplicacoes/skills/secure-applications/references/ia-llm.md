# Applications that use LLMs

Basis: OWASP Top 10 for LLM Applications, 2025 edition (checked at genai.owasp.org). OWASP itself warns that no defense completely eliminates the risk, because of the probabilistic nature of the models; the goal is to reduce the likelihood and **limit the damage**. Central rule: the model is an **untrusted** component, like an external user. Also applicable: ASVS V1.2 (output encoding), V1.3.2 (no `eval`), V3.2.2, V2.4.1 (anti-automation), V16 (logs) and V14 (sensitive data).

## How to handle each risk

| 2025 risk | What to do |
|---|---|
| **LLM01 Prompt injection** | Separate instructions (system prompt, fixed on the server) from data (user text, documents, pages, emails), labeling external content as untrusted. Treat the model's output as untrusted input. Ask for a structured format (JSON) and validate it by schema in code, rejecting whatever does not match. Give the model only the tools and permissions it needs. Test with adversarial attacks (direct and indirect injection, via a document) before release and then at every prompt or model change. |
| **LLM02 Sensitive information disclosure** | Do not send personal data, confidential data or secrets to the model. Do local screening before sending (detection and masking of national ID numbers, email, case numbers, keys) and block the send when something is found. Apply the same filter to the response. Check the provider's contract and retention; see `privacidade.md`. Retrieved context (RAG) respects the permissions of the user asking. |
| **LLM03 Supply chain** | Models, adapters, libraries, plugins and datasets come from a trusted source, with a pinned version and hash; they go in the SBOM (the CycloneDX format can hold models). Avoid model formats that execute code on load. |
| **LLM04 Data and model poisoning** | Control who can change fine-tuning data, the knowledge base and embeddings; record provenance; review what goes in. |
| **LLM05 Improper output handling** | Escape or sanitize the output before displaying it (`textContent` in the browser, context-appropriate encoding, a recognized HTML/Markdown sanitizer). Never build SQL, commands, file paths, URLs or code from the model's output; use parameterized queries and an allowlist. Never `eval` the output. |
| **LLM06 Excessive agency** | The model's output **never**, on its own, triggers writing, deletion, sending, publishing, payment or a permission change: the user confirms, seeing exactly what will be done. Tools with minimum privilege (read-only where possible), the application's own credential with a narrow scope, not inheriting administrator privilege. Authorization is checked on the server against the real user, not against what the model "decided". |
| **LLM07 System prompt leakage** | Do not put secrets, keys, access rules or sensitive data in the prompt; security controls live in code, not in the instructions to the model. Consider the prompt potentially public. |
| **LLM08 Vector and embedding weaknesses** | In RAG, apply per-document access control in the search, separate stores per tenant/profile, validate what is indexed and record the source of each quoted passage. |
| **LLM09 Misinformation** | Show the generated text as a **draft**, with a visible notice that it was AI-generated and needs human review; require a review confirmation before copying, exporting, sending or saving as final; cite sources where available; do not use the output for a decision that affects people without human review. |
| **LLM10 Unbounded consumption** | Request limit per user, maximum input and output size, timeout, cost/token ceiling per user and global, alert on abnormal spending (V2.4.1). |

## Logging AI use

Record, without the full content when personal data is involved: UTC date/time, user (internal identifier), model and version, purpose/feature, input and output size, result of the sensitive-data screening (blocked or not), whether the user confirmed the review, and the `request_id`. Keep the full prompt only if necessary and with short retention. Alerts: usage spikes, many screening blocks, detected injection attempts.

## Before release

- Inventory of where the model is called, with what data and with which provider (V13.1.1).
- DPO approval if there is personal data or automated decision-making (DPIA, called RIPD under LGPD).
- Direct and indirect injection test and prompt leakage test, with the result in the report.
- Plan for when the provider is down (the application remains safe and useful without AI, V16.5.2).

## Sources

- https://genai.owasp.org/llm-top-10/
- https://genai.owasp.org/llmrisk/llm01-prompt-injection/
