# Production: continuous detection after release

Goal: discover early whatever appears after go-live (a new CVE in a dependency, a regression, an ongoing attack). Basis: ASVS 5.0 V15.1, V15.2, V16, V13.4 and NIST SSDF (practice RV, identify and fix vulnerabilities). The deadlines and thresholds below are suggestions for the company to adjust.

## a) Monitored SBOM (OWASP Dependency-Track)

1. The pipeline generates the SBOM (CycloneDX) on every release build and sends it to Dependency-Track through the API, with a minimum-scope API key kept in the pipeline vault (V15.1.2).
2. **One project per application**, with **one version per release** (app name + version or tag). Mark the version in production as active and deactivate the old ones.
3. Notifications: create a rule for the groups `NEW_VULNERABILITY` (immediate alert) and `NEW_VULNERABILITIES_SUMMARY` (scheduled summary), plus `POLICY_VIOLATION`; limit the rule to projects in production. Available destinations: webhook (POST JSON), email, Slack, Microsoft Teams, Mattermost, Webex, Jira. Choose the channel the team actually reads.
4. Policy (Policy Compliance): a "fail" violation for a critical or high vulnerability with a fix available, and for a component that is no longer maintained. Record exceptions with a justification, owner and deadline (V15.1.1, V15.2.1).
5. Triage: each finding receives an analysis (exploitable, not affected, false positive) in Dependency-Track itself, so the state change is audited.

## b) Scheduled DAST (OWASP ZAP)

1. **Staging identical to production** (same version, configuration, headers and proxy). Full (active) scan weekly and after each relevant release, by a ZAP Automation Framework plan (YAML) versioned in the repository.
2. **Authenticated scan** with the **identity provider's test user**, an account created only for this, with minimum profiles and no real data. Never use a real user's credential. The test user's credentials live in the vault, not in the YAML.
3. Against **production**, only the *baseline* (passive, no active attack), and only with written authorization from the infrastructure team, in an agreed window and without real users.
4. Output: report (JSON/HTML/SARIF) archived; a high-risk alert opens a ticket automatically. ZAP returns a non-zero exit code on failure/warning, useful for the pipeline.
5. False-positive tuning in a versioned rules file, with the reason.

## c) Security events in the SIEM

Basis: OWASP Logging Cheat Sheet and OWASP Logging Vocabulary Cheat Sheet (standardized names, such as `authn_login_fail`, `authz_fail`, `authz_change`). ASVS requirements: V16.1.1 (inventory), V16.2.1 to V16.2.5, V16.3.1 to V16.3.4, V16.4.1 to V16.4.3.

**Minimum events**

| Event | Note |
|---|---|
| Successful and failed login | From the IdP's claims and response: `sub`, `acr`/`amr`, reason (V16.3.1) |
| Access denied (403/401) | Resource, action and user (V16.3.2) |
| Permission or profile change | Who changed it, for whom, from what to what |
| Administrative action | User creation/removal, configuration change, bulk export |
| Input validation failures in volume | Count per source; do not record the whole content (V16.3.3) |
| Token validation failure | Signature, issuer, audience, expiry |
| Session failure | Invalid identifier, use after expiry |
| Unexpected error and security control failure | V16.3.4 |

**Format**: JSON, one line per event; fields: `timestamp` in UTC (ISO 8601, synchronized clocks, V16.2.2), `event` (vocabulary), `user_id` (internal identifier, not name or email), `source_ip` (the real one, from a trusted header, V15.3.4), `request_id`, `app`, `version`, `outcome`, `resource`.

**Never log**: password, token, key, clear-text session identifier (use a hash), cookie, request body with personal data, document or card number (V16.2.5). Encode whatever comes from the user to prevent log injection (V16.4.1).

**Integrity and retention**: immediate shipping to a system separate from the application (V16.4.3), with restricted access and no permission to alter (V16.4.2). Retention: define by company policy (suggestion: 12 months searchable plus whatever the law or internal rule requires) and discard afterwards; a log with personal data follows `privacidade.md`.

**Example alert rules** (adjust thresholds to real traffic)

1. Brute force: more than 10 login failures for the same user or from the same IP in 5 minutes, or failures across many users from one IP (password spraying).
2. IDOR probing: more than 20 403/404 responses for distinct objects from the same user in 10 minutes.
3. Privilege change outside the approved change window, or without an associated ticket.
4. Spike in token or input validation failures (possible automated attack).
5. Successful login right after many failures, or from a country/network unusual for the profile.
6. Administrative action by an account that has never performed it.
7. Application stopped sending logs (the absence of events is also an alert).

## d) Periodic checks

| What | How | Suggested frequency |
|---|---|---|
| TLS (versions, ciphers, certificate) | `testssl.sh` or equivalent against the application's address; expected: only TLS 1.2 and 1.3, strong ciphers (V12.1.1, V12.1.2) | Monthly and after a proxy change |
| Security headers | HSTS, CSP, `nosniff`, Referrer-Policy, `frame-ancestors` (V3.4.1 to V3.4.6) | Monthly, also in DAST |
| Certificate validity | Alert at 30 and 7 days ahead; automatic renewal where possible | Continuous |
| Exposed debugging and monitoring endpoints | Look for `/debug`, `/actuator`, `/swagger`, `/metrics`, `.git`, directory listing, TRACE (V13.4.1 to V13.4.5) | Weekly (in DAST) |
| Unmaintained dependencies | Dependency-Track report | Monthly |
| Review of accounts and profiles | List of who has access and an administrative profile | Quarterly |

## e) Vulnerability disclosure

1. Publish `/.well-known/security.txt` (RFC 9116), served over HTTPS as `text/plain` UTF-8, with at least `Contact` (email, URL or phone) and `Expires` (future date; renew before it expires, preferably in less than a year). Useful optional fields: `Policy`, `Preferred-Languages`, `Acknowledgments`, `Canonical`. It is valid only for the address where it is served.
2. Internal process: monitored inbox, acknowledgement of receipt within 3 business days (suggestion), severity triage, an owner for the fix, deadline from table (g), feedback to the reporter and a record of the lesson learned. For an internal-only application behind MFA: the contact can be an internal channel instead of a public one.

## f) Penetration testing

At least once a year and at each major change (new module, new integration, IdP change, architecture change). Written scope, contracted with someone who did not develop the application, with test users of each profile (tests horizontal and vertical authorization). The report follows the template in `relatorio.md`; fixes go into table (g) and the retest closes the finding.

## g) Fix deadlines (suggestion)

| Severity | Deadline | Note |
|---|---|---|
| Critical (CVSS 9.0 to 10.0) | 7 days | If in the CISA KEV catalog or with a high EPSS, treat as an incident: mitigate within 24 to 72 hours |
| High (7.0 to 8.9) | 30 days | |
| Medium (4.0 to 6.9) | 90 days | |
| Low (0.1 to 3.9) | Next maintenance cycle | |

Prioritize by combining: CVSS (technical severity), EPSS (probability of exploitation in the next 30 days, from 0 to 1), presence in the CISA KEV (confirmed exploitation) and the asset's exposure. A provisional mitigation (WAF rule, turning off the function) counts as containment, not as a fix; the deadline continues. An exception requires a justification, a compensating control, an owner and a date (V15.1.1).

## h) When a vulnerability is exploited

1. Trigger the company's incident response plan; record the time of awareness.
2. Contain (isolate, block the source, turn off the function, revoke sessions and tokens, rotate exposed secrets).
3. Preserve logs and evidence before cleaning up.
4. Assess whether personal data was involved: if so, immediately notify the DPO (encarregado under LGPD), who decides on communication to the authority and to data subjects (see `privacidade.md`; legal deadlines run from awareness).
5. Fix the cause, retest, post-incident review and adjustment of the detection rule.

## i) Who does what

| The skill delivers | The infrastructure/security team operates |
|---|---|
| Pipeline step that generates and sends the SBOM | Dependency-Track server, users, notification channels |
| ZAP plan (YAML), false-positive rules | Identical staging environment, test user in the IdP, scan window |
| Log library/configuration in JSON with the vocabulary | SIEM, retention, log protection, alert rules, on-call |
| Template for `security.txt` and for alert rules | Publishing the file, contact inbox, triage |
| Commands and expected headers for checking | Scheduled execution, certificate alert |
| Report template and deadline table | Contracting the pentest, SLA approval, exceptions |

## Sources

- https://docs.dependencytrack.org/integrations/notifications/
- https://www.zaproxy.org/docs/automate/automation-framework/
- https://www.zaproxy.org/docs/docker/baseline-scan/
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html
- https://www.rfc-editor.org/rfc/rfc9116
- https://github.com/testssl/testssl.sh
- https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- https://www.first.org/epss/
- https://www.first.org/cvss/v4-0/specification-document
