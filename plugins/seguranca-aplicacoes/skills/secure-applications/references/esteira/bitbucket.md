# Pipeline on Bitbucket Pipelines

## When it applies

A `bitbucket-pipelines.yml` exists at the root (Bitbucket Cloud). Bitbucket Data Center has no native Pipelines: use the file of whichever CI platform the environment has (Jenkins, Bamboo etc.) together with `generico.md`. Concepts, commands and the exceptions script: `generico.md`.

## Stages

| Step | Tool | Gate |
|---|---|---|
| Exceptions | `ci/verificar-excecoes.sh` | expired exception |
| Secrets | Gitleaks (full clone: `clone: depth: full`) | any finding not in `.gitleaksignore` |
| SAST | Semgrep CE | ERROR severity |
| SCA + SBOM | Trivy `fs`, CycloneDX SBOM as an artifact | CRITICAL/HIGH with a fix available |
| Image and IaC | Trivy `image` and `config` (`docker` service) | CRITICAL/HIGH |
| DAST baseline | ZAP baseline on every push to `main`, against staging | FAIL rules |
| Full/API DAST | ZAP full/API in a `custom` pipeline with a schedule | FAIL rules |
| SBOM (optional) | upload to Dependency-Track, key in a protected repository variable | does not block |

Steps in the same sequential stage run in order; use a `parallel` block for the analysis ones. Exceptions: `.trivyignore`, `.gitleaksignore`, `.zap/rules.tsv`, with `exp:YYYY-MM-DD` and a justification. Prevent production deployment with a *deployment* that depends on the steps below, with *branch permissions* and *merge checks* requiring a green pipeline.

## Template

Pinned versions (read from the official release pages and registries on 2026-11-22): Trivy 0.76.2, Gitleaks v8.30.1, Semgrep 1.186.0, ZAP 2.17.0, alpine 3.24.4, docker 29.10.0, curl 8.23.0. The `@sha256:` digests are those of the multi-architecture manifest read from the registry. Keep these pins up to date with Dependabot or Renovate (they update both action SHAs and image tags/digests) and review each update; to pin the digest of another tag, use `docker buildx imagetools inspect <image>:<tag>`. The syntax below follows the usual Bitbucket Pipelines format, but the reference page could not be read in full during verification: check each key against the official reference. Each step runs in the container given in `image`; the tools, being images with their own entrypoint, are called by the binary path.

```yaml
image: alpine:3.24.4

definitions:
  caches: {}
  services:
    docker: { memory: 2048 }
  steps:
    - step: &excecoes
        name: Excecoes
        script: [sh ci/verificar-excecoes.sh]
    - step: &segredos
        name: Secrets (Gitleaks)
        image: ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f
        clone: { depth: full }
        script:
          - gitleaks git --redact --exit-code 1 --report-format sarif --report-path gitleaks.sarif .
        artifacts: [gitleaks.sarif]
    - step: &sast
        name: SAST (Semgrep CE)
        image: semgrep/semgrep:1.186.0@sha256:6e1b04340e60e910fbb4ddbf3c857ab0918f064417ad5ac530014ccb3cf8c8f1
        script:
          - semgrep scan --config p/default --config p/owasp-top-ten --severity WARNING --metrics=off --sarif -o semgrep-avisos.sarif .
          - semgrep scan --config p/default --config p/owasp-top-ten --severity ERROR --error --metrics=off --sarif -o semgrep.sarif .
        artifacts: [semgrep.sarif, semgrep-avisos.sarif]
    - step: &sca
        name: SCA and SBOM (Trivy)
        image: ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb
        script:
          - trivy fs --format cyclonedx --output sbom.cdx.json .
          - trivy fs --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .
        artifacts: [sbom.cdx.json]
    - step: &imagem-iac
        name: Image and IaC (Trivy)
        services: [docker]
        script:
          - docker build -t app:$BITBUCKET_COMMIT .
          - docker save app:$BITBUCKET_COMMIT -o app.tar && chmod a+r app.tar
          - docker run --rm -v "$PWD:/w" -w /w ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb image --input app.tar --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1
          - docker run --rm -v "$PWD:/w" -w /w ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb config --severity HIGH,CRITICAL --exit-code 1 .
    - step: &dast-baseline
        name: DAST baseline (ZAP)
        image: ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af
        script:                                  # before: deploy to staging (project step)
          - mkdir -p /zap/wrk && cp .zap/rules.tsv /zap/wrk/
          - '[ -n "$STAGING_URL" ] || { echo "STAGING_URL not set, configure the staging URL"; exit 1; }'
          - curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING_URL"
          - zap-baseline.py -t "$STAGING_URL" -c rules.tsv -I -r baseline.html -J baseline.json
          - cp /zap/wrk/*.html /zap/wrk/*.json . 
        artifacts: ["*.html", "*.json"]
    - step: &dast-completo
        name: Full DAST (ZAP)
        image: ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af
        script:
          - mkdir -p /zap/wrk && cp .zap/rules.tsv /zap/wrk/
          - '[ -n "$STAGING_URL" ] || { echo "STAGING_URL not set, configure the staging URL"; exit 1; }'
          - curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING_URL"
          - zap-full-scan.py -t "$STAGING_URL" -c rules.tsv -I -r completo.html
          - cp /zap/wrk/*.html .
        artifacts: ["*.html"]
    - step: &dependency-track
        name: SBOM to Dependency-Track
        image: curlimages/curl:8.23.0
        script:
          - if [ -z "$DT_URL" ]; then echo "DT_URL not set, optional step skipped"; exit 0; fi
          - 'curl -sf -X POST "$DT_URL/api/v1/bom" -H "X-Api-Key: $DT_API_KEY" -F autoCreate=true -F "projectName=$BITBUCKET_REPO_SLUG" -F "projectVersion=$BITBUCKET_COMMIT" -F bom=@sbom.cdx.json'

pipelines:
  pull-requests:
    "**":
      - step: *excecoes
      - parallel:
          - step: *segredos
          - step: *sast
          - step: *sca
          - step: *imagem-iac
  branches:
    main:
      - step: *excecoes
      - parallel:
          - step: *segredos
          - step: *sast
          - step: *sca
          - step: *imagem-iac
      - step: *dast-baseline
      - step: *dependency-track          # optional; remove if not used
  custom:
    dast-completo:                       # schedule under Repository settings > Pipelines > Schedules
      - step: *dast-completo
```

For `custom`, the schedule is registered in the interface, pointing to `dast-completo`. For APIs: `zap-api-scan.py -t <openapi> -f openapi -c rules.tsv -I`. The SCA artifact reaches the next step through `artifacts`. If `apk` or the `docker` service do not allow running Trivy as a container, install the binary at a pinned version inside the step and check its hash.

## Security of the pipeline itself

- Secrets only in *Repository/Workspace variables* marked as *Secured* (masked value); the Dependency-Track key only on the `main` branch (a *Deployment* variable with a restricted environment).
- Repository or app tokens with minimum scope; no administrator credential in the pipeline.
- `main` branch with *branch permissions* (no direct push), *merge checks* (green pipeline, minimum approvals) and a mandatory reviewer for `bitbucket-pipelines.yml`, `ci/` and the exception files.
- Do not run fork PR pipelines with secured variables (Bitbucket does not pass them on by default; do not change this).
- Self-hosted runners (if used) ephemeral, isolated per workspace and without internal network access beyond what is necessary; steps with `services: [docker]` need attention because they are privileged.
- Optional: sign the image and SBOM with cosign and verify before deployment.

## Sources

- https://support.atlassian.com/bitbucket-cloud/docs/bitbucket-pipelines-configuration-reference/ (consulted, but only the index was readable; syntax to be confirmed)
- https://support.atlassian.com/bitbucket-cloud/docs/configure-bitbucket-pipelinesyml/ (same)
- Other tools: sources listed in `generico.md`.
