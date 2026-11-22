# Java: security

Applies when there is `pom.xml`, `build.gradle(.kts)`, classes with `@SpringBootApplication`, `@RestController`, `spring-security-*` or, in Jakarta EE, `web.xml`/`jakarta.*`.

## Framework controls

| Topic | How to do it in this framework | ASVS |
|---|---|---|
| Output encoding | Thymeleaf escapes with `th:text`; avoid `th:utext`. JSP: `<c:out>` or `fn:escapeXml`, never a raw `${}` in HTML. JSON only via Jackson, without building strings. | V1.2.1, V1.2.3, V3.2.2 |
| SQL / ORM | `PreparedStatement`, Spring Data with named parameters, JPA with `setParameter`. JPA/Hibernate does not protect concatenated JPQL/HQL. | V1.2.4 |
| Input validation | Bean Validation (`@Valid`, `@NotNull`, `@Size`, `@Pattern`) on DTOs; never bind a JPA entity directly to the body (mass assignment). | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | Spring Security protects unsafe methods by default (token in the session; `csrf.spa()` for SPAs). Do not turn it off with `csrf.disable()` if there is a session cookie. | V3.5.1, V3.5.3 |
| Session / cookies | `Secure`, `HttpOnly`, `SameSite` cookie in the container or in `server.servlet.session.cookie.*`; Spring Security changes the ID at login (session fixation protection). Timeout in `server.servlet.session.timeout`. | V3.3.1–V3.3.4, V7.2.4, V7.3.1 |
| OIDC/SAML authentication | Official client: `spring-boot-starter-oauth2-client` (`oauth2Login`, code + PKCE) and `spring-security-saml2-service-provider` (`saml2Login`). Do not write token validation by hand. | V6.8.2, V10.2.1, V10.5.1, V10.5.4 |
| Authorization | `authorizeHttpRequests` with deny by default (`anyRequest().authenticated()` or `denyAll()`); `@PreAuthorize`/`@PostAuthorize` and `@PreAuthorize("@rule.canEdit(#id)")` to check the object. | V8.2.1, V8.2.2, V8.3.1 |
| Headers / CSP | Spring Security sends `X-Content-Type-Options`, HSTS (HTTPS only), `X-Frame-Options: DENY` and anti-cache headers by default; **CSP is not sent by default**: configure `headers.contentSecurityPolicy(...)`. | V3.4.1, V3.4.3, V3.4.4, V3.4.6 |
| File upload | `MultipartFile`: limit `spring.servlet.multipart.max-file-size`; ignore `getOriginalFilename()` and generate your own name; validate the content, store outside the web root. | V5.2.1, V5.2.2, V5.3.2, V5.4.1 |
| Deserialization | Do not use `ObjectInputStream` with external data; JSON with Jackson without `enableDefaultTyping`/open polymorphism; if unavoidable, an `ObjectInputFilter` with an allow list. XML with XXE turned off. | V1.5.1, V1.5.2 |
| Secrets / config | Environment variables, Spring Cloud Config with encryption or a vault (Vault); nothing in a versioned `application.properties`. Separate profiles per environment. | V13.3.1, V13.3.2 |
| Logging | SLF4J/Logback with a structured format; no password/token/personal data; beware of log injection (CRLF) and vulnerable Log4j versions. | V16.2.5, V16.3.1, V16.3.2, V16.4.1 |
| Errors / debugging | `@ControllerAdvice`/`ProblemDetail` with a generic message; `server.error.include-stacktrace=never`; Actuator restricted (only `health`) and behind authentication. | V16.5.1, V13.4.2, V13.4.5 |

## Common pitfalls

- `ObjectInputStream.readObject()` on external data (remote code execution).
- `csrf.disable()` and `permitAll()` copied from a tutorial into an application with a session cookie.
- Building JPQL/HQL/native SQL with `+` or `String.format`, including dynamic `ORDER BY`.
- `th:utext`, `[(...)]` in Thymeleaf and `${}` in JSP with user data.
- XML factories (`DocumentBuilderFactory`, `SAXParser`) without turning off DTDs/external entities.
- SpEL, `ScriptEngine` or `Runtime.exec`/`ProcessBuilder` with user data; JNDI with a name coming from outside.
- Actuator (`/env`, `/heapdump`) exposed; `@RequestBody` bound directly to the JPA entity.
- Trusting `X-Forwarded-*` without configuring `server.forward-headers-strategy` and the trusted proxy.

## Tools

- SAST: Semgrep with the Java/Kotlin rule sets; SpotBugs with the Find Security Bugs plugin (via the SpotBugs Maven/Gradle plugin); CodeQL when the platform offers it.
- Dependencies: OWASP Dependency-Check (project now at `github.com/dependency-check/DependencyCheck`; use an NVD API key); `mvn dependency:tree`/Gradle to map transitive dependencies; generate an SBOM (CycloneDX).

## Sources

- https://cheatsheetseries.owasp.org/cheatsheets/Java_Security_Cheat_Sheet.html
- https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html
- https://docs.spring.io/spring-security/reference/servlet/oauth2/login/index.html
- https://docs.spring.io/spring-security/reference/servlet/saml2/index.html
- https://docs.spring.io/spring-security/reference/features/exploits/headers.html
- https://find-sec-bugs.github.io/
- https://github.com/semgrep/semgrep-rules
