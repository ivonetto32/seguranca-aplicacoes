# Pipeline on Azure DevOps (Azure Pipelines)

## When it applies

An `azure-pipelines.yml` exists (or a YAML file pointed to by the pipeline definition). Concepts, commands and the exceptions script: `generico.md`. The template uses Linux agents with Docker and runs the tools as containers.

## Stages

| Stage | Tool | Gate |
|---|---|---|
| `Analise` (parallel jobs) | exceptions; Gitleaks (secrets); Semgrep CE (SAST); Trivy `fs` (SCA + CycloneDX SBOM); Trivy `image` and `config` | expired exception; secret; ERROR; CRITICAL/HIGH with a fix available |
| `Dast` | ZAP baseline on every push to `main`, against staging; ZAP full/API on a scheduled run | FAIL rules in `.zap/rules.tsv` |
| `Sbom` (optional) | upload to Dependency-Track, key in a secret variable or a variable group linked to Key Vault | does not block |

Platform notes: Azure DevOps has no free SAST of its own (GitHub Advanced Security for Azure DevOps is paid; confirm the license before adopting it). The PR validation pipeline comes from the branch policy (*Build validation*), not from the `pr:` block when the repository is in Azure Repos. Production deployment: use *Environments* with approvals and checks, and make the deploy stage depend on `Analise` and `Dast`. Exceptions: `.trivyignore`, `.gitleaksignore`, `.zap/rules.tsv` with `exp:YYYY-MM-DD` and a justification.

## Template

Pinned versions (read from the official release pages and registries on 2026-11-22): Trivy 0.76.2, Gitleaks v8.30.1, Semgrep 1.186.0, ZAP 2.17.0, alpine 3.24.4, docker 29.10.0, curl 8.23.0. The `@sha256:` digests are those of the multi-architecture manifest read from the registry. Keep these pins up to date with Dependabot or Renovate (they update both action SHAs and image tags/digests) and review each update; to pin the digest of another tag, use `docker buildx imagetools inspect <image>:<tag>`.

```yaml
trigger:
  branches: { include: [main] }
pr: none                      # PR: use the branch policy (Build validation)
schedules:
  - cron: "17 3 * * 1"        # full DAST, Monday 03:17 UTC
    displayName: Weekly DAST
    branches: { include: [main] }
    always: true              # runs even without code changes

pool: { vmImage: ubuntu-latest }

variables:
  GITLEAKS: ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f
  SEMGREP: semgrep/semgrep:1.186.0@sha256:6e1b04340e60e910fbb4ddbf3c857ab0918f064417ad5ac530014ccb3cf8c8f1
  TRIVY: ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb
  ZAP: ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af
  # STAGING_URL and DT_URL: pipeline variables; DT_API_KEY: secret variable

stages:
  - stage: Analise
    condition: ne(variables['Build.Reason'], 'Schedule')
    jobs:
      - job: Excecoes
        steps:
          - checkout: self
          - script: sh ci/verificar-excecoes.sh
      - job: Segredos
        steps:
          - checkout: self
            fetchDepth: 0                      # full history
          - script: docker run --rm -v "$(Build.SourcesDirectory):/repo" $(GITLEAKS) git --redact --exit-code 1 --report-format sarif --report-path /repo/gitleaks.sarif /repo
            displayName: Gitleaks
      - job: Sast
        steps:
          - checkout: self
          - script: docker run --rm -v "$(Build.SourcesDirectory):/src" -w /src $(SEMGREP) semgrep scan --config p/default --config p/owasp-top-ten --severity WARNING --metrics=off --sarif -o semgrep-avisos.sarif .
            displayName: Semgrep CE (warnings)
          - script: docker run --rm -v "$(Build.SourcesDirectory):/src" -w /src $(SEMGREP) semgrep scan --config p/default --config p/owasp-top-ten --severity ERROR --error --metrics=off --sarif -o semgrep.sarif .
            displayName: Semgrep CE
          - publish: $(Build.SourcesDirectory)/semgrep-avisos.sarif
            artifact: semgrep-avisos
            condition: always()
      - job: Sca
        steps:
          - checkout: self
          - script: |
              docker run --rm -v "$(Build.SourcesDirectory):/w" -w /w $(TRIVY) fs --format cyclonedx --output sbom.cdx.json .
              docker run --rm -v "$(Build.SourcesDirectory):/w" -w /w $(TRIVY) fs --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .
            displayName: Trivy SCA + SBOM
          - publish: $(Build.SourcesDirectory)/sbom.cdx.json
            artifact: sbom
            condition: always()
      - job: ImagemIac
        steps:
          - checkout: self
          - script: |
              docker build -t app:$(Build.SourceVersion) .
              docker save app:$(Build.SourceVersion) -o app.tar && chmod a+r app.tar
              docker run --rm -v "$(Build.SourcesDirectory):/w" -w /w $(TRIVY) image --input app.tar --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1
              docker run --rm -v "$(Build.SourcesDirectory):/w" -w /w $(TRIVY) config --severity HIGH,CRITICAL --exit-code 1 .
            displayName: Trivy image and IaC

  - stage: Dast
    dependsOn: [Analise]
    condition: or(succeeded(), eq(variables['Build.Reason'], 'Schedule'))
    jobs:
      - job: Baseline
        condition: ne(variables['Build.Reason'], 'Schedule')   # deploy to staging first (project stage)
        steps:
          - checkout: self
          - script: |
              mkdir -p zap && chmod 777 zap && cp .zap/rules.tsv zap/
              curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$(STAGING_URL)"
              docker run --rm -v "$(Build.SourcesDirectory)/zap:/zap/wrk:rw" $(ZAP) zap-baseline.py -t "$(STAGING_URL)" -c rules.tsv -I -r baseline.html -J baseline.json
            displayName: ZAP baseline
          - publish: $(Build.SourcesDirectory)/zap
            artifact: zap-baseline
            condition: always()
      - job: Completo
        condition: eq(variables['Build.Reason'], 'Schedule')
        steps:
          - checkout: self
          - script: |
              mkdir -p zap && chmod 777 zap && cp .zap/rules.tsv zap/
              curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$(STAGING_URL)"
              docker run --rm -v "$(Build.SourcesDirectory)/zap:/zap/wrk:rw" $(ZAP) zap-full-scan.py -t "$(STAGING_URL)" -c rules.tsv -I -r completo.html
            displayName: ZAP full scan
          - publish: $(Build.SourcesDirectory)/zap
            artifact: zap-completo
            condition: always()

  - stage: Sbom                                         # optional
    dependsOn: [Analise]
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'), ne(variables['Build.Reason'], 'Schedule'))
    jobs:
      - job: DependencyTrack
        condition: and(succeeded(), ne(variables['DT_URL'], ''))
        steps:
          - download: current
            artifact: sbom
          - script: |
              curl -sf -X POST "$(DT_URL)/api/v1/bom" -H "X-Api-Key: $DT_API_KEY" -F autoCreate=true -F "projectName=$(Build.Repository.Name)" -F "projectVersion=$(Build.SourceVersion)" -F bom=@$(Pipeline.Workspace)/sbom/sbom.cdx.json
            env: { DT_API_KEY: $(DT_API_KEY) }          # a secret variable only gets in through env
```

For an API, replace with `zap-api-scan.py -t <openapi> -f openapi -c rules.tsv -I`. On Microsoft-hosted agents Docker is already available; on self-hosted agents, install it and use ephemeral agents.

## Security of the pipeline itself

- Secrets only as secret variables or variable groups (preferably linked to Azure Key Vault); a secret variable is never exposed to the script without an explicit mapping in `env:`.
- Service connections with least privilege, scoped to the project, and *Environment* checks (approval, allowed branch).
- Branch policy on `main`: mandatory review, mandatory *Build validation*, mandatory reviewer for `azure-pipelines.yml`, `ci/` and the exception files.
- Fork PRs do not receive secrets (leave "Make secrets available to builds of forks" off); do not run unreviewed code with service connections.
- Ephemeral self-hosted agents, isolated per project and on a segregated network; *Job authorization scope* limited to the project.
- Optional: sign the image and SBOM with cosign and verify before deployment.

## Sources

- https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/pipeline?view=azure-pipelines (structure: stages, jobs, steps, trigger, pr, schedules)
- Other tools: sources listed in `generico.md`.
