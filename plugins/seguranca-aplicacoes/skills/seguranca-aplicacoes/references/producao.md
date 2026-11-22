# Produção: detecção contínua depois da publicação

Objetivo: descobrir cedo o que surgir depois do go-live (CVE nova em dependência, regressão, ataque em curso). Base: ASVS 5.0 V15.1, V15.2, V16, V13.4 e NIST SSDF (prática RV, identificar e corrigir vulnerabilidades). Os prazos e limiares abaixo são sugestões para a empresa ajustar.

## a) SBOM monitorado (OWASP Dependency-Track)

1. A esteira gera o SBOM (CycloneDX) a cada build de release e envia ao Dependency-Track pela API, com chave de API de escopo mínimo guardada no cofre da esteira (V15.1.2).
2. Um **projeto por aplicação**, com **uma versão por release** (nome da app + versão ou tag). Marque a versão em produção como ativa e desative as antigas.
3. Notificações: crie regra para os grupos `NEW_VULNERABILITY` (alerta imediato) e `NEW_VULNERABILITIES_SUMMARY` (resumo agendado), mais `POLICY_VIOLATION`; limite a regra aos projetos em produção. Destinos disponíveis: webhook (POST JSON), e-mail, Slack, Microsoft Teams, Mattermost, Webex, Jira. Escolha o canal que a equipe realmente lê.
4. Política (Policy Compliance): violação "falha" para vulnerabilidade crítica ou alta com correção disponível, e para componente fora de manutenção. Registre exceções com justificativa, dono e prazo (V15.1.1, V15.2.1).
5. Triagem: cada achado recebe análise (explorável, não afetado, falso positivo) no próprio Dependency-Track, para a mudança de estado ficar auditada.

## b) DAST agendado (OWASP ZAP)

1. **Homologação idêntica à produção** (mesma versão, configuração, cabeçalhos e proxy). Varredura completa (ativa) semanal e após cada release relevante, por plano do ZAP Automation Framework (YAML) versionado no repositório.
2. **Varredura autenticada** com o **usuário de teste do provedor de identidade**, conta criada só para isso, com perfis mínimos e sem dados reais. Nunca use credencial de usuário real. Credenciais do usuário de teste ficam no cofre, não no YAML.
3. Contra a **produção**, só o *baseline* (passivo, sem ataque ativo), e somente com autorização por escrito da equipe de infraestrutura, em janela combinada e sem usuário real.
4. Saída: relatório (JSON/HTML/SARIF) arquivado; alerta de risco alto abre chamado automático. O ZAP retorna código de saída diferente de zero em falha/aviso, útil para a esteira.
5. Ajuste de falsos positivos em arquivo de regras versionado, com motivo.

## c) Eventos de segurança no SIEM

Base: OWASP Logging Cheat Sheet e OWASP Logging Vocabulary Cheat Sheet (nomes padronizados, como `authn_login_fail`, `authz_fail`, `authz_change`). Requisitos ASVS: V16.1.1 (inventário), V16.2.1 a V16.2.5, V16.3.1 a V16.3.4, V16.4.1 a V16.4.3.

**Eventos mínimos**

| Evento | Observação |
|---|---|
| Login com sucesso e com falha | Vindos das claims e da resposta do IdP: `sub`, `acr`/`amr`, motivo (V16.3.1) |
| Acesso negado (403/401) | Recurso, ação e usuário (V16.3.2) |
| Mudança de permissão ou perfil | Quem mudou, de quem, de quê para quê |
| Ação administrativa | Criação/remoção de usuário, mudança de configuração, exportação em massa |
| Falha de validação de entrada em volume | Contar por origem; não gravar o conteúdo inteiro (V16.3.3) |
| Falha de validação de token | Assinatura, emissor, audiência, expiração |
| Falha de sessão | Identificador inválido, uso após expirar |
| Erro inesperado e falha de controle de segurança | V16.3.4 |

**Formato**: JSON, uma linha por evento; campos: `timestamp` em UTC (ISO 8601, relógios sincronizados, V16.2.2), `event` (vocabulário), `user_id` (identificador interno, não nome nem e-mail), `source_ip` (o real, por cabeçalho confiável, V15.3.4), `request_id`, `app`, `version`, `outcome`, `resource`.

**Nunca registrar**: senha, token, chave, identificador de sessão em claro (use hash), cookie, corpo de requisição com dado pessoal, número de documento ou cartão (V16.2.5). Codificar o que vem do usuário para impedir injeção de log (V16.4.1).

**Integridade e retenção**: envio imediato a sistema separado da aplicação (V16.4.3), com acesso restrito e sem permissão de alteração (V16.4.2). Retenção: defina por política da empresa (sugestão: 12 meses pesquisáveis e o que a lei ou a norma interna exigir) e descarte depois; log com dado pessoal segue `privacidade.md`.

**Regras de alerta de exemplo** (ajustar limiares ao tráfego real)

1. Força bruta: mais de 10 falhas de login do mesmo usuário ou do mesmo IP em 5 minutos, ou falhas em muitos usuários a partir de um IP (password spraying).
2. Sondagem de IDOR: mais de 20 respostas 403/404 para objetos distintos do mesmo usuário em 10 minutos.
3. Mudança de privilégio fora da janela de mudança aprovada, ou sem chamado associado.
4. Pico de falha de validação de token ou de entrada (possível ataque automatizado).
5. Login bem-sucedido logo após muitas falhas, ou de país/rede incomum para o perfil.
6. Ação administrativa por conta que nunca a executou.
7. Aplicação parou de enviar logs (ausência de evento também é alerta).

## d) Conferências periódicas

| O quê | Como | Frequência sugerida |
|---|---|---|
| TLS (versões, cifras, certificado) | `testssl.sh` ou equivalente contra o endereço da aplicação; esperado: só TLS 1.2 e 1.3, cifras fortes (V12.1.1, V12.1.2) | Mensal e após mudança no proxy |
| Cabeçalhos de segurança | HSTS, CSP, `nosniff`, Referrer-Policy, `frame-ancestors` (V3.4.1 a V3.4.6) | Mensal, também no DAST |
| Validade do certificado | Alerta com 30 e 7 dias de antecedência; renovação automática quando possível | Contínua |
| Endpoints de depuração e monitoramento expostos | Procurar `/debug`, `/actuator`, `/swagger`, `/metrics`, `.git`, listagem de diretório, TRACE (V13.4.1 a V13.4.5) | Semanal (no DAST) |
| Dependências sem manutenção | Relatório do Dependency-Track | Mensal |
| Revisão de contas e perfis | Lista de quem tem acesso e perfil administrativo | Trimestral |

## e) Divulgação de vulnerabilidades

1. Publicar `/.well-known/security.txt` (RFC 9116), servido por HTTPS como `text/plain` UTF-8, com ao menos `Contact` (e-mail, URL ou telefone) e `Expires` (data futura; renove antes de vencer, de preferência em menos de um ano). Campos opcionais úteis: `Policy`, `Preferred-Languages`, `Acknowledgments`, `Canonical`. Vale só para o endereço onde é servido.
2. Processo interno: caixa de entrada monitorada, confirmação de recebimento em até 3 dias úteis (sugestão), triagem de gravidade, dono da correção, prazo da tabela (g), retorno a quem relatou e registro da lição aprendida. Aplicação só interna, atrás de MFA: o contato pode ser um canal interno em vez de público.

## f) Teste de intrusão

Ao menos uma vez por ano e a cada mudança grande (novo módulo, nova integração, troca de IdP, mudança de arquitetura). Escopo escrito, contratado com quem não desenvolveu a aplicação, com usuários de teste de cada perfil (testa autorização horizontal e vertical). O relatório segue o modelo de `relatorio.md`; as correções entram na tabela (g) e o reteste fecha o achado.

## g) Prazos de correção (sugestão)

| Gravidade | Prazo | Observação |
|---|---|---|
| Crítica (CVSS 9,0 a 10,0) | 7 dias | Se estiver no catálogo CISA KEV ou com EPSS alto, tratar como incidente: mitigar em 24 a 72 horas |
| Alta (7,0 a 8,9) | 30 dias | |
| Média (4,0 a 6,9) | 90 dias | |
| Baixa (0,1 a 3,9) | Próximo ciclo de manutenção | |

Priorizar combinando: CVSS (gravidade técnica), EPSS (probabilidade de exploração nos próximos 30 dias, de 0 a 1), presença no CISA KEV (exploração confirmada) e exposição do ativo. Mitigação provisória (regra no WAF, desligar a função) conta como contenção, não como correção; o prazo continua. Exceção exige justificativa, controle compensatório, dono e data (V15.1.1).

## h) Quando uma vulnerabilidade for explorada

1. Acionar o plano de resposta a incidentes da empresa; registrar horário de ciência.
2. Conter (isolar, bloquear origem, desligar função, revogar sessões e tokens, trocar segredos expostos).
3. Preservar logs e evidências antes de limpar.
4. Avaliar se houve dado pessoal: se sim, avisar de imediato o encarregado/DPO, que decide sobre comunicação à autoridade e aos titulares (ver `privacidade.md`; os prazos legais contam desde a ciência).
5. Corrigir a causa, reteste, revisão pós-incidente e ajuste de regra de detecção.

## i) Quem faz o quê

| A skill entrega | A equipe de infraestrutura/segurança opera |
|---|---|
| Passo da esteira que gera e envia o SBOM | Servidor Dependency-Track, usuários, canais de notificação |
| Plano ZAP (YAML), regras de falsos positivos | Ambiente de homologação idêntico, usuário de teste no IdP, janela de varredura |
| Biblioteca/configuração de log em JSON com o vocabulário | SIEM, retenção, proteção dos logs, regras de alerta, plantão |
| Modelo de `security.txt` e de regras de alerta | Publicação do arquivo, caixa de contato, triagem |
| Comandos e cabeçalhos esperados para conferência | Execução agendada, alerta de certificado |
| Modelo de relatório e tabela de prazos | Contratação do pentest, aprovação do SLA, exceções |

## Fontes

- https://docs.dependencytrack.org/integrations/notifications/
- https://www.zaproxy.org/docs/automate/automation-framework/
- https://www.zaproxy.org/docs/docker/baseline-scan/
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html
- https://www.rfc-editor.org/rfc/rfc9116
- https://github.com/testssl/testssl.sh
- https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- https://www.first.org/epss/
- https://www.first.org/cvss/v4-0/specification-document
