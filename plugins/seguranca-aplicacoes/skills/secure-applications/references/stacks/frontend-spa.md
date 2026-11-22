# Front-end SPA: security

Applies when there is a `package.json` with `react`, `@angular/core` or `vue`, `vite.config.*`, `angular.json`, `src/App.*`. The SPA runs in the user's browser: nothing in it is secret or access control. The server/API (see `node.md` or the back-end stack) decides.

## Framework controls

| Topic | How to do it in this framework | ASVS |
|---|---|---|
| Output encoding | React (`{x}`), Vue (`{{ }}`) and Angular (interpolation) escape by default; Angular also sanitizes HTML and URLs. Never build HTML by concatenation. Text via `textContent`. | V1.2.1, V3.2.2 |
| Untrusted HTML | If user HTML must be rendered, sanitize it first with a recognized library (DOMPurify); keep sanitization separate from script execution. | V1.3.1, V1.3.5 |
| SQL / ORM | Does not apply in the browser; make sure the API parameterizes (see the back-end stack). No queries built on the client. | V1.2.4 |
| Input validation | Client-side validation is only ergonomics (Zod, Yup, Angular/Vue validators); the validation that counts is the server's. | V2.2.2 |
| CSRF | If the API uses a session cookie, require a token: Angular's `HttpClient` reads `XSRF-TOKEN` and sends `X-XSRF-TOKEN` on mutating requests (the server must issue and verify it); in React/Vue, do the same in the HTTP client (axios, fetch). With a bearer header the CSRF risk drops, but the risk of token theft via XSS grows. | V3.5.1, V3.5.3 |
| Session / tokens | Prefer the BFF pattern: the back end does OIDC and holds the tokens, and the SPA receives only an `HttpOnly` + `Secure` + `SameSite` cookie. Avoid tokens in `localStorage`/`sessionStorage`/IndexedDB. | V3.3.4, V14.3.3, V10.1.1 |
| OIDC/SAML authentication | Without a BFF: code flow with PKCE and a public client in a maintained library (e.g. `oidc-client-ts`, `angular-auth-oidc-client`); no implicit flow; validate `state`/`nonce`. SAML always stays on the server. | V10.2.1, V10.4.4, V10.4.6, V10.5.1 |
| Authorization | Client-side protected routes (guards, `ProtectedRoute`) serve only the experience; the real decision and the per-object check stay in the API. Hiding a button does not protect. | V8.3.1, V8.2.2 |
| Headers / CSP | Serve the SPA with a restrictive CSP (no `unsafe-inline`/`unsafe-eval`; nonce or hash), HSTS, `nosniff`, `frame-ancestors`, `Referrer-Policy`. Angular: `CSP_NONCE`/`ngCspNonce`; Trusted Types as an extra layer. | V3.4.1, V3.4.3–V3.4.6 |
| File upload | Client-side type/size validation is only guidance; the server validates. Display files uploaded by others only with the type checked (SVG can contain script). | V5.2.2, V1.3.4 |
| Deserialization | `JSON.parse`, never `eval`; treat the API response as data and validate its format before use; be careful with `postMessage` (check `origin`). | V1.3.2, V3.5.5 |
| Secrets / config | Every `VITE_*`, `REACT_APP_*`, `NEXT_PUBLIC_*`, `environment.ts` goes to the browser: never a private API key, client secret or credential. | V13.3.1 |
| Logging | Do not log tokens, passwords or PII to `console` or to a telemetry tool; source maps outside production or restricted. | V16.2.5, V14.2.3 |
| Errors / debugging | Generic message to the user; no stack on screen; development tools (React DevTools hooks, Vue devtools) and dev mode off in the production build. | V16.5.1, V13.4.2 |

## Common pitfalls

- React: `dangerouslySetInnerHTML`; `href`/`src` with a user value (`javascript:`); `ref.current.innerHTML`.
- Vue: `v-html` with external data; runtime templates compiled from user input.
- Angular: `bypassSecurityTrustHtml/Url/Script/ResourceUrl` without reviewing the value; direct DOM access (`ElementRef.nativeElement.innerHTML`).
- `eval`, `new Function`, `setTimeout("...")`, `document.write`, `innerHTML` and `outerHTML` with external data.
- Access/refresh token in `localStorage` (an XSS steals it) and in the URL/query string.
- `window.postMessage` with `"*"` or without checking `event.origin`; `target="_blank"` without `rel="noopener"`.
- An npm dependency with a malicious install script, or a CDN without a version and SRI.
- Believing a "protected route" or a front-end environment variable is a security control.

## Tools

- SAST: Semgrep with JavaScript/TypeScript and React rule sets; `eslint-plugin-security` plus the framework rules (`eslint-plugin-react`, `@angular-eslint`, `eslint-plugin-vue`) — triage false positives.
- Dependencies: `npm audit` (or `pnpm`/`yarn`), lockfile with `npm ci`, SBOM with CycloneDX; SRI on CDN scripts.

## Sources

- https://angular.dev/best-practices/security
- https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
- https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-oidc-web-authentication (section on BFF)
- https://github.com/eslint-community/eslint-plugin-security
- https://github.com/semgrep/semgrep-rules
