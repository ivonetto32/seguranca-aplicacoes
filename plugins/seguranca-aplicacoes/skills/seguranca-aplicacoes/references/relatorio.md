# Modelo do relatório de revisão

Copie a estrutura abaixo. Todo achado cita o ID do ASVS de `asvs-n2.md` (nunca invente ID). Proponha as correções antes de aplicá-las.

## Gravidade

Faixas qualitativas do CVSS v4.0 (FIRST). Calcule a nota do achado, quando possível, e ajuste pelo contexto (exposição, dado afetado, MFA na entrada); registre o motivo se mudar a faixa.

| Gravidade | CVSS 4.0 | Exemplo |
|---|---|---|
| Crítica | 9,0 a 10,0 | Execução remota de código, acesso a dados de todos sem autenticação, segredo de produção no repositório |
| Alta | 7,0 a 8,9 | IDOR em dado pessoal, injeção SQL autenticada, validação de token ausente |
| Média | 4,0 a 6,9 | XSS que exige interação, cabeçalho de segurança ausente com impacto real, log com dado sensível |
| Baixa | 0,1 a 3,9 | Informação de versão exposta, cookie sem atributo recomendado sem impacto direto |

Nota 0,0 é "nenhuma" e vira observação, não achado.

## Estrutura

```
# Relatório de revisão de segurança

## 1. Identificação
- Aplicação:
- Versão / commit:
- Data da revisão:
- Responsável pela revisão:
- Escopo (o que entrou e o que ficou de fora):
- Padrão de referência: OWASP ASVS 5.0.0, nível 2
- Ferramentas executadas (nome e versão): SAST, SCA/SBOM, segredos, contêiner/IaC, DAST, outras
- Limitações (ambiente, acessos, tempo):

## 2. Resumo
| Gravidade | Quantidade |
|---|---|
| Crítica | |
| Alta | |
| Média | |
| Baixa | |
Parecer em 3 a 5 linhas: pode ir ao ar? Com quais condições?
(Regra sugerida: crítica ou alta aberta barra a publicação.)

## 3. Achados
| # | Gravidade | ASVS | Local | Problema | Correção proposta | Como testar |
|---|---|---|---|---|---|---|
| 1 | Alta | V8.2.2 | `arquivo:linha` ou rota | O que está errado e o impacto | O que mudar, em uma frase | Passo a passo curto que prova o defeito e, depois, a correção |

## 4. Não se aplica
| ASVS | Motivo |
|---|---|
| V4.3.1 | A aplicação não expõe GraphQL |

## 5. Pendências que dependem da empresa
| Item | De quem depende | Observação |
|---|---|---|
| Ex.: configuração de MFA/acr no provedor de identidade, retenção de logs, base legal (DPO), regras do SIEM | | |

## 6. Capítulos conferidos
V1 a V17 (marcar atende / não atende / não se aplica, com a evidência).

Segurança: conferido …; pendente …
```

## Regras de preenchimento

1. Um achado por problema; vários locais do mesmo problema ficam na mesma linha.
2. "Local" aponta arquivo e linha (ou rota e parâmetro, ou configuração). Revisão de código lê o código, não só a documentação.
3. "Como testar" deve ser repetível por outra pessoa (requisição, perfil usado, resultado esperado).
4. Achado de ferramenta só entra depois de confirmado; falso positivo vai para a lista de supressões, com motivo.
5. A última linha do relatório e da resposta é sempre: "Segurança: conferido …; pendente …".
6. Prazos de correção: tabela sugerida em `producao.md`, item (g).

## Fontes

- https://www.first.org/cvss/v4-0/specification-document
- OWASP ASVS 5.0.0, conforme `asvs-n2.md`
