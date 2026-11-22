# Esteira no Bitbucket Pipelines

## Quando se aplica

Existe `bitbucket-pipelines.yml` na raiz (Bitbucket Cloud). Em Bitbucket Data Center não há Pipelines nativo: use o arquivo da plataforma de CI que o ambiente tiver (Jenkins, Bamboo etc.) com `generico.md`. Conceitos, comandos e script de exceções: `generico.md`.

## Etapas

| Etapa (step) | Ferramenta | Gate |
|---|---|---|
| Exceções | `ci/verificar-excecoes.sh` | exceção vencida |
| Segredos | Gitleaks (clone completo: `clone: depth: full`) | qualquer achado fora do `.gitleaksignore` |
| SAST | Semgrep CE | severidade ERROR |
| SCA + SBOM | Trivy `fs`, SBOM CycloneDX como artefato | CRITICAL/HIGH com correção |
| Imagem e IaC | Trivy `image` e `config` (serviço `docker`) | CRITICAL/HIGH |
| DAST baseline | ZAP baseline em todo push na `main`, contra homologação | regras FAIL |
| DAST completo/API | ZAP full/API em pipeline `custom` com agendamento | regras FAIL |
| SBOM (opcional) | envio ao Dependency-Track, chave em variável protegida do repositório | não barra |

Os steps de um mesmo estágio sequencial rodam em ordem; use bloco `parallel` para os de análise. Exceções: `.trivyignore`, `.gitleaksignore`, `.zap/rules.tsv`, com `exp:AAAA-MM-DD` e justificativa. Impeça a publicação em produção com *deployment* que dependa dos steps abaixo, com *branch permissions* e *merge checks* exigindo a esteira verde.

## Modelo

Versões fixadas (lidas nas páginas oficiais de lançamentos e nos registries em 22/11/2026): Trivy 0.76.2, Gitleaks v8.30.1, Semgrep 1.186.0, ZAP 2.17.0, alpine 3.24.4, docker 29.10.0, curl 8.23.0. Os digests `@sha256:` são os do manifesto multi-arquitetura lidos no registry. Mantenha essas fixações atualizadas com Dependabot ou Renovate (que atualizam tanto SHAs de actions quanto etiquetas/digests de imagens) e revise cada atualização; para fixar o digest de outra etiqueta, use `docker buildx imagetools inspect <imagem>:<etiqueta>`. A sintaxe abaixo segue o formato habitual do Bitbucket Pipelines, mas a página de referência não pôde ser lida por completo na verificação: confira cada chave na referência oficial. Cada step roda no contêiner indicado em `image`; as ferramentas, por serem imagens com entrypoint próprio, são chamadas pelo caminho do binário.

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
        name: Segredos (Gitleaks)
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
        name: SCA e SBOM (Trivy)
        image: ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb
        script:
          - trivy fs --format cyclonedx --output sbom.cdx.json .
          - trivy fs --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .
        artifacts: [sbom.cdx.json]
    - step: &imagem-iac
        name: Imagem e IaC (Trivy)
        services: [docker]
        script:
          - docker build -t app:$BITBUCKET_COMMIT .
          - docker save app:$BITBUCKET_COMMIT -o app.tar && chmod a+r app.tar
          - docker run --rm -v "$PWD:/w" -w /w ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb image --input app.tar --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1
          - docker run --rm -v "$PWD:/w" -w /w ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb config --severity HIGH,CRITICAL --exit-code 1 .
    - step: &dast-baseline
        name: DAST baseline (ZAP)
        image: ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af
        script:                                  # antes: publicação em homologação (step do projeto)
          - mkdir -p /zap/wrk && cp .zap/rules.tsv /zap/wrk/
          - '[ -n "$STAGING_URL" ] || { echo "STAGING_URL não definido, configure a URL da homologação"; exit 1; }'
          - curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING_URL"
          - zap-baseline.py -t "$STAGING_URL" -c rules.tsv -I -r baseline.html -J baseline.json
          - cp /zap/wrk/*.html /zap/wrk/*.json . 
        artifacts: ["*.html", "*.json"]
    - step: &dast-completo
        name: DAST completo (ZAP)
        image: ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af
        script:
          - mkdir -p /zap/wrk && cp .zap/rules.tsv /zap/wrk/
          - '[ -n "$STAGING_URL" ] || { echo "STAGING_URL não definido, configure a URL da homologação"; exit 1; }'
          - curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING_URL"
          - zap-full-scan.py -t "$STAGING_URL" -c rules.tsv -I -r completo.html
          - cp /zap/wrk/*.html .
        artifacts: ["*.html"]
    - step: &dependency-track
        name: SBOM para o Dependency-Track
        image: curlimages/curl:8.23.0
        script:
          - if [ -z "$DT_URL" ]; then echo "DT_URL não definido, etapa opcional ignorada"; exit 0; fi
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
      - step: *dependency-track          # opcional; remova se não usar
  custom:
    dast-completo:                       # agendar em Repository settings > Pipelines > Schedules
      - step: *dast-completo
```

Em `custom` o agendamento é cadastrado na interface, apontando para `dast-completo`. Para APIs: `zap-api-scan.py -t <openapi> -f openapi -c rules.tsv -I`. O artefato do SCA chega ao step seguinte por `artifacts`. Se `apk` ou o serviço `docker` não permitirem rodar o Trivy como contêiner, instale o binário em versão fixa dentro do step e confira o hash.

## Segurança da própria esteira

- Segredos só em *Repository/Workspace variables* marcadas como *Secured* (valor mascarado); chave do Dependency-Track somente na branch `main` (variável de *Deployment* com ambiente restrito).
- Tokens de repositório ou de app com escopo mínimo; sem credencial de administrador na esteira.
- Branch `main` com *branch permissions* (sem push direto), *merge checks* (esteira verde, mínimo de aprovações) e revisor obrigatório para `bitbucket-pipelines.yml`, `ci/` e arquivos de exceção.
- Não execute pipeline de PR de fork com variáveis secured (o Bitbucket não as repassa por padrão; não altere isso).
- Runners próprios (se usar) efêmeros, isolados por workspace e sem acesso à rede interna além do necessário; steps com `services: [docker]` exigem atenção por serem privilegiados.
- Opcional: assinar imagem e SBOM com cosign e verificar antes da publicação.

## Fontes

- https://support.atlassian.com/bitbucket-cloud/docs/bitbucket-pipelines-configuration-reference/ (consultada, porém só o índice foi legível; sintaxe a confirmar)
- https://support.atlassian.com/bitbucket-cloud/docs/configure-bitbucket-pipelinesyml/ (idem)
- Demais ferramentas: fontes listadas em `generico.md`.
