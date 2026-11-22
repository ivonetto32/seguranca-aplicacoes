# Esteira no GitHub Actions

## Quando se aplica

Existe `.github/workflows/*.yml`. Conceitos, comandos e arquivo de exceções: `generico.md`. O modelo abaixo roda as ferramentas como contêineres (`docker run`), o que deixa só duas actions de terceiros para fixar (checkout e upload de artefatos).

## Etapas

| Etapa | Ferramenta | Gate |
|---|---|---|
| Segredos | Gitleaks, histórico completo (`fetch-depth: 0`) | qualquer achado fora do `.gitleaksignore` |
| SAST | Semgrep CE (`p/default`, `p/owasp-top-ten`) | severidade ERROR |
| SCA + SBOM | Trivy `fs`: SBOM CycloneDX e varredura | CRITICAL/HIGH com correção |
| Imagem e IaC | Trivy `image` e `config` | CRITICAL/HIGH |
| DAST baseline | ZAP baseline em todo push na `main`, contra homologação | regras FAIL de `.zap/rules.tsv` |
| DAST completo/API | ZAP full ou API scan, agendado (semanal) | idem |
| SBOM (opcional) | envio ao Dependency-Track, chave em secret do repositório | não barra |

CodeQL é opção ao Semgrep: gratuito em repositórios públicos; em privados exige licença GitHub Code Security. Alternativa à chamada direta do Trivy: a action oficial `aquasecurity/trivy-action` (a documentação dela usa a versão v0.36.0; fixe pelo SHA completo ao instalar). Exceções: `.trivyignore`, `.gitleaksignore`, `.zap/rules.tsv`, todos com `exp:AAAA-MM-DD` e justificativa; a etapa `excecoes` reprova vencidas (script em `generico.md`). Proteja a publicação em produção com um *environment* que exija os jobs abaixo (regra de branch protegida: checks obrigatórios).

## Modelo

Arquivo `.github/workflows/seguranca.yml`. Cada action está fixada pelo SHA completo de 40 caracteres da versão atual (lido no repositório original em 22/11/2026; o comentário mantém a versão). Mantenha os SHAs atualizados com Dependabot ou Renovate. Imagens: veja o bloco `env` (etiqueta mais digest do manifesto multi-arquitetura); para fixar outra etiqueta, use `docker buildx imagetools inspect <imagem>:<etiqueta>`.

```yaml
name: seguranca
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: "17 3 * * 1"   # DAST completo, segunda 03:17 UTC
permissions:
  contents: read            # mínimo; cada job pede só o que precisar
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
    if: github.event_name == 'push'          # só na main; antes, publicar em homologação (job do projeto)
    needs: [excecoes, segredos, sast, sca, imagem-iac]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - run: |
          mkdir -p zap && chmod 777 zap
          [ -n "${{ vars.STAGING_URL }}" ] || { echo "STAGING_URL não definido, configure a URL da homologação"; exit 1; }
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
          [ -n "${{ vars.STAGING_URL }}" ] || { echo "STAGING_URL não definido, configure a URL da homologação"; exit 1; }
          curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "${{ vars.STAGING_URL }}"
          docker run --rm -v "$PWD/zap:/zap/wrk:rw" -v "$PWD/.zap:/zap/rules:ro" $ZAP zap-full-scan.py -t "${{ vars.STAGING_URL }}" -c /zap/rules/rules.tsv -I -r completo.html
      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        if: always()
        with: { name: zap-completo, path: zap/ }
  dependency-track:                          # opcional
    if: github.event_name == 'push' && vars.DT_URL != ''
    needs: sca
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
        with: { name: sbom }
      - run: |
          curl -sf -X POST "${{ vars.DT_URL }}/api/v1/bom" -H "X-Api-Key: ${{ secrets.DT_API_KEY }}" -F autoCreate=true -F "projectName=${{ github.event.repository.name }}" -F "projectVersion=${{ github.sha }}" -F bom=@sbom.cdx.json
```

Para API (OpenAPI), troque o comando do ZAP por `zap-api-scan.py -t <url ou arquivo> -f openapi -c ... -I`. Para enviar SARIF ao painel de code scanning, use `github/codeql-action/upload-sarif` (fixada por SHA; exige a licença citada acima em repositórios privados).

## Segurança da própria esteira

- Segredos só em *Secrets* e *Variables* do repositório ou do *environment*; chave do Dependency-Track só no job que a usa, nunca em jobs de pull request.
- `permissions:` mínimo no topo (`contents: read`); eleve por job apenas o necessário. Actions de terceiros fixadas por SHA completo; revise as atualizações (Dependabot para `github-actions`).
- Evite `pull_request_target` e `workflow_run` com checkout de código do PR; código de fork nunca recebe segredos.
- Runner próprio apenas efêmero (just-in-time) e isolado; não use runner auto-hospedado em repositório público.
- Branch `main` protegida: revisão obrigatória, checks desta esteira obrigatórios, CODEOWNERS para `.github/workflows/` e para os arquivos de exceção.
- Opcional: assinar imagens e SBOM com cosign (identidade sem chave via OIDC) e verificar antes de publicar.

## Fontes

- https://docs.github.com/en/actions/reference/security/secure-use (SHA completo, permissões mínimas, `pull_request_target`, runners)
- https://github.com/aquasecurity/trivy-action (action oficial, v0.36.0, entradas `trivyignores`, `ignore-unfixed`)
- https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security (licença do code scanning em privados)
- https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql
- Demais ferramentas: fontes listadas em `generico.md`.
