# Identidade e MFA (delegados ao provedor de identidade)

Princípio: a aplicação **não implementa senha nem MFA**. Delega ao provedor de identidade (IdP) corporativo e apenas consome o resultado, conferindo-o. Com isso, os requisitos de credencial do ASVS (V6.2, V6.4, V6.5) são do IdP; a aplicação responde por V6.8 (asserções), V7 (sessão), V9 (tokens) e V10 (OIDC). Se existir caminho de login local (conta de emergência, API), documente-o (V6.1.3, V6.3.4) e aplique os mesmos controles.

## 1. OIDC (padrão recomendado)

- **Fluxo:** authorization code com **PKCE (S256)**, mesmo para cliente confidencial (V10.4.6, V10.2.1). Sem implicit nem password (V10.4.4). Cada cliente recebe só os grants e escopos de que precisa (V10.4.4, V10.4.11).
- **Cliente confidencial** autenticado no endpoint de token, de preferência por `private_key_jwt` ou mTLS em vez de segredo compartilhado (V10.4.10). Segredo, se houver, vai para o cofre (V13.3.1).
- **`state`** aleatório e atrelado ao navegador que iniciou o fluxo; **`nonce`** no ID Token, conferido na volta (V10.1.2, V10.5.1). Guarde o par `state`/`nonce`/`code_verifier` na sessão pré-login, nunca em URL.
- **Redirect URI:** lista pré-registrada, comparação exata de string, só HTTPS (V10.4.1). Nada de curinga nem de redirecionamento aberto (V3.7.2).
- **Validação do ID Token** (use biblioteca madura, não código próprio): assinatura pela JWKS do emissor, algoritmo de lista permitida e jamais `none` (V9.1.1, V9.1.2); chave obtida da configuração confiável, não do token (V9.1.3); `iss` igual ao esperado (V10.5.3); `aud` contém o `client_id` (V10.5.4); `exp`/`nbf` (V9.2.1); `nonce` (V10.5.1). Com mais de um IdP, valide também `iss` para evitar mix-up e não aceite o mesmo `sub` de IdPs diferentes como a mesma pessoa (V10.2.2, V6.8.1).
- **Identidade do usuário** = par (`iss`, `sub`) imutável. E-mail, nome e UPN mudam e podem ser reatribuídos: não servem de chave nem de decisão de autorização (V10.5.2, V10.3.3).
- **Access token** destinado a API: valide `aud`, escopos e tipo de token (V9.2.2, V9.2.3, V10.3.1, V10.3.2). Nunca na URL.
- **Armazenamento de tokens:** no servidor, ligados à sessão (V10.1.1). Em SPA, use o padrão **BFF** (backend for frontend): o backend é o cliente OAuth confidencial, guarda os tokens e entrega ao navegador apenas cookie de sessão `HttpOnly`; exige proteção CSRF e lista permitida de destinos do proxy. É a opção recomendada pelas diretrizes do IETF para apps de navegador com dados sensíveis. Tokens em `localStorage` ou `sessionStorage` não (V14.3.3).
- **Refresh token:** só no backend; rotação a cada uso ou vínculo ao remetente (DPoP ou mTLS) (V10.4.5); expiração absoluta mesmo com expiração deslizante (V10.4.8); revogação disponível no IdP (V10.4.9). Reuso do authorization code deve ser rejeitado (V10.4.2), com vida curta (V10.4.3).
- **Logout:** (a) *RP-initiated*: encerre a sessão local no servidor e redirecione ao `end_session_endpoint` do IdP com `id_token_hint` e `post_logout_redirect_uri` previamente registrado; (b) *back-channel*: exponha endpoint que recebe o logout token e confira assinatura, `iss`, `aud`, `iat`, `exp`, presença de `sid` ou `sub`, claim `events` de back-channel logout, **ausência de `nonce`**, e `jti` não repetido; rejeite com 400 se falhar, e limite a taxa contra logout forçado (V10.5.5, V7.6.1, V7.1.3). Nem todo IdP oferece os dois: veja a seção 5.

## 2. SAML 2.0

- **Assinatura obrigatória e verificada** na resposta ou, de preferência, na asserção que a aplicação de fato usa; rejeite o que não estiver assinado ou falhar (V6.8.2). Chave de verificação vem do metadado do IdP configurado, ignorando `KeyInfo` do documento. Exija RSA-SHA-256 ou mais forte; rejeite SHA-1.
- **XML signature wrapping:** valide o esquema com cópia local, use a biblioteca para localizar o elemento assinado (nunca `getElementsByTagName` antes de validar) e confirme que a referência da assinatura cobre a asserção consumida. Parser XML sem entidades externas (V1.5.1).
- **Condições:** `Audience` = EntityID da aplicação; `Recipient` e `Destination` = URL do ACS; `NotBefore`/`NotOnOrAfter` da asserção e da `SubjectConfirmationData` com tolerância de relógio pequena; `InResponseTo` igual ao ID do `AuthnRequest` enviado.
- **Replay:** guarde os IDs de asserção já usados até a expiração e processe cada uma uma única vez (V6.8.3). Não faça cache de mensagens SAML.
- **Biblioteca mantida** (do framework ou de projeto ativo); não escreva parser de SAML. Atualize-a como dependência crítica (V15.1.1).
- Força, método ou recência exigidos: confira `AuthnContextClassRef` e `AuthnInstant` (V6.8.4).

## 3. Identidade por proxy reverso ou cabeçalho

Aceitável (por exemplo oauth2-proxy ou gateway de autenticação), **somente se**:

1. A aplicação é **inalcançável por fora do proxy**: NetworkPolicy ou firewall permitem tráfego apenas do proxy, idealmente com mTLS entre os dois (V12.3.3, V12.1.3).
2. O proxy **remove** qualquer cabeçalho de identidade enviado pelo cliente antes de definir o seu (V4.1.3). No oauth2-proxy, mantenha o padrão que descarta esses cabeçalhos e configure `trusted_proxy_ips`: sem isso, todos os IPs são confiáveis e o cliente falsifica os cabeçalhos `X-Forwarded-*`.
3. Preferir **token assinado (JWT)** repassado pelo proxy a cabeçalho simples (`X-User`, `X-Email`). A aplicação valida assinatura, `iss`, `aud`, `exp` como na seção 1 (V9.1.x, V9.2.x). Cabeçalho em texto puro só com as condições 1 e 2 comprovadas por teste (tente chamar a aplicação direto, com cabeçalho forjado: deve falhar).
4. O IP original do cliente vem de campo confiável do proxy (V15.3.4). A autorização continua dentro da aplicação (`references/controle-acesso.md`).

## 4. Garantia de MFA e reautenticação

- O IdP diz como o usuário se autenticou. A aplicação **verifica** o que exige, em vez de presumir MFA na entrada (V6.8.4, V10.3.4): `amr` (métodos usados, valores do RFC 8176 como `mfa`, `pwd`, `hwk`), `acr` (classe de contexto atingida) e `auth_time` (instante da autenticação). Os nomes e valores variam por IdP (seção 5).
- **Ação crítica** (alterar permissões, exportar dados em massa, aprovar pagamento, mudar fator de autenticação) exige **step-up**: nova autenticação recente e de nível adequado, não apenas sessão válida (V7.5.1, V7.3.1).
  - `prompt=login` força nova autenticação; `max_age=N` limita a idade da autenticação (com `max_age`, o ID Token traz `auth_time`; `max_age=0` equivale a `prompt=login`); `acr_values` pede nível ou classe. A aplicação confere o resultado no novo token: o pedido sozinho não prova nada.
  - Após o step-up, **gere novo identificador de sessão** (V7.2.4) e registre `auth_time`/`acr` na sessão para a decisão seguinte.
- Falha em satisfazer o nível exigido (erro do IdP ou claim ausente) = acesso negado à ação, nunca "segue sem".

## 5. Notas por provedor (conferir sempre na documentação do provedor e na versão em uso)

| Provedor | Onde aparece o MFA | Step-up / acesso condicional | Logout |
|---|---|---|---|
| Microsoft Entra ID | Claim `amr` (opcional nos tokens v2.0; valores como `pwd`, `mfa`, `fido`, `hwk`; `mfa` só quando o MFA foi concluído); `acr` e `auth_time` constam no `claims_supported` do discovery; `auth_time` opcional | Autenticação por Acesso Condicional; step-up fino por *authentication context* (`acrs`, IDs C1 em diante) pedido por claims request e desafio `insufficient_claims` (exige licença P1); `prompt=login` aceito | RP-initiated: `end_session_endpoint` (GET ou POST) com `post_logout_redirect_uri`; logout front-channel. **Back-channel: não documentado**; o discovery da v2.0 anuncia só `frontchannel_logout_supported`, então não conte com receber logout token do Entra (reduza a duração da sessão e reverifique a conta em ações sensíveis) |
| Keycloak | `acr` por mapeamento ACR para nível de autenticação (LoA) no realm; o **mapeador Authentication Method Reference (AMR)** preenche o `amr` nos tokens de acesso e de ID a partir de valores de referência definidos nas execuções do fluxo de autenticação (RFC 8176) | Step-up por fluxo de autenticação condicional; o nível é pedido pelo parâmetro `claims` (`acr`) ou por `acr_values`, e o token devolve o `acr` atingido | Logout RP-initiated (`/realms/{realm}/protocol/openid-connect/logout`, `post_logout_redirect_uri` validada por cliente) e back-channel suportados: o cliente tem as opções *Backchannel logout URL* e *Backchannel logout session required* (`sid` no logout token) |
| AD FS | `amr` e `acr` no ID Token: não confirmados na documentação do AD FS lida (confira com um token de teste do seu servidor; o `amr` pode exigir regra de emissão de claims) | Método de autenticação pedido por `amr_values` ou por `resource_params` (elemento acr); `max_age` (nível de comportamento 2 ou superior); `mfa_max_age` (nível 3 ou superior; acrescenta `mfa_auth_time` ao ID Token); `prompt=login` aceito | RP-initiated: `end_session_endpoint` no discovery, com `id_token_hint` e `post_logout_redirect_uri` registrada em `RedirectUris`; logout front-channel suportado. **Back-channel: não documentado**; PKCE desde o Windows Server 2019 |
| Okta | `amr` no ID Token (ex.: `pwd`); a claim `acr` (nos tokens de acesso e de ID) informa o nível de garantia atingido; `auth_time` | `acr_values` como `urn:okta:loa:2fa:any` (e `phr`/`phrh` para resistente a phishing no Identity Engine); `max_age` (`max_age=0` força nova autenticação no Identity Engine; `max_age=1` no Classic Engine); erro `unmet_authentication_requirements` se não atendido | RP-initiated: endpoint `/logout` com `id_token_hint` e URI de redirecionamento registrada, pelo navegador. O logout único na documentação é **só front-channel** (exige o recurso *Front-channel Single Logout*); **back-channel: não documentado** |
| Ping Identity (PingFederate) | `acr` e `auth_time`: preenchidos a partir do contexto e do instante de autenticação do fluxo (`SAML_AUTHN_CTX`, `SAML_AUTHN_INSTANT`) e mapeados no contrato de política OIDC; `amr`: não confirmado na documentação lida (conferir). O PingOne não foi verificado | Políticas de autenticação e seletores; o endpoint de autorização aceita `acr_values` (em ordem de preferência), `max_age` (acima dele, o PingFederate pede nova autenticação) e `prompt` | Logout RP-initiated desde a 12.0 (`post_logout_redirect_uri` deve estar registrada no cliente); logout back-channel desde a 11.3 (*Logout Mode* do cliente = OIDC Back-Channel, com *Back-Channel Logout URI*) |
| Google Workspace | `amr` só se pedido via parâmetro `claims` (com a opção habilitada nas configurações); sem `acr`; `auth_time` também sob pedido | Sem `max_age` nem `acr_values` na página de OIDC; `prompt` aceita só `none`, `consent` e `select_account`: exigir MFA por política do Workspace (verificação em duas etapas obrigatória, conforme a ajuda do administrador) | Sem `end_session_endpoint` no discovery: encerre a sessão local; revogação de token existe, não é logout. Sem logout back-channel no discovery |

Em todos: restrinja o tenant/domínio aceito (claim `tid` no Entra; `hd` no Google, que é só indício e deve ser verificado no token, não no parâmetro de requisição). Chaves da JWKS mudam: busque do endpoint com cache e releitura periódica.

## 6. Sessão dentro da aplicação (V7)

- Identificador gerado por CSPRNG, mínimo 128 bits (V7.2.3), verificado no backend (V7.2.1); não use chave estática de API como sessão (V7.2.2).
- Cookie: `Secure`, `HttpOnly`, `SameSite=Lax` ou `Strict`, prefixo `__Host-` (sem `Domain`, `Path=/`) (V3.3.1 a V3.3.4). CSRF: token ou verificação de origem além do `SameSite` (V3.5.1, V3.5.3).
- Timeout por **inatividade** e duração **absoluta** documentados e aplicados no servidor (V7.1.1, V7.3.1, V7.3.2). Referência da OWASP: inatividade de 2 a 5 minutos em aplicação de alto valor e de 15 a 30 em baixo risco; absoluta de 4 a 8 horas em aplicação de expediente. Ajuste pelo risco e registre o desvio.
- **Rotação** do identificador no login, na reautenticação e em mudança de privilégio; descarte o anterior (V7.2.4).
- **Logout** invalida a sessão no servidor (não só apaga o cookie), em todas as páginas autenticadas, e propaga ao IdP (V7.4.1, V7.4.4). Conta desabilitada encerra todas as sessões (V7.4.2); administrador pode encerrar sessões (V7.4.5).
- Sessão só nasce de ação explícita do usuário (V7.6.2). Limpe dados autenticados do cliente ao sair (V14.3.1).

## 7. Serviço para serviço

- Preferir **client credentials** (OAuth) com cliente confidencial e escopos mínimos, ou **mTLS** com validação do certificado do cliente antes de usar a identidade (V13.2.1, V12.1.3, V10.4.11). Tokens de curta duração, `aud` validado pelo receptor (V9.2.3).
- **Sem chave estática compartilhada** entre serviços nem credenciais padrão (V13.2.3). Segredo no cofre, com acesso de menor privilégio e rotação (V13.3.1, V13.3.2).
- Conta de serviço com privilégio mínimo (V13.2.2); destinos externos em lista permitida (V13.2.4).

## Fontes

- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
- OpenID Connect Back-Channel Logout 1.0: https://openid.net/specs/openid-connect-backchannel-1_0.html
- OpenID Connect RP-Initiated Logout 1.0: https://openid.net/specs/openid-connect-rpinitiated-1_0.html
- RFC 9700, OAuth 2.0 Security BCP: https://www.rfc-editor.org/rfc/rfc9700.html
- OAuth 2.0 for Browser-Based Applications (IETF, BCP): https://datatracker.ietf.org/doc/draft-ietf-oauth-browser-based-apps/
- OWASP OAuth2 Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html
- OWASP SAML Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- oauth2-proxy, configuração: https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview
- Microsoft Entra, tokens de acesso: https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- Microsoft Entra, claims opcionais e valores de `amr`: https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference
- Microsoft Entra, authentication context (step-up): https://learn.microsoft.com/en-us/entra/identity-platform/developer-guide-conditional-access-authentication-context
- Microsoft Entra, OIDC e logout: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
- Keycloak, guia de administração: https://www.keycloak.org/docs/latest/server_admin/index.html
- Keycloak, AmrProtocolMapper: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/mappers/AmrProtocolMapper.html
- AD FS, fluxos OIDC/OAuth: https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/overview/ad-fs-openid-connect-oauth-flows-scenarios
- Okta, step-up authentication: https://developer.okta.com/docs/guides/step-up-authentication/main/
- Ping Identity (PingFederate, atributos especiais de contratos): https://docs.pingidentity.com/r/en-us/pingfederate-120/pf_special_attr_names_contracts
- Google, OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
- Microsoft Entra, documento de discovery da v2.0 (`frontchannel_logout_supported`, `end_session_endpoint`, `claims_supported`): https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration
- Keycloak, proteção de aplicações (endpoint de logout): https://www.keycloak.org/securing-apps/oidc-layers
- AD FS, logout com OpenID Connect: https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/development/ad-fs-logout-openid-connect
- AD FS, [MS-OAPX] detalhes de processamento (`amr_values`, `resource_params`, `max_age`, `mfa_max_age`): https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-oapx/a9921868-71c8-4644-95ff-cb0ab8436e5d
- PingFederate, endpoint de autorização (`acr_values`, `max_age`, `prompt`): https://docs.pingidentity.com/pingfederate/13.1/developers_reference_guide/pf_authorization_endpoint.html
- PingFederate, configuração de clientes OAuth (modo de logout, URI de logout back-channel, URIs de redirecionamento pós-logout): https://docs.pingidentity.com/pingfederate/13.0/administrators_reference_guide/pf_configuring_oauth_clients.html
- PingFederate 11.3, notas de versão (logout back-channel): https://docs.pingidentity.com/pingfederate/13.0/release_notes/pf_release_notes_113.html
- PingFederate 12.0, notas de versão (logout RP-initiated): https://docs.pingidentity.com/pingfederate/13.1/release_notes/pf_release_notes_120.html
- Okta, logout único (front-channel): https://developer.okta.com/docs/guides/single-logout/openidconnect/main/
- Okta, API de OpenID Connect e OAuth 2.0 (`amr`, `auth_time`): https://developer.okta.com/docs/reference/api/oidc/
- Google, documento de discovery: https://accounts.google.com/.well-known/openid-configuration
- Google Workspace, implantar a verificação em duas etapas: https://support.google.com/a/answer/9176657
- OWASP ASVS 5.0.0: https://github.com/OWASP/ASVS/tree/master/5.0
