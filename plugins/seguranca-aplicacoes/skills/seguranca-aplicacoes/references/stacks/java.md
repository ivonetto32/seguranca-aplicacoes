# Java: segurança

Aplica-se quando há `pom.xml`, `build.gradle(.kts)`, classes com `@SpringBootApplication`, `@RestController`, `spring-security-*` ou, em Jakarta EE, `web.xml`/`jakarta.*`.

## Controles do framework

| Tema | Como fazer neste framework | ASVS |
|---|---|---|
| Codificação de saída | Thymeleaf escapa com `th:text`; evitar `th:utext`. JSP: `<c:out>` ou `fn:escapeXml`, nunca `${}` cru em HTML. JSON só por Jackson, sem montar string. | V1.2.1, V1.2.3, V3.2.2 |
| SQL / ORM | `PreparedStatement`, Spring Data com parâmetros nomeados, JPA com `setParameter`. JPA/Hibernate não protege JPQL/HQL concatenado. | V1.2.4 |
| Validação de entrada | Bean Validation (`@Valid`, `@NotNull`, `@Size`, `@Pattern`) em DTOs; nunca vincular entidade JPA direto ao corpo (mass assignment). | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | Spring Security protege métodos não seguros por padrão (token na sessão; `csrf.spa()` para SPA). Não desligar com `csrf.disable()` se houver cookie de sessão. | V3.5.1, V3.5.3 |
| Sessão / cookies | Cookie `Secure`, `HttpOnly`, `SameSite` no contêiner ou em `server.servlet.session.cookie.*`; Spring Security troca o ID no login (proteção contra fixação). Timeout em `server.servlet.session.timeout`. | V3.3.1–V3.3.4, V7.2.4, V7.3.1 |
| Autenticação OIDC/SAML | Cliente oficial: `spring-boot-starter-oauth2-client` (`oauth2Login`, código + PKCE) e `spring-security-saml2-service-provider` (`saml2Login`). Não escrever validação de token à mão. | V6.8.2, V10.2.1, V10.5.1, V10.5.4 |
| Autorização | `authorizeHttpRequests` com negação por padrão (`anyRequest().authenticated()` ou `denyAll()`); `@PreAuthorize`/`@PostAuthorize` e `@PreAuthorize("@regra.podeEditar(#id)")` para checar o objeto. | V8.2.1, V8.2.2, V8.3.1 |
| Cabeçalhos / CSP | Spring Security envia por padrão `X-Content-Type-Options`, HSTS (só em HTTPS), `X-Frame-Options: DENY` e anticache; **CSP não vem por padrão**: configurar `headers.contentSecurityPolicy(...)`. | V3.4.1, V3.4.3, V3.4.4, V3.4.6 |
| Upload de arquivo | `MultipartFile`: limitar `spring.servlet.multipart.max-file-size`; ignorar `getOriginalFilename()` e gerar nome próprio; validar conteúdo, gravar fora da raiz web. | V5.2.1, V5.2.2, V5.3.2, V5.4.1 |
| Desserialização | Não usar `ObjectInputStream` com dado externo; JSON com Jackson sem `enableDefaultTyping`/polimorfismo aberto; se inevitável, filtro `ObjectInputFilter` por lista permitida. XML com XXE desligado. | V1.5.1, V1.5.2 |
| Segredos / config | Variáveis de ambiente, Spring Cloud Config com criptografia ou cofre (Vault); nada em `application.properties` versionado. Perfis separados por ambiente. | V13.3.1, V13.3.2 |
| Logging | SLF4J/Logback com formato estruturado; sem senha/token/dado pessoal; cuidado com injeção de log (CRLF) e com Log4j em versão vulnerável. | V16.2.5, V16.3.1, V16.3.2, V16.4.1 |
| Erros / depuração | `@ControllerAdvice`/`ProblemDetail` com mensagem genérica; `server.error.include-stacktrace=never`; Actuator restrito (só `health`) e atrás de autenticação. | V16.5.1, V13.4.2, V13.4.5 |

## Armadilhas comuns

- `ObjectInputStream.readObject()` sobre dado externo (execução remota de código).
- `csrf.disable()` e `permitAll()` copiados de tutorial em aplicação com cookie de sessão.
- Montar JPQL/HQL/SQL nativo com `+` ou `String.format`, inclusive em `ORDER BY` dinâmico.
- `th:utext`, `[(...)]` no Thymeleaf e `${}` em JSP com dado do usuário.
- Fábricas XML (`DocumentBuilderFactory`, `SAXParser`) sem desligar DTD/entidades externas.
- SpEL, `ScriptEngine` ou `Runtime.exec`/`ProcessBuilder` com dado do usuário; JNDI com nome vindo de fora.
- Actuator (`/env`, `/heapdump`) exposto; `@RequestBody` ligado direto à entidade JPA.
- Confiar em `X-Forwarded-*` sem configurar `server.forward-headers-strategy` e o proxy confiável.

## Ferramentas

- SAST: Semgrep com os conjuntos de regras de Java/Kotlin; SpotBugs com o plugin Find Security Bugs (via plugin Maven/Gradle do SpotBugs); CodeQL quando a plataforma oferecer.
- Dependências: OWASP Dependency-Check (projeto hoje em `github.com/dependency-check/DependencyCheck`; usar chave de API da NVD); `mvn dependency:tree`/Gradle para mapear transitivas; gerar SBOM (CycloneDX).

## Fontes

- https://cheatsheetseries.owasp.org/cheatsheets/Java_Security_Cheat_Sheet.html
- https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html
- https://docs.spring.io/spring-security/reference/servlet/oauth2/login/index.html
- https://docs.spring.io/spring-security/reference/servlet/saml2/index.html
- https://docs.spring.io/spring-security/reference/features/exploits/headers.html
- https://find-sec-bugs.github.io/
- https://github.com/semgrep/semgrep-rules
