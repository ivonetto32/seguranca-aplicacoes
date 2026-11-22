# Privacidade e proteção de dados pessoais

Este texto é apoio técnico, **não é parecer jurídico**. Quem decide base legal, prazos e comunicações é o encarregado (DPO) da empresa, com o jurídico. Números de artigo conferidos nos textos oficiais em novembro de 2026; reconfira antes de citar em documento formal.

## Qual lei aplicar

| Titulares dos dados | Norma |
|---|---|
| No Brasil | LGPD, Lei 13.709/2018 |
| Na União Europeia | GDPR, Regulamento (UE) 2016/679 |
| Nos dois | Ambas; na dúvida, adote o requisito mais rigoroso de cada item |

Pergunte ao usuário onde estão os titulares se isso não estiver claro. Dado pessoal é toda informação ligada a pessoa identificada ou identificável (inclui IP, identificador de usuário, e-mail corporativo).

## Checklist antes de criar app, campo, exportação ou integração com dado pessoal

| # | Pergunta | LGPD | GDPR | Como a aplicação apoia |
|---|---|---|---|---|
| 1 | Qual a **finalidade** específica e a **base legal**? | art. 6 (princípios), art. 7 | art. 5, art. 6 | Registrar finalidade e base por campo/tratamento; não reutilizar para fim diferente |
| 2 | **Dado sensível** (saúde, biometria, origem racial/étnica, religião, opinião política, filiação sindical, vida sexual, genético)? Se sim, base própria e controles reforçados | art. 11 | art. 9 | Classificar o campo (ASVS V14.1.1, V14.1.2); cifrar, restringir acesso por perfil e por campo (V8.2.3) |
| 3 | **Necessidade e minimização**: precisa mesmo de cada campo? | art. 6, III | art. 5(1)(c) | Remover campo opcional; retornar só o necessário (V15.3.1); mascarar na tela |
| 4 | **Retenção e eliminação**: por quanto tempo e como apagar? | art. 6, art. 15 e 16 (término do tratamento) | art. 5(1)(e) | Prazo por tipo de dado, rotina de descarte, backup incluído |
| 5 | **Direitos do titular** | art. 18 | arts. 15 a 22 (acesso art. 15, retificação art. 16, apagamento art. 17, portabilidade art. 20) | Função de localizar, exportar (formato aberto), corrigir e apagar/anonimizar os dados de uma pessoa; canal e registro do pedido |
| 6 | **Compartilhamento** e **transferência internacional**? | art. 33 (e seguintes) | arts. 44 a 49 | Listar destinatários (V13.1.1); contrato com operador/processador (GDPR art. 28); mecanismo de transferência; nuvem e IA fora do país contam |
| 7 | **Registro das operações** | art. 37 | art. 30 | Manter o inventário atualizado a cada mudança relevante |
| 8 | **Avaliação de impacto** se houver risco alto (larga escala, dado sensível, monitoramento, decisão automatizada, IA) | art. 38 (RIPD) | art. 35 (DPIA) | Acionar o DPO antes do desenvolvimento, não depois |
| 9 | **Privacidade desde a concepção e por padrão** | art. 46, §2º | art. 25 | Padrão mais restritivo, coleta mínima, controles no desenho |
| 10 | **Segurança do tratamento** | art. 46 | art. 32 | Todo o restante desta skill (acesso, cifragem, logs) |
| 11 | **Incidente com dado pessoal**: quem avisa, quando | art. 48 | arts. 33 e 34 | Ver abaixo |

Se qualquer resposta for "não sei", pare e consulte o DPO antes de criar.

## Comunicação de incidente

- **GDPR art. 33**: o controlador notifica a autoridade de supervisão sem demora injustificada e, quando viável, em até **72 horas** depois de tomar ciência, salvo improbável risco aos titulares. Art. 34: comunicação aos titulares quando o risco for alto.
- **LGPD art. 48**: comunicação à ANPD e ao titular quando o incidente puder acarretar risco ou dano relevante. O prazo e o conteúdo estão no Regulamento de Comunicação de Incidente de Segurança (Resolução CD/ANPD nº 15/2024), que no site da ANPD indica **3 dias úteis** a partir da ciência. **Confirme o prazo vigente no site oficial da ANPD** (gov.br/anpd), pois regulamentos são alterados.
- A aplicação deve facilitar: horário de ciência registrado, logs preservados, lista de titulares afetados obtenível, contato do DPO documentado. Quem avalia o risco e comunica é o DPO, não o desenvolvedor.

## Dado pessoal em logs, testes, commits e IA

1. **Logs**: só identificador interno do usuário, sem nome, documento, e-mail pessoal, corpo de requisição com dados pessoais nem token (ASVS V16.2.5). Retenção definida e acesso restrito.
2. **Testes e homologação**: só dados fictícios ou anonimizados de forma irreversível; nunca cópia de produção.
3. **Repositório e commits**: nenhum dado pessoal real em código, fixtures, prints, issues ou mensagens de commit.
4. **Dado pessoal real em teste, log ou commit é incidente.** Pare, não apague sozinho o histórico às pressas, preserve evidência, notifique o DPO e a equipe de segurança; a limpeza (reescrever histórico, purgar log, revogar acessos) é feita sob orientação.
5. **IA**: não enviar dado pessoal ou confidencial a modelo externo sem base legal, contrato e aprovação do DPO; ver `ia-llm.md`.
6. **Exportações**: limitar por perfil, registrar quem exportou o quê (evento de log), proteger o arquivo gerado e dar prazo de vida a ele.

## Em cada entrega, registrar

Finalidade, base legal indicada pelo DPO, campos tratados e sensíveis, retenção, destinatários e transferências, necessidade de RIPD/DPIA, e a linha "Privacidade: conferido …; pendente (decisão do DPO) …".

## Fontes

- https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (arts. 6, 7, 11, 18, 33, 37, 38, 46, 48, 50)
- https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679 (arts. 5, 6, 9, 15, 16, 17, 20, 25, 28, 30, 32, 33, 34, 35, 44)
- https://www.gov.br/anpd/pt-br/assuntos/incidente-de-seguranca (Resolução CD/ANPD nº 15/2024, prazo de 3 dias úteis)
