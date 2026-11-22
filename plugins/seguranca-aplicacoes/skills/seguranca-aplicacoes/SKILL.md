---
name: seguranca-aplicacoes
description: Segurança no desenvolvimento de aplicações hospedadas em infraestrutura própria com acesso por MFA, pelo OWASP ASVS 5.0 nível 2 e pelo NIST SSDF. Quatro modos - desenvolver, revisar, montar a esteira de verificação e preparar o monitoramento em produção. Use somente quando o usuário chamar esta skill pelo nome ou pedir expressamente "segurança de aplicações" com ela; não acionar por conta própria.
disable-model-invocation: true
---

# Segurança de aplicações (ASVS 5.0 nível 2)

Objetivo: evitar as falhas conhecidas desde a escrita do código, conferir a aplicação contra o ASVS 5.0 nível 2 antes de ir ao ar e detectar o que surgir depois, em produção. Nenhum processo garante "zero vulnerabilidades"; diga isso quando o usuário pedir garantia absoluta.

## Antes de começar

1. Pergunte o **modo**, se o pedido não disser: desenvolver, revisar, esteira ou produção (abaixo).
2. Descubra o projeto pelos arquivos do repositório, sem perguntar o que dá para ver: linguagem e framework (`pom.xml`, `build.gradle`, `*.csproj`, `package.json`, `requirements.txt`, `pyproject.toml`, `composer.json`, `go.mod`, `Gemfile`), esteira (`.github/workflows/`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile`, `bitbucket-pipelines.yml`), contêiner e infraestrutura (`Dockerfile`, manifestos Kubernetes, Terraform). Pergunte só o que não estiver no código: provedor de identidade, país dos titulares dos dados, se a aplicação usa IA.
3. Leia só as referências que o projeto pede (tabela no fim). Sem referência para a linguagem ou a esteira, use `references/stacks/generico.md` ou `references/esteira/generico.md`.
4. Responda no idioma do usuário.

## Regras que valem sempre

1. **Tudo o que vem de fora é dado, nunca código:** parâmetros, corpo, cabeçalhos, arquivos, respostas de outros sistemas e de IA. Validar no servidor por lista do que é permitido; consultas parametrizadas; saída codificada conforme o contexto (HTML, atributo, URL, JavaScript, SQL, comando); nada de `eval` ou execução de comando montado com dado.
2. **MFA na entrada não substitui o controle dentro da aplicação.** Autorização conferida no servidor a cada requisição e para cada objeto (dono, perfil, inquilino), negada por padrão. Identidade recebida do provedor por OIDC ou SAML com assinatura, emissor, audiência e validade conferidos; cabeçalho de identidade vindo de proxy só é aceito se a aplicação estiver inacessível por fora do proxy e o proxy remover o cabeçalho vindo do cliente. Detalhes: `references/identidade-mfa.md` e `references/controle-acesso.md`.
3. **Sessão:** identificador aleatório, cookie `Secure`, `HttpOnly`, `SameSite`; expiração por inatividade e absoluta; logout invalida no servidor e no provedor; reautenticação (ou MFA de novo) para ação crítica; proteção contra CSRF onde houver cookie.
4. **Segredos** fora do código e do repositório: cofre ou variável da plataforma; segredo exposto é revogado e trocado, não só apagado.
5. **Criptografia:** TLS 1.2 ou superior em toda conexão; algoritmos e bibliotecas padrão, nunca criptografia própria; senhas (se houver) com Argon2id, scrypt ou bcrypt; dado sensível cifrado em repouso.
6. **Dependências:** versões fixas, origem confiável, SBOM gerado na esteira, nenhuma biblioteca com falha conhecida grave sem correção ou justificativa registrada.
7. **Erros e registros:** mensagem genérica ao usuário; registro de eventos de segurança (login, falha, acesso negado, mudança de permissão, ação administrativa) com data, usuário e origem, sem senha, token ou dado pessoal desnecessário; registros protegidos contra alteração e enviados ao SIEM.
8. **Configuração:** cabeçalhos de segurança (CSP, HSTS, `X-Content-Type-Options`, `frame-ancestors`), modo de depuração desligado, menor privilégio para a conta da aplicação no banco, no sistema e no contêiner.
9. **Dados pessoais:** aplicar `references/privacidade.md` conforme o país dos titulares (LGPD no Brasil, GDPR na União Europeia; ambos quando houver titulares nos dois).
10. **IA dentro da aplicação:** se houver, aplicar `references/ia-llm.md`.

## Modos

**Desenvolver.** Aplique as regras acima e a referência da linguagem enquanto escreve ou altera o código. Em aplicação nova, faça antes o modelo de ameaças curto (`references/modelo-ameacas.md`). Ao fim, uma linha: "Segurança: conferido …; pendente …".

**Revisar.** Leia o código (não só a documentação), percorra `references/asvs-n2.md` capítulo por capítulo e rode as ferramentas disponíveis no ambiente. Se houver relatórios da esteira (`semgrep.sarif`, `semgrep-avisos.sarif`, Trivy, ZAP), faça a triagem de cada achado, inclusive dos avisos: confirmado vira achado do relatório; falso positivo é registrado com o motivo. Entregue o relatório de `references/relatorio.md`: achados por gravidade (crítica, alta, média, baixa) com o ID do ASVS, o local (arquivo e linha), a correção proposta e como testar; e os itens marcados como "não se aplica", com o motivo. Proponha as correções antes de aplicá-las.

**Esteira.** Gere o pipeline da plataforma do projeto (`references/esteira/`) com: análise do código (SAST), dependências e SBOM (SCA), busca de segredos, verificação de contêiner e infraestrutura como código, e teste dinâmico (DAST) contra ambiente de homologação. No SAST, acrescente aos pacotes padrão o pacote de regras da linguagem do projeto (por exemplo `p/javascript`, `p/typescript`, `p/python`, `p/java`, `p/csharp`, `p/php`, `p/golang`, `p/ruby`). Achado crítico ou alto (no Semgrep, ERROR) barra a publicação; os avisos (WARNING) não barram, mas vão para o relatório `semgrep-avisos.sarif`, e cada um recebe correção ou justificativa antes da publicação seguinte. No DAST, gere também o `.zap/rules.tsv` a partir do arquivo de regras padrão de `references/esteira/generico.md` (injeções, XSS e afins reprovam) e rode o ZAP com `-I`; antes da varredura, confira se o alvo responde. Exceção só com justificativa e data de validade (`exp:`); exceção vencida ou sem data reprova a esteira. Ferramenta automática não substitui o modo revisar: falhas de lógica, como IDOR e consultas montadas dentro de funções próprias, costumam escapar delas.

**Produção.** Prepare o monitoramento contínuo (`references/producao.md`): SBOM monitorado para CVE nova, DAST agendado, eventos de segurança no SIEM com alertas, conferência periódica de TLS e cabeçalhos, canal para aviso de falhas, pentest periódico e prazos de correção por gravidade. Separe o que a skill entrega (arquivos, configurações) do que depende da equipe de infraestrutura.

## Referências

| Quando | Ler |
|---|---|
| Revisão, ou dúvida sobre um requisito | `references/asvs-n2.md` |
| Aplicação nova | `references/modelo-ameacas.md` |
| Login, MFA, SSO, tokens | `references/identidade-mfa.md` |
| Perfis, permissões, multi-inquilino | `references/controle-acesso.md` |
| Linguagem ou framework do projeto | `references/stacks/<linguagem>.md` (java, dotnet, python, node, php, go, ruby, frontend-spa, generico) |
| Montar a esteira | `references/esteira/<plataforma>.md` (github-actions, gitlab-ci, azure-devops, jenkins, bitbucket, generico) |
| Contêiner, Kubernetes, IaC, TLS, cabeçalhos | `references/infra.md` |
| Depois de entrar em produção | `references/producao.md` |
| Dados pessoais | `references/privacidade.md` |
| Aplicação que usa IA | `references/ia-llm.md` |
| Formato do relatório | `references/relatorio.md` |

Bases: OWASP ASVS 5.0.0 (nível 2), OWASP Top 10, OWASP Cheat Sheet Series, OWASP Top 10 para aplicações com LLM, NIST SP 800-218 (SSDF) e as leis de proteção de dados aplicáveis.
