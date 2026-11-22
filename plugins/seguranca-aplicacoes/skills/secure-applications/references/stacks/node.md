# Node.js: security

Applies when there is a `package.json` with `express`, `@nestjs/*`, `fastify`, `next` (API routes, Server Components and Server Actions), `server.js`/`app.ts`. Browser front end: see `frontend-spa.md`.

## Framework controls

| Topic | How to do it in this framework | ASVS |
|---|---|---|
| Output encoding | Template engines with escaping on (EJS `<%= %>`, Handlebars `{{ }}`, Pug `#{}`); avoid unescaped output (`<%-`, `{{{ }}}`, `!{}`). React/Next escape by default. | V1.2.1, V1.2.3, V3.2.2 |
| SQL / ORM | Parameterized queries (`pg`, `mysql2` with `?`/`$1`), Prisma/Sequelize/TypeORM with the parameter API; beware of `$queryRawUnsafe`, concatenated `sequelize.query` and NoSQL operators coming from the body (`{"$ne": ...}`). | V1.2.4 |
| Input validation | Server-side schema: Zod, Joi, ajv or `class-validator` + `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted`) in NestJS; validate `params`, `query`, body and headers. | V2.2.1, V2.2.2, V15.3.3, V15.3.6 |
| CSRF | With a session cookie, an anti-CSRF token (NestJS: `app.enableCsrfProtection()`; Express: a maintained double-submit token library) plus `SameSite`. Next.js Server Actions accept only POST and compare `Origin` with `Host`; configure `allowedOrigins` behind a proxy. | V3.5.1, V3.5.3 |
| Session / cookies | `express-session` with an external store (Redis etc.), generic name, `secure`, `httpOnly`, `sameSite`, `rolling`/`maxAge`, `req.session.regenerate()` at login. `cookie-session` keeps everything in the cookie: no secrets in it. | V3.3.1–V3.3.4, V7.2.4, V7.3.1 |
| OIDC/SAML authentication | `openid-client` (certified OIDC client) or Passport with a maintained strategy; `jose` to validate JWTs (fixed algorithm, `iss`, `aud`, `exp`). SAML: `@node-saml/passport-saml` with signatures required. Next.js: Auth.js (NextAuth). | V6.8.2, V9.1.1–V9.2.3, V10.5.4 |
| Authorization | Middleware/guards (NestJS `CanActivate` + role decorators) denying by default; on every route, check the object's owner/tenant. Next.js: a server-side data access layer (`server-only`) that authorizes and returns only the necessary fields; re-verify **inside** each Server Action. | V8.2.1, V8.2.2, V8.3.1, V15.3.1 |
| Headers / CSP | `helmet` (Express/Fastify) or `app.useSecurityHeaders()` in NestJS; adjust the CSP to the application; turn off `X-Powered-By`. Next.js: CSP with a per-request nonce. | V3.4.1, V3.4.3–V3.4.6 |
| File upload | `multer`/`busboy` with `limits` on size and number of fields; server-generated name; check the content; outside the static root. | V5.2.1, V5.2.2, V5.3.2, V5.4.1 |
| Deserialization | `JSON.parse` followed by schema validation; do not use `node-serialize`, `eval`, `vm` for external data; `yaml` in safe mode; limit the body size (`express.json({limit})`). | V1.3.2, V1.5.2 |
| Secrets / config | Environment variables or a vault; in Next.js only what has the `NEXT_PUBLIC_` prefix goes to the browser: never put a secret in it; read `process.env` only in the data layer. | V13.3.1, V13.3.2 |
| Logging | Structured `pino`/`winston`, with sensitive fields suppressed (redact); no tokens or PII. | V16.2.5, V16.3.1, V16.4.1 |
| Errors / debugging | Global error handler with a generic response (no stack); `NODE_ENV=production`; handle `unhandledRejection` without leaking details; turn off the inspector (`--inspect`). | V16.5.1, V13.4.2 |

## Common pitfalls

- Final image keeping the `npm` from the official `node` image: it carries its own dependencies with known flaws and fails Trivy. Use a two-stage build and, in the final stage, `RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn*` (or a distroless Node image).

- `child_process.exec`/`execSync` with external data (use `execFile`/`spawn` with an argument array and without `shell: true`).
- `eval`, `new Function`, `vm.runInNewContext`, `setTimeout("string")` with external data.
- Prototype pollution: `Object.assign`/recursive merge with a user object and `__proto__`/`constructor` keys; prefer `Map`/`Set` and `Object.create(null)`.
- NoSQL injection through an object in the body (`req.body.user` used directly in the MongoDB filter).
- `res.redirect(req.query.next)` without a destination allow list; `res.sendFile`/`fs` with a path coming from the user (path traversal).
- A regular expression built from input (`new RegExp(x)`) or vulnerable to ReDoS.
- Comparing secrets with `===` (use `crypto.timingSafeEqual`); `Math.random` for tokens (use `crypto.randomBytes`).
- Next.js: treating a Server Action as internal (it is a public POST), passing the entire database record to a Client Component, trusting `searchParams` to decide permission.

## Tools

- SAST: Semgrep with JavaScript/TypeScript and Node rule sets; `eslint-plugin-security` (generates many false positives, triage each finding).
- Dependencies: `npm audit` (or `pnpm audit`/`yarn npm audit`); pin with a lockfile and `npm ci`; SBOM with CycloneDX; review install scripts.

## Sources

- https://expressjs.com/en/advanced/best-practice-security.html
- https://nextjs.org/docs/app/guides/data-security
- https://docs.nestjs.com/security/helmet
- https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
- https://github.com/eslint-community/eslint-plugin-security
- https://github.com/semgrep/semgrep-rules
