# Esteira de segurança: qualquer outra plataforma de CI

Use este arquivo quando a plataforma não tiver arquivo próprio (Drone, Woodpecker, TeamCity, CircleCI, Forgejo/Gitea Actions, Tekton etc.) e como base conceitual das demais. Todas as ferramentas rodam como contêiner ou binário de linha de comando; basta o executor ter Docker (ou instalar o binário em versão fixa).

## Etapas

| # | Etapa | Ferramenta | Entrada | Saída | Gate |
|---|---|---|---|---|---|
| 1 | Segredos | Gitleaks (`gitleaks git`) | histórico completo do repositório (clone sem `--depth`) | `gitleaks.sarif` | qualquer segredo reprovado, exceto `.gitleaksignore` |
| 2 | SAST | Semgrep CE (`semgrep scan`) | código-fonte | `semgrep.sarif` | ERROR reprova; WARNING vai para `semgrep-avisos.sarif`, com triagem obrigatória |
| 3 | SCA + SBOM | Trivy `fs` | código com arquivos de trava (lockfiles) | `sbom.cdx.json` (CycloneDX) e relatório | CRITICAL ou HIGH **com correção disponível** (`--ignore-unfixed`) reprova |
| 4 | Contêiner e IaC | Trivy `image` e Trivy `config` | imagem construída; Dockerfile, Kubernetes, Terraform | relatórios | CRITICAL ou HIGH reprova |
| 5 | DAST | OWASP ZAP baseline (todo merge na principal, contra homologação); ZAP full ou API scan (agendado) | URL de homologação (ou definição OpenAPI) | HTML e JSON | regras em FAIL no arquivo de regras reprovam |
| 6 | SBOM (opcional) | Dependency-Track | `sbom.cdx.json` | projeto atualizado | não barra; serve ao monitoramento contínuo |

Ordem: 1 a 4 em todo pull request e merge, em paralelo. Etapa 5 (baseline) só depois da publicação em homologação. Etapa 6 só na branch principal. A publicação em produção depende de 1 a 5 verdes.

Regra do portão: crítico e alto bloqueiam a publicação. Exceção só por arquivo versionado, revisado em pull request, com justificativa e validade:

- `.trivyignore`: uma linha por CVE com `exp:AAAA-MM-DD` (o Trivy deixa de ignorar após a data) e comentário `#` acima com motivo e responsável.
- O Gitleaks varre o histórico de **todos os ramos** presentes no clone: um segredo em qualquer ramo reprova a esteira, mesmo no `main`. Correção: revogar e trocar o segredo e limpar o histórico (`git filter-repo`); apagar o ramo não basta enquanto houver cópias.
- `.gitleaksignore`: uma impressão digital (fingerprint) por linha, com comentário `#` e `exp:AAAA-MM-DD` na linha de cima. O Gitleaks não conhece validade; quem confere é o script abaixo.
- `.zap/rules.tsv`: regra (ID, ação, nome, separados por tabulação) com ação IGNORE ou FAIL; validade em comentário.
- Exceção sem validade ou vencida reprova a esteira. Script `ci/verificar-excecoes.sh`, a rodar como etapa 0:

```sh
#!/bin/sh
# Reprova exceção vencida ou sem data de validade (exp:AAAA-MM-DD na própria linha ou no comentário logo acima).
# No .zap/rules.tsv, só as regras rebaixadas (IGNORE ou WARN) são exceções.
hoje=$(date +%F); falha=0
for f in .trivyignore .gitleaksignore .zap/rules.tsv; do
  [ -f "$f" ] || continue
  ant=""
  while IFS= read -r l || [ -n "$l" ]; do
    l=$(printf '%s' "$l" | tr -d '\r')
    case "$l" in ''|'#'*) ant="$l"; continue;; esac
    if [ "$f" = ".zap/rules.tsv" ]; then
      case "$l" in *IGNORE*|*WARN*) ;; *) ant=""; continue;; esac
    fi
    d=$(printf '%s\n%s\n' "$l" "$ant" | grep -o 'exp:[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' | head -1 | cut -d: -f2)
    if [ -z "$d" ]; then echo "Exceção sem data de validade em $f: $l"; falha=1
    elif [ "$d" != "$hoje" ] && [ "$(printf '%s
%s
' "$d" "$hoje" | sort | head -1)" = "$d" ]; then echo "Exceção vencida em $f ($d): $l"; falha=1
    fi
    ant=""
  done < "$f"
done
exit $falha
```

## Como mapear cada ferramenta

Versões fixadas (lidas nas páginas oficiais de lançamentos e nos registries em 22/11/2026): Trivy 0.76.2, Gitleaks v8.30.1, Semgrep 1.186.0, ZAP 2.17.0, alpine 3.24.4, docker 29.10.0, curl 8.23.0. Os digests `@sha256:` são os do manifesto multi-arquitetura lidos no registry. Mantenha essas fixações atualizadas com Dependabot ou Renovate (que atualizam tanto SHAs de actions quanto etiquetas/digests de imagens) e revise cada atualização; para fixar o digest de outra etiqueta, use `docker buildx imagetools inspect <imagem>:<etiqueta>`.

```sh
# 1. Segredos (imagem ghcr.io/gitleaks/gitleaks:v8.30.1; também publicada no Docker Hub)
gitleaks git --redact --exit-code 1 --report-format sarif --report-path gitleaks.sarif .
# 2. SAST (imagem semgrep/semgrep)
# 2a. Avisos do SAST: não barram, mas a triagem é obrigatória
semgrep scan --config p/default --config p/owasp-top-ten --severity WARNING --metrics=off --sarif -o semgrep-avisos.sarif .
semgrep scan --config p/default --config p/owasp-top-ten --severity ERROR --error --metrics=off --sarif -o semgrep.sarif .
# 3. SCA + SBOM (imagem ghcr.io/aquasecurity/trivy:0.76.2)
trivy fs --format cyclonedx --output sbom.cdx.json .
trivy fs --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .
# 4. Contêiner e IaC
docker save app:$COMMIT -o app.tar && chmod a+r app.tar
trivy image --input app.tar --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1
trivy config --severity HIGH,CRITICAL --exit-code 1 .
# 5. DAST (imagem ghcr.io/zaproxy/zaproxy:2.17.0; montar pasta gravável em /zap/wrk)
# 5a. Confere se o alvo responde; sem isso o ZAP pode "aprovar" sem ter testado nada
[ -n "$STAGING_URL" ] || { echo "STAGING_URL não definido, configure a URL da homologação"; exit 1; }
curl -sS -o /dev/null --retry 5 --retry-connrefused --retry-delay 5 --max-time 30 "$STAGING_URL"
zap-baseline.py -t "$STAGING_URL" -c .zap/rules.tsv -I -r zap.html -J zap.json
zap-full-scan.py -t "$STAGING_URL" -c .zap/rules.tsv -I -r zap.html     # agendado
zap-api-scan.py -t openapi.yaml -f openapi -c .zap/rules.tsv -I -r zap.html   # APIs
# 6. Dependency-Track (opcional)
curl -sf -X POST "$DT_URL/api/v1/bom" -H "X-Api-Key: $DT_API_KEY" \
  -F autoCreate=true -F projectName="$NOME" -F projectVersion="$VERSAO" -F bom=@sbom.cdx.json
```

Notas de uso:

- Código de saída do ZAP: 0 sucesso, 1 ao menos um FAIL, 2 só avisos (WARN), 3 falha de execução. A esteira usa `-I`, que trata 2 como sucesso: só as regras em FAIL barram.
- Em Trivy, `--ignore-unfixed` esconde achados sem correção publicada; eles continuam visíveis no SBOM monitorado pelo Dependency-Track (etapa 6) e devem ter prazo de revisão.
- Semgrep CE usa regras do registro com licença própria: confira a chave `license` de cada regra se o uso precisar ser estritamente de código aberto. CodeQL (GitHub) é opcional e só gratuito em repositórios públicos; em privados exige GitHub Code Security.
- Cadastre o ambiente de homologação como alvo do ZAP com conta de teste e dados fictícios; nunca aponte o DAST para produção.
- Plataforma sem contêineres: instale os binários em versão fixa e confira o hash publicado antes de rodar.
- Faça os relatórios SARIF e o SBOM como artefatos da execução, com retenção mínima de 90 dias.

## Segurança da própria esteira

- Segredos (chave do Dependency-Track, credenciais de homologação) só no cofre da plataforma, mascarados nos logs e escopados à branch principal; nunca no repositório.
- Tokens com o menor privilégio e validade curta; conta de serviço própria da esteira, sem direito de administrador.
- Branch principal protegida: revisão obrigatória, esteira verde obrigatória, sem push direto; o arquivo da esteira e os arquivos de exceção têm dono de código (CODEOWNERS ou equivalente).
- Código de pull request de fora ou de fork nunca roda com segredos nem em executor com acesso à rede interna.
- Executores efêmeros e isolados, separados por sensibilidade; imagens das ferramentas fixadas por versão ou digest.
- Opcional: assinar imagem e SBOM com cosign e verificar a assinatura antes da publicação.

### Arquivo de regras padrão do ZAP (`.zap/rules.tsv`)

O ZAP classifica quase tudo como aviso (WARN), inclusive XSS e injeção. Por isso a esteira usa `-I` (aviso não reprova) e este arquivo, que marca como FAIL as falhas graves: injeções, XSS, path traversal, inclusão de arquivo, exposição de código-fonte e execução remota conhecida. Os demais avisos vão para o relatório, com triagem obrigatória. Rebaixar uma regra (IGNORE ou WARN) é exceção: exige justificativa e `exp:` no comentário. IDs conferidos no ZAP 2.17.0. A regra 43 (Source Code Disclosure - File Inclusion) ficou de fora de propósito: em páginas que repetem o que o usuário digitou, ela acusa falso positivo, e a falha real que ela procura já é coberta pela 6 (Path Traversal). Ela continua no relatório como aviso.

```tsv
6	FAIL	(Path Traversal)
7	FAIL	(Remote File Inclusion)
41	FAIL	(Source Code Disclosure - Git)
42	FAIL	(Source Code Disclosure - SVN)
10045	FAIL	(Source Code Disclosure - /WEB-INF Folder)
10048	FAIL	(Remote Code Execution - Shell Shock)
10115	FAIL	(Script Served From Malicious Domain (polyfill))
20015	FAIL	(Heartbleed OpenSSL Vulnerability)
20017	FAIL	(Source Code Disclosure - CVE-2012-1823)
20018	FAIL	(Remote Code Execution - CVE-2012-1823)
40009	FAIL	(Server Side Include)
40012	FAIL	(Cross Site Scripting (Reflected))
40014	FAIL	(Cross Site Scripting (Persistent))
40016	FAIL	(Cross Site Scripting (Persistent) - Prime)
40017	FAIL	(Cross Site Scripting (Persistent) - Spider)
40018	FAIL	(SQL Injection)
40019	FAIL	(SQL Injection - MySQL (Time Based))
40020	FAIL	(SQL Injection - Hypersonic SQL (Time Based))
40021	FAIL	(SQL Injection - Oracle (Time Based))
40022	FAIL	(SQL Injection - PostgreSQL (Time Based))
40026	FAIL	(Cross Site Scripting (DOM Based))
40027	FAIL	(SQL Injection - MsSQL (Time Based))
40033	FAIL	(NoSQL Injection - MongoDB)
40043	FAIL	(Log4Shell)
40045	FAIL	(Spring4Shell)
40046	FAIL	(Server Side Request Forgery)
40047	FAIL	(Text4shell (CVE-2022-42889))
40048	FAIL	(Remote Code Execution (React2Shell))
90017	FAIL	(XSLT Injection)
90019	FAIL	(Server Side Code Injection)
90020	FAIL	(Remote OS Command Injection)
90021	FAIL	(XPath Injection)
90023	FAIL	(XML External Entity Attack)
90025	FAIL	(Expression Language Injection)
90029	FAIL	(SOAP XML Injection)
90035	FAIL	(Server Side Template Injection)
90036	FAIL	(Server Side Template Injection (Blind))
90037	FAIL	(Remote OS Command Injection (Time Based))
90039	FAIL	(NoSQL Injection - MongoDB (Time Based))
```

## Fontes

- https://github.com/aquasecurity/trivy/releases (Trivy 0.76.2)
- https://github.com/gitleaks/gitleaks e /releases (v8.30.1, comandos, formatos de relatório)
- https://trivy.dev/latest/docs/configuration/filtering/ (`.trivyignore`, `exp:`, `--ignore-unfixed`, `--severity`)
- https://docs.semgrep.dev/deployment/oss-deployment (Semgrep CE em CI, licença das regras)
- https://www.zaproxy.org/docs/docker/baseline-scan/, /api-scan/, /full-scan/ (opções, arquivo de regras, códigos de saída)
- https://docs.dependencytrack.org/usage/cicd/ (envio de BOM por API)
