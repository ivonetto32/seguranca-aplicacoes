# Outras linguagens: como achar os controles

Aplica-se quando o projeto usa linguagem ou framework sem arquivo próprio nesta pasta (Kotlin fora do Spring, Rust, Elixir/Phoenix, Scala/Play, C/C++, Perl, Swift server-side etc.). O objetivo é produzir, para a stack, a mesma tabela dos outros arquivos, com base na documentação oficial e não na memória.

## Procedimento

1. **Identificar** a linguagem, o framework web, o ORM, a biblioteca de identidade e o gerenciador de pacotes pelos arquivos do repositório.
2. **Buscar na documentação oficial** do framework (página de segurança, guia de produção) e no OWASP Cheat Sheet Series; anotar a URL de cada fonte. Sem fonte, marcar o item como "não confirmado" e perguntar ao usuário.
3. **Preencher a tabela abaixo**: para cada tema, qual recurso do framework cobre, como é ligado e qual ID do ASVS atende. Onde o framework não traz o controle, dizer qual biblioteca mantida o supre ou que o controle fica a cargo do código da aplicação.
4. **Escolher ferramentas** (SAST e auditoria de dependências) por cobertura da linguagem; preferir livres e de código aberto.
5. **Registrar** as armadilhas da linguagem: funções que executam código, comando, desserialização ou consulta a partir de texto.

## O que cada tema deve cobrir

| Tema | O que conferir | ASVS |
|---|---|---|
| Codificação de saída | Escape automático no motor de templates e como ele é desligado; API de saída por contexto (HTML, atributo, URL, JS). | V1.2.1, V1.2.2, V1.2.3 |
| SQL / ORM | Consulta parametrizada no driver e no ORM; os pontos onde o ORM aceita SQL cru ou fragmento (ordenação, filtro dinâmico). | V1.2.4 |
| Validação de entrada | Mecanismo de validação por esquema/tipos no servidor; vínculo de campos permitidos (mass assignment). | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | Se o framework traz token anti-CSRF e se vem ligado; alternativa para API com cookie. | V3.5.1, V3.5.3 |
| Sessão / cookies | Atributos `Secure`, `HttpOnly`, `SameSite`, prefixo `__Host-`; renovação do ID no login; expiração e logout no servidor. | V3.3.1–V3.3.4, V7.2.4, V7.3.1, V7.4.1 |
| Autenticação OIDC/SAML | Biblioteca cliente oficial ou amplamente mantida; conferir `iss`, `aud`, `exp`, assinatura, `nonce`, PKCE; não escrever validação de token à mão. | V6.8.2, V9.1.1, V10.2.1, V10.5.4 |
| Autorização | Mecanismo de papéis/políticas; negação por padrão; checagem do objeto; como testar. | V8.2.1, V8.2.2, V8.3.1 |
| Cabeçalhos / CSP | Como emitir CSP, HSTS, `nosniff`, `frame-ancestors`, `Referrer-Policy`; pacote de cabeçalhos do ecossistema. | V3.4.1, V3.4.3–V3.4.6 |
| Upload de arquivo | Limites de tamanho, tipo por conteúdo, nome gerado, local fora da raiz servida. | V5.2.1, V5.2.2, V5.3.2 |
| Desserialização | Formatos binários nativos que reconstroem objetos (proibidos para dado externo); parsers XML/YAML seguros. | V1.5.1, V1.5.2 |
| Segredos / config | Origem dos segredos (ambiente, cofre); separação por ambiente; nada no repositório. | V13.3.1, V13.3.2 |
| Logging | Biblioteca de log estruturado; campos sensíveis suprimidos; eventos de segurança registrados. | V16.2.5, V16.3.1, V16.4.1 |
| Erros / depuração | Modo de produção, tratador global de erros, endpoints de depuração e documentação desligados. | V16.5.1, V13.4.2, V13.4.5 |

## Como achar as ferramentas

- **SAST**: Semgrep (confirmar se há regras para a linguagem no repositório de regras); CodeQL (confirmar a linguagem na documentação); analisador da própria comunidade (ex.: `cargo clippy` com lints de segurança, `mix sobelow` para Phoenix, `cppcheck`/`clang-tidy` para C/C++), conferindo a manutenção atual.
- **Dependências**: procurar o comando oficial do gerenciador (`cargo audit`/`cargo deny`, `mix deps.audit`, `sbt dependencyCheck`), ou usar o OSV-Scanner (lê vários formatos de lockfile) e o OWASP Dependency-Check quando o ecossistema for coberto.
- **SBOM**: CycloneDX ou SPDX, com gerador nativo do ecossistema ou `syft`.
- **Linguagens sem coleta de memória** (C/C++): acrescentar compilação com sanitizadores, fuzzing e avisos do compilador como erro (V1.4.1–V1.4.3).

## Entrega

Ao terminar, devolver ao usuário: a tabela preenchida, as armadilhas da linguagem, as ferramentas recomendadas e a lista de fontes consultadas, separando o que foi confirmado em documentação do que ficou "não confirmado". Se o projeto for recorrente, sugerir salvar o resultado como novo arquivo em `references/stacks/`.

## Fontes

- https://cheatsheetseries.owasp.org/
- https://owasp.org/www-project-application-security-verification-standard/
- https://github.com/semgrep/semgrep-rules
- https://osv.dev/
