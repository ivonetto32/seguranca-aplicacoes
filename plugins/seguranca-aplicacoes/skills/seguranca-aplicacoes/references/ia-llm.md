# Aplicações que usam LLM

Base: OWASP Top 10 for LLM Applications, edição 2025 (conferida em genai.owasp.org). A própria OWASP avisa que nenhuma defesa elimina por completo o risco, por causa da natureza probabilística dos modelos; o objetivo é reduzir a chance e **limitar o dano**. Regra central: o modelo é um componente **não confiável**, como um usuário externo. Valem também ASVS V1.2 (codificação de saída), V1.3.2 (sem `eval`), V3.2.2, V2.4.1 (antiautomação), V16 (logs) e V14 (dados sensíveis).

## Como tratar cada risco

| Risco 2025 | O que fazer |
|---|---|
| **LLM01 Prompt injection** | Separar instruções (prompt de sistema, fixo no servidor) de dados (texto do usuário, documentos, páginas, e-mails), rotulando o conteúdo externo como não confiável. Tratar a saída do modelo como entrada não confiável. Pedir formato estruturado (JSON) e validar por esquema no código, rejeitando o que não bater. Dar ao modelo só as ferramentas e permissões necessárias. Testar com ataques adversariais (injeção direta e indireta, via documento) antes de publicar e depois a cada mudança de prompt ou modelo. |
| **LLM02 Divulgação de informação sensível** | Não enviar dado pessoal, sigiloso ou segredo ao modelo. Fazer triagem local antes do envio (detecção e mascaramento de CPF, e-mail, números de processo, chaves) e bloquear o envio quando achar. Aplicar o mesmo filtro à resposta. Verificar contrato e retenção do provedor; ver `privacidade.md`. Contexto recuperado (RAG) respeita a permissão do usuário que pergunta. |
| **LLM03 Cadeia de suprimentos** | Modelos, adaptadores, bibliotecas, plugins e conjuntos de dados vêm de fonte confiável, com versão fixa e hash; entram no SBOM (formato CycloneDX comporta modelos). Evitar formatos de modelo que executam código ao carregar. |
| **LLM04 Envenenamento de dados e modelo** | Controlar quem pode alterar dados de ajuste fino, base de conhecimento e embeddings; registrar origem; revisar o que entra. |
| **LLM05 Tratamento impróprio de saída** | Escapar ou sanitizar a saída antes de exibir (`textContent` no navegador, codificação de contexto, sanitizador de HTML/Markdown reconhecido). Nunca montar SQL, comando, caminho de arquivo, URL ou código com a saída do modelo; usar consultas parametrizadas e lista do que é permitido. Nunca `eval` na saída. |
| **LLM06 Agência excessiva** | A saída do modelo **nunca** dispara, sozinha, escrita, exclusão, envio, publicação, pagamento ou mudança de permissão: o usuário confirma, vendo exatamente o que será feito. Ferramentas com privilégio mínimo (somente leitura quando possível), credencial própria da aplicação com escopo estreito, sem herdar privilégio de administrador. A autorização é conferida no servidor sobre o usuário real, não sobre o que o modelo "decidiu". |
| **LLM07 Vazamento do prompt de sistema** | Não colocar segredo, chave, regra de acesso nem dado sensível no prompt; controles de segurança ficam no código, não nas instruções ao modelo. Considerar o prompt como potencialmente público. |
| **LLM08 Fragilidades de vetores e embeddings** | Em RAG, aplicar controle de acesso por documento na busca, separar bases por inquilino/perfil, validar o que é indexado e registrar a origem de cada trecho citado. |
| **LLM09 Desinformação** | Mostrar o texto gerado como **rascunho**, com aviso visível de que foi gerado por IA e precisa de revisão humana; exigir confirmação de revisão antes de copiar, exportar, enviar ou gravar como definitivo; citar fontes quando houver; não usar a saída para decisão que afete pessoas sem revisão humana. |
| **LLM10 Consumo ilimitado** | Limite de requisições por usuário, tamanho máximo de entrada e de saída, tempo limite, teto de custo/tokens por usuário e global, alerta de gasto anormal (V2.4.1). |

## Registro do uso de IA

Registrar, sem o conteúdo integral quando houver dado pessoal: data/hora UTC, usuário (identificador interno), modelo e versão, finalidade/funcionalidade, tamanho de entrada e saída, resultado da triagem de dados sensíveis (bloqueou ou não), se o usuário confirmou a revisão e o `request_id`. Guardar o prompt completo só se necessário e com retenção curta. Alertas: pico de uso, muitos bloqueios de triagem, tentativas de injeção detectadas.

## Antes de publicar

- Inventário de onde o modelo é chamado, com que dados e com qual provedor (V13.1.1).
- Aprovação do DPO se houver dado pessoal ou decisão automatizada (RIPD/DPIA).
- Teste de injeção direta e indireta e de vazamento do prompt, com o resultado no relatório.
- Plano para o provedor ficar fora do ar (a aplicação continua segura e útil sem IA, V16.5.2).

## Fontes

- https://genai.owasp.org/llm-top-10/
- https://genai.owasp.org/llmrisk/llm01-prompt-injection/
