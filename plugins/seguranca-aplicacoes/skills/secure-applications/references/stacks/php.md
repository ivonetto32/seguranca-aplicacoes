# PHP: security

Applies when there is `composer.json`/`composer.lock`, `artisan` and `app/Http` (Laravel), `symfony.lock`, `config/packages/security.yaml` (Symfony) or loose `.php` files.

## Framework controls

| Topic | How to do it in this framework | ASVS |
|---|---|---|
| Output encoding | Laravel Blade `{{ }}` and Twig (`{{ }}`) escape; avoid `{!! !!}` and `|raw` with external data. Outside templates: `htmlspecialchars($s, ENT_QUOTES)`. | V1.2.1, V1.2.3, V3.2.2 |
| SQL / ORM | Eloquent/Query Builder and Doctrine (DQL with parameters) parameterize; PDO with `prepare` and `bindValue`. Beware of `DB::raw`, `whereRaw`, `orderByRaw` and concatenated DQL. | V1.2.4 |
| Input validation | Laravel: Form Requests (`rules()`); Symfony: Validator component with constraints on DTOs. Use `$request->validated()`; define `$fillable` (Eloquent) to avoid mass assignment. | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | Laravel: `ValidateCsrfToken` middleware in the `web` group (`@csrf` in forms; SPA with Sanctum); exclude routes only when indispensable (e.g. signed webhook). Symfony: `enable_csrf` in `form_login`, `csrf_token()` in forms. | V3.5.1, V3.5.3 |
| Session / cookies | Laravel: `config/session.php` with `secure`, `http_only`, `same_site`, `lifetime`; `session()->regenerate()` at login and `invalidate()` at logout. Symfony: `framework.session.cookie_*`; the firewall changes the ID at login. | V3.3.1–V3.3.4, V7.2.4, V7.4.1 |
| OIDC/SAML authentication | Laravel: Socialite (OAuth/OIDC, with community providers) or a maintained SAML package; Sanctum for SPA/API. Symfony: the `oidc`/`oidc_user_info` token handler of `access_token`; SAML via a third-party bundle/library or the provider in front. Require validation of signature, `iss`, `aud`. | V6.8.2, V10.2.1, V10.5.4 |
| Authorization | Laravel: Gates and Policies (`$this->authorize`, `can:` middleware); Symfony: `access_control`, `#[IsGranted]` and Voters for per-object decisions. Deny by default and check the object's owner in every action. | V8.2.1, V8.2.2, V8.3.1 |
| Headers / CSP | Your own middleware or a package (e.g. spatie/laravel-csp, NelmioSecurityBundle) for CSP, HSTS, `nosniff`, `Referrer-Policy`; hide `X-Powered-By` (`expose_php=Off`). | V3.4.1, V3.4.3–V3.4.6 |
| File upload | Validate size, extension and content (`mimes`/`File` constraint); generated name; store outside `public/` or in a folder without PHP execution. | V5.2.1, V5.2.2, V5.3.1, V5.3.2 |
| Deserialization | Do not use `unserialize()` with external data (if unavoidable, `allowed_classes => false`); JSON with `json_decode` and validation. Beware of gadget chains in libraries and of `phar://`. | V1.5.2 |
| Secrets / config | `.env` outside Git and the public directory; Laravel `config:cache` in production; Symfony Secrets/vault. `APP_KEY` and `APP_SECRET` unique per environment. | V13.3.1, V13.3.2 |
| Logging | Monolog (Laravel/Symfony) with a structured format, no credentials or PII; separate channel for security. | V16.2.5, V16.3.1, V16.4.1 |
| Errors / debugging | `APP_DEBUG=false` (Laravel), `APP_ENV=prod` (Symfony); `display_errors=Off`; turn off Telescope, Debugbar and the profiler in production. | V13.4.2, V16.5.1, V13.4.5 |

## Common pitfalls

- `unserialize($_COOKIE[...])` or external data; `phar://` and file functions with a user path.
- `eval`, `assert` with a string, `preg_replace` with `/e`, `include`/`require` with a variable path (local/remote file inclusion).
- `exec`, `system`, `shell_exec`, `passthru`, backticks with external arguments (use `escapeshellarg` or avoid).
- `{!! $x !!}` in Blade, `|raw` in Twig, `echo $_GET[...]` directly.
- `DB::raw`/`whereRaw`/`orderByRaw` with concatenation; `$guarded = []` in the Eloquent model.
- Loose comparison (`==`) on tokens and passwords (type juggling): use `hash_equals` and `===`.
- `APP_DEBUG=true` in production (exposes environment variables on the error page); `.git` folder and `.env` reachable through the web server.
- Uploads in a folder with PHP execution enabled.

## Tools

- SAST: Semgrep with PHP rule sets (and Laravel/Symfony); PHPStan/Larastan for type errors that become flaws.
- Dependencies: `composer audit` (queries Packagist advisories, flags abandoned packages; exits with code 1 if it finds a problem; `--locked` in the pipeline); SBOM with CycloneDX.

## Sources

- https://laravel.com/docs/12.x/csrf
- https://symfony.com/doc/current/security.html
- https://symfony.com/doc/current/security/access_token.html
- https://getcomposer.org/doc/03-cli.md#audit
- https://github.com/semgrep/semgrep-rules
