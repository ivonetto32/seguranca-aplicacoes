# Front-end SPA: segurança

Aplica-se quando há `package.json` com `react`, `@angular/core` ou `vue`, `vite.config.*`, `angular.json`, `src/App.*`. A SPA roda no navegador do usuário: nada nela é segredo nem controle de acesso. O servidor/API (ver `node.md` ou a stack do back-end) decide.

## Controles do framework

| Tema | Como fazer neste framework | ASVS |
|---|---|---|
| Codificação de saída | React (`{x}`), Vue (`{{ }}`) e Angular (interpolação) escapam por padrão; Angular ainda sanitiza HTML e URL. Nunca montar HTML por concatenação. Texto por `textContent`. | V1.2.1, V3.2.2 |
| HTML não confiável | Se for preciso renderizar HTML do usuário, sanitizar com biblioteca reconhecida (DOMPurify) antes; manter sanitização separada da execução de script. | V1.3.1, V1.3.5 |
| SQL / ORM | Não se aplica no navegador; garantir que a API parametrize (ver stack do back-end). Nada de consulta montada no cliente. | V1.2.4 |
| Validação de entrada | Validação no cliente é só ergonomia (Zod, Yup, validadores do Angular/Vue); a validação que vale é a do servidor. | V2.2.2 |
| CSRF | Se a API usa cookie de sessão, exigir token: o `HttpClient` do Angular lê `XSRF-TOKEN` e envia `X-XSRF-TOKEN` em requisições mutáveis (o servidor precisa emitir e verificar); em React/Vue, fazer o mesmo no cliente HTTP (axios, fetch). Com bearer em cabeçalho, o risco de CSRF cai, mas cresce o de roubo de token por XSS. | V3.5.1, V3.5.3 |
| Sessão / tokens | Preferir o padrão BFF: o back-end faz OIDC e guarda os tokens, a SPA recebe só um cookie `HttpOnly` + `Secure` + `SameSite`. Evitar tokens em `localStorage`/`sessionStorage`/IndexedDB. | V3.3.4, V14.3.3, V10.1.1 |
| Autenticação OIDC/SAML | Se não houver BFF: fluxo de código com PKCE e cliente público em biblioteca mantida (ex.: `oidc-client-ts`, `angular-auth-oidc-client`); sem fluxo implícito; validar `state`/`nonce`. SAML fica sempre no servidor. | V10.2.1, V10.4.4, V10.4.6, V10.5.1 |
| Autorização | Rotas protegidas no cliente (guards, `ProtectedRoute`) servem só para a experiência; a decisão real e a checagem por objeto ficam na API. Esconder botão não protege. | V8.3.1, V8.2.2 |
| Cabeçalhos / CSP | Servir a SPA com CSP restritiva (sem `unsafe-inline`/`unsafe-eval`; nonce ou hash), HSTS, `nosniff`, `frame-ancestors`, `Referrer-Policy`. Angular: `CSP_NONCE`/`ngCspNonce`; Trusted Types como camada extra. | V3.4.1, V3.4.3–V3.4.6 |
| Upload de arquivo | Validação de tipo/tamanho no cliente só orienta; o servidor valida. Exibir arquivo enviado por outros só com tipo conferido (SVG pode conter script). | V5.2.2, V1.3.4 |
| Desserialização | `JSON.parse`, nunca `eval`; tratar resposta da API como dado, validar formato antes de usar; cuidado com `postMessage` (checar `origin`). | V1.3.2, V3.5.5 |
| Segredos / config | Todo `VITE_*`, `REACT_APP_*`, `NEXT_PUBLIC_*`, `environment.ts` vai para o navegador: nunca chave de API privada, segredo de cliente ou credencial. | V13.3.1 |
| Logging | Não registrar token, senha ou PII em `console` nem em ferramenta de telemetria; mapa de código-fonte (source maps) fora de produção ou restritos. | V16.2.5, V14.2.3 |
| Erros / depuração | Mensagem genérica ao usuário; sem stack na tela; ferramentas de desenvolvimento (React DevTools hooks, Vue devtools) e modo dev desligados no build de produção. | V16.5.1, V13.4.2 |

## Armadilhas comuns

- React: `dangerouslySetInnerHTML`; `href`/`src` com valor do usuário (`javascript:`); `ref.current.innerHTML`.
- Vue: `v-html` com dado externo; template em runtime compilado a partir de entrada do usuário.
- Angular: `bypassSecurityTrustHtml/Url/Script/ResourceUrl` sem revisar o valor; acesso direto ao DOM (`ElementRef.nativeElement.innerHTML`).
- `eval`, `new Function`, `setTimeout("...")`, `document.write`, `innerHTML` e `outerHTML` com dado externo.
- Token de acesso/refresh em `localStorage` (um XSS o rouba) e em URL/query string.
- `window.postMessage` com `"*"` ou sem checar `event.origin`; `target="_blank"` sem `rel="noopener"`.
- Dependência npm com script de instalação malicioso ou CDN sem versão e SRI.
- Achar que "rota protegida" ou variável de ambiente do front-end é controle de segurança.

## Ferramentas

- SAST: Semgrep com conjuntos de regras de JavaScript/TypeScript e React; `eslint-plugin-security` mais as regras do framework (`eslint-plugin-react`, `@angular-eslint`, `eslint-plugin-vue`) — triar falsos positivos.
- Dependências: `npm audit` (ou `pnpm`/`yarn`), lockfile com `npm ci`, SBOM com CycloneDX; SRI em scripts de CDN.

## Fontes

- https://angular.dev/best-practices/security
- https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
- https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-oidc-web-authentication (seção sobre BFF)
- https://github.com/eslint-community/eslint-plugin-security
- https://github.com/semgrep/semgrep-rules
