# Infraestrutura: contêiner, Kubernetes, TLS, cabeçalhos, proxy e dados

Fica fora da aplicação, mas é onde muitas falhas nascem. Itens com "(equipe de infraestrutura)" dependem de quem opera a plataforma: a skill entrega o arquivo ou a configuração, a equipe aplica. ASVS: V12, V13, V3.4, V14, V15.

## 1. Contêiner

- **Usuário não root** (`USER` numérico no Dockerfile) e `no-new-privileges`; descarte todas as *capabilities* do Linux e adicione só as necessárias; nunca `--privileged`; nunca exponha o socket do Docker.
- **Imagem base mínima** (distroless, Alpine ou slim) e **fixada por versão ou digest**; build em múltiplos estágios, sem compiladores nem ferramentas de depuração na imagem final (V15.2.3). Isso inclui os gerenciadores de pacotes que vêm na imagem oficial da linguagem (npm, yarn, corepack, pip): eles trazem dependências próprias, muitas vezes com falhas conhecidas, e o Trivy reprova a imagem por causa delas. Instale as dependências na etapa de construção e, na final, copie só o resultado e remova essas ferramentas (ou use distroless).
- **Sistema de arquivos somente leitura**, com `tmpfs`/`emptyDir` só nos caminhos que precisam de escrita.
- **Sem segredos na imagem**: nada em `ARG`, `ENV`, `COPY` nem em camadas; segredo de build por mount de segredo do BuildKit, segredo de execução injetado em tempo de execução (V13.3.1). Sem `.git` na imagem (V13.4.1).
- **Varredura** da imagem, do Dockerfile e de segredos na esteira (Trivy, Grype ou equivalente), barrando achado crítico/alto; gere o SBOM da imagem (V15.1.2). Reconstrua a imagem periodicamente para pegar correção da base.
- Limites de memória, CPU, processos e reinícios; perfis padrão de seccomp/AppArmor/SELinux mantidos.
- `HEALTHCHECK`/endpoints de saúde sem dados internos e sem exposição pública (V13.4.5). Depuração desligada (V13.4.2).

## 2. Kubernetes (equipe de infraestrutura)

- **Pod Security Standards perfil `restricted`** aplicado por Pod Security Admission por namespace (`enforce`). Exige, entre outros: `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `capabilities.drop: ["ALL"]`, `seccompProfile: RuntimeDefault`, sem `hostPath`, sem `hostNetwork`.
- Exemplo mínimo de `securityContext` (pod e contêiner):

```yaml
securityContext:            # pod
  runAsNonRoot: true
  seccompProfile: { type: RuntimeDefault }
containers:
- securityContext:          # contêiner
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    capabilities: { drop: ["ALL"] }
```

- **NetworkPolicy:** comece com negação total de entrada e saída por namespace e libere só o necessário (proxy para a aplicação; aplicação para banco, IdP, SIEM e serviços externos permitidos). Por padrão os pods não são isolados. As políticas só funcionam com plugin de rede que as aplique (por exemplo Calico, Cilium) e são aditivas. Isso também sustenta "aplicação inalcançável fora do proxy" (`references/identidade-mfa.md`, seção 3) e a lista permitida de destinos (V13.2.4, V13.2.5).
- **Segredos:** Secret é só base64; ative **cifragem em repouso** no etcd ou use cofre externo (Secrets Store CSI Driver). Monte como volume somente leitura, não como variável de ambiente; não versione manifesto com segredo. Aplique RBAC de menor privilégio: `list` e `watch` em Secrets também revelam o conteúdo (V13.3.1, V13.3.2).
- **RBAC:** uma conta de serviço por aplicação, sem papéis amplos; `automountServiceAccountToken: false` quando a aplicação não fala com a API do cluster; sem `cluster-admin` para cargas de trabalho.
- Imagens só de registro confiável e aprovado; `ResourceQuota`/`LimitRange`; log de auditoria do cluster enviado para fora dele; versões do cluster e dos nós suportadas e com correções.

## 3. Infraestrutura como código (IaC)

- Versione Terraform, Helm, manifestos e Dockerfiles junto ao código; mudança passa por revisão e pela esteira.
- **Varredura** na esteira (Checkov, tfsec/Trivy config, kube-linter ou equivalente) barrando configuração insegura; varredura de segredos (gitleaks, trufflehog) em cada commit.
- Política como código (OPA/Gatekeeper ou Kyverno) para reforçar no cluster o que a varredura exige.
- Quem pode aplicar IaC é limitado, e as permissões que o IaC concede aos recursos são mínimas. Segredo nunca no estado em texto claro sem proteção: use backend de estado cifrado.

## 4. TLS (V12)

- **Versões:** TLS 1.3 preferido e TLS 1.2 como compatibilidade; desative SSLv3, TLS 1.0 e 1.1 (V12.1.1). Suítes: AEAD (AES-GCM, ChaCha20-Poly1305); em 1.2, ECDHE; sem CBC, RC4, 3DES, export, anônimas ou RSA estático (V12.1.2).
- **Configuração de referência:** gere pela ferramenta de configuração de TLS da Mozilla (hoje mantida como TLSRef Configurator) com o perfil **"intermediate"**, para o seu servidor (nginx, Apache, HAProxy etc.). Use o perfil "modern" só se todos os clientes suportarem apenas TLS 1.3. Revise a saída a cada ano.
- **Certificados** publicamente confiáveis ou de CA interna confiável, com SHA-256, chave RSA de pelo menos 2048 bits ou ECDSA, FQDN em SAN, curinga só quando necessário, restrição de CA por registro **CAA** (V12.2.2, V12.3.4).
- **Automatize** emissão e renovação (ACME, por exemplo Certbot ou cert-manager); certificados de 90 dias renovam por volta do 60º dia, em horário aleatório. Monitore a validade com alerta.
- **TLS também entre serviços internos** (aplicação, banco, cache, fila, SIEM) com validação do certificado, sem retorno a texto claro (V12.3.1 a V12.3.3). HTTP redirecionado a HTTPS só em endpoints para usuário (V4.1.2). WebSocket sempre `wss` (V4.4.1).
- Chaves privadas com permissão restrita e política de ciclo de vida (V11.1.1).

## 5. Cabeçalhos de segurança (aplicação ou proxy)

| Cabeçalho | Valor recomendado | ASVS |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (acrescente `preload` só após ler os requisitos de pré-carga: erro de certificado trava os usuários) | V3.4.1 |
| `Content-Security-Policy` | Estrita, com nonce por resposta: `script-src 'nonce-{aleatório}' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'` (acrescente `report-to`). Sem `unsafe-inline`/`unsafe-eval`. Enviada por cabeçalho, não por `<meta>` | V3.4.3, V3.4.6 |
| `frame-ancestors` (na CSP) | `'none'`, ou `'self'` / lista explícita se houver incorporação legítima. `X-Frame-Options: DENY` só como reforço em navegador antigo | V3.4.6 |
| `X-Content-Type-Options` | `nosniff` (com `Content-Type` correto em toda resposta) | V3.4.4, V4.1.1 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` (ou `no-referrer` se nada depender dele) | V3.4.5 |
| `Permissions-Policy` | `geolocation=(), camera=(), microphone=()` e o que mais a aplicação não usar | reforço (sem ID próprio) |
| `Cache-Control` | `no-store` em respostas com dados sensíveis | V14.3.2 |
| `Cross-Origin-Opener-Policy` | `same-origin` | reforço |
| `Access-Control-Allow-Origin` | Fixo ou validado contra lista; nunca `*` com credenciais | V3.4.2 |
| `X-XSS-Protection` | Não definir (ou `0`); a defesa é a CSP | n/a |
| `Server` / versões | Remover ou neutralizar; TRACE desabilitado; listagem de diretório desligada | V13.4.3, V13.4.4 |

Teste os cabeçalhos na esteira (DAST) e periodicamente em produção (`references/producao.md`).

## 6. Proxy reverso e WAF (camada extra, não substituta)

- Proxy reverso termina TLS, remove cabeçalhos de identidade do cliente, define os de segurança, limita tamanho de requisição e delimita mensagens HTTP de modo consistente com a aplicação (V4.1.3, V4.2.1).
- **WAF** (ModSecurity ou Coraza com o **OWASP Core Rule Set**) reduz ruído e ataques conhecidos, mas **não** conserta aplicação vulnerável: o código continua obrigado a validar, autorizar e codificar. O CRS pontua anomalias por transação e bloqueia ao atingir o limite (padrão de entrada: 5). Comece com limites altos para observar falsos positivos, ajuste exceções e só então baixe o limite.
- **Limitação de taxa** no proxy e na aplicação: por IP, por usuário e por rota (login, busca, exportação, API), com resposta 429 e registro (V2.4.1, V6.1.1).

## 7. Backups e restauração

- Backups automáticos, **cifrados**, com permissão restrita e cópia fora do domínio de falha (outra conta/local); retenção definida conforme a classificação do dado (V14.1.2).
- **Teste de restauração** periódico e documentado, medindo o tempo real (RTO) e a perda possível (RPO); backup nunca testado não conta.
- Backup de banco com RLS exige papel apropriado (`row_security` desligado faz o backup falhar em vez de omitir linhas em silêncio).

## 8. Banco de dados: menor privilégio (V13.2.2)

- Conta própria por aplicação e por ambiente; **não** use dono do esquema, superusuário nem administrador embutido na aplicação. Migrações rodam com conta separada da de execução.
- Permissões só no necessário (SELECT/INSERT/UPDATE/DELETE nas tabelas usadas); sem DDL em produção pela conta da aplicação.
- Banco em rede interna, com origem restrita ao(s) pod(s) da aplicação; conexão cifrada com verificação do certificado do servidor; contas e bancos de exemplo removidos; serviço rodando sem privilégio; credencial no cofre, com rotação (V13.2.3, V13.3.1).

## Fontes

- OWASP Docker Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
- OWASP Kubernetes Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Kubernetes_Security_Cheat_Sheet.html
- Kubernetes, Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes, Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes, boas práticas para Secrets: https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- OWASP Infrastructure as Code Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Infrastructure_as_Code_Security_Cheat_Sheet.html
- OWASP Transport Layer Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html
- Mozilla SSL Configuration Generator (migrado para o TLSRef): https://ssl-config.mozilla.org/ e https://docs.tlsref.org/
- RFC 9325, recomendações para TLS: https://www.rfc-editor.org/rfc/rfc9325.html
- Let's Encrypt, FAQ (validade e renovação): https://letsencrypt.org/docs/faq/
- OWASP HTTP Headers Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- OWASP Content Security Policy Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- OWASP CRS, pontuação de anomalias: https://coreruleset.org/docs/2-how-crs-works/2-1-anomaly_scoring/
- Coraza e CRS: https://coraza.io/docs/tutorials/coreruleset/
- OWASP Database Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html
- PostgreSQL, Row Security Policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- OWASP ASVS 5.0.0: https://github.com/OWASP/ASVS/tree/master/5.0
