# Esteira no GitLab CI/CD

## Quando se aplica

Existe `.gitlab-ci.yml` na raiz. Conceitos, comandos e script de exceções: `generico.md`.

## Etapas

| Etapa (stage) | Ferramenta | Gate |
|---|---|---|
| `excecoes` | `ci/verificar-excecoes.sh` | exceção vencida |
| `analise` (paralelo) | Gitleaks (segredos); Semgrep CE (SAST); Trivy `fs` (SCA + SBOM CycloneDX); Trivy `image` e `config` | segredo; ERROR; CRITICAL/HIGH com correção |
| `dast` | ZAP baseline em todo pipeline da `main`, contra homologação; ZAP full/API em pipeline agendado | regras FAIL de `.zap/rules.tsv` |
| `sbom` (opcional) | envio ao Dependency-Track, chave em variável CI/CD mascarada e protegida | não barra |

Modelos incluídos do GitLab: `Jobs/SAST.gitlab-ci.yml` roda no plano gratuito com analisadores de código aberto (Semgrep com regras gerenciadas pelo GitLab); relatório no painel de merge request, gestão de vulnerabilidades e regras personalizadas são do plano Ultimate. Para manter a mesma esteira em qualquer plano e o mesmo arquivo de exceções, o modelo abaixo usa as ferramentas diretamente; se preferir o modelo do GitLab para SAST, acrescente `include: - template: Jobs/SAST.gitlab-ci.yml` e remova o job `sast`. A publicação em produção deve ter `needs` de todos os jobs de segurança, e a `main` deve exigir pipeline verde para merge.

## Modelo

Versões fixadas (lidas nas páginas oficiais de lançamentos e nos registries em 22/11/2026): Trivy 0.76.2, Gitleaks v8.30.1, Semgrep 1.186.0, ZAP 2.17.0, alpine 3.24.4, docker 29.10.0, curl 8.23.0. Os digests `@sha256:` são os do manifesto multi-arquitetura lidos no registry. Mantenha essas fixações atualizadas com Dependabot ou Renovate (que atualizam tanto SHAs de actions quanto etiquetas/digests de imagens) e revise cada atualização; para fixar o digest de outra etiqueta, use `docker buildx imagetools inspect <imagem>:<etiqueta>`.

```yaml
stages: [excecoes, analise, teste-dinamico, sbom]

variables:
  GIT_DEPTH: "0"            # Gitleaks precisa do histórico completo
  TRIVY_IMG: ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb
  ZAP_IMG: ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af
  # STAGING_URL, DT_URL: variáveis CI/CD do projeto; DT_API_KEY: mascarada e protegida

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
  stage: teste-dinamico
  image: { name: "$ZAP_IMG", entrypoint: [""] }
  before_script: [mkdir -p /zap/wrk && cp .zap/rules.tsv /zap/wrk/rules.tsv]
  after_script: [cp /zap/wrk/*.html /zap/wrk/*.json "$CI_PROJECT_DIR/" 2>/dev/null || true]
  artifacts: { when: always, paths: ["*.html", "*.json"] }

dast-baseline:
  extends: .dast
  needs: [excecoes, segredos, sast, sca, iac]      # e a publicação em homologação do projeto
  script:
    - '[ -n "$STAGING_URL" ] || { echo "STAGING_URL não definido, configure a URL da homologação"; exit 1; }'
    - curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING_URL"
    - zap-baseline.py -t "$STAGING_URL" -c rules.tsv -I -r baseline.html -J baseline.json
  rules:
    - if: '$CI_PIPELINE_SOURCE == "push" && $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'

dast-completo:
  extends: .dast
  script:
    - '[ -n "$STAGING_URL" ] || { echo "STAGING_URL não definido, configure a URL da homologação"; exit 1; }'
    - curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING_URL"
    - zap-full-scan.py -t "$STAGING_URL" -c rules.tsv -I -r completo.html
    # APIs: zap-api-scan.py -t <openapi> -f openapi -c rules.tsv -I -r api.html
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'      # criar o agendamento em Build > Pipeline schedules

dependency-track:                                    # opcional
  stage: sbom
  image: curlimages/curl:8.23.0
  needs: [{ job: sca, artifacts: true }]
  script:
    - 'curl -sf -X POST "$DT_URL/api/v1/bom" -H "X-Api-Key: $DT_API_KEY" -F autoCreate=true -F "projectName=$CI_PROJECT_NAME" -F "projectVersion=$CI_COMMIT_SHORT_SHA" -F bom=@sbom.cdx.json'
  rules:
    - if: '$DT_URL && $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
```

Pontos a ajustar: o ZAP roda como usuário `zap` e grava em `/zap/wrk` (no executor Docker, a pasta de trabalho do job pode não ser gravável por ele; por isso o modelo copia as regras para `/zap/wrk` e os relatórios de volta). Se a imagem recusar o `mkdir`, use `docker run -v` como em `generico.md`. Os jobs `analise` rodam também em merge request; `dast` não, por exigir ambiente publicado. Por padrão `needs` dispensa a ordem de stages; confira que a publicação em produção dependa de todos os jobs de segurança.

No GitLab, não use `dast` como nome de etapa: ele é reservado ao DAST pago do GitLab, e o pipeline é recusado com "Insufficient permissions for dast_configuration keyword".

## Segurança da própria esteira

- Segredos só em *Settings > CI/CD > Variables*, mascarados e protegidos (disponíveis apenas em branches e tags protegidas); nunca em `variables:` do YAML.
- Token de job (`CI_JOB_TOKEN`) com escopo de acesso restrito; tokens de projeto com papel e validade mínimos.
- Branch padrão protegida: merge request com aprovação obrigatória, pipeline verde obrigatório, CODEOWNERS para `.gitlab-ci.yml`, `ci/` e arquivos de exceção.
- Pipelines de merge request de fork não recebem variáveis protegidas; não habilite pipelines com segredos para código de terceiros.
- Runners isolados: executor Docker com contêiner novo por job; modo privilegiado (necessário ao `dind`) só em runner dedicado ao projeto, nunca compartilhado com projetos de outra sensibilidade.
- Opcional: assinar imagem e SBOM com cosign e verificar antes da publicação.

## Fontes

- https://docs.gitlab.com/ci/yaml/ (stages, include:template, artifacts, rules)
- https://docs.gitlab.com/user/application_security/sast/ (modelo `Jobs/SAST.gitlab-ci.yml`, analisadores por plano)
- Demais ferramentas: fontes listadas em `generico.md`.
