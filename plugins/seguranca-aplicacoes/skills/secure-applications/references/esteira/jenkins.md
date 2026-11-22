# Pipeline on Jenkins

## When it applies

A `Jenkinsfile` exists at the root (declarative Pipeline, preferably in a Multibranch job). Concepts, commands and the exceptions script: `generico.md`. Requires the Docker Pipeline plugin and an agent with Docker.

## Stages

| Stage | Tool | Gate |
|---|---|---|
| Exceptions | `ci/verificar-excecoes.sh` | expired exception |
| Secrets | Gitleaks | any finding not in `.gitleaksignore` |
| SAST | Semgrep CE | ERROR severity |
| SCA + SBOM | Trivy `fs` | CRITICAL/HIGH with a fix available |
| Image and IaC | Trivy `image` and `config` | CRITICAL/HIGH |
| DAST baseline | ZAP baseline, on every `main` build, against staging | FAIL rules |
| Full/API DAST | ZAP full/API in a scheduled job (Jenkins `cron`) | FAIL rules |
| SBOM (optional) | upload to Dependency-Track, key in a *Secret text* credential | does not block |

Each stage has its own `agent { docker { ... } }`, which isolates the tools and avoids installing them on the agent. Exceptions: `.trivyignore`, `.gitleaksignore`, `.zap/rules.tsv`, with `exp:YYYY-MM-DD` and a justification. Production deployment is only released after the security stages (the project's deploy stage comes afterwards, with an approval `input`).

## Template

Pinned versions (read from the official release pages and registries on 2026-11-22): Trivy 0.76.2, Gitleaks v8.30.1, Semgrep 1.186.0, ZAP 2.17.0, alpine 3.24.4, docker 29.10.0, curl 8.23.0. The `@sha256:` digests are those of the multi-architecture manifest read from the registry. Keep these pins up to date with Dependabot or Renovate (they update both action SHAs and image tags/digests) and review each update; to pin the digest of another tag, use `docker buildx imagetools inspect <image>:<tag>`. `reuseNode true` keeps the same workspace across stages (per the Docker Pipeline documentation).

```groovy
pipeline {
  agent none
  options { timestamps(); disableConcurrentBuilds(); buildDiscarder(logRotator(numToKeepStr: '30')) }
  triggers { cron(env.BRANCH_NAME == 'main' ? 'H 3 * * 1' : '') }   // weekly schedule for the full DAST
  environment {
    TRIVY   = 'ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb'
    STAGING = credentials('staging-url')          // Secret text credential or job variable
  }
  stages {
    stage('Analise') {
      when { not { triggeredBy 'TimerTrigger' } }
      parallel {
        stage('Excecoes') {
          agent { docker { image 'alpine:3.24.4'; reuseNode true } }
          steps { sh 'sh ci/verificar-excecoes.sh' }
        }
        stage('Segredos') {
          agent { docker { image 'ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f'; args '--entrypoint='; reuseNode true } }
          steps { sh 'gitleaks git --redact --exit-code 1 --report-format sarif --report-path gitleaks.sarif .' }   // checkout without shallow clone
        }
        stage('SAST') {
          agent { docker { image 'semgrep/semgrep:1.186.0@sha256:6e1b04340e60e910fbb4ddbf3c857ab0918f064417ad5ac530014ccb3cf8c8f1'; reuseNode true } }
          steps { sh 'semgrep scan --config p/default --config p/owasp-top-ten --severity WARNING --metrics=off --sarif -o semgrep-avisos.sarif .'; sh 'semgrep scan --config p/default --config p/owasp-top-ten --severity ERROR --error --metrics=off --sarif -o semgrep.sarif .' }
        }
        stage('SCA e SBOM') {
          agent { docker { image "${TRIVY}"; args '--entrypoint='; reuseNode true } }
          steps {
            sh 'trivy fs --format cyclonedx --output sbom.cdx.json .'
            sh 'trivy fs --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .'
          }
        }
        stage('Imagem e IaC') {
          agent { label 'docker' }                 // agent with Docker to build the image
          steps {
            sh 'docker build -t app:${GIT_COMMIT} .'
            sh 'docker save app:${GIT_COMMIT} -o app.tar && chmod a+r app.tar && docker run --rm -v "$PWD:/w" -w /w ${TRIVY} image --input app.tar --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1'
            sh 'docker run --rm -v "$PWD:/w" -w /w ${TRIVY} config --severity HIGH,CRITICAL --exit-code 1 .'
          }
        }
      }
      post { always { archiveArtifacts artifacts: '*.sarif, sbom.cdx.json', allowEmptyArchive: true } }
    }
    stage('DAST baseline') {
      when { allOf { branch 'main'; not { triggeredBy 'TimerTrigger' } } }   // after deploying to staging (project stage)
      agent { docker { image 'ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af'; args '--entrypoint= -u root'; reuseNode true } }
      steps {
        sh '[ -n "$STAGING" ] || { echo "STAGING_URL not set, configure the staging URL"; exit 1; }; mkdir -p /zap/wrk && cp .zap/rules.tsv /zap/wrk/ && curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING" && zap-baseline.py -t "$STAGING" -c rules.tsv -I -r baseline.html -J baseline.json'
      }
      post { always { sh 'cp /zap/wrk/*.html /zap/wrk/*.json . || true'; archiveArtifacts artifacts: '*.html, *.json', allowEmptyArchive: true } }
    }
    stage('DAST completo') {
      when { triggeredBy 'TimerTrigger' }
      agent { docker { image 'ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af'; args '--entrypoint= -u root'; reuseNode true } }
      steps { sh '[ -n "$STAGING" ] || { echo "STAGING_URL not set, configure the staging URL"; exit 1; }; mkdir -p /zap/wrk && cp .zap/rules.tsv /zap/wrk/ && curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING" && zap-full-scan.py -t "$STAGING" -c rules.tsv -I -r completo.html' }
      post { always { sh 'cp /zap/wrk/*.html . || true'; archiveArtifacts artifacts: '*.html', allowEmptyArchive: true } }
    }
    stage('Dependency-Track') {                    // optional
      when { allOf { branch 'main'; not { triggeredBy 'TimerTrigger' }; expression { env.DT_URL?.trim() } } }
      agent { docker { image 'curlimages/curl:8.23.0'; reuseNode true } }
      steps {
        withCredentials([string(credentialsId: 'dt-api-key', variable: 'DT_API_KEY')]) {
          sh 'curl -sf -X POST "$DT_URL/api/v1/bom" -H "X-Api-Key: $DT_API_KEY" -F autoCreate=true -F "projectName=${JOB_BASE_NAME}" -F "projectVersion=${GIT_COMMIT}" -F bom=@sbom.cdx.json'
        }
      }
    }
  }
}
```

Notes: `sbom.cdx.json` must reach the last stage (same workspace with `reuseNode true`; otherwise use `stash`/`unstash`). For APIs, `zap-api-scan.py -t <openapi> -f openapi -c rules.tsv -I`. To hold the key without exposing it in the log, use `withCredentials` (do not interpolate the secret with Groovy double quotes; let the shell expand it). The fine-grained `docker { args }` parameters (`--entrypoint=`, `-u root`) depend on the image; test on your agent.

## Security of the pipeline itself

- Secrets only in Jenkins' credential store (folder or job scope, not global), used with `withCredentials`; never in `environment` as plain text.
- Least privilege: authorization matrix per folder, service users without Administrator; Jenkinsfile scripts outside the *Script Security* sandbox only with review.
- Multibranch with the `main` branch protected in the repository: mandatory review and a code owner for `Jenkinsfile`, `ci/` and the exception files; the Jenkinsfile of an outside/fork PR does not run with credentials (use the SCM plugin's trust policy: trusted contributors only).
- Controller with no executors (`0 executors`); builds only on ephemeral agents, isolated per project; Docker socket mounted only on a dedicated agent.
- Plugins and core up to date; plugin versions pinned and reviewed.
- Optional: sign the image and SBOM with cosign and verify before deployment.

## Sources

- https://www.jenkins.io/doc/book/pipeline/docker/ (agent docker, args, reuseNode, per-stage agent)
- Other tools: sources listed in `generico.md`.
