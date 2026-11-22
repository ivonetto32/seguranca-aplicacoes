# Node.js: segurança

Aplica-se quando há `package.json` com `express`, `@nestjs/*`, `fastify`, `next` (rotas de API, Server Components e Server Actions), `server.js`/`app.ts`. Front-end em navegador: ver `frontend-spa.md`.

## Controles do framework

| Tema | Como fazer neste framework | ASVS |
|---|---|---|
| Codificação de saída | Motores de template com escape ligado (EJS `<%= %>`, Handlebars `{{ }}`, Pug `#{}`); evitar saída sem escape (`<%-`, `{{{ }}}`, `!{}`). React/Next escapam por padrão. | V1.2.1, V1.2.3, V3.2.2 |
| SQL / ORM | Consultas parametrizadas (`pg`, `mysql2` com `?`/`$1`), Prisma/Sequelize/TypeORM com API de parâmetros; cuidado com `$queryRawUnsafe`, `sequelize.query` concatenado e com operadores NoSQL vindos do corpo (`{"$ne": ...}`). | V1.2.4 |
| Validação de entrada | Esquema no servidor: Zod, Joi, ajv ou `class-validator` + `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted`) no NestJS; validar `params`, `query`, corpo e cabeçalhos. | V2.2.1, V2.2.2, V15.3.3, V15.3.6 |
| CSRF | Com cookie de sessão, token anti-CSRF (NestJS: `app.enableCsrfProtection()`; Express: biblioteca mantida de token duplo) mais `SameSite`. Next.js Server Actions só aceitam POST e comparam `Origin` com `Host`; configurar `allowedOrigins` atrás de proxy. | V3.5.1, V3.5.3 |
| Sessão / cookies | `express-session` com store externo (Redis etc.), nome genérico, `secure`, `httpOnly`, `sameSite`, `rolling`/`maxAge`, `req.session.regenerate()` no login. `cookie-session` guarda tudo no cookie: sem segredos nele. | V3.3.1–V3.3.4, V7.2.4, V7.3.1 |
| Autenticação OIDC/SAML | `openid-client` (cliente certificado OIDC) ou Passport com estratégia mantida; `jose` para validar JWT (algoritmo fixo, `iss`, `aud`, `exp`). SAML: `@node-saml/passport-saml` com assinatura exigida. Next.js: Auth.js (NextAuth). | V6.8.2, V9.1.1–V9.2.3, V10.5.4 |
| Autorização | Middleware/guards (NestJS `CanActivate` + decorators de papéis) negando por padrão; em cada rota, checar dono/inquilino do objeto. Next.js: camada de acesso a dados no servidor (`server-only`) que autoriza e devolve só os campos necessários; reverificar **dentro** de cada Server Action. | V8.2.1, V8.2.2, V8.3.1, V15.3.1 |
| Cabeçalhos / CSP | `helmet` (Express/Fastify) ou `app.useSecurityHeaders()` no NestJS; ajustar CSP à aplicação; desligar `X-Powered-By`. Next.js: CSP com nonce por requisição. | V3.4.1, V3.4.3–V3.4.6 |
| Upload de arquivo | `multer`/`busboy` com `limits` de tamanho e de número de campos; nome gerado pelo servidor; checar conteúdo; fora da raiz estática. | V5.2.1, V5.2.2, V5.3.2, V5.4.1 |
| Desserialização | `JSON.parse` com validação de esquema depois; não usar `node-serialize`, `eval`, `vm` para dado externo; `yaml` em modo seguro; limitar tamanho do corpo (`express.json({limit})`). | V1.3.2, V1.5.2 |
| Segredos / config | Variáveis de ambiente ou cofre; em Next.js só o que tem prefixo `NEXT_PUBLIC_` vai ao navegador: nunca colocar segredo nele; ler `process.env` só na camada de dados. | V13.3.1, V13.3.2 |
| Logging | `pino`/`winston` estruturado, com campos sensíveis suprimidos (redact); sem token e PII. | V16.2.5, V16.3.1, V16.4.1 |
| Erros / depuração | Manipulador global de erros com resposta genérica (sem stack); `NODE_ENV=production`; tratar `unhandledRejection` sem vazar detalhes; desligar inspetor (`--inspect`). | V16.5.1, V13.4.2 |

## Armadilhas comuns

- Imagem final com o `npm` da imagem oficial `node`: ele traz dependências próprias com falhas conhecidas e reprova no Trivy. Use build em duas etapas e, na final, `RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn*` (ou imagem distroless de Node).

- `child_process.exec`/`execSync` com dado externo (usar `execFile`/`spawn` com vetor de argumentos e sem `shell: true`).
- `eval`, `new Function`, `vm.runInNewContext`, `setTimeout("string")` com dado externo.
- Poluição de protótipo: `Object.assign`/merge recursivo com objeto do usuário e chaves `__proto__`/`constructor`; preferir `Map`/`Set` e `Object.create(null)`.
- Injeção NoSQL por objeto no corpo (`req.body.user` usado direto no filtro do MongoDB).
- `res.redirect(req.query.next)` sem lista de destinos; `res.sendFile`/`fs` com caminho vindo do usuário (path traversal).
- Expressão regular montada com entrada (`new RegExp(x)`) ou vulnerável a ReDoS.
- Comparar segredos com `===` (usar `crypto.timingSafeEqual`); `Math.random` para tokens (usar `crypto.randomBytes`).
- Next.js: tratar Server Action como interna (é um POST público), passar o registro inteiro do banco a Client Component, confiar em `searchParams` para decidir permissão.

## Ferramentas

- SAST: Semgrep com conjuntos de regras de JavaScript/TypeScript e Node; `eslint-plugin-security` (gera muitos falsos positivos, triar cada achado).
- Dependências: `npm audit` (ou `pnpm audit`/`yarn npm audit`); fixar com lockfile e `npm ci`; SBOM com CycloneDX; revisar scripts de instalação.

## Fontes

- https://expressjs.com/en/advanced/best-practice-security.html
- https://nextjs.org/docs/app/guides/data-security
- https://docs.nestjs.com/security/helmet
- https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
- https://github.com/eslint-community/eslint-plugin-security
- https://github.com/semgrep/semgrep-rules
