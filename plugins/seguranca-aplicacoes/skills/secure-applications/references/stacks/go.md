# Go: security

Applies when there is `go.mod`/`go.sum`, `net/http` packages, `github.com/gin-gonic/gin`, `github.com/labstack/echo`, `chi`.

## Framework controls

| Topic | How to do it in this framework | ASVS |
|---|---|---|
| Output encoding | `html/template` (automatic contextual escaping); never `text/template` for HTML. For JSON in a script, pass the object to the template, not a JSON string. | V1.2.1, V1.2.3, V3.2.2 |
| SQL / ORM | `database/sql` with placeholders (`db.Query(sql, args...)`), `sqlc`, GORM with `?`/struct; never `fmt.Sprintf` to build SQL. | V1.2.4 |
| Input validation | Decode into a typed struct (`json.Decoder` with `DisallowUnknownFields`), validate with `go-playground/validator`; limit the body with `http.MaxBytesReader`. | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | `net/http` does not provide it: use a maintained library (e.g. `gorilla/csrf`, Echo middleware) or check `Origin`/`Sec-Fetch-Site`, plus `SameSite`. State-changing methods only with POST/PUT/PATCH/DELETE. | V3.5.1, V3.5.3 |
| Session / cookies | Cookie with `http.Cookie{Secure, HttpOnly, SameSite}`; session with a random ID (`crypto/rand`) in a server-side store; renew the ID at login; invalidate at logout. | V3.3.1–V3.3.4, V7.2.3, V7.2.4, V7.4.1 |
| OIDC/SAML authentication | `github.com/coreos/go-oidc/v3/oidc` with `golang.org/x/oauth2` (discovery, ID token verification, `nonce`, PKCE). SAML: a maintained library (e.g. `crewjam/saml`) with mandatory signatures. | V6.8.2, V10.2.1, V10.5.1, V10.5.4 |
| Authorization | Middleware that denies by default (Gin/Echo/chi `Use`), role and object-owner check in every handler; never trust an ID coming from the client. | V8.2.1, V8.2.2, V8.3.1 |
| Headers / CSP | Your own middleware or a package (e.g. `unrolled/secure`, `gin-contrib/secure`) for HSTS, CSP, `nosniff`, `frame-ancestors`, `Referrer-Policy`. | V3.4.1, V3.4.3–V3.4.6 |
| File upload | `r.ParseMultipartForm` with a limit and `MaxBytesReader`; `http.DetectContentType`; server-generated name; `filepath.Base`/`filepath.IsLocal` against path traversal; store outside the served root. | V5.2.1, V5.2.2, V5.3.2, V5.4.1 |
| Deserialization | Typed `encoding/json`; `encoding/gob` only between trusted parties; XML (`encoding/xml` does not resolve external entities, but limit the size); YAML with fixed types. | V1.5.1, V1.5.2 |
| Secrets / config | Environment variables or a vault; nothing in versioned code/`.env`; `crypto/rand` (never `math/rand`) for tokens. | V13.3.1, V11.5.1 |
| Logging | Structured `log/slog`; no credentials/PII; strip line breaks from external data. | V16.2.5, V16.3.1, V16.4.1 |
| Errors / debugging | Handle every `error`; generic response to the client and detail only in the log; `recover` in middleware; turn off `pprof` and `expvar` in production; `gin.SetMode(gin.ReleaseMode)`. | V16.5.1, V13.4.2, V13.4.5 |

## Common pitfalls

- `text/template` to generate HTML; use of `template.HTML`, `template.JS`, `template.URL` with external data (turns escaping off).
- `fmt.Sprintf` for SQL; `exec.Command("sh", "-c", ...)` with external data (use `exec.Command(cmd, args...)` without a shell).
- `http.Client`/`http.Get` with a user URL without a destination allow list (SSRF) or with `InsecureSkipVerify: true`.
- `http.ListenAndServe` without timeouts (`http.Server{ReadHeaderTimeout, ...}`): denial of service through slow connections.
- `math/rand` for tokens; comparing secrets with `==` (use `subtle.ConstantTimeCompare`).
- `http.ServeFile`/`os.Open` with a path built from external data; `filepath.Join` does not prevent `..` on its own.
- Race conditions on shared state (maps, sessions): use a mutex and run the race detector.
- `net/http/pprof` imported in an exposed binary.

## Tools

- SAST: Semgrep with Go rule sets; `gosec` (`gosec ./...`, AST/SSA and data-flow analysis); `go vet ./...`.
- Dependencies: `govulncheck ./...` (reports only flaws the code reaches); `go test -race ./...`; native fuzzing (`go test -fuzz`) for parsers; SBOM with CycloneDX/`syft`.

## Sources

- https://go.dev/doc/security/best-practices
- https://pkg.go.dev/html/template
- https://github.com/coreos/go-oidc
- https://github.com/securego/gosec
- https://github.com/semgrep/semgrep-rules
