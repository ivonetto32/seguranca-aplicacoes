# Ruby: segurança

Aplica-se quando há `Gemfile`/`Gemfile.lock`, `config/application.rb`, `config/routes.rb` (Rails); Sinatra/Rack quando o `Gemfile` os cita.

## Controles do framework

| Tema | Como fazer neste framework | ASVS |
|---|---|---|
| Codificação de saída | ERB escapa por padrão; evitar `raw`, `html_safe`, `<%==`. Para HTML rico, `sanitize` com lista de tags permitidas. | V1.2.1, V1.3.1, V3.2.2 |
| SQL / ORM | ActiveRecord com hash (`where(id: x)`) ou placeholders (`where("a = ?", x)`); nunca interpolar `#{}` em `where`, `order`, `pluck`, `find_by_sql`. | V1.2.4 |
| Validação de entrada | Strong parameters (`params.require(...).permit(...)`) contra mass assignment; validações no modelo (`validates`) e no formulário/serviço; validar também `params` de ordenação e filtros. | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | `protect_from_forgery` (em Rails, `ActionController::Base` já traz); token via `csrf_meta_tags`; Turbo envia `X-CSRF-Token`. Em API só com token no cabeçalho, desligar CSRF deliberadamente e documentar. | V3.5.1, V3.5.3 |
| Sessão / cookies | Cookie de sessão cifrado por padrão; `reset_session` após o login (fixação); `config.force_ssl = true` (também envia HSTS); expiração no servidor (ex.: varrer sessões antigas ou usar store em banco/Redis). | V3.3.1–V3.3.4, V7.2.4, V7.3.1 |
| Autenticação OIDC/SAML | OmniAuth com `omniauth_openid_connect` (OIDC) e `omniauth-saml` (SAML, informar `idp_cert` completo em vez de só o fingerprint SHA1). Devise para sessão local, se houver. | V6.8.2, V10.5.1, V10.5.4 |
| Autorização | Pundit ou CanCanCan; `before_action` global exigindo autenticação e `after_action :verify_authorized`; buscar objetos pelo escopo do usuário (`current_user.pedidos.find(id)`). | V8.2.1, V8.2.2, V8.3.1 |
| Cabeçalhos / CSP | `config/initializers/content_security_policy.rb` com nonce (sem `'unsafe-inline'`), começar em modo só-relatório; `default_headers` do Rails (`X-Content-Type-Options` etc.); `frame-ancestors`. | V3.4.1, V3.4.3–V3.4.6 |
| Upload de arquivo | Active Storage com validação de tipo e tamanho (por conteúdo, não só extensão); nome do arquivo por lista de caracteres permitidos; nunca gravar em `public/`; processar mídia fora da requisição. | V5.2.1, V5.2.2, V5.3.2, V5.4.1 |
| Desserialização | Não usar `Marshal.load` nem `YAML.load` com dado externo (usar `YAML.safe_load` com classes permitidas); JSON com `JSON.parse` sem `create_additions`. | V1.5.2 |
| Segredos / config | `config/credentials.yml.enc` (a chave `master.key` fora do Git); `secret_key_base` exclusivo por ambiente; em vazamento, rotacionar. | V13.3.1, V13.3.2 |
| Logging | `config.filter_parameters` para senha, token, documentos; log estruturado; nível `info` ou acima em produção. | V16.2.5, V16.3.1, V16.4.1 |
| Erros / depuração | `consider_all_requests_local = false` em produção; páginas 404/500 estáticas; `config.hosts` definido; desligar `web-console` e `better_errors` fora de desenvolvimento. | V13.4.2, V16.5.1 |

## Armadilhas comuns

- `html_safe`, `raw`, `<%==` e `sanitize` com `tags` amplas aplicados a dado do usuário.
- Interpolação em SQL: `where("nome = '#{params[:n]}'")`, `order(params[:sort])`, `pluck(params[:col])`.
- `permit!` em strong parameters e `params.to_unsafe_h`.
- `redirect_to params[:url]` (redirecionamento aberto); `render params[:tpl]` e `send_file params[:path]`.
- `Kernel#open`, `system`, crases e `%x` com dado externo (um `|` inicial executa comando); preferir `File.open` e `system("cmd", arg)`.
- `Marshal.load`, `YAML.load`, `eval`, `constantize`/`send`/`public_send` com nome vindo do cliente.
- `skip_before_action :verify_authenticity_token` sem motivo; `skip_forgery_protection` em controlador com cookie.
- Gem fonte `http://`/`git://` e gems abandonadas.

## Ferramentas

- SAST: Brakeman (`brakeman` na raiz da aplicação Rails; análise estática específica de Rails); Semgrep com conjuntos de regras de Ruby.
- Dependências: `bundler-audit` (`bundle-audit check --update`, usa a base ruby-advisory-db e acusa fontes inseguras); SBOM com CycloneDX.

## Fontes

- https://guides.rubyonrails.org/security.html
- https://github.com/presidentbeef/brakeman
- https://github.com/rubysec/bundler-audit
- https://github.com/omniauth/omniauth-saml
- https://github.com/semgrep/semgrep-rules
