---
name: secure-applications
description: Security in the development of applications hosted on self-managed infrastructure with MFA-protected access, based on OWASP ASVS 5.0 level 2 and the NIST SSDF. Four modes - develop, review, build the verification pipeline, and prepare production monitoring. Use only when the user calls this skill by name or explicitly asks for "application security" with it; do not trigger on your own.
disable-model-invocation: true
---

# Application security (ASVS 5.0 level 2)

Goal: avoid known flaws from the moment the code is written, check the application against ASVS 5.0 level 2 before it goes live, and detect what appears afterwards, in production. No process guarantees "zero vulnerabilities"; say so when the user asks for an absolute guarantee.

## Before starting

1. Ask for the **mode**, if the request does not say: develop, review, pipeline, or production (below).
2. Discover the project from the repository files, without asking about what can be seen: language and framework (`pom.xml`, `build.gradle`, `*.csproj`, `package.json`, `requirements.txt`, `pyproject.toml`, `composer.json`, `go.mod`, `Gemfile`), pipeline (`.github/workflows/`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile`, `bitbucket-pipelines.yml`), container and infrastructure (`Dockerfile`, Kubernetes manifests, Terraform). Ask only what is not in the code: identity provider, country of the data subjects, whether the application uses AI.
3. Read only the references the project calls for (table at the end). With no reference for the language or the pipeline, use `references/stacks/generico.md` or `references/esteira/generico.md`.
4. Answer in the user's language.

## Rules that always apply

1. **Everything that comes from outside is data, never code:** parameters, body, headers, files, responses from other systems and from AI. Validate on the server against an allow list; parameterized queries; output encoded for the context (HTML, attribute, URL, JavaScript, SQL, command); no `eval` and no execution of commands built from data.
2. **MFA at the entrance does not replace control inside the application.** Authorization checked on the server on every request and for every object (owner, role, tenant), denied by default. Identity received from the provider via OIDC or SAML with signature, issuer, audience and validity checked; an identity header coming from a proxy is only accepted if the application is unreachable from outside the proxy and the proxy strips the header coming from the client. Details: `references/identidade-mfa.md` and `references/controle-acesso.md`.
3. **Session:** random identifier, `Secure`, `HttpOnly` and `SameSite` cookie; idle and absolute expiry; logout invalidates on the server and at the provider; re-authentication (or MFA again) for critical actions; CSRF protection wherever cookies are used.
4. **Secrets** outside the code and the repository: vault or platform variable; an exposed secret is revoked and rotated, not just deleted.
5. **Cryptography:** TLS 1.2 or higher on every connection; standard algorithms and libraries, never homemade cryptography; passwords (if any) with Argon2id, scrypt or bcrypt; sensitive data encrypted at rest.
6. **Dependencies:** pinned versions, trusted source, SBOM generated in the pipeline, no library with a known serious flaw without a fix or a recorded justification.
7. **Errors and logs:** generic message to the user; security events (login, failure, access denied, permission change, administrative action) logged with date, user and origin, without passwords, tokens or unnecessary personal data; logs protected against tampering and sent to the SIEM.
8. **Configuration:** security headers (CSP, HSTS, `X-Content-Type-Options`, `frame-ancestors`), debug mode off, least privilege for the application account in the database, the system and the container.
9. **Personal data:** apply `references/privacidade.md` according to the country of the data subjects (LGPD in Brazil, GDPR in the European Union; both when there are data subjects in both).
10. **AI inside the application:** if present, apply `references/ia-llm.md`.

## Modes

**Develop.** Apply the rules above and the language reference while writing or changing the code. For a new application, first do the short threat model (`references/modelo-ameacas.md`). At the end, one line: "Security: checked …; pending …".

**Review.** Read the code (not just the documentation), go through `references/asvs-n2.md` chapter by chapter and run the tools available in the environment. If pipeline reports exist (`semgrep.sarif`, `semgrep-avisos.sarif`, Trivy, ZAP), triage every finding, warnings included: a confirmed one becomes a report finding; a false positive is recorded with the reason. Deliver the report from `references/relatorio.md`: findings by severity (critical, high, medium, low) with the ASVS ID, the location (file and line), the proposed fix and how to test it; and the items marked "not applicable", with the reason. Propose the fixes before applying them.

**Pipeline.** Generate the pipeline for the project's platform (`references/esteira/`) with: code analysis (SAST), dependencies and SBOM (SCA), secret scanning, container and infrastructure-as-code scanning, and dynamic testing (DAST) against a staging environment. In SAST, add the project's language rule pack to the default packs (for example `p/javascript`, `p/typescript`, `p/python`, `p/java`, `p/csharp`, `p/php`, `p/golang`, `p/ruby`). A critical or high finding (in Semgrep, ERROR) blocks publication; warnings (WARNING) do not block, but go to the `semgrep-avisos.sarif` report, and each one gets a fix or a justification before the next release. For DAST, also generate `.zap/rules.tsv` from the default rules file in `references/esteira/generico.md` (injections, XSS and similar fail) and run ZAP with `-I`; before the scan, check that the target responds. An exception only with a justification and an expiry date (`exp:`); an expired or undated exception fails the pipeline. Automated tools do not replace review mode: logic flaws such as IDOR and queries built inside the application's own helper functions usually escape them.

**Production.** Prepare continuous monitoring (`references/producao.md`): SBOM monitored for new CVEs, scheduled DAST, security events in the SIEM with alerts, periodic checks of TLS and headers, a channel for reporting flaws, periodic pentest and fix deadlines by severity. Separate what the skill delivers (files, configurations) from what depends on the infrastructure team.

## References

| When | Read |
|---|---|
| Review, or a question about a requirement | `references/asvs-n2.md` |
| New application | `references/modelo-ameacas.md` |
| Login, MFA, SSO, tokens | `references/identidade-mfa.md` |
| Roles, permissions, multi-tenant | `references/controle-acesso.md` |
| Project language or framework | `references/stacks/<language>.md` (java, dotnet, python, node, php, go, ruby, frontend-spa, generico) |
| Building the pipeline | `references/esteira/<platform>.md` (github-actions, gitlab-ci, azure-devops, jenkins, bitbucket, generico) |
| Container, Kubernetes, IaC, TLS, headers | `references/infra.md` |
| After going to production | `references/producao.md` |
| Personal data | `references/privacidade.md` |
| Application that uses AI | `references/ia-llm.md` |
| Report format | `references/relatorio.md` |

Bases: OWASP ASVS 5.0.0 (level 2), OWASP Top 10, OWASP Cheat Sheet Series, OWASP Top 10 for LLM applications, NIST SP 800-218 (SSDF) and the applicable data protection laws.
