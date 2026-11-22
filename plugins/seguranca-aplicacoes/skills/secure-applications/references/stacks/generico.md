# Other languages: how to find the controls

Applies when the project uses a language or framework with no file of its own in this folder (Kotlin outside Spring, Rust, Elixir/Phoenix, Scala/Play, C/C++, Perl, server-side Swift, etc.). The goal is to produce, for the stack, the same table as the other files, based on official documentation and not on memory.

## Procedure

1. **Identify** the language, the web framework, the ORM, the identity library and the package manager from the repository files.
2. **Search the framework's official documentation** (security page, production guide) and the OWASP Cheat Sheet Series; note the URL of each source. With no source, mark the item as "unconfirmed" and ask the user.
3. **Fill in the table below**: for each topic, which framework feature covers it, how it is enabled and which ASVS ID it satisfies. Where the framework does not provide the control, say which maintained library supplies it or that the control is left to the application code.
4. **Choose tools** (SAST and dependency auditing) by language coverage; prefer free and open-source ones.
5. **Record** the language's pitfalls: functions that execute code, commands, deserialization or queries from text.

## What each topic must cover

| Topic | What to check | ASVS |
|---|---|---|
| Output encoding | Automatic escaping in the template engine and how it is turned off; output API by context (HTML, attribute, URL, JS). | V1.2.1, V1.2.2, V1.2.3 |
| SQL / ORM | Parameterized queries in the driver and the ORM; the places where the ORM accepts raw SQL or fragments (ordering, dynamic filters). | V1.2.4 |
| Input validation | Schema/type validation mechanism on the server; binding of allowed fields (mass assignment). | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | Whether the framework provides an anti-CSRF token and whether it is enabled; alternative for an API with cookies. | V3.5.1, V3.5.3 |
| Session / cookies | `Secure`, `HttpOnly`, `SameSite` attributes, `__Host-` prefix; ID renewal at login; expiry and logout on the server. | V3.3.1–V3.3.4, V7.2.4, V7.3.1, V7.4.1 |
| OIDC/SAML authentication | Official or widely maintained client library; check `iss`, `aud`, `exp`, signature, `nonce`, PKCE; do not write token validation by hand. | V6.8.2, V9.1.1, V10.2.1, V10.5.4 |
| Authorization | Role/policy mechanism; deny by default; object check; how to test. | V8.2.1, V8.2.2, V8.3.1 |
| Headers / CSP | How to emit CSP, HSTS, `nosniff`, `frame-ancestors`, `Referrer-Policy`; ecosystem header package. | V3.4.1, V3.4.3–V3.4.6 |
| File upload | Size limits, type by content, generated name, location outside the served root. | V5.2.1, V5.2.2, V5.3.2 |
| Deserialization | Native binary formats that rebuild objects (forbidden for external data); safe XML/YAML parsers. | V1.5.1, V1.5.2 |
| Secrets / config | Source of secrets (environment, vault); separation by environment; nothing in the repository. | V13.3.1, V13.3.2 |
| Logging | Structured logging library; sensitive fields suppressed; security events logged. | V16.2.5, V16.3.1, V16.4.1 |
| Errors / debugging | Production mode, global error handler, debug endpoints and documentation turned off. | V16.5.1, V13.4.2, V13.4.5 |

## How to find the tools

- **SAST**: Semgrep (confirm whether the rules repository has rules for the language); CodeQL (confirm the language in the documentation); the community's own analyzer (e.g. `cargo clippy` with security lints, `mix sobelow` for Phoenix, `cppcheck`/`clang-tidy` for C/C++), checking current maintenance.
- **Dependencies**: look for the package manager's official command (`cargo audit`/`cargo deny`, `mix deps.audit`, `sbt dependencyCheck`), or use OSV-Scanner (reads many lockfile formats) and OWASP Dependency-Check when the ecosystem is covered.
- **SBOM**: CycloneDX or SPDX, with the ecosystem's native generator or `syft`.
- **Languages without garbage collection** (C/C++): add builds with sanitizers, fuzzing and compiler warnings treated as errors (V1.4.1–V1.4.3).

## Deliverable

When finished, give the user: the filled-in table, the language's pitfalls, the recommended tools and the list of sources consulted, separating what was confirmed in documentation from what stayed "unconfirmed". If the project is recurring, suggest saving the result as a new file in `references/stacks/`.

## Sources

- https://cheatsheetseries.owasp.org/
- https://owasp.org/www-project-application-security-verification-standard/
- https://github.com/semgrep/semgrep-rules
- https://osv.dev/
