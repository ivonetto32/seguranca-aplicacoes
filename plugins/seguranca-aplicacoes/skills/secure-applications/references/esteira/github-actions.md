# Pipeline on GitHub Actions

## When it applies

`.github/workflows/*.yml` exists. Concepts, commands and the exceptions file: `generico.md`. The template below runs the tools as containers (`docker run`), which leaves only two third-party actions to pin (checkout and artifact upload).

## Stages

| Stage | Tool | Gate |
|---|---|---|
| Secrets | Gitleaks, full history (`fetch-depth: 0`) | any finding not in `.gitleaksignore` |
| SAST | Semgrep CE (`p/default`, `p/owasp-top-ten`) | ERROR severity |
| SCA + SBOM | Trivy `fs`: CycloneDX SBOM and scan | CRITICAL/HIGH with a fix available |
| Image and IaC | Trivy `image` and `config` | CRITICAL/HIGH |
| DAST baseline | ZAP baseline on every push to `main`, against staging | FAIL rules in `.zap/rules.tsv` |
| Full/API DAST | ZAP full or API scan, scheduled (weekly) | same |
| SBOM (optional) | upload to Dependency-Track, key in a repository secret | does not block |

CodeQL is an alternative to Semgrep: free on public repositories; on private ones it requires a GitHub Code Security license. Alternative to calling Trivy directly: the official action `aquasecurity/trivy-action` (its documentation uses version v0.36.0; pin by the full SHA at installation). Exceptions: `.trivyignore`, `.gitleaksignore`, `.zap/rules.tsv`, all with `exp:YYYY-MM-DD` and a justification; the `excecoes` stage fails expired ones (script in `generico.md`). Protect production deployment with an *environment* that requires the jobs below (protected branch rule: required checks).

## Template

File `.github/workflows/seguranca.yml`. Each action is pinned by the full 40-character SHA of its current release (read from the original repository on 2026-11-22; the comment keeps the version). Keep the SHAs up to date with Dependabot or Renovate. Images (read from the official release pages and registries on 2026-11-22): see the `env` block (tags plus multi-architecture digest); to pin another tag, use `docker buildx imagetools inspect <image>:<tag>`.

```yaml
name: seguranca
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: "17 3 * * 1"   # full DAST, Monday 03:17 UTC
permissions:
  contents: read            # minimum; each job asks only for what it needs
env:
  GITLEAKS: ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f
  SEMGREP: semgrep/semgrep:1.186.0@sha256:6e1b04340e60e910fbb4ddbf3c857ab0918f064417ad5ac530014ccb3cf8c8f1
  TRIVY: ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb
  ZAP: ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af
jobs:
  excecoes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - run: sh ci/verificar-excecoes.sh
  segredos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { fetch-depth: 0, persist-credentials: false }
      - run: docker run --rm -v "$PWD:/repo" $GITLEAKS git --redact --exit-code 1 --report-format sarif --report-path /repo/gitleaks.sarif /repo
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - run: docker run --rm -v "$PWD:/src" -w /src $SEMGREP semgrep scan --config p/default --config p/owasp-top-ten --severity WARNING --metrics=off --sarif -o semgrep-avisos.sarif .
      - run: docker run --rm -v "$PWD:/src" -w /src $SEMGREP semgrep scan --config p/default --config p/owasp-top-ten --severity ERROR --error --metrics=off --sarif -o semgrep.sarif .
      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        if: always()
        with: { name: semgrep, path: "semgrep*.sarif" }
  sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - run: |
          docker run --rm -v "$PWD:/w" -w /w $TRIVY fs --format cyclonedx --output sbom.cdx.json .
          docker run --rm -v "$PWD:/w" -w /w $TRIVY fs --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .
      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        if: always()
        with: { name: sbom, path: sbom.cdx.json }
  imagem-iac:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - run: |
          docker build -t app:${{ github.sha }} .
          docker save app:${{ github.sha }} -o app.tar && chmod a+r app.tar
          docker run --rm -v "$PWD:/w" -w /w $TRIVY image --input app.tar --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1
          docker run --rm -v "$PWD:/w" -w /w $TRIVY config --severity HIGH,CRITICAL --exit-code 1 .
  dast-baseline:
    if: github.event_name == 'push'          # main only; before it, deploy to staging (project job)
    needs: [excecoes, segredos, sast, sca, imagem-iac]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - run: |
          mkdir -p zap && chmod 777 zap
          [ -n "${{ vars.STAGING_URL }}" ] || { echo "STAGING_URL not set, configure the staging URL"; exit 1; }
          curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "${{ vars.STAGING_URL }}"
          docker run --rm -v "$PWD/zap:/zap/wrk:rw" -v "$PWD/.zap:/zap/rules:ro" $ZAP zap-baseline.py -t "${{ vars.STAGING_URL }}" -c /zap/rules/rules.tsv -I -r baseline.html -J baseline.json
      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        if: always()
        with: { name: zap-baseline, path: zap/ }
  dast-completo:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - run: |
          mkdir -p zap && chmod 777 zap
          [ -n "${{ vars.STAGING_URL }}" ] || { echo "STAGING_URL not set, configure the staging URL"; exit 1; }
          curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "${{ vars.STAGING_URL }}"
          docker run --rm -v "$PWD/zap:/zap/wrk:rw" -v "$PWD/.zap:/zap/rules:ro" $ZAP zap-full-scan.py -t "${{ vars.STAGING_URL }}" -c /zap/rules/rules.tsv -I -r completo.html
      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        if: always()
        with: { name: zap-completo, path: zap/ }
  dependency-track:                          # optional
    if: github.event_name == 'push' && vars.DT_URL != ''
    needs: sca
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
        with: { name: sbom }
      - run: |
          curl -sf -X POST "${{ vars.DT_URL }}/api/v1/bom" -H "X-Api-Key: ${{ secrets.DT_API_KEY }}" -F autoCreate=true -F "projectName=${{ github.event.repository.name }}" -F "projectVersion=${{ github.sha }}" -F bom=@sbom.cdx.json
```

For an API (OpenAPI), replace the ZAP command with `zap-api-scan.py -t <url or file> -f openapi -c ... -I`. To send SARIF to the code scanning dashboard, use `github/codeql-action/upload-sarif` (pinned by SHA; requires the license mentioned above on private repositories).

## Security of the pipeline itself

- Secrets only in repository or *environment* *Secrets* and *Variables*; the Dependency-Track key only in the job that uses it, never in pull request jobs.
- Minimum `permissions:` at the top (`contents: read`); raise per job only what is necessary. Third-party actions pinned by full SHA; review updates (Dependabot for `github-actions`).
- Avoid `pull_request_target` and `workflow_run` with checkout of PR code; fork code never receives secrets.
- Self-hosted runner only if ephemeral (just-in-time) and isolated; do not use a self-hosted runner on a public repository.
- Protected `main` branch: mandatory review, this pipeline's checks required, CODEOWNERS for `.github/workflows/` and for the exception files.
- Optional: sign images and SBOM with cosign (keyless identity via OIDC) and verify before deploying.

## Sources

- https://docs.github.com/en/actions/reference/security/secure-use (full SHA, minimum permissions, `pull_request_target`, runners)
- https://github.com/aquasecurity/trivy-action (official action, v0.36.0, inputs `trivyignores`, `ignore-unfixed`)
- https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security (code scanning license on private repositories)
- https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql
- Other tools: sources listed in `generico.md`.
