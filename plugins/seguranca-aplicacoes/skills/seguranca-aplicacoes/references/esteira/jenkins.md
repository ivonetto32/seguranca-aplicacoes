# Esteira no Jenkins

## Quando se aplica

Existe `Jenkinsfile` na raiz (Pipeline declarativo, de preferência em job Multibranch). Conceitos, comandos e script de exceções: `generico.md`. Requer o plugin Docker Pipeline e um agente com Docker.

## Etapas

| Stage | Ferramenta | Gate |
|---|---|---|
| Exceções | `ci/verificar-excecoes.sh` | exceção vencida |
| Segredos | Gitleaks | qualquer achado fora do `.gitleaksignore` |
| SAST | Semgrep CE | severidade ERROR |
| SCA + SBOM | Trivy `fs` | CRITICAL/HIGH com correção |
| Imagem e IaC | Trivy `image` e `config` | CRITICAL/HIGH |
| DAST baseline | ZAP baseline, em todo build da `main`, contra homologação | regras FAIL |
| DAST completo/API | ZAP full/API em job agendado (`cron` do Jenkins) | regras FAIL |
| SBOM (opcional) | envio ao Dependency-Track, chave em credencial *Secret text* | não barra |

Cada stage tem seu próprio `agent { docker { ... } }`, o que isola as ferramentas e dispensa instalá-las no agente. Exceções: `.trivyignore`, `.gitleaksignore`, `.zap/rules.tsv`, com `exp:AAAA-MM-DD` e justificativa. A publicação em produção só é liberada depois dos stages de segurança (stage de deploy do projeto vem depois, com `input` de aprovação).

## Modelo

Versões fixadas (lidas nas páginas oficiais de lançamentos e nos registries em 22/11/2026): Trivy 0.76.2, Gitleaks v8.30.1, Semgrep 1.186.0, ZAP 2.17.0, alpine 3.24.4, docker 29.10.0, curl 8.23.0. Os digests `@sha256:` são os do manifesto multi-arquitetura lidos no registry. Mantenha essas fixações atualizadas com Dependabot ou Renovate (que atualizam tanto SHAs de actions quanto etiquetas/digests de imagens) e revise cada atualização; para fixar o digest de outra etiqueta, use `docker buildx imagetools inspect <imagem>:<etiqueta>`. `reuseNode true` mantém o mesmo workspace entre stages (conforme a documentação do Docker Pipeline).

```groovy
pipeline {
  agent none
  options { timestamps(); disableConcurrentBuilds(); buildDiscarder(logRotator(numToKeepStr: '30')) }
  triggers { cron(env.BRANCH_NAME == 'main' ? 'H 3 * * 1' : '') }   // agendamento semanal do DAST completo
  environment {
    TRIVY   = 'ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb'
    STAGING = credentials('staging-url')          // credencial Secret text ou variável do job
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
          steps { sh 'gitleaks git --redact --exit-code 1 --report-format sarif --report-path gitleaks.sarif .' }   // checkout sem shallow clone
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
          agent { label 'docker' }                 // agente com Docker para construir a imagem
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
      when { allOf { branch 'main'; not { triggeredBy 'TimerTrigger' } } }   // após publicar em homologação (stage do projeto)
      agent { docker { image 'ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af'; args '--entrypoint= -u root'; reuseNode true } }
      steps {
        sh '[ -n "$STAGING" ] || { echo "STAGING_URL não definido, configure a URL da homologação"; exit 1; }; mkdir -p /zap/wrk && cp .zap/rules.tsv /zap/wrk/ && curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING" && zap-baseline.py -t "$STAGING" -c rules.tsv -I -r baseline.html -J baseline.json'
      }
      post { always { sh 'cp /zap/wrk/*.html /zap/wrk/*.json . || true'; archiveArtifacts artifacts: '*.html, *.json', allowEmptyArchive: true } }
    }
    stage('DAST completo') {
      when { triggeredBy 'TimerTrigger' }
      agent { docker { image 'ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af'; args '--entrypoint= -u root'; reuseNode true } }
      steps { sh '[ -n "$STAGING" ] || { echo "STAGING_URL não definido, configure a URL da homologação"; exit 1; }; mkdir -p /zap/wrk && cp .zap/rules.tsv /zap/wrk/ && curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING" && zap-full-scan.py -t "$STAGING" -c rules.tsv -I -r completo.html' }
      post { always { sh 'cp /zap/wrk/*.html . || true'; archiveArtifacts artifacts: '*.html', allowEmptyArchive: true } }
    }
    stage('Dependency-Track') {                    // opcional
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

Observações: o `sbom.cdx.json` precisa chegar ao último stage (mesmo workspace com `reuseNode true`; do contrário use `stash`/`unstash`). Para APIs, `zap-api-scan.py -t <openapi> -f openapi -c rules.tsv -I`. Para guardar a chave sem expô-la no log, use `withCredentials` (não interpole o segredo com aspas duplas do Groovy; deixe o shell expandir). Os parâmetros finos de `docker { args }` (`--entrypoint=`, `-u root`) dependem da imagem; teste no seu agente.

## Segurança da própria esteira

- Segredos só no armazenamento de credenciais do Jenkins (escopo de pasta ou job, não global), usados com `withCredentials`; nunca em `environment` com texto puro.
- Menor privilégio: matriz de autorização por pasta, usuários de serviço sem Administrador; scripts do Jenkinsfile fora do *Script Security* sandbox só com revisão.
- Multibranch com ramo `main` protegido no repositório: revisão obrigatória e dono de código para `Jenkinsfile`, `ci/` e arquivos de exceção; o Jenkinsfile de PR de fora/fork não roda com credenciais (use a política de confiança do plugin de SCM: só contribuidores confiáveis).
- Controlador sem executores (`0 executors`); builds só em agentes efêmeros, isolados por projeto; Docker socket montado apenas em agente dedicado.
- Plugins e núcleo atualizados; versões de plugins fixadas e revisadas.
- Opcional: assinar imagem e SBOM com cosign e verificar antes da publicação.

## Fontes

- https://www.jenkins.io/doc/book/pipeline/docker/ (agent docker, args, reuseNode, agente por stage)
- Demais ferramentas: fontes listadas em `generico.md`.
