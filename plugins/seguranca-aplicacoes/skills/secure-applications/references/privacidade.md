# Privacy and personal data protection

This text is technical support, **not legal advice**. The company's DPO (encarregado under LGPD), together with legal counsel, decides on legal basis, deadlines and communications. Article numbers were checked against the official texts in November 2026; re-check before citing in a formal document.

## Which law applies

| Data subjects | Law |
|---|---|
| In Brazil | LGPD, Law 13.709/2018 |
| In the European Union | GDPR, Regulation (EU) 2016/679 |
| In both | Both; when in doubt, adopt the stricter requirement of each item |

Ask the user where the data subjects are if this is not clear. Personal data is any information relating to an identified or identifiable person (it includes IP address, user identifier, corporate email).

## Checklist before creating an app, field, export or integration with personal data

| # | Question | LGPD | GDPR | How the application helps |
|---|---|---|---|---|
| 1 | What is the specific **purpose** and the **legal basis**? | art. 6 (principles), art. 7 | art. 5, art. 6 | Record purpose and basis per field/processing activity; do not reuse for a different purpose |
| 2 | **Sensitive data** (health, biometrics, racial/ethnic origin, religion, political opinion, trade union membership, sex life, genetic)? If so, a dedicated basis and reinforced controls | art. 11 | art. 9 | Classify the field (ASVS V14.1.1, V14.1.2); encrypt, restrict access by profile and by field (V8.2.3) |
| 3 | **Necessity and minimization**: is each field really needed? | art. 6, III | art. 5(1)(c) | Remove optional fields; return only what is necessary (V15.3.1); mask on screen |
| 4 | **Retention and deletion**: for how long and how to erase? | art. 6, arts. 15 and 16 (end of processing) | art. 5(1)(e) | Retention period per data type, disposal routine, backups included |
| 5 | **Data subject rights** | art. 18 | arts. 15 to 22 (access art. 15, rectification art. 16, erasure art. 17, portability art. 20) | Function to locate, export (open format), correct and erase/anonymize a person's data; channel and record of the request |
| 6 | **Sharing** and **international transfer**? | art. 33 (and following) | arts. 44 to 49 | List recipients (V13.1.1); contract with the operator/processor (GDPR art. 28); transfer mechanism; cloud and AI outside the country count |
| 7 | **Record of processing operations** | art. 37 | art. 30 | Keep the inventory updated at every relevant change |
| 8 | **Impact assessment** if risk is high (large scale, sensitive data, monitoring, automated decision, AI) | art. 38 (DPIA, called RIPD under LGPD) | art. 35 (DPIA) | Involve the DPO before development, not after |
| 9 | **Privacy by design and by default** | art. 46, §2 | art. 25 | Most restrictive default, minimal collection, controls in the design |
| 10 | **Security of processing** | art. 46 | art. 32 | Everything else in this skill (access, encryption, logs) |
| 11 | **Personal data incident**: who notifies, when | art. 48 | arts. 33 and 34 | See below |

If any answer is "I don't know", stop and consult the DPO before creating.

## Incident notification

- **GDPR art. 33**: the controller notifies the supervisory authority without undue delay and, where feasible, within **72 hours** after becoming aware, unless the risk to data subjects is unlikely. Art. 34: communication to data subjects when the risk is high.
- **LGPD art. 48**: notification to the ANPD (Brazilian data protection authority) and to the data subject when the incident may cause relevant risk or harm. The deadline and content are in the Security Incident Notification Regulation (ANPD Board Resolution CD/ANPD No. 15/2024), which the ANPD website gives as **3 business days** from awareness. **Confirm the current deadline on the official ANPD website** (gov.br/anpd), since regulations are amended.
- The application should make this easy: time of awareness recorded, logs preserved, list of affected data subjects obtainable, DPO contact documented. Whoever assesses the risk and notifies is the DPO, not the developer.

## Personal data in logs, tests, commits and AI

1. **Logs**: only the user's internal identifier, no name, document number, personal email, request body with personal data or token (ASVS V16.2.5). Retention defined and access restricted.
2. **Tests and staging**: only fictitious or irreversibly anonymized data; never a copy of production.
3. **Repository and commits**: no real personal data in code, fixtures, screenshots, issues or commit messages.
4. **Real personal data in a test, log or commit is an incident.** Stop, do not hastily erase the history on your own, preserve evidence, notify the DPO and the security team; cleanup (rewriting history, purging the log, revoking access) is done under guidance.
5. **AI**: do not send personal or confidential data to an external model without a legal basis, a contract and DPO approval; see `ia-llm.md`.
6. **Exports**: limit by profile, record who exported what (log event), protect the generated file and give it a lifetime.

## In each deliverable, record

Purpose, legal basis indicated by the DPO, fields processed and sensitive ones, retention, recipients and transfers, need for a DPIA (RIPD under LGPD), and the line "Privacy: checked …; pending (DPO decision) …".

## Sources

- https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (arts. 6, 7, 11, 18, 33, 37, 38, 46, 48, 50)
- https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679 (arts. 5, 6, 9, 15, 16, 17, 20, 25, 28, 30, 32, 33, 34, 35, 44)
- https://www.gov.br/anpd/pt-br/assuntos/incidente-de-seguranca (Resolution CD/ANPD No. 15/2024, 3-business-day deadline)
