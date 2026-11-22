# Review report template

Copy the structure below. Every finding cites the ASVS ID from `asvs-n2.md` (never invent an ID). Propose the fixes before applying them.

## Severity

Qualitative CVSS v4.0 ranges (FIRST). Calculate the finding's score where possible and adjust for context (exposure, affected data, MFA at entry); record the reason if you change the range.

| Severity | CVSS 4.0 | Example |
|---|---|---|
| Critical | 9.0 to 10.0 | Remote code execution, access to everyone's data without authentication, production secret in the repository |
| High | 7.0 to 8.9 | IDOR on personal data, authenticated SQL injection, missing token validation |
| Medium | 4.0 to 6.9 | XSS that requires interaction, missing security header with real impact, log with sensitive data |
| Low | 0.1 to 3.9 | Exposed version information, cookie without a recommended attribute with no direct impact |

A score of 0.0 is "none" and becomes an observation, not a finding.

## Structure

```
# Security review report

## 1. Identification
- Application:
- Version / commit:
- Review date:
- Reviewer:
- Scope (what was included and what was left out):
- Reference standard: OWASP ASVS 5.0.0, level 2
- Tools run (name and version): SAST, SCA/SBOM, secrets, container/IaC, DAST, others
- Limitations (environment, access, time):

## 2. Summary
| Severity | Count |
|---|---|
| Critical | |
| High | |
| Medium | |
| Low | |
Verdict in 3 to 5 lines: can it go live? Under which conditions?
(Suggested rule: an open critical or high blocks release.)

## 3. Findings
| # | Severity | ASVS | Location | Problem | Proposed fix | How to test |
|---|---|---|---|---|---|---|
| 1 | High | V8.2.2 | `file:line` or route | What is wrong and the impact | What to change, in one sentence | Short step-by-step that proves the defect and, afterwards, the fix |

## 4. Not applicable
| ASVS | Reason |
|---|---|
| V4.3.1 | The application does not expose GraphQL |

## 5. Items that depend on the company
| Item | Depends on | Note |
|---|---|---|
| E.g.: MFA/acr configuration at the identity provider, log retention, legal basis (DPO), SIEM rules | | |

## 6. Chapters checked
V1 to V17 (mark meets / does not meet / not applicable, with the evidence).

Security: checked …; pending …
```

## Filling-in rules

1. One finding per problem; several locations of the same problem go on the same row.
2. "Location" points to file and line (or route and parameter, or configuration). Code review reads the code, not just the documentation.
3. "How to test" must be repeatable by another person (request, profile used, expected result).
4. A tool finding only goes in after being confirmed; a false positive goes to the suppression list, with the reason.
5. The last line of the report and of the reply is always: "Security: checked …; pending …".
6. Fix deadlines: suggested table in `producao.md`, item (g).

## Sources

- https://www.first.org/cvss/v4-0/specification-document
- OWASP ASVS 5.0.0, as in `asvs-n2.md`
