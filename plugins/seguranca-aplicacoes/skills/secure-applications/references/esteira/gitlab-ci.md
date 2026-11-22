# Pipeline on GitLab CI/CD

## When it applies

A `.gitlab-ci.yml` exists at the root. Concepts, commands and the exceptions script: `generico.md`.

## Stages

| Stage | Tool | Gate |
|---|---|---|
| `excecoes` | `ci/verificar-excecoes.sh` | expired exception |
| `analise` (parallel) | Gitleaks (secrets); Semgrep CE (SAST); Trivy `fs` (SCA + CycloneDX SBOM); Trivy `image` and `config` | secret; ERROR; CRITICAL/HIGH with a fix available |
| `dast` | ZAP baseline on every `main` pipeline, against staging; ZAP full/API on a scheduled pipeline | FAIL rules in `.zap/rules.tsv` |
| `sbom` (optional) | upload to Dependency-Track, key in a masked and protected CI/CD variable | does not block |

GitLab's bundled templates: `Jobs/SAST.gitlab-ci.yml` runs on the free tier with open-source analyzers (Semgrep with GitLab-managed rules); the merge request report, vulnerability management and custom rules belong to the Ultimate tier. To keep the same pipeline on any tier and the same exceptions file, the template below uses the tools directly; if you prefer GitLab's template for SAST, add `include: - template: Jobs/SAST.gitlab-ci.yml` and remove the `sast` job. Production deployment must have `needs` on all security jobs, and `main` must require a green pipeline to merge.

## Template

Pinned versions (read from the official release pages and registries on 2026-11-22): Trivy 0.76.2, Gitleaks v8.30.1, Semgrep 1.186.0, ZAP 2.17.0, alpine 3.24.4, docker 29.10.0, curl 8.23.0. The `@sha256:` digests are those of the multi-architecture manifest read from the registry. Keep these pins up to date with Dependabot or Renovate (they update both action SHAs and image tags/digests) and review each update; to pin the digest of another tag, use `docker buildx imagetools inspect <image>:<tag>`.

```yaml
stages: [excecoes, analise, dynamic-test, sbom]

variables:
  GIT_DEPTH: "0"            # Gitleaks needs the full history
  TRIVY_IMG: ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb
  ZAP_IMG: ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af
  # STAGING_URL, DT_URL: project CI/CD variables; DT_API_KEY: masked and protected

excecoes:
  stage: excecoes
  image: alpine:3.24.4
  script: [sh ci/verificar-excecoes.sh]

segredos:
  stage: analise
  image: { name: "ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f", entrypoint: [""] }
  script:
    - gitleaks git --redact --exit-code 1 --report-format sarif --report-path gitleaks.sarif .
  artifacts: { when: always, paths: [gitleaks.sarif] }

sast:
  stage: analise
  image: semgrep/semgrep:1.186.0@sha256:6e1b04340e60e910fbb4ddbf3c857ab0918f064417ad5ac530014ccb3cf8c8f1
  script:
    - semgrep scan --config p/default --config p/owasp-top-ten --severity WARNING --metrics=off --sarif -o semgrep-avisos.sarif .
    - semgrep scan --config p/default --config p/owasp-top-ten --severity ERROR --error --metrics=off --sarif -o semgrep.sarif .
  artifacts: { when: always, paths: [semgrep.sarif, semgrep-avisos.sarif] }

sca:
  stage: analise
  image: { name: "$TRIVY_IMG", entrypoint: [""] }
  script:
    - trivy fs --format cyclonedx --output sbom.cdx.json .
    - trivy fs --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .
  artifacts: { when: always, paths: [sbom.cdx.json] }

iac:
  stage: analise
  image: { name: "$TRIVY_IMG", entrypoint: [""] }
  script:
    - trivy config --severity HIGH,CRITICAL --exit-code 1 .

imagem:
  stage: analise
  image: docker:29.10.0
  services: [docker:29.10.0-dind]
  variables: { DOCKER_TLS_CERTDIR: "/certs" }
  script:
    - docker build -t app:$CI_COMMIT_SHA .
    - docker save app:$CI_COMMIT_SHA -o app.tar && chmod a+r app.tar
    - docker run --rm -v "$PWD:/w" -w /w $TRIVY_IMG image --input app.tar --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1
  rules:
    - exists: [Dockerfile]

.dast:
  stage: dynamic-test
  image: { name: "$ZAP_IMG", entrypoint: [""] }
  before_script: [mkdir -p /zap/wrk && cp .zap/rules.tsv /zap/wrk/rules.tsv]
  after_script: [cp /zap/wrk/*.html /zap/wrk/*.json "$CI_PROJECT_DIR/" 2>/dev/null || true]
  artifacts: { when: always, paths: ["*.html", "*.json"] }

dast-baseline:
  extends: .dast
  needs: [excecoes, segredos, sast, sca, iac]      # plus the project's deployment to staging
  script:
    - '[ -n "$STAGING_URL" ] || { echo "STAGING_URL not set, configure the staging URL"; exit 1; }'
    - curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING_URL"
    - zap-baseline.py -t "$STAGING_URL" -c rules.tsv -I -r baseline.html -J baseline.json
  rules:
    - if: '$CI_PIPELINE_SOURCE == "push" && $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

dast-completo:
  extends: .dast
  script:
    - '[ -n "$STAGING_URL" ] || { echo "STAGING_URL not set, configure the staging URL"; exit 1; }'
    - curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING_URL"
    - zap-full-scan.py -t "$STAGING_URL" -c rules.tsv -I -r completo.html
    # APIs: zap-api-scan.py -t <openapi> -f openapi -c rules.tsv -I -r api.html
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'      # create the schedule under Build > Pipeline schedules

dependency-track:                                    # optional
  stage: sbom
  image: curlimages/curl:8.23.0
  needs: [{ job: sca, artifacts: true }]
  script:
    - 'curl -sf -X POST "$DT_URL/api/v1/bom" -H "X-Api-Key: $DT_API_KEY" -F autoCreate=true -F "projectName=$CI_PROJECT_NAME" -F "projectVersion=$CI_COMMIT_SHORT_SHA" -F bom=@sbom.cdx.json'
  rules:
    - if: '$DT_URL && $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
```

Points to adjust: ZAP runs as the `zap` user and writes to `/zap/wrk` (on the Docker executor, the job's working folder may not be writable by it; that is why the template copies the rules to `/zap/wrk` and the reports back). If the image refuses the `mkdir`, use `docker run -v` as in `generico.md`. The `analise` jobs also run on merge requests; `dast` does not, since it requires a deployed environment. By default `needs` bypasses stage order; check that production deployment depends on all security jobs.

On GitLab, do not name a stage `dast`: it is reserved for GitLab's paid DAST, and the pipeline is rejected with "Insufficient permissions for dast_configuration keyword".

## Security of the pipeline itself

- Secrets only in *Settings > CI/CD > Variables*, masked and protected (available only on protected branches and tags); never in the YAML's `variables:`.
- Job token (`CI_JOB_TOKEN`) with a restricted access scope; project tokens with minimum role and validity.
- Protected default branch: merge request with mandatory approval, mandatory green pipeline, CODEOWNERS for `.gitlab-ci.yml`, `ci/` and the exception files.
- Fork merge request pipelines do not receive protected variables; do not enable pipelines with secrets for third-party code.
- Isolated runners: Docker executor with a fresh container per job; privileged mode (required by `dind`) only on a runner dedicated to the project, never shared with projects of a different sensitivity.
- Optional: sign the image and SBOM with cosign and verify before deployment.

## Sources

- https://docs.gitlab.com/ci/yaml/ (stages, include:template, artifacts, rules)
- https://docs.gitlab.com/user/application_security/sast/ (`Jobs/SAST.gitlab-ci.yml` template, analyzers per tier)
- Other tools: sources listed in `generico.md`.
