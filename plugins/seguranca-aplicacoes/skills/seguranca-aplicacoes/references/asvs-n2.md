# OWASP ASVS 5.0.0 — níveis 1 e 2

- Fonte: https://github.com/OWASP/ASVS/blob/master/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv (ASVS 5.0.0, maio de 2025).
- Licença CC BY-SA 4.0, com atribuição ao OWASP (Application Security Verification Standard).
- As descrições são resumos parafraseados; em caso de dúvida, vale o texto original do requisito, pelo ID.
- Uso na revisão: marcar cada item como "atende / não atende / não se aplica", com evidência (arquivo:linha ou teste).
- Nível 2 = todos os itens N1 + os itens N2 (a coluna Nível mostra o nível em que o item passa a valer). Itens exclusivamente N3 foram omitidos.

## V1 Codificação e sanitização (Encoding and Sanitization)

| ID | Nível | O que conferir |
|---|---|---|
| V1.1.1 | L2 | Decodificar entrada para a forma canônica uma só vez, antes de qualquer validação ou processamento. |
| V1.1.2 | L2 | Aplicar codificação/escape de saída como etapa final, imediatamente antes do interpretador de destino. |
| V1.2.1 | L1 | Codificar a saída conforme o contexto (elemento, atributo, comentário HTML, CSS, cabeçalho HTTP). |
| V1.2.2 | L1 | Codificar dados não confiáveis ao montar URLs e permitir apenas protocolos seguros (sem javascript: ou data:). |
| V1.2.3 | L1 | Escapar dados ao gerar conteúdo JavaScript ou JSON dinamicamente, evitando injeção. |
| V1.2.4 | L1 | Usar consultas parametrizadas, ORM ou proteção equivalente contra injeção SQL/NoSQL e similares. |
| V1.2.5 | L1 | Impedir injeção de comandos de SO: chamadas parametrizadas ou codificação adequada dos argumentos. |
| V1.2.6 | L2 | Proteger contra injeção LDAP, por codificação ou controles específicos. |
| V1.2.7 | L2 | Proteger consultas XPath com parametrização ou consultas pré-compiladas. |
| V1.2.8 | L2 | Configurar processadores LaTeX com segurança (sem --shell-escape) e lista de comandos permitidos. |
| V1.2.9 | L2 | Escapar caracteres especiais de entradas usadas em expressões regulares. |
| V1.3.1 | L1 | Sanitizar HTML não confiável de editores WYSIWYG com biblioteca de sanitização reconhecida. |
| V1.3.2 | L1 | Evitar eval() e execução dinâmica de código; se inevitável, sanitizar antes qualquer entrada incluída. |
| V1.3.3 | L2 | Sanitizar dados enviados a contextos perigosos, permitindo só caracteres seguros e limitando tamanho. |
| V1.3.4 | L2 | Validar ou sanitizar SVG enviado por usuários, mantendo só tags e atributos seguros (sem scripts). |
| V1.3.5 | L2 | Sanitizar ou desabilitar conteúdo com linguagem de script/expressão enviado por usuários (Markdown, CSS, XSL, BBCode). |
| V1.3.6 | L2 | Proteger contra SSRF validando destinos por lista de protocolos, domínios, caminhos e portas permitidos. |
| V1.3.7 | L2 | Impedir injeção de template: não montar templates a partir de entrada não confiável. |
| V1.3.8 | L2 | Sanitizar entradas usadas em consultas JNDI e configurar JNDI contra injeção. |
| V1.3.9 | L2 | Sanitizar o conteúdo enviado ao memcache para evitar injeção. |
| V1.3.10 | L2 | Sanitizar strings de formato que possam ser resolvidas de forma inesperada ou maliciosa. |
| V1.3.11 | L2 | Sanitizar entradas repassadas a sistemas de e-mail contra injeção SMTP/IMAP. |
| V1.4.1 | L2 | Usar manipulação segura de strings, cópia de memória e ponteiros para evitar estouro de pilha, buffer ou heap. |
| V1.4.2 | L2 | Validar sinal, intervalo e entrada para evitar estouro de inteiros. |
| V1.4.3 | L2 | Liberar memória e recursos alocados e anular referências, evitando ponteiros pendentes e use-after-free. |
| V1.5.1 | L1 | Configurar parsers XML de forma restritiva, desabilitando entidades externas (XXE). |
| V1.5.2 | L2 | Desserializar dados não confiáveis com tipos permitidos por lista, evitando ataques de desserialização. |

## V2 Validação e lógica de negócio (Validation and Business Logic)

| ID | Nível | O que conferir |
|---|---|---|
| V2.1.1 | L1 | Documentar as regras de validação de entrada (formato e estrutura esperada de cada dado). |
| V2.1.2 | L2 | Documentar como validar a consistência lógica e contextual entre itens de dados combinados. |
| V2.1.3 | L2 | Documentar os limites e validações da lógica de negócio, por usuário e globais. |
| V2.2.1 | L1 | Validar a entrada contra regras de negócio, com lista de valores/padrões/intervalos permitidos. |
| V2.2.2 | L1 | Impor a validação em camada de serviço confiável; validação no cliente não conta como controle. |
| V2.2.3 | L2 | Verificar que combinações de itens relacionados são coerentes segundo as regras definidas. |
| V2.3.1 | L1 | Processar fluxos de negócio apenas na ordem esperada, sem permitir pular etapas. |
| V2.3.2 | L2 | Implementar os limites de lógica de negócio conforme a documentação. |
| V2.3.3 | L2 | Usar transações de negócio atômicas: concluir por inteiro ou reverter ao estado anterior. |
| V2.3.4 | L2 | Usar bloqueio no nível da lógica para evitar reserva dupla de recursos limitados. |
| V2.4.1 | L2 | Implementar controles antiautomação contra chamadas excessivas (exfiltração, lixo, esgotamento de cota, DoS). |

## V3 Segurança do front-end web (Web Frontend Security)

| ID | Nível | O que conferir |
|---|---|---|
| V3.2.1 | L1 | Impedir que o navegador renderize conteúdo ou funcionalidade em contexto incorreto (ex.: API ou arquivo acessado direto). |
| V3.2.2 | L1 | Exibir texto como texto, usando funções seguras (textContent, createTextNode) em vez de HTML. |
| V3.3.1 | L1 | Definir o atributo Secure nos cookies, com prefixo __Host- ou __Secure- no nome. |
| V3.3.2 | L2 | Definir SameSite de cada cookie conforme sua finalidade, limitando CSRF e clickjacking. |
| V3.3.3 | L2 | Usar o prefixo __Host- nos cookies, salvo os feitos para compartilhamento entre hosts. |
| V3.3.4 | L2 | Marcar cookies inacessíveis ao JavaScript (ex.: token de sessão) com HttpOnly. |
| V3.4.1 | L1 | Enviar Strict-Transport-Security em todas as respostas, com max-age de pelo menos 1 ano (e includeSubDomains no N2). |
| V3.4.2 | L1 | Definir Access-Control-Allow-Origin fixo ou validado contra lista de origens permitidas. |
| V3.4.3 | L2 | Enviar Content-Security-Policy que restrinja o carregamento e a execução a conteúdo confiável. |
| V3.4.4 | L2 | Enviar X-Content-Type-Options: nosniff em todas as respostas. |
| V3.4.5 | L2 | Definir uma Referrer-Policy que evite vazar dados sensíveis a terceiros. |
| V3.4.6 | L2 | Usar frame-ancestors da CSP em todas as respostas para controlar quem pode incorporar a aplicação. |
| V3.5.1 | L1 | Sem depender de preflight CORS, validar a origem das requisições a funções sensíveis (ex.: token anti-CSRF). |
| V3.5.2 | L1 | Ao depender de preflight CORS, garantir que a função sensível não possa ser chamada sem disparar o preflight. |
| V3.5.3 | L1 | Usar métodos POST, PUT, PATCH ou DELETE em funções sensíveis, nunca métodos seguros como GET. |
| V3.5.4 | L2 | Hospedar aplicações distintas em hostnames diferentes para aproveitar a política de mesma origem. |
| V3.5.5 | L2 | Descartar mensagens postMessage de origem não confiável ou com sintaxe inválida. |
| V3.7.1 | L2 | Usar só tecnologias de cliente ainda suportadas e seguras (sem Flash, ActiveX, plugins NSAPI e similares). |
| V3.7.2 | L2 | Redirecionar automaticamente para outro domínio apenas se o destino estiver em lista permitida. |

## V4 API e serviços web (API and Web Service)

| ID | Nível | O que conferir |
|---|---|---|
| V4.1.1 | L1 | Enviar Content-Type correto e charset em toda resposta com corpo. |
| V4.1.2 | L2 | Redirecionar de HTTP para HTTPS apenas em endpoints voltados ao usuário, não em APIs e serviços. |
| V4.1.3 | L2 | Impedir que o usuário sobrescreva cabeçalhos HTTP definidos por intermediários (balanceador, proxy, BFF). |
| V4.2.1 | L2 | Fazer todos os componentes delimitarem mensagens HTTP pelo mecanismo correto da versão, evitando request smuggling. |
| V4.3.1 | L2 | Limitar consultas GraphQL (lista permitida, profundidade, quantidade ou custo) contra DoS. |
| V4.3.2 | L2 | Desabilitar introspecção GraphQL em produção, salvo API destinada a terceiros. |
| V4.4.1 | L1 | Usar WebSocket sobre TLS (WSS) em todas as conexões. |
| V4.4.2 | L2 | Verificar o cabeçalho Origin no handshake WebSocket contra lista de origens permitidas. |
| V4.4.3 | L2 | Se a sessão padrão não puder ser usada, usar tokens dedicados que atendam aos requisitos de sessão. |
| V4.4.4 | L2 | Obter ou validar o token de sessão WebSocket por meio da sessão HTTPS já autenticada. |

## V5 Manipulação de arquivos (File Handling)

| ID | Nível | O que conferir |
|---|---|---|
| V5.1.1 | L2 | Documentar, por upload, tipos, extensões, tamanho máximo (inclusive descompactado) e tratamento dos arquivos. |
| V5.2.1 | L1 | Aceitar apenas arquivos de tamanho que a aplicação processe sem degradação ou negação de serviço. |
| V5.2.2 | L1 | Conferir extensão esperada e validar que o conteúdo corresponde ao tipo, inclusive dentro de arquivos compactados. |
| V5.2.3 | L2 | Checar tamanho descompactado e número de arquivos máximos antes de descompactar. |
| V5.3.1 | L1 | Garantir que arquivos enviados e guardados em pasta pública não sejam executados como código no servidor. |
| V5.3.2 | L1 | Montar caminhos de arquivo com dados internos ou confiáveis; se usar nome do usuário, validar contra path traversal, LFI/RFI e SSRF. |
| V5.4.1 | L2 | Validar ou ignorar nomes de arquivo enviados e definir o nome no Content-Disposition da resposta. |
| V5.4.2 | L2 | Codificar ou sanitizar nomes de arquivo servidos (cabeçalhos, anexos), por exemplo conforme a RFC 6266. |
| V5.4.3 | L2 | Escanear com antivírus os arquivos de fontes não confiáveis. |

## V6 Autenticação (Authentication)

| ID | Nível | O que conferir |
|---|---|---|
| V6.1.1 | L1 | Documentar como limitação de taxa, antiautomação e resposta adaptativa defendem contra credential stuffing e força bruta. |
| V6.1.2 | L2 | Documentar lista de palavras do contexto (nomes de produto, sistema etc.) proibidas em senhas. |
| V6.1.3 | L2 | Documentar todos os caminhos de autenticação e os controles e a força exigidos em cada um. |
| V6.2.1 | L1 | Exigir senhas com no mínimo 8 caracteres (recomendado 15). |
| V6.2.2 | L1 | Permitir que o usuário altere a própria senha. |
| V6.2.3 | L1 | Exigir a senha atual e a nova na troca de senha. |
| V6.2.4 | L1 | Checar senhas no cadastro e na troca contra ao menos as 3000 mais comuns que cumpram a política. |
| V6.2.5 | L1 | Aceitar senhas de qualquer composição, sem regras de tipos de caractere obrigatórios. |
| V6.2.6 | L1 | Usar type=password nos campos de senha, permitindo no máximo exibição temporária. |
| V6.2.7 | L1 | Permitir colar, auxiliares do navegador e gerenciadores de senha. |
| V6.2.8 | L1 | Verificar a senha exatamente como recebida, sem truncar nem alterar caixa. |
| V6.2.9 | L2 | Permitir senhas de pelo menos 64 caracteres. |
| V6.2.10 | L2 | Manter a senha válida até comprometimento ou troca pelo usuário, sem rotação periódica obrigatória. |
| V6.2.11 | L2 | Usar a lista documentada de palavras do contexto para barrar senhas fáceis de adivinhar. |
| V6.2.12 | L2 | Checar senhas no cadastro e na troca contra conjuntos de senhas vazadas. |
| V6.3.1 | L1 | Implementar os controles contra credential stuffing e força bruta conforme a documentação de segurança. |
| V6.3.2 | L1 | Não manter contas padrão (root, admin, sa) ou mantê-las desabilitadas. |
| V6.3.3 | L2 | Exigir MFA ou combinação de mecanismos de fator único para acessar a aplicação. |
| V6.3.4 | L2 | Com vários caminhos de autenticação, não ter caminhos não documentados e aplicar os controles de forma consistente. |
| V6.4.1 | L1 | Gerar senhas iniciais e códigos de ativação aleatórios e seguros, que expirem logo ou no primeiro uso. |
| V6.4.2 | L1 | Não ter dicas de senha nem perguntas secretas. |
| V6.4.3 | L2 | Ter processo seguro de recuperação de senha que não contorne o MFA habilitado. |
| V6.4.4 | L2 | Ao perder um fator MFA, exigir comprovação de identidade no mesmo nível do cadastro. |
| V6.5.1 | L2 | Garantir que códigos de recuperação, códigos fora de banda e TOTP só funcionem uma vez. |
| V6.5.2 | L2 | Armazenar com hash aprovado os segredos de busca com menos de 112 bits de entropia. |
| V6.5.3 | L2 | Gerar segredos de busca, códigos fora de banda e sementes TOTP com CSPRNG. |
| V6.5.4 | L2 | Garantir ao menos 20 bits de entropia em segredos de busca e códigos fora de banda. |
| V6.5.5 | L2 | Definir validade para pedidos/códigos fora de banda (máx. 10 min) e para TOTP (máx. 30 s). |
| V6.6.1 | L2 | Oferecer OTP por telefone/SMS apenas com número previamente validado e com alternativas mais fortes disponíveis, informando o usuário dos riscos. |
| V6.6.2 | L2 | Vincular códigos fora de banda à requisição de autenticação original, sem reuso em outras. |
| V6.6.3 | L2 | Proteger códigos fora de banda contra força bruta com limitação de taxa. |
| V6.8.1 | L2 | Com vários IdPs, impedir falsificação de identidade por outro IdP (ex.: mesmo identificador de usuário). |
| V6.8.2 | L2 | Validar sempre a presença e a integridade das assinaturas em asserções (JWT, SAML), rejeitando as inválidas. |
| V6.8.3 | L2 | Processar asserções SAML uma única vez na validade, impedindo replay. |
| V6.8.4 | L2 | Quando exigir força, método ou recência de autenticação, verificar essas informações retornadas pelo IdP. |

## V7 Gerenciamento de sessão (Session Management)

| ID | Nível | O que conferir |
|---|---|---|
| V7.1.1 | L2 | Documentar timeout por inatividade e duração máxima absoluta da sessão, com justificativa de desvios. |
| V7.1.2 | L2 | Documentar o número de sessões simultâneas por conta e o comportamento ao atingir o limite. |
| V7.1.3 | L2 | Documentar sistemas de sessão em ambiente federado (SSO) e como coordenam duração e encerramento. |
| V7.2.1 | L1 | Fazer toda verificação de token de sessão em serviço de backend confiável. |
| V7.2.2 | L1 | Usar tokens de sessão gerados dinamicamente (autocontidos ou de referência), não chaves estáticas de API. |
| V7.2.3 | L1 | Gerar tokens de referência únicos com CSPRNG e pelo menos 128 bits de entropia. |
| V7.2.4 | L1 | Gerar novo token de sessão a cada autenticação, inclusive reautenticação, e encerrar o anterior. |
| V7.3.1 | L2 | Aplicar timeout por inatividade, exigindo reautenticação conforme análise de risco. |
| V7.3.2 | L2 | Aplicar duração máxima absoluta da sessão, exigindo reautenticação conforme análise de risco. |
| V7.4.1 | L1 | Impedir qualquer uso da sessão após o encerramento (logout ou expiração), invalidando-a no servidor. |
| V7.4.2 | L1 | Encerrar todas as sessões ativas quando a conta for desabilitada ou excluída. |
| V7.4.3 | L2 | Oferecer encerrar as demais sessões após troca ou remoção de fator de autenticação. |
| V7.4.4 | L2 | Dar acesso fácil e visível ao logout em todas as páginas autenticadas. |
| V7.4.5 | L2 | Permitir que administradores encerrem sessões de um usuário ou de todos. |
| V7.5.1 | L2 | Exigir reautenticação completa antes de alterar atributos sensíveis (e-mail, telefone, MFA). |
| V7.5.2 | L2 | Permitir ao usuário ver e encerrar suas sessões ativas, após nova autenticação com ao menos um fator. |
| V7.6.1 | L2 | Garantir que duração e encerramento de sessão entre RP e IdP ocorram como documentado, com reautenticação quando necessário. |
| V7.6.2 | L2 | Exigir consentimento ou ação explícita do usuário para criar uma sessão, sem sessões criadas sem interação. |

## V8 Autorização (Authorization)

| ID | Nível | O que conferir |
|---|---|---|
| V8.1.1 | L1 | Documentar regras de acesso por função e por dado, com base em permissões e atributos do recurso. |
| V8.1.2 | L2 | Documentar regras de acesso por campo (leitura e escrita) conforme permissões e atributos. |
| V8.2.1 | L1 | Restringir o acesso por função a consumidores com permissão explícita. |
| V8.2.2 | L1 | Restringir o acesso a dados a itens com permissão explícita, mitigando IDOR/BOLA. |
| V8.2.3 | L2 | Restringir o acesso por campo a quem tem permissão explícita, mitigando BOPLA. |
| V8.3.1 | L1 | Aplicar autorização em camada de serviço confiável, sem depender de controles manipuláveis no cliente. |
| V8.4.1 | L2 | Em aplicações multi-tenant, usar controles entre tenants para que operações nunca afetem tenants sem permissão. |

## V9 Tokens autocontidos (Self-contained Tokens)

| ID | Nível | O que conferir |
|---|---|---|
| V9.1.1 | L1 | Validar assinatura ou MAC de tokens autocontidos antes de aceitar seu conteúdo. |
| V9.1.2 | L1 | Permitir apenas algoritmos de lista permitida para criar e verificar tokens (sem "none"). |
| V9.1.3 | L1 | Obter a chave de validação de fontes pré-configuradas e confiáveis, nunca indicadas pelo token. |
| V9.2.1 | L1 | Aceitar o token apenas dentro do prazo de validade (nbf e exp em JWT). |
| V9.2.2 | L2 | Verificar que o token é do tipo correto e destinado ao propósito (ex.: só access token para autorizar). |
| V9.2.3 | L2 | Aceitar apenas tokens destinados ao serviço, validando o audience (aud) contra lista permitida. |
| V9.2.4 | L2 | Ao usar a mesma chave para várias audiências, incluir restrição de audience única em cada token. |

## V10 OAuth e OIDC (OAuth and OIDC)

| ID | Nível | O que conferir |
|---|---|---|
| V10.1.1 | L2 | Enviar tokens apenas aos componentes que precisam deles (ex.: BFF mantém tokens fora do JavaScript do navegador). |
| V10.1.2 | L2 | Aceitar valores do servidor de autorização apenas de fluxo iniciado pela mesma sessão do agente de usuário (state, nonce, PKCE). |
| V10.2.1 | L2 | No fluxo de código, proteger o cliente OAuth contra CSRF em requisições de token (PKCE, state ou nonce). |
| V10.2.2 | L2 | Com mais de um servidor de autorização, defender contra mix-up (ex.: validar o parâmetro iss). |
| V10.3.1 | L2 | Fazer o resource server aceitar só tokens de acesso destinados a ele (audience). |
| V10.3.2 | L2 | Fazer o resource server decidir autorização pelas claims do token (sub, scope, authorization_details). |
| V10.3.3 | L2 | Identificar o usuário por claims que não possam ser reatribuídas a outro usuário. |
| V10.3.4 | L2 | Verificar que o token atende à força, método ou recência exigidos (ex.: acr, amr, auth_time). |
| V10.4.1 | L1 | Validar redirect URIs por lista pré-registrada do cliente com comparação exata de string. |
| V10.4.2 | L1 | Permitir que o authorization code seja usado uma única vez; ao reuso, rejeitar e revogar tokens emitidos. |
| V10.4.3 | L1 | Manter o authorization code de vida curta (máx. 10 minutos no N1 e N2). |
| V10.4.4 | L1 | Permitir a cada cliente apenas os grants que precisa; sem implicit e password. |
| V10.4.5 | L1 | Mitigar replay de refresh token em clientes públicos, de preferência com tokens vinculados ao remetente (DPoP ou mTLS). |
| V10.4.6 | L2 | Exigir PKCE no fluxo de código para mitigar interceptação do authorization code. |
| V10.4.7 | L2 | Com registro dinâmico não autenticado de clientes, mitigar clientes maliciosos validando metadados e URIs. |
| V10.4.8 | L2 | Dar expiração absoluta aos refresh tokens, mesmo com expiração deslizante. |
| V10.4.9 | L2 | Permitir revogar refresh tokens e access tokens de referência pela interface do servidor de autorização. |
| V10.4.10 | L2 | Autenticar o cliente confidencial nas requisições backchannel (token, PAR, revogação). |
| V10.4.11 | L2 | Atribuir ao cliente OAuth apenas os escopos necessários. |
| V10.5.1 | L2 | Mitigar replay de ID Token, conferindo o nonce enviado na requisição com o do token. |
| V10.5.2 | L2 | Identificar o usuário por claim do ID Token que não possa ser reatribuída (normalmente sub). |
| V10.5.3 | L2 | Rejeitar metadados do servidor de autorização cujo issuer não corresponda ao esperado (impersonação). |
| V10.5.4 | L2 | Validar que o ID Token é destinado ao cliente: aud igual ao client_id. |
| V10.5.5 | L2 | No logout back-channel OIDC, validar o logout token e mitigar DoS por logout forçado e confusão de JWT. |
| V10.6.1 | L2 | No OpenID Provider, permitir apenas os response modes code, ciba, id_token ou id_token code. |
| V10.6.2 | L2 | No OpenID Provider, mitigar DoS por logout forçado com confirmação do usuário ou validação dos parâmetros. |
| V10.7.1 | L2 | Garantir consentimento do usuário a cada autorização; sempre pedir consentimento se o cliente não for confiável. |
| V10.7.2 | L2 | Apresentar informação clara e suficiente sobre o que está sendo consentido (natureza, cliente, escopo). |
| V10.7.3 | L2 | Permitir ao usuário revisar, alterar e revogar consentimentos concedidos. |

## V11 Criptografia (Cryptography)

| ID | Nível | O que conferir |
|---|---|---|
| V11.1.1 | L2 | Ter política documentada de gestão de chaves e ciclo de vida, conforme padrão como NIST SP 800-57. |
| V11.1.2 | L2 | Manter inventário criptográfico atualizado de chaves, algoritmos e certificados, com onde podem ou não ser usados. |
| V11.2.1 | L2 | Usar implementações criptográficas validadas pela indústria (bibliotecas e hardware). |
| V11.2.2 | L2 | Projetar com agilidade criptográfica: algoritmos, tamanhos de chave e modos configuráveis e substituíveis. |
| V11.2.3 | L2 | Garantir que todas as primitivas criptográficas ofereçam pelo menos 128 bits de segurança. |
| V11.3.1 | L1 | Não usar modos de bloco inseguros (ECB) nem preenchimentos fracos (PKCS#1 v1.5). |
| V11.3.2 | L1 | Usar apenas cifras e modos aprovados, como AES-GCM. |
| V11.3.3 | L2 | Proteger dados cifrados contra modificação, preferindo cifragem autenticada ou cifra mais MAC. |
| V11.4.1 | L1 | Usar apenas funções de hash aprovadas (sem MD5) em assinaturas, HMAC, KDF e geração de bits aleatórios. |
| V11.4.2 | L2 | Armazenar senhas com função de derivação de chave aprovada e custosa, com parâmetros atuais. |
| V11.4.3 | L2 | Usar hashes resistentes a colisão e de tamanho adequado em assinaturas e verificação de integridade. |
| V11.4.4 | L2 | Usar KDFs aprovadas com alongamento ao derivar chaves de senhas, equilibrando segurança e desempenho. |
| V11.5.1 | L2 | Gerar valores aleatórios não adivinháveis com CSPRNG e pelo menos 128 bits de entropia. |
| V11.6.1 | L2 | Usar apenas algoritmos e modos aprovados para geração de chaves, sementes e assinaturas digitais. |

## V12 Comunicação segura (Secure Communication)

| ID | Nível | O que conferir |
|---|---|---|
| V12.1.1 | L1 | Habilitar apenas versões recentes de TLS (1.2 e 1.3), com a mais nova preferida. |
| V12.1.2 | L2 | Habilitar apenas cipher suites recomendadas, com as mais fortes preferidas. |
| V12.1.3 | L2 | Validar que certificados de cliente mTLS são confiáveis antes de usar a identidade para autenticar ou autorizar. |
| V12.2.1 | L1 | Usar TLS em toda conexão entre cliente e serviços HTTP externos, sem fallback para texto claro. |
| V12.2.2 | L1 | Usar certificados TLS publicamente confiáveis nos serviços externos. |
| V12.3.1 | L2 | Usar protocolo cifrado (TLS) em todas as conexões de entrada e saída (monitoramento, SSH, banco, e-mail etc.). |
| V12.3.2 | L2 | Validar, nos clientes TLS, os certificados recebidos antes de comunicar. |
| V12.3.3 | L2 | Usar TLS entre serviços HTTP internos, sem fallback para comunicação sem cifra. |
| V12.3.4 | L2 | Usar certificados confiáveis entre serviços internos; se autoassinados, confiar só em CAs internas específicas. |

## V13 Configuração (Configuration)

| ID | Nível | O que conferir |
|---|---|---|
| V13.1.1 | L2 | Documentar todas as necessidades de comunicação, inclusive serviços externos e destinos informados pelo usuário. |
| V13.2.1 | L2 | Autenticar a comunicação entre componentes de backend que não usam a sessão padrão (APIs, middleware, dados). |
| V13.2.2 | L2 | Usar contas com privilégio mínimo na comunicação entre componentes de backend. |
| V13.2.3 | L2 | Não usar credenciais padrão (root/root, admin/admin) na autenticação entre serviços. |
| V13.2.4 | L2 | Definir lista permitida de recursos externos com os quais a aplicação pode se comunicar. |
| V13.2.5 | L2 | Configurar o servidor com lista permitida dos destinos para onde pode enviar requisições ou carregar dados. |
| V13.3.1 | L2 | Usar solução de gestão de segredos (cofre de chaves) para criar, guardar, controlar e destruir segredos de backend. |
| V13.3.2 | L2 | Aplicar privilégio mínimo ao acesso aos segredos. |
| V13.4.1 | L1 | Implantar sem metadados de controle de versão (.git, .svn) ou com acesso bloqueado a eles. |
| V13.4.2 | L2 | Desabilitar modos de depuração em todos os componentes em produção. |
| V13.4.3 | L2 | Não expor listagem de diretórios, salvo se intencional. |
| V13.4.4 | L2 | Não suportar o método HTTP TRACE em produção. |
| V13.4.5 | L2 | Não expor documentação (APIs internas) nem endpoints de monitoramento, salvo se intencional. |

## V14 Proteção de dados (Data Protection)

| ID | Nível | O que conferir |
|---|---|---|
| V14.1.1 | L2 | Identificar e classificar em níveis de proteção todos os dados sensíveis tratados, inclusive os apenas codificados. |
| V14.1.2 | L2 | Documentar os requisitos de proteção de cada nível (cifragem, integridade, retenção, log, acesso, privacidade). |
| V14.2.1 | L1 | Enviar dados sensíveis só no corpo ou em cabeçalhos HTTP, nunca na URL ou query string. |
| V14.2.2 | L2 | Impedir que dados sensíveis fiquem em cache de servidor (balanceador, cache da aplicação) ou purgá-los após o uso. |
| V14.2.3 | L2 | Não enviar dados sensíveis a terceiros não confiáveis (ex.: rastreadores). |
| V14.2.4 | L2 | Implementar os controles definidos para cada nível de proteção (cifragem, integridade, retenção, log, acesso, privacidade). |
| V14.3.1 | L1 | Limpar dados autenticados do armazenamento do cliente (ex.: DOM) ao encerrar a sessão. |
| V14.3.2 | L2 | Enviar cabeçalhos anticache (Cache-Control: no-store) para que o navegador não guarde dados sensíveis. |
| V14.3.3 | L2 | Não guardar dados sensíveis em localStorage, sessionStorage, IndexedDB ou cookies, exceto token de sessão. |

## V15 Codificação segura e arquitetura (Secure Coding and Architecture)

| ID | Nível | O que conferir |
|---|---|---|
| V15.1.1 | L1 | Documentar prazos de correção por risco para componentes de terceiros vulneráveis e atualização de bibliotecas. |
| V15.1.2 | L2 | Manter inventário (SBOM) das bibliotecas de terceiros, de fontes confiáveis e mantidas. |
| V15.1.3 | L2 | Documentar funcionalidades custosas ou demoradas e como evitar perda de disponibilidade por seu uso excessivo. |
| V15.2.1 | L1 | Não manter componentes que tenham estourado os prazos documentados de atualização e correção. |
| V15.2.2 | L2 | Implementar defesas contra perda de disponibilidade em funcionalidades custosas, conforme a documentação. |
| V15.2.3 | L2 | Manter em produção só o necessário, sem código de teste, exemplos ou funções de desenvolvimento. |
| V15.3.1 | L1 | Retornar apenas o subconjunto necessário de campos de um objeto de dados. |
| V15.3.2 | L2 | Configurar chamadas do backend a URLs externas para não seguir redirecionamentos, salvo se intencional. |
| V15.3.3 | L2 | Proteger contra mass assignment limitando os campos permitidos por controlador e ação. |
| V15.3.4 | L2 | Repassar o IP original do usuário por campos confiáveis, não manipuláveis, e usá-lo corretamente. |
| V15.3.5 | L2 | Garantir tipos corretos e usar comparações estritas, evitando type juggling e confusão de tipos. |
| V15.3.6 | L2 | Escrever JavaScript que previna prototype pollution (ex.: usar Set ou Map em vez de objetos literais). |
| V15.3.7 | L2 | Defender contra HTTP parameter pollution, tratando a origem dos parâmetros (query, corpo, cookie). |

## V16 Logs de segurança e tratamento de erros (Security Logging and Error Handling)

| ID | Nível | O que conferir |
|---|---|---|
| V16.1.1 | L2 | Manter inventário dos logs por camada: eventos, formatos, armazenamento, uso e controle de acesso. |
| V16.2.1 | L2 | Incluir nos logs metadados necessários (quando, onde, quem, o quê) para investigação detalhada. |
| V16.2.2 | L2 | Sincronizar as fontes de tempo dos logs e registrar timestamps em UTC ou com fuso explícito. |
| V16.2.3 | L2 | Gravar ou transmitir logs só para arquivos e serviços documentados no inventário. |
| V16.2.4 | L2 | Usar formato de log comum que o processador de logs consiga ler e correlacionar. |
| V16.2.5 | L2 | Registrar dados sensíveis conforme o nível de proteção, sem logar credenciais ou dados de pagamento. |
| V16.3.1 | L2 | Registrar todas as operações de autenticação, com sucesso ou falha, e metadados como tipo e fatores. |
| V16.3.2 | L2 | Registrar tentativas de autorização negadas. |
| V16.3.3 | L2 | Registrar eventos de segurança documentados e tentativas de burlar controles (validação, lógica, antiautomação). |
| V16.3.4 | L2 | Registrar erros inesperados e falhas de controles de segurança, como falhas de TLS no backend. |
| V16.4.1 | L2 | Codificar dados em todos os componentes de log para evitar injeção de log. |
| V16.4.2 | L2 | Proteger logs contra acesso não autorizado e alteração. |
| V16.4.3 | L2 | Transmitir logs com segurança a sistema logicamente separado, para análise, alertas e escalonamento. |
| V16.5.1 | L2 | Retornar mensagem genérica em erros inesperados ou sensíveis, sem expor stack traces, consultas, chaves ou tokens. |
| V16.5.2 | L2 | Continuar operando com segurança quando recursos externos falham (circuit breaker, degradação controlada). |
| V16.5.3 | L2 | Falhar de forma segura e controlada em exceções, evitando fail-open (ex.: processar transação apesar de erro de validação). |

## V17 WebRTC (WebRTC)

| ID | Nível | O que conferir |
|---|---|---|
| V17.1.1 | L2 | Restringir o serviço TURN a endereços IP não reservados (redes internas, broadcast, loopback). |
| V17.2.1 | L2 | Gerenciar e proteger a chave do certificado DTLS conforme a política de gestão de chaves. |
| V17.2.2 | L2 | Configurar o servidor de mídia com cipher suites DTLS aprovadas e perfil de proteção seguro para SRTP. |
| V17.2.3 | L2 | Checar a autenticação SRTP no servidor de mídia para evitar injeção RTP, DoS ou degradação de mídia. |
| V17.2.4 | L2 | Manter o servidor de mídia processando tráfego ao receber pacotes SRTP malformados. |
| V17.3.1 | L2 | Manter o servidor de sinalização processando mensagens legítimas durante flood, com limitação de taxa. |
| V17.3.2 | L2 | Manter o servidor de sinalização processando mensagens legítimas diante de mensagens malformadas. |
