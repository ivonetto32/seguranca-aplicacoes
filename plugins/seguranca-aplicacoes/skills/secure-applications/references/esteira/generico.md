# Security pipeline: any other CI platform

Use this file when the platform has no file of its own (Drone, Woodpecker, TeamCity, CircleCI, Forgejo/Gitea Actions, Tekton etc.) and as the conceptual basis for the others. All tools run as a container or a command-line binary; the runner only needs Docker (or to install the binary at a pinned version).

## Stages

| # | Stage | Tool | Input | Output | Gate |
|---|---|---|---|---|---|
| 1 | Secrets | Gitleaks (`gitleaks git`) | full repository history (clone without `--depth`) | `gitleaks.sarif` | any secret fails, except `.gitleaksignore` |
| 2 | SAST | Semgrep CE (`semgrep scan`) | source code | `semgrep.sarif` | ERROR fails; WARNING goes to `semgrep-avisos.sarif`, with mandatory triage |
| 3 | SCA + SBOM | Trivy `fs` | code with lockfiles | `sbom.cdx.json` (CycloneDX) and report | CRITICAL or HIGH **with a fix available** (`--ignore-unfixed`) fails |
| 4 | Container and IaC | Trivy `image` and Trivy `config` | built image; Dockerfile, Kubernetes, Terraform | reports | CRITICAL or HIGH fails |
| 5 | DAST | OWASP ZAP baseline (every merge to the main branch, against staging); ZAP full or API scan (scheduled) | staging URL (or OpenAPI definition) | HTML and JSON | rules set to FAIL in the rules file fail |
| 6 | SBOM (optional) | Dependency-Track | `sbom.cdx.json` | updated project | does not block; serves continuous monitoring |

Order: 1 to 4 on every pull request and merge, in parallel. Stage 5 (baseline) only after deployment to staging. Stage 6 only on the main branch. Deployment to production depends on 1 to 5 being green.

Gate rule: critical and high block deployment. An exception only through a versioned file, reviewed in a pull request, with a justification and an expiry date:

- `.trivyignore`: one line per CVE with `exp:YYYY-MM-DD` (Trivy stops ignoring it after the date) and a `#` comment above with the reason and owner.
- Gitleaks scans the history of **every branch** present in the clone: a secret in any branch fails the pipeline, even on `main`. Fix: revoke and rotate the secret and clean the history (`git filter-repo`); deleting the branch is not enough while copies exist.
- `.gitleaksignore`: one fingerprint per line, with a `#` comment and `exp:YYYY-MM-DD` on the line above. Gitleaks has no notion of expiry; the script below does the checking.
- `.zap/rules.tsv`: rule (ID, action, name, tab-separated) with action IGNORE or FAIL; expiry in a comment.
- An exception without an expiry date, or an expired one, fails the pipeline. Script `ci/verificar-excecoes.sh`, to run as stage 0:

```sh
#!/bin/sh
# Fails on an expired exception or one with no expiry date (exp:YYYY-MM-DD on the same line or in the comment right above).
# In .zap/rules.tsv, only downgraded rules (IGNORE or WARN) are exceptions.
hoje=$(date +%F); falha=0
for f in .trivyignore .gitleaksignore .zap/rules.tsv; do
  [ -f "$f" ] || continue
  ant=""
  while IFS= read -r l || [ -n "$l" ]; do
    l=$(printf '%s' "$l" | tr -d '\r')
    case "$l" in ''|'#'*) ant="$l"; continue;; esac
    if [ "$f" = ".zap/rules.tsv" ]; then
      case "$l" in *IGNORE*|*WARN*) ;; *) ant=""; continue;; esac
    fi
    d=$(printf '%s\n%s\n' "$l" "$ant" | grep -o 'exp:[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' | head -1 | cut -d: -f2)
    if [ -z "$d" ]; then echo "Exception with no expiry date in $f: $l"; falha=1
    elif [ "$d" != "$hoje" ] && [ "$(printf '%s
%s
' "$d" "$hoje" | sort | head -1)" = "$d" ]; then echo "Expired exception in $f ($d): $l"; falha=1
    fi
    ant=""
  done < "$f"
done
exit $falha
```

## How to map each tool

Pinned versions (read from the official release pages and registries on 2026-11-22): Trivy 0.76.2, Gitleaks v8.30.1, Semgrep 1.186.0, ZAP 2.17.0, alpine 3.24.4, docker 29.10.0, curl 8.23.0. The `@sha256:` digests are those of the multi-architecture manifest read from the registry. Keep these pins up to date with Dependabot or Renovate (they update both action SHAs and image tags/digests) and review each update; to pin the digest of another tag, use `docker buildx imagetools inspect <image>:<tag>`.

```sh
# 1. Secrets (image ghcr.io/gitleaks/gitleaks:v8.30.1; also published on Docker Hub)
gitleaks git --redact --exit-code 1 --report-format sarif --report-path gitleaks.sarif .
# 2. SAST (image semgrep/semgrep)
# 2a. SAST warnings: do not block, but triage is mandatory
semgrep scan --config p/default --config p/owasp-top-ten --severity WARNING --metrics=off --sarif -o semgrep-avisos.sarif .
semgrep scan --config p/default --config p/owasp-top-ten --severity ERROR --error --metrics=off --sarif -o semgrep.sarif .
# 3. SCA + SBOM (image ghcr.io/aquasecurity/trivy:0.76.2)
trivy fs --format cyclonedx --output sbom.cdx.json .
trivy fs --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .
# 4. Container and IaC
docker save app:$COMMIT -o app.tar && chmod a+r app.tar
trivy image --input app.tar --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1
trivy config --severity HIGH,CRITICAL --exit-code 1 .
# 5. DAST (image ghcr.io/zaproxy/zaproxy:2.17.0; mount a writable folder at /zap/wrk)
# 5a. Check the target responds; without it ZAP can "pass" without testing anything
[ -n "$STAGING_URL" ] || { echo "STAGING_URL not set, configure the staging URL"; exit 1; }
curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING_URL"
zap-baseline.py -t "$STAGING_URL" -c .zap/rules.tsv -I -r zap.html -J zap.json
zap-full-scan.py -t "$STAGING_URL" -c .zap/rules.tsv -I -r zap.html     # scheduled
zap-api-scan.py -t openapi.yaml -f openapi -c .zap/rules.tsv -I -r zap.html   # APIs
# 6. Dependency-Track (optional)
curl -sf -X POST "$DT_URL/api/v1/bom" -H "X-Api-Key: $DT_API_KEY" \
  -F autoCreate=true -F projectName="$NOME" -F projectVersion="$VERSAO" -F bom=@sbom.cdx.json
```

Usage notes:

- ZAP exit code: 0 success, 1 at least one FAIL, 2 warnings only (WARN), 3 execution failure. The pipeline uses `-I`, which treats 2 as success: only FAIL rules block.
- In Trivy, `--ignore-unfixed` hides findings with no published fix; they remain visible in the SBOM monitored by Dependency-Track (stage 6) and must have a review deadline.
- Semgrep CE uses registry rules under their own license: check the `license` key of each rule if usage must be strictly open source. CodeQL (GitHub) is optional and free only on public repositories; on private ones it requires GitHub Code Security.
- Register the staging environment as the ZAP target with a test account and fictitious data; never point DAST at production.
- Platform without containers: install the binaries at a pinned version and check the published hash before running.
- Keep the SARIF reports and the SBOM as run artifacts, with a minimum retention of 90 days.

## Security of the pipeline itself

- Secrets (Dependency-Track key, staging credentials) only in the platform vault, masked in logs and scoped to the main branch; never in the repository.
- Tokens with least privilege and short validity; a dedicated pipeline service account, without administrator rights.
- Protected main branch: mandatory review, mandatory green pipeline, no direct push; the pipeline file and the exception files have a code owner (CODEOWNERS or equivalent).
- Code from external or fork pull requests never runs with secrets nor on a runner with internal network access.
- Ephemeral, isolated runners, separated by sensitivity; tool images pinned by version or digest.
- Optional: sign the image and SBOM with cosign and verify the signature before deployment.

### Default ZAP rules file (`.zap/rules.tsv`)

ZAP classifies almost everything as a warning (WARN), XSS and injection included. So the pipeline uses `-I` (warnings do not fail) and this file, which marks serious flaws as FAIL: injections, XSS, path traversal, file inclusion, source code disclosure and known remote code execution. Other warnings go to the report, with mandatory triage. Downgrading a rule (IGNORE or WARN) is an exception: it needs a justification and `exp:` in the comment. IDs checked against ZAP 2.17.0. Rule 43 (Source Code Disclosure - File Inclusion) is left out on purpose: on pages that echo user input it raises false positives, and the real flaw it looks for is already covered by rule 6 (Path Traversal). It still appears in the report as a warning.

```tsv
6	FAIL	(Path Traversal)
7	FAIL	(Remote File Inclusion)
41	FAIL	(Source Code Disclosure - Git)
42	FAIL	(Source Code Disclosure - SVN)
10045	FAIL	(Source Code Disclosure - /WEB-INF Folder)
10048	FAIL	(Remote Code Execution - Shell Shock)
10115	FAIL	(Script Served From Malicious Domain (polyfill))
20015	FAIL	(Heartbleed OpenSSL Vulnerability)
20017	FAIL	(Source Code Disclosure - CVE-2012-1823)
20018	FAIL	(Remote Code Execution - CVE-2012-1823)
40009	FAIL	(Server Side Include)
40012	FAIL	(Cross Site Scripting (Reflected))
40014	FAIL	(Cross Site Scripting (Persistent))
40016	FAIL	(Cross Site Scripting (Persistent) - Prime)
40017	FAIL	(Cross Site Scripting (Persistent) - Spider)
40018	FAIL	(SQL Injection)
40019	FAIL	(SQL Injection - MySQL (Time Based))
40020	FAIL	(SQL Injection - Hypersonic SQL (Time Based))
40021	FAIL	(SQL Injection - Oracle (Time Based))
40022	FAIL	(SQL Injection - PostgreSQL (Time Based))
40026	FAIL	(Cross Site Scripting (DOM Based))
40027	FAIL	(SQL Injection - MsSQL (Time Based))
40033	FAIL	(NoSQL Injection - MongoDB)
40043	FAIL	(Log4Shell)
40045	FAIL	(Spring4Shell)
40046	FAIL	(Server Side Request Forgery)
40047	FAIL	(Text4shell (CVE-2022-42889))
40048	FAIL	(Remote Code Execution (React2Shell))
90017	FAIL	(XSLT Injection)
90019	FAIL	(Server Side Code Injection)
90020	FAIL	(Remote OS Command Injection)
90021	FAIL	(XPath Injection)
90023	FAIL	(XML External Entity Attack)
90025	FAIL	(Expression Language Injection)
90029	FAIL	(SOAP XML Injection)
90035	FAIL	(Server Side Template Injection)
90036	FAIL	(Server Side Template Injection (Blind))
90037	FAIL	(Remote OS Command Injection (Time Based))
90039	FAIL	(NoSQL Injection - MongoDB (Time Based))
```

## Sources

- https://github.com/aquasecurity/trivy/releases (Trivy 0.76.2)
- https://github.com/gitleaks/gitleaks and /releases (v8.30.1, commands, report formats)
- https://trivy.dev/latest/docs/configuration/filtering/ (`.trivyignore`, `exp:`, `--ignore-unfixed`, `--severity`)
- https://docs.semgrep.dev/deployment/oss-deployment (Semgrep CE in CI, rule license)
- https://www.zaproxy.org/docs/docker/baseline-scan/, /api-scan/, /full-scan/ (options, rules file, exit codes)
- https://docs.dependencytrack.org/usage/cicd/ (BOM upload via API)
