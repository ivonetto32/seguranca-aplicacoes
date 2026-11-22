# Esteira no Azure DevOps (Azure Pipelines)

## Quando se aplica

Existe `azure-pipelines.yml` (ou arquivo YAML apontado pela definição do pipeline). Conceitos, comandos e script de exceções: `generico.md`. O modelo usa agentes Linux com Docker e executa as ferramentas como contêineres.

## Etapas

| Stage | Ferramenta | Gate |
|---|---|---|
| `Analise` (jobs em paralelo) | exceções; Gitleaks (segredos); Semgrep CE (SAST); Trivy `fs` (SCA + SBOM CycloneDX); Trivy `image` e `config` | exceção vencida; segredo; ERROR; CRITICAL/HIGH com correção |
| `Dast` | ZAP baseline em todo push na `main`, contra homologação; ZAP full/API em execução agendada | regras FAIL de `.zap/rules.tsv` |
| `Sbom` (opcional) | envio ao Dependency-Track, chave em variável secreta ou grupo de variáveis ligado ao Key Vault | não barra |

Notas da plataforma: o Azure DevOps não traz SAST gratuito próprio (o GitHub Advanced Security para Azure DevOps é pago; confirme a licença antes de adotá-lo). O pipeline de validação de PR vem da política de branch (*Build validation*), não do bloco `pr:` quando o repositório está no Azure Repos. Publicação em produção: use *Environments* com aprovação e verificações, e faça o stage de deploy depender de `Analise` e `Dast`. Exceções: `.trivyignore`, `.gitleaksignore`, `.zap/rules.tsv` com `exp:AAAA-MM-DD` e justificativa.

## Modelo

Versões fixadas (lidas nas páginas oficiais de lançamentos e nos registries em 22/11/2026): Trivy 0.76.2, Gitleaks v8.30.1, Semgrep 1.186.0, ZAP 2.17.0, alpine 3.24.4, docker 29.10.0, curl 8.23.0. Os digests `@sha256:` são os do manifesto multi-arquitetura lidos no registry. Mantenha essas fixações atualizadas com Dependabot ou Renovate (que atualizam tanto SHAs de actions quanto etiquetas/digests de imagens) e revise cada atualização; para fixar o digest de outra etiqueta, use `docker buildx imagetools inspect <imagem>:<etiqueta>`.

```yaml
trigger:
  branches: { include: [main] }
pr: none                      # PR: use a política de branch (Build validation)
schedules:
  - cron: "17 3 * * 1"        # DAST completo, segunda 03:17 UTC
    displayName: DAST semanal
    branches: { include: [main] }
    always: true              # roda mesmo sem mudança no código

pool: { vmImage: ubuntu-latest }

variables:
  GITLEAKS: ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f
  SEMGREP: semgrep/semgrep:1.186.0@sha256:6e1b04340e60e910fbb4ddbf3c857ab0918f064417ad5ac530014ccb3cf8c8f1
  TRIVY: ghcr.io/aquasecurity/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb
  ZAP: ghcr.io/zaproxy/zaproxy:2.17.0@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af
  # STAGING_URL e DT_URL: variáveis do pipeline; DT_API_KEY: variável secreta

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
            fetchDepth: 0                      # histórico completo
          - script: docker run --rm -v "$(Build.SourcesDirectory):/repo" $(GITLEAKS) git --redact --exit-code 1 --report-format sarif --report-path /repo/gitleaks.sarif /repo
            displayName: Gitleaks
      - job: Sast
        steps:
          - checkout: self
          - script: docker run --rm -v "$(Build.SourcesDirectory):/src" -w /src $(SEMGREP) semgrep scan --config p/default --config p/owasp-top-ten --severity WARNING --metrics=off --sarif -o semgrep-avisos.sarif .
            displayName: Semgrep CE (avisos)
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
            displayName: Trivy imagem e IaC

  - stage: Dast
    dependsOn: [Analise]
    condition: or(succeeded(), eq(variables['Build.Reason'], 'Schedule'))
    jobs:
      - job: Baseline
        condition: ne(variables['Build.Reason'], 'Schedule')   # publicar em homologação antes (stage do projeto)
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

  - stage: Sbom                                         # opcional
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
            env: { DT_API_KEY: $(DT_API_KEY) }          # variável secreta só entra por env
```

Para API, troque por `zap-api-scan.py -t <openapi> -f openapi -c rules.tsv -I`. Em agentes Microsoft-hosted o Docker já existe; em agentes próprios, instale-o e use agentes efêmeros.

## Segurança da própria esteira

- Segredos só como variáveis secretas ou grupos de variáveis (de preferência ligados ao Azure Key Vault); variável secreta nunca é exposta ao script sem mapeamento explícito em `env:`.
- Conexões de serviço com menor privilégio, escopo restrito ao projeto e checagens de *Environment* (aprovação, branch permitida).
- Política de branch na `main`: revisão obrigatória, *Build validation* obrigatória, revisor obrigatório para `azure-pipelines.yml`, `ci/` e arquivos de exceção.
- PR de fork não recebe segredos (deixe "Make secrets available to builds of forks" desligado); não execute código não revisado com conexões de serviço.
- Agentes próprios efêmeros, isolados por projeto e em rede segregada; *Job authorization scope* limitado ao projeto.
- Opcional: assinar imagem e SBOM com cosign e verificar antes da publicação.

## Fontes

- https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/pipeline?view=azure-pipelines (estrutura: stages, jobs, steps, trigger, pr, schedules)
- Demais ferramentas: fontes listadas em `generico.md`.
