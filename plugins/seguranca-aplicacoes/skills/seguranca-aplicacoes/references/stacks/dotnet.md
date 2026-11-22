# .NET: segurança

Aplica-se quando há `*.csproj`/`*.sln`, `Program.cs` com `WebApplication.CreateBuilder`, `Startup.cs`, `appsettings.json` (ASP.NET Core: Razor Pages, MVC, Web API, Minimal APIs, Blazor).

## Controles do framework

| Tema | Como fazer neste framework | ASVS |
|---|---|---|
| Codificação de saída | Razor codifica HTML por padrão; evitar `@Html.Raw` e `MarkupString` (Blazor) com dado externo. JSON via `System.Text.Json`. | V1.2.1, V1.2.3, V3.2.2 |
| SQL / ORM | Entity Framework com LINQ ou `FromSql`/`FromSqlInterpolated` (parametrizam); nunca `FromSqlRaw` com concatenação. Dapper/ADO.NET com `SqlParameter`. | V1.2.4 |
| Validação de entrada | Data annotations/FluentValidation em modelos de entrada (`[ApiController]` valida sozinho); DTOs separados das entidades; `[Bind]`/DTO contra mass assignment. | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | Antiforgery: Razor Pages valida por padrão; em MVC usar `AutoValidateAntiforgeryTokenAttribute` globalmente; em Minimal APIs com formulário, `UseAntiforgery()`; API controllers exigem opt-in (`[RequireAntiforgeryToken]`). Não usar `DisableAntiforgery` em endpoint com cookie. | V3.5.1, V3.5.3 |
| Sessão / cookies | Cookie de autenticação com `Secure`, `HttpOnly`, `SameSite`; `ExpireTimeSpan` e `SlidingExpiration`; cookie antiforgery com `SecurePolicy = Always` fora de desenvolvimento. | V3.3.1–V3.3.4, V7.3.1, V7.3.2 |
| Autenticação OIDC/SAML | `Microsoft.AspNetCore.Authentication.OpenIdConnect` com fluxo de código + PKCE e cliente confidencial, cookie para a sessão; com Entra ID, `Microsoft.Identity.Web`. SAML: biblioteca mantida e auditada (ex.: Sustainsys.Saml2) ou o provedor na frente. | V10.2.1, V10.4.6, V10.5.4, V6.8.2 |
| Autorização | `[Authorize]` com políticas; política de fallback exigindo usuário autenticado em tudo e `[AllowAnonymous]` só nas exceções; checar o objeto com `IAuthorizationService` (autorização baseada em recurso). | V8.2.1, V8.2.2, V8.3.1 |
| Cabeçalhos / CSP | `UseHsts()` e `UseHttpsRedirection()`; CSP, `nosniff`, `Referrer-Policy` e `frame-ancestors` por middleware próprio ou pacote mantido (ex.: NWebsec/NetEscapades.AspNetCore.SecurityHeaders). | V3.4.1, V3.4.3–V3.4.6 |
| Upload de arquivo | `IFormFile`: limitar tamanho (`RequestSizeLimit`, `FormOptions`), ignorar `FileName` e gerar nome próprio, conferir conteúdo, gravar fora da raiz web. | V5.2.1, V5.2.2, V5.3.2, V5.4.1 |
| Desserialização | Proibido `BinaryFormatter` (em .NET 9 em diante lança exceção), `SoapFormatter`, `NetDataContractSerializer`, `LosFormatter`. Usar `System.Text.Json`, `XmlSerializer` ou `DataContractSerializer`. | V1.5.2 |
| Segredos / config | Secret Manager só em desenvolvimento; em produção, cofre de chaves ou identidade gerenciada; não deixar string de conexão em `appsettings.json` versionado. Data Protection com chaves persistidas e protegidas. | V13.3.1, V13.3.2 |
| Logging | `ILogger` com log estruturado; PII não é registrada por padrão e `IdentityModelEventSource.ShowPII` fica desligado em produção. | V16.2.5, V16.3.1, V16.4.1 |
| Erros / depuração | `UseExceptionHandler` e `ProblemDetails` em produção; `UseDeveloperExceptionPage` só em Development; Swagger e endpoints de saúde restritos. | V16.5.1, V13.4.2, V13.4.5 |

## Armadilhas comuns

- `BinaryFormatter` e demais formatadores polimórficos com dado externo.
- `FromSqlRaw`/`ExecuteSqlRaw` com `$"..."` ou `+` (interpolação em `Raw` não parametriza).
- `@Html.Raw`, `MarkupString`, `HtmlString` com dado do usuário.
- `[IgnoreAntiforgeryToken]`/`DisableAntiforgery()` em ação que usa cookie de sessão.
- `ValidateIssuer = false`/`ValidateAudience = false` em `TokenValidationParameters`.
- `Redirect(returnUrl)` sem `Url.IsLocalUrl` (redirecionamento aberto).
- `Process.Start` ou `Assembly.Load` com dado externo; `XmlDocument` sem `XmlResolver = null`.
- Segredos em variável de ambiente de produção sem proteção adicional (a documentação oficial não recomenda).

## Ferramentas

- SAST: Semgrep com conjuntos de regras de C#; analisadores Roslyn (`Microsoft.CodeAnalysis.NetAnalyzers` com regras de segurança CA3xxx/CA5xxx); Security Code Scan (analisador Roslyn, conferir se a versão atual cobre o SDK usado); CodeQL quando disponível.
- Dependências: NuGet Audit (ativo no `restore`, avisos NU1901–NU1904; `NuGetAuditMode=all` para transitivas) e `dotnet list package --vulnerable --include-transitive`; SBOM com CycloneDX.

## Fontes

- https://learn.microsoft.com/en-us/aspnet/core/security/
- https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery
- https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-oidc-web-authentication
- https://learn.microsoft.com/en-us/dotnet/standard/serialization/binaryformatter-security-guide
- https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages
- https://github.com/security-code-scan/security-code-scan
