# PHP: segurança

Aplica-se quando há `composer.json`/`composer.lock`, `artisan` e `app/Http` (Laravel), `symfony.lock`, `config/packages/security.yaml` (Symfony) ou arquivos `.php` soltos.

## Controles do framework

| Tema | Como fazer neste framework | ASVS |
|---|---|---|
| Codificação de saída | Laravel Blade `{{ }}` e Twig (`{{ }}`) escapam; evitar `{!! !!}` e `|raw` com dado externo. Fora de template: `htmlspecialchars($s, ENT_QUOTES)`. | V1.2.1, V1.2.3, V3.2.2 |
| SQL / ORM | Eloquent/Query Builder e Doctrine (DQL com parâmetros) parametrizam; PDO com `prepare` e `bindValue`. Cuidado com `DB::raw`, `whereRaw`, `orderByRaw` e DQL concatenado. | V1.2.4 |
| Validação de entrada | Laravel: Form Requests (`rules()`); Symfony: componente Validator com constraints em DTOs. Usar `$request->validated()`; definir `$fillable` (Eloquent) para evitar mass assignment. | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | Laravel: middleware `ValidateCsrfToken` no grupo `web` (`@csrf` nos formulários; SPA com Sanctum); excluir rotas só quando indispensável (ex.: webhook assinado). Symfony: `enable_csrf` no `form_login`, `csrf_token()` nos formulários. | V3.5.1, V3.5.3 |
| Sessão / cookies | Laravel: `config/session.php` com `secure`, `http_only`, `same_site`, `lifetime`; `session()->regenerate()` no login e `invalidate()` no logout. Symfony: `framework.session.cookie_*`; o firewall troca o ID no login. | V3.3.1–V3.3.4, V7.2.4, V7.4.1 |
| Autenticação OIDC/SAML | Laravel: Socialite (OAuth/OIDC, com provedores da comunidade) ou pacote SAML mantido; Sanctum para SPA/API. Symfony: handler de token `oidc`/`oidc_user_info` do `access_token`; SAML por bundle/biblioteca de terceiros ou provedor à frente. Exigir validação de assinatura, `iss`, `aud`. | V6.8.2, V10.2.1, V10.5.4 |
| Autorização | Laravel: Gates e Policies (`$this->authorize`, middleware `can:`); Symfony: `access_control`, `#[IsGranted]` e Voters para decisão por objeto. Negar por padrão e conferir o dono do objeto em cada ação. | V8.2.1, V8.2.2, V8.3.1 |
| Cabeçalhos / CSP | Middleware próprio ou pacote (ex.: spatie/laravel-csp, NelmioSecurityBundle) para CSP, HSTS, `nosniff`, `Referrer-Policy`; esconder `X-Powered-By` (`expose_php=Off`). | V3.4.1, V3.4.3–V3.4.6 |
| Upload de arquivo | Validar tamanho, extensão e conteúdo (`mimes`/`File` constraint); nome gerado; guardar fora de `public/` ou sem execução de PHP na pasta. | V5.2.1, V5.2.2, V5.3.1, V5.3.2 |
| Desserialização | Não usar `unserialize()` com dado externo (se inevitável, `allowed_classes => false`); JSON com `json_decode` e validação. Cuidado com cadeias de gadgets em bibliotecas e com `phar://`. | V1.5.2 |
| Segredos / config | `.env` fora do Git e do diretório público; Laravel `config:cache` em produção; Symfony Secrets/cofre. `APP_KEY` e `APP_SECRET` exclusivos por ambiente. | V13.3.1, V13.3.2 |
| Logging | Monolog (Laravel/Symfony) com formato estruturado, sem credenciais nem PII; canal separado para segurança. | V16.2.5, V16.3.1, V16.4.1 |
| Erros / depuração | `APP_DEBUG=false` (Laravel), `APP_ENV=prod` (Symfony); `display_errors=Off`; desligar Telescope, Debugbar e profiler em produção. | V13.4.2, V16.5.1, V13.4.5 |

## Armadilhas comuns

- `unserialize($_COOKIE[...])` ou dado externo; `phar://` e funções de arquivo com caminho do usuário.
- `eval`, `assert` com string, `preg_replace` com `/e`, `include`/`require` com caminho variável (inclusão de arquivo local/remoto).
- `exec`, `system`, `shell_exec`, `passthru`, crases com argumentos externos (usar `escapeshellarg` ou evitar).
- `{!! $x !!}` no Blade, `|raw` no Twig, `echo $_GET[...]` direto.
- `DB::raw`/`whereRaw`/`orderByRaw` com concatenação; `$guarded = []` no modelo Eloquent.
- Comparação frouxa (`==`) em tokens e senhas (type juggling): usar `hash_equals` e `===`.
- `APP_DEBUG=true` em produção (expõe variáveis de ambiente na página de erro); pasta `.git` e `.env` acessíveis pelo servidor web.
- Uploads em pasta com execução de PHP habilitada.

## Ferramentas

- SAST: Semgrep com conjuntos de regras de PHP (e Laravel/Symfony); PHPStan/Larastan para erros de tipo que viram falhas.
- Dependências: `composer audit` (consulta avisos do Packagist, aponta pacotes abandonados; sai com código 1 se achar problema; `--locked` na esteira); SBOM com CycloneDX.

## Fontes

- https://laravel.com/docs/12.x/csrf
- https://symfony.com/doc/current/security.html
- https://symfony.com/doc/current/security/access_token.html
- https://getcomposer.org/doc/03-cli.md#audit
- https://github.com/semgrep/semgrep-rules
