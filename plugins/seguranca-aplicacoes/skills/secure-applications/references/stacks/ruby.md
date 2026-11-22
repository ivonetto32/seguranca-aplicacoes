# Ruby: security

Applies when there is `Gemfile`/`Gemfile.lock`, `config/application.rb`, `config/routes.rb` (Rails); Sinatra/Rack when the `Gemfile` mentions them.

## Framework controls

| Topic | How to do it in this framework | ASVS |
|---|---|---|
| Output encoding | ERB escapes by default; avoid `raw`, `html_safe`, `<%==`. For rich HTML, `sanitize` with an allow list of tags. | V1.2.1, V1.3.1, V3.2.2 |
| SQL / ORM | ActiveRecord with a hash (`where(id: x)`) or placeholders (`where("a = ?", x)`); never interpolate `#{}` in `where`, `order`, `pluck`, `find_by_sql`. | V1.2.4 |
| Input validation | Strong parameters (`params.require(...).permit(...)`) against mass assignment; validations in the model (`validates`) and in the form/service; also validate sorting and filter `params`. | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | `protect_from_forgery` (in Rails, `ActionController::Base` already includes it); token via `csrf_meta_tags`; Turbo sends `X-CSRF-Token`. For an API with only a header token, turn CSRF off deliberately and document it. | V3.5.1, V3.5.3 |
| Session / cookies | Session cookie encrypted by default; `reset_session` after login (fixation); `config.force_ssl = true` (also sends HSTS); server-side expiry (e.g. sweep old sessions or use a database/Redis store). | V3.3.1–V3.3.4, V7.2.4, V7.3.1 |
| OIDC/SAML authentication | OmniAuth with `omniauth_openid_connect` (OIDC) and `omniauth-saml` (SAML, supply the full `idp_cert` instead of just the SHA1 fingerprint). Devise for local sessions, if any. | V6.8.2, V10.5.1, V10.5.4 |
| Authorization | Pundit or CanCanCan; a global `before_action` requiring authentication and `after_action :verify_authorized`; fetch objects through the user's scope (`current_user.orders.find(id)`). | V8.2.1, V8.2.2, V8.3.1 |
| Headers / CSP | `config/initializers/content_security_policy.rb` with a nonce (no `'unsafe-inline'`), starting in report-only mode; Rails `default_headers` (`X-Content-Type-Options` etc.); `frame-ancestors`. | V3.4.1, V3.4.3–V3.4.6 |
| File upload | Active Storage with type and size validation (by content, not just extension); file name by an allow list of characters; never write to `public/`; process media outside the request. | V5.2.1, V5.2.2, V5.3.2, V5.4.1 |
| Deserialization | Do not use `Marshal.load` or `YAML.load` with external data (use `YAML.safe_load` with permitted classes); JSON with `JSON.parse` without `create_additions`. | V1.5.2 |
| Secrets / config | `config/credentials.yml.enc` (the `master.key` outside Git); `secret_key_base` unique per environment; rotate on leakage. | V13.3.1, V13.3.2 |
| Logging | `config.filter_parameters` for passwords, tokens, documents; structured logging; `info` level or above in production. | V16.2.5, V16.3.1, V16.4.1 |
| Errors / debugging | `consider_all_requests_local = false` in production; static 404/500 pages; `config.hosts` defined; turn off `web-console` and `better_errors` outside development. | V13.4.2, V16.5.1 |

## Common pitfalls

- `html_safe`, `raw`, `<%==` and `sanitize` with broad `tags` applied to user data.
- Interpolation in SQL: `where("name = '#{params[:n]}'")`, `order(params[:sort])`, `pluck(params[:col])`.
- `permit!` in strong parameters and `params.to_unsafe_h`.
- `redirect_to params[:url]` (open redirect); `render params[:tpl]` and `send_file params[:path]`.
- `Kernel#open`, `system`, backticks and `%x` with external data (a leading `|` executes a command); prefer `File.open` and `system("cmd", arg)`.
- `Marshal.load`, `YAML.load`, `eval`, `constantize`/`send`/`public_send` with a name coming from the client.
- `skip_before_action :verify_authenticity_token` without a reason; `skip_forgery_protection` in a controller with cookies.
- Gem source `http://`/`git://` and abandoned gems.

## Tools

- SAST: Brakeman (`brakeman` at the root of the Rails application; Rails-specific static analysis); Semgrep with Ruby rule sets.
- Dependencies: `bundler-audit` (`bundle-audit check --update`, uses the ruby-advisory-db database and flags insecure sources); SBOM with CycloneDX.

## Sources

- https://guides.rubyonrails.org/security.html
- https://github.com/presidentbeef/brakeman
- https://github.com/rubysec/bundler-audit
- https://github.com/omniauth/omniauth-saml
- https://github.com/semgrep/semgrep-rules
