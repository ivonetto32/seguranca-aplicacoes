# Infrastructure: container, Kubernetes, TLS, headers, proxy and data

It sits outside the application, but it is where many flaws originate. Items marked "(infrastructure team)" depend on whoever operates the platform: the skill delivers the file or configuration, the team applies it. ASVS: V12, V13, V3.4, V14, V15.

## 1. Container

- **Non-root user** (numeric `USER` in the Dockerfile) and `no-new-privileges`; drop all Linux *capabilities* and add only those needed; never `--privileged`; never expose the Docker socket.
- **Minimal base image** (distroless, Alpine or slim) and **pinned by version or digest**; multi-stage build, with no compilers or debugging tools in the final image (V15.2.3). This includes the package managers bundled in the official language image (npm, yarn, corepack, pip): they carry their own dependencies, often with known flaws, and Trivy fails the image because of them. Install dependencies in the build stage and, in the final stage, copy only the result and remove those tools (or use distroless).
- **Read-only filesystem**, with `tmpfs`/`emptyDir` only on paths that need writing.
- **No secrets in the image**: nothing in `ARG`, `ENV`, `COPY` or layers; build-time secrets via a BuildKit secret mount, runtime secrets injected at run time (V13.3.1). No `.git` in the image (V13.4.1).
- **Scanning** of the image, the Dockerfile and secrets in the pipeline (Trivy, Grype or equivalent), blocking critical/high findings; generate the image SBOM (V15.1.2). Rebuild the image periodically to pick up base fixes.
- Limits on memory, CPU, processes and restarts; default seccomp/AppArmor/SELinux profiles kept.
- `HEALTHCHECK`/health endpoints without internal data and without public exposure (V13.4.5). Debugging turned off (V13.4.2).

## 2. Kubernetes (infrastructure team)

- **Pod Security Standards `restricted` profile** enforced by Pod Security Admission per namespace (`enforce`). Requires, among others: `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `capabilities.drop: ["ALL"]`, `seccompProfile: RuntimeDefault`, no `hostPath`, no `hostNetwork`.
- Minimal `securityContext` example (pod and container):

```yaml
securityContext:            # pod
  runAsNonRoot: true
  seccompProfile: { type: RuntimeDefault }
containers:
- securityContext:          # container
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    capabilities: { drop: ["ALL"] }
```

- **NetworkPolicy:** start with a total deny of ingress and egress per namespace and allow only what is needed (proxy to application; application to database, IdP, SIEM and permitted external services). By default pods are not isolated. Policies only work with a network plugin that enforces them (for example Calico, Cilium) and are additive. This also underpins "application unreachable outside the proxy" (`references/identidade-mfa.md`, section 3) and the destination allowlist (V13.2.4, V13.2.5).
- **Secrets:** a Secret is only base64; enable **encryption at rest** in etcd or use an external vault (Secrets Store CSI Driver). Mount as a read-only volume, not as an environment variable; do not version a manifest containing a secret. Apply least-privilege RBAC: `list` and `watch` on Secrets also reveal the content (V13.3.1, V13.3.2).
- **RBAC:** one service account per application, no broad roles; `automountServiceAccountToken: false` when the application does not talk to the cluster API; no `cluster-admin` for workloads.
- Images only from a trusted, approved registry; `ResourceQuota`/`LimitRange`; cluster audit log sent outside the cluster; supported and patched cluster and node versions.

## 3. Infrastructure as code (IaC)

- Version Terraform, Helm, manifests and Dockerfiles together with the code; changes go through review and the pipeline.
- **Scanning** in the pipeline (Checkov, tfsec/Trivy config, kube-linter or equivalent) blocking insecure configuration; secret scanning (gitleaks, trufflehog) on every commit.
- Policy as code (OPA/Gatekeeper or Kyverno) to enforce in the cluster what the scan requires.
- Who can apply IaC is limited, and the permissions IaC grants to resources are minimal. A secret is never in the state in clear text without protection: use an encrypted state backend.

## 4. TLS (V12)

- **Versions:** TLS 1.3 preferred and TLS 1.2 for compatibility; disable SSLv3, TLS 1.0 and 1.1 (V12.1.1). Suites: AEAD (AES-GCM, ChaCha20-Poly1305); in 1.2, ECDHE; no CBC, RC4, 3DES, export, anonymous or static RSA (V12.1.2).
- **Reference configuration:** generate it with Mozilla's TLS configuration tool (now maintained as the TLSRef Configurator) using the **"intermediate"** profile, for your server (nginx, Apache, HAProxy etc.). Use the "modern" profile only if all clients support TLS 1.3 only. Review the output every year.
- **Certificates** publicly trusted or from a trusted internal CA, with SHA-256, RSA key of at least 2048 bits or ECDSA, FQDN in SAN, wildcard only when necessary, CA restriction through a **CAA** record (V12.2.2, V12.3.4).
- **Automate** issuance and renewal (ACME, for example Certbot or cert-manager); 90-day certificates renew around day 60, at a random time. Monitor validity with an alert.
- **TLS also between internal services** (application, database, cache, queue, SIEM) with certificate validation, no fallback to clear text (V12.3.1 to V12.3.3). HTTP redirected to HTTPS only on user-facing endpoints (V4.1.2). WebSocket always `wss` (V4.4.1).
- Private keys with restricted permissions and a lifecycle policy (V11.1.1).

## 5. Security headers (application or proxy)

| Header | Recommended value | ASVS |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (add `preload` only after reading the preload requirements: a certificate error locks users out) | V3.4.1 |
| `Content-Security-Policy` | Strict, with a per-response nonce: `script-src 'nonce-{random}' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'` (add `report-to`). No `unsafe-inline`/`unsafe-eval`. Sent by header, not by `<meta>` | V3.4.3, V3.4.6 |
| `frame-ancestors` (in the CSP) | `'none'`, or `'self'` / an explicit list if there is legitimate embedding. `X-Frame-Options: DENY` only as reinforcement for old browsers | V3.4.6 |
| `X-Content-Type-Options` | `nosniff` (with the correct `Content-Type` on every response) | V3.4.4, V4.1.1 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` (or `no-referrer` if nothing depends on it) | V3.4.5 |
| `Permissions-Policy` | `geolocation=(), camera=(), microphone=()` and whatever else the application does not use | reinforcement (no ID of its own) |
| `Cache-Control` | `no-store` on responses with sensitive data | V14.3.2 |
| `Cross-Origin-Opener-Policy` | `same-origin` | reinforcement |
| `Access-Control-Allow-Origin` | Fixed or validated against a list; never `*` with credentials | V3.4.2 |
| `X-XSS-Protection` | Do not set (or `0`); the defense is the CSP | n/a |
| `Server` / versions | Remove or neutralize; TRACE disabled; directory listing off | V13.4.3, V13.4.4 |

Test the headers in the pipeline (DAST) and periodically in production (`references/producao.md`).

## 6. Reverse proxy and WAF (an extra layer, not a substitute)

- The reverse proxy terminates TLS, removes client identity headers, sets the security ones, limits request size and delimits HTTP messages consistently with the application (V4.1.3, V4.2.1).
- A **WAF** (ModSecurity or Coraza with the **OWASP Core Rule Set**) reduces noise and known attacks, but does **not** fix a vulnerable application: the code is still obliged to validate, authorize and encode. The CRS scores anomalies per transaction and blocks when the threshold is reached (default inbound: 5). Start with high thresholds to observe false positives, tune exceptions and only then lower the threshold.
- **Rate limiting** at the proxy and in the application: per IP, per user and per route (login, search, export, API), with a 429 response and logging (V2.4.1, V6.1.1).

## 7. Backups and restore

- Automatic, **encrypted** backups, with restricted permissions and a copy outside the failure domain (another account/location); retention defined according to the data classification (V14.1.2).
- Periodic, documented **restore test**, measuring the real time (RTO) and the possible loss (RPO); a backup never tested does not count.
- Backing up a database with RLS requires an appropriate role (`row_security` off makes the backup fail instead of silently omitting rows).

## 8. Database: least privilege (V13.2.2)

- A dedicated account per application and per environment; do **not** use the schema owner, a superuser or a built-in administrator in the application. Migrations run with an account separate from the runtime one.
- Permissions only as needed (SELECT/INSERT/UPDATE/DELETE on the tables used); no DDL in production through the application account.
- Database on an internal network, with origin restricted to the application's pod(s); encrypted connection with verification of the server certificate; sample accounts and databases removed; service running unprivileged; credential in the vault, with rotation (V13.2.3, V13.3.1).

## Sources

- OWASP Docker Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
- OWASP Kubernetes Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Kubernetes_Security_Cheat_Sheet.html
- Kubernetes, Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes, Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes, good practices for Secrets: https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- OWASP Infrastructure as Code Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Infrastructure_as_Code_Security_Cheat_Sheet.html
- OWASP Transport Layer Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html
- Mozilla SSL Configuration Generator (migrated to TLSRef): https://ssl-config.mozilla.org/ and https://docs.tlsref.org/
- RFC 9325, recommendations for TLS: https://www.rfc-editor.org/rfc/rfc9325.html
- Let's Encrypt, FAQ (validity and renewal): https://letsencrypt.org/docs/faq/
- OWASP HTTP Headers Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- OWASP Content Security Policy Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- OWASP CRS, anomaly scoring: https://coreruleset.org/docs/2-how-crs-works/2-1-anomaly_scoring/
- Coraza and CRS: https://coraza.io/docs/tutorials/coreruleset/
- OWASP Database Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html
- PostgreSQL, Row Security Policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- OWASP ASVS 5.0.0: https://github.com/OWASP/ASVS/tree/master/5.0
