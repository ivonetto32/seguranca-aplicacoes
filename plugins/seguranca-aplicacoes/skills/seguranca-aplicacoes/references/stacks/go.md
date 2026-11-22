# Go: segurança

Aplica-se quando há `go.mod`/`go.sum`, pacotes `net/http`, `github.com/gin-gonic/gin`, `github.com/labstack/echo`, `chi`.

## Controles do framework

| Tema | Como fazer neste framework | ASVS |
|---|---|---|
| Codificação de saída | `html/template` (escape contextual automático); nunca `text/template` para HTML. Para JSON em script, passar o objeto ao template, não string JSON. | V1.2.1, V1.2.3, V3.2.2 |
| SQL / ORM | `database/sql` com placeholders (`db.Query(sql, args...)`), `sqlc`, GORM com `?`/estrutura; nunca `fmt.Sprintf` para montar SQL. | V1.2.4 |
| Validação de entrada | Decodificar em struct tipada (`json.Decoder` com `DisallowUnknownFields`), validar com `go-playground/validator`; limitar corpo com `http.MaxBytesReader`. | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | `net/http` não traz: usar biblioteca mantida (ex.: `gorilla/csrf`, middleware do Echo) ou verificação de `Origin`/`Sec-Fetch-Site`, mais `SameSite`. Métodos de mudança só com POST/PUT/PATCH/DELETE. | V3.5.1, V3.5.3 |
| Sessão / cookies | Cookie com `http.Cookie{Secure, HttpOnly, SameSite}`; sessão com ID aleatório (`crypto/rand`) em store no servidor; renovar o ID no login; invalidar no logout. | V3.3.1–V3.3.4, V7.2.3, V7.2.4, V7.4.1 |
| Autenticação OIDC/SAML | `github.com/coreos/go-oidc/v3/oidc` com `golang.org/x/oauth2` (descoberta, verificação do ID token, `nonce`, PKCE). SAML: biblioteca mantida (ex.: `crewjam/saml`) com assinatura obrigatória. | V6.8.2, V10.2.1, V10.5.1, V10.5.4 |
| Autorização | Middleware que nega por padrão (Gin/Echo/chi `Use`), checagem de papel e de dono do objeto em cada handler; nunca confiar em ID vindo do cliente. | V8.2.1, V8.2.2, V8.3.1 |
| Cabeçalhos / CSP | Middleware próprio ou pacote (ex.: `unrolled/secure`, `gin-contrib/secure`) para HSTS, CSP, `nosniff`, `frame-ancestors`, `Referrer-Policy`. | V3.4.1, V3.4.3–V3.4.6 |
| Upload de arquivo | `r.ParseMultipartForm` com limite e `MaxBytesReader`; `http.DetectContentType`; nome gerado pelo servidor; `filepath.Base`/`filepath.IsLocal` contra path traversal; gravar fora da raiz servida. | V5.2.1, V5.2.2, V5.3.2, V5.4.1 |
| Desserialização | `encoding/json` tipado; `encoding/gob` só entre partes confiáveis; XML (`encoding/xml` não resolve entidades externas, mas limitar tamanho); YAML com tipos fixos. | V1.5.1, V1.5.2 |
| Segredos / config | Variáveis de ambiente ou cofre; nada em código/`.env` versionado; `crypto/rand` (nunca `math/rand`) para tokens. | V13.3.1, V11.5.1 |
| Logging | `log/slog` estruturado; sem credenciais/PII; sanitizar quebra de linha de dado externo. | V16.2.5, V16.3.1, V16.4.1 |
| Erros / depuração | Tratar todo `error`; resposta genérica ao cliente e detalhe só no log; `recover` em middleware; desligar `pprof` e `expvar` em produção; `gin.SetMode(gin.ReleaseMode)`. | V16.5.1, V13.4.2, V13.4.5 |

## Armadilhas comuns

- `text/template` para gerar HTML; uso de `template.HTML`, `template.JS`, `template.URL` com dado externo (desliga o escape).
- `fmt.Sprintf` para SQL; `exec.Command("sh", "-c", ...)` com dado externo (usar `exec.Command(cmd, args...)` sem shell).
- `http.Client`/`http.Get` com URL do usuário sem lista de destinos (SSRF) ou com `InsecureSkipVerify: true`.
- `http.ListenAndServe` sem timeouts (`http.Server{ReadHeaderTimeout, ...}`): negação de serviço por conexão lenta.
- `math/rand` para token; comparação de segredo com `==` (usar `subtle.ConstantTimeCompare`).
- `http.ServeFile`/`os.Open` com caminho montado com dado externo; `filepath.Join` não impede `..` sozinho.
- Condições de corrida em estado compartilhado (mapas, sessões): usar mutex e rodar o detector de corridas.
- `net/http/pprof` importado em binário exposto.

## Ferramentas

- SAST: Semgrep com conjuntos de regras de Go; `gosec` (`gosec ./...`, análise AST/SSA e fluxo de dados); `go vet ./...`.
- Dependências: `govulncheck ./...` (reporta só falhas que o código alcança); `go test -race ./...`; fuzzing nativo (`go test -fuzz`) para parsers; SBOM com CycloneDX/`syft`.

## Fontes

- https://go.dev/doc/security/best-practices
- https://pkg.go.dev/html/template
- https://github.com/coreos/go-oidc
- https://github.com/securego/gosec
- https://github.com/semgrep/semgrep-rules
