# Controle de acesso (autorização)

Autenticar (inclusive com MFA no IdP) diz **quem** é o usuário. Esta referência cobre o que ele **pode** fazer. A falha mais comum em aplicações é autorização ausente ou inconsistente, não criptografia fraca. ASVS: V8 (e V15.3.x, V16.3.2).

## 1. Regras de base

1. **Negar por padrão.** Toda rota, ação e objeto exige permissão explícita; o que não foi permitido é negado, sem depender do padrão do framework (V8.2.1, V8.2.2). Rota nova sem regra deve falhar nos testes.
2. **No servidor, a cada requisição.** Controle no cliente (botão escondido, rota de front-end, campo oculto) é só usabilidade (V8.3.1). Aplique a verificação em camada central e confiável (middleware, filtro, política), não repetida à mão em cada controlador.
3. **Por função e por objeto.** Não basta saber que o usuário "pode editar pedidos": a decisão considera **qual pedido**, de quem é e em que estado está (V8.2.1 e V8.2.2).
4. **Menor privilégio.** Cada perfil recebe só o necessário; revise periodicamente (acúmulo de permissões ao longo do tempo).
5. **Falhar de forma segura.** Erro na checagem de permissão = negar (V16.5.3). Mensagem genérica ao usuário (V16.5.1); responder 404 em vez de 403 quando a existência do objeto for informação sensível.
6. **Documentar as regras** de acesso por função e por dado (e por campo, quando houver) em uma matriz perfil x recurso x ação (V8.1.1, V8.1.2). A matriz é a fonte dos testes.

## 2. Modelo: RBAC, ABAC e relacionamentos

- **RBAC** (papéis) serve para poucas funções e perfis estáveis. Com muitos papéis surge "explosão de papéis".
- **ABAC** (atributos: dono, departamento, classificação do dado, horário, nível de autenticação) ou **ReBAC** (relações: "membro do projeto X") expressam melhor regras por objeto e multi-inquilino. A OWASP prefere ABAC/ReBAC ao RBAC puro para necessidades finas.
- Combinação prática: papéis grossos vindos do IdP (grupos/roles no token) para **entrada**, mais regras por atributo e dono no código/política para **cada objeto**. Mapeie grupos do IdP para permissões da aplicação em um único ponto.
- Papéis e grupos lidos do token são válidos enquanto o token for (V10.3.2); para efeito imediato de revogação, consulte a fonte de verdade ou use sessão curta.
- Nível de autenticação também é atributo: ação crítica exige `acr`/`amr`/`auth_time` adequados (`references/identidade-mfa.md`, seção 4; V10.3.4).

## 3. Objetos: IDOR / BOLA

- Todo acesso a objeto por identificador vindo do cliente (URL, corpo, cabeçalho, nome de arquivo) confere se o **usuário atual** tem permissão sobre **aquele** objeto (V8.2.2). IDs aleatórios (UUID) não substituem a checagem.
- Prefira consultas que já embutem o dono/escopo (`WHERE id = ? AND owner_id = :usuario`) a buscar e depois verificar; assim a ausência de permissão vira "não encontrado".
- Vale para leitura, escrita, exclusão, download de arquivos, exportações, relatórios, anexos, URLs assinadas e filas/jobs que processam o objeto depois.
- Por **campo** (BOPLA): retorne só os campos permitidos (V15.3.1) e restrinja leitura/escrita de campos sensíveis por permissão (V8.2.3).

## 4. Mass assignment

- Não vincule o corpo da requisição direto ao modelo de domínio. Use **DTO** ou lista permitida de campos graváveis por ação (V15.3.3).
- Campos como `role`, `is_admin`, `tenant_id`, `owner_id`, `status`, `price` nunca vêm do cliente; o servidor define.
- Lista de bloqueio é só complemento: campo novo escapa dela. Verifique também objetos aninhados e construtores.
- Lista permitida de campos não substitui a checagem de permissão sobre o objeto e a operação.

## 5. APIs: autorização por função

- Cada endpoint declara o perfil/escopo exigido, inclusive os "internos", de administração, de saúde e de documentação (V8.2.1, V13.4.5).
- Autorize por **método HTTP** também: GET liberado não implica PUT/DELETE liberado. Funções sensíveis nunca em GET (V3.5.3).
- GraphQL: autorização por campo e por resolver, não só na entrada da consulta; limite de profundidade e custo (V4.3.1).
- Tokens de API: o receptor valida `aud` e escopos (V10.3.1, V10.3.2). Escopo do token é teto, a regra por objeto continua valendo.
- Controles antiautomação em listagens e exportações para conter exfiltração (V2.4.1).

## 6. Multi-inquilino (V8.4.1)

- O `tenant_id` vem da **sessão/identidade autenticada**, nunca de parâmetro, cabeçalho ou corpo. Se o cliente informar um tenant, trate como seletor e verifique contra a associação do usuário.
- Toda consulta e toda escrita filtram por tenant em camada única (repositório/ORM com escopo global), não consulta a consulta.
- **Defesa em profundidade no banco:** PostgreSQL com *row-level security* ativada e `FORCE ROW LEVEL SECURITY` nas tabelas de tenant, política lendo o tenant de configuração local à transação (`SET LOCAL`/`set_config(..., true)`), falhando fechado se ausente. A conexão da aplicação usa papel que **não** seja superusuário nem `BYPASSRLS` (superusuário, `BYPASSRLS` e dono da tabela, sem `FORCE`, contornam a política). Outros bancos: mecanismo equivalente, ou esquema/banco por tenant.
- Chaves de **cache**, filas, índices de busca, arquivos e logs incluem o tenant; jobs em segundo plano re-estabelecem e reautorizam o contexto do tenant.

## 7. Funções administrativas separadas

- Administração em rota, painel e, quando possível, **serviço/hostname separado**, com perfil próprio, MFA reforçado (step-up) e acesso restrito por rede (V3.5.4, V7.5.1).
- Sem "modo admin" ativado por parâmetro ou cabeçalho. Quem administra a aplicação não herda, por isso, acesso aos dados dos usuários.
- Ações administrativas e mudanças de permissão são registradas (V16.3.3) e, se possível, exigem aprovação de segunda pessoa.
- Contas padrão desativadas ou removidas (V6.3.2).

## 8. Testes de autorização

- **Matriz de testes automatizada** a partir da matriz de permissões: para cada rota e perfil, o esperado (permitido/negado). Rota sem teste = lacuna.
- **Teste de dois usuários** (e dois tenants): o usuário A cria objetos; o usuário B tenta ler, alterar, excluir e baixar cada um, trocando IDs em todas as rotas e métodos. Resultado esperado: negado. Repita com perfil comum tentando função administrativa e com requisição sem sessão.
- Teste de mass assignment: envie campos extras (`role`, `tenant_id`) e confirme que são ignorados.
- Em multi-tenant, teste na configuração implantada (mesmo papel de banco e mesmo pool de conexões), com requisições de dois tenants na mesma conexão para provar que não há vazamento de contexto, e descubra as tabelas pelo esquema, não por lista manual.
- Testes de integração rodam na esteira; DAST com dois usuários cobre o que o teste unitário não alcança. Teste automatizado não substitui a revisão manual.

## 9. Registro de acesso negado (V16.3.2)

- Registre toda negação: quando (UTC), onde (rota, método, versão), quem (usuário, IP de origem confiável), o quê (ação e objeto, motivo), com identificador de correlação da requisição (V16.2.1, V16.2.2).
- Sem dado desnecessário: nada de token, identificador de sessão em claro, senha ou dado pessoal além do preciso (V16.2.5). Codifique CR/LF e controle o que o atacante escolhe (IDs) contra injeção de log (V16.4.1).
- Envie ao SIEM, em sistema separado e protegido (V16.4.2, V16.4.3). Alerte sobre picos de negações por usuário ou rota (indício de varredura de IDOR). Se negações alimentarem bloqueio de conta, evite que sirvam para travar terceiros.

## Fontes

- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Mass Assignment Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html
- OWASP Multi-Tenant Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- PostgreSQL, Row Security Policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- OWASP ASVS 5.0.0: https://github.com/OWASP/ASVS/tree/master/5.0
