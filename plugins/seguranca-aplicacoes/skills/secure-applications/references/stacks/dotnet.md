# .NET: security

Applies when there is `*.csproj`/`*.sln`, `Program.cs` with `WebApplication.CreateBuilder`, `Startup.cs`, `appsettings.json` (ASP.NET Core: Razor Pages, MVC, Web API, Minimal APIs, Blazor).

## Framework controls

| Topic | How to do it in this framework | ASVS |
|---|---|---|
| Output encoding | Razor encodes HTML by default; avoid `@Html.Raw` and `MarkupString` (Blazor) with external data. JSON via `System.Text.Json`. | V1.2.1, V1.2.3, V3.2.2 |
| SQL / ORM | Entity Framework with LINQ or `FromSql`/`FromSqlInterpolated` (they parameterize); never `FromSqlRaw` with concatenation. Dapper/ADO.NET with `SqlParameter`. | V1.2.4 |
| Input validation | Data annotations/FluentValidation on input models (`[ApiController]` validates automatically); DTOs separate from entities; `[Bind]`/DTO against mass assignment. | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | Antiforgery: Razor Pages validates by default; in MVC use `AutoValidateAntiforgeryTokenAttribute` globally; in Minimal APIs with forms, `UseAntiforgery()`; API controllers require opt-in (`[RequireAntiforgeryToken]`). Do not use `DisableAntiforgery` on an endpoint that uses cookies. | V3.5.1, V3.5.3 |
| Session / cookies | Authentication cookie with `Secure`, `HttpOnly`, `SameSite`; `ExpireTimeSpan` and `SlidingExpiration`; antiforgery cookie with `SecurePolicy = Always` outside development. | V3.3.1–V3.3.4, V7.3.1, V7.3.2 |
| OIDC/SAML authentication | `Microsoft.AspNetCore.Authentication.OpenIdConnect` with code flow + PKCE and a confidential client, cookie for the session; with Entra ID, `Microsoft.Identity.Web`. SAML: a maintained and audited library (e.g. Sustainsys.Saml2) or the provider in front. | V10.2.1, V10.4.6, V10.5.4, V6.8.2 |
| Authorization | `[Authorize]` with policies; a fallback policy requiring an authenticated user everywhere and `[AllowAnonymous]` only for exceptions; check the object with `IAuthorizationService` (resource-based authorization). | V8.2.1, V8.2.2, V8.3.1 |
| Headers / CSP | `UseHsts()` and `UseHttpsRedirection()`; CSP, `nosniff`, `Referrer-Policy` and `frame-ancestors` via your own middleware or a maintained package (e.g. NWebsec/NetEscapades.AspNetCore.SecurityHeaders). | V3.4.1, V3.4.3–V3.4.6 |
| File upload | `IFormFile`: limit size (`RequestSizeLimit`, `FormOptions`), ignore `FileName` and generate your own name, check the content, store outside the web root. | V5.2.1, V5.2.2, V5.3.2, V5.4.1 |
| Deserialization | `BinaryFormatter` is forbidden (from .NET 9 on it throws an exception), as are `SoapFormatter`, `NetDataContractSerializer`, `LosFormatter`. Use `System.Text.Json`, `XmlSerializer` or `DataContractSerializer`. | V1.5.2 |
| Secrets / config | Secret Manager only in development; in production, a key vault or managed identity; do not leave connection strings in a versioned `appsettings.json`. Data Protection with persisted and protected keys. | V13.3.1, V13.3.2 |
| Logging | `ILogger` with structured logging; PII is not logged by default and `IdentityModelEventSource.ShowPII` stays off in production. | V16.2.5, V16.3.1, V16.4.1 |
| Errors / debugging | `UseExceptionHandler` and `ProblemDetails` in production; `UseDeveloperExceptionPage` only in Development; Swagger and health endpoints restricted. | V16.5.1, V13.4.2, V13.4.5 |

## Common pitfalls

- `BinaryFormatter` and other polymorphic formatters with external data.
- `FromSqlRaw`/`ExecuteSqlRaw` with `$"..."` or `+` (interpolation in `Raw` does not parameterize).
- `@Html.Raw`, `MarkupString`, `HtmlString` with user data.
- `[IgnoreAntiforgeryToken]`/`DisableAntiforgery()` on an action that uses a session cookie.
- `ValidateIssuer = false`/`ValidateAudience = false` in `TokenValidationParameters`.
- `Redirect(returnUrl)` without `Url.IsLocalUrl` (open redirect).
- `Process.Start` or `Assembly.Load` with external data; `XmlDocument` without `XmlResolver = null`.
- Secrets in a production environment variable without additional protection (the official documentation does not recommend it).

## Tools

- SAST: Semgrep with C# rule sets; Roslyn analyzers (`Microsoft.CodeAnalysis.NetAnalyzers` with the CA3xxx/CA5xxx security rules); Security Code Scan (Roslyn analyzer; check whether the current version covers the SDK in use); CodeQL when available.
- Dependencies: NuGet Audit (active on `restore`, warnings NU1901–NU1904; `NuGetAuditMode=all` for transitive dependencies) and `dotnet list package --vulnerable --include-transitive`; SBOM with CycloneDX.

## Sources

- https://learn.microsoft.com/en-us/aspnet/core/security/
- https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery
- https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-oidc-web-authentication
- https://learn.microsoft.com/en-us/dotnet/standard/serialization/binaryformatter-security-guide
- https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages
- https://github.com/security-code-scan/security-code-scan
