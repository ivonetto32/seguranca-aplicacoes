# Segurança de aplicações / Secure applications

Skill para o Claude sobre segurança no desenvolvimento de aplicações hospedadas em infraestrutura própria, com acesso por MFA. Segue o OWASP ASVS 5.0.0 nível 2 e o NIST SSDF. Tem quatro modos: desenvolver, revisar, montar a esteira de verificação e preparar o monitoramento em produção.

*A Claude skill for secure development of applications hosted on your own infrastructure behind MFA. It follows OWASP ASVS 5.0.0 level 2 and NIST SSDF, and has four modes: develop, review, build the verification pipeline, and prepare production monitoring.*

| Skill | Idioma / Language |
|---|---|
| `seguranca-aplicacoes` | Português (Brasil) |
| `secure-applications` | English |

As duas skills só rodam quando chamadas, nunca por conta própria. *Both run only when invoked.*

## Instalação no Claude Code (plugin) / Installing in Claude Code (plugin)

```
claude plugin marketplace add <endereço do repositório ou pasta local>
claude plugin install seguranca-aplicacoes@seguranca-aplicacoes
```

Para chamar: `/seguranca-aplicacoes:seguranca-aplicacoes` ou `/seguranca-aplicacoes:secure-applications`, dizendo o modo (desenvolver, revisar, esteira ou produção).
Atualizar: `claude plugin update seguranca-aplicacoes@seguranca-aplicacoes`.

*To invoke: `/seguranca-aplicacoes:secure-applications`, stating the mode (develop, review, pipeline or production).*

## Instalação no claude.ai (zip) / Installing in claude.ai (zip)

```
node scripts/gerar-zip.js
```

O comando gera `dist/seguranca-aplicacoes.zip` e `dist/secure-applications.zip`. Envie o zip em Configurações > Skills; nos planos Team e Enterprise, o administrador pode publicá-lo para a organização. O claude.ai não aceita o campo de chamada manual, então no zip a regra "só quando chamada" fica apenas no texto da descrição. A cada atualização, envie o zip de novo.

*Generates both zips in `dist/`. Upload them in Settings > Skills (admins can provision them org-wide). claude.ai does not accept the manual-invocation field, so in the zip the "only when invoked" rule is in the description text only. Re-upload on each update.*

## Limites / Limits

Nenhum processo garante uma aplicação sem vulnerabilidades. A skill reduz as falhas conhecidas, confere a aplicação contra o ASVS nível 2 e prepara a detecção contínua. A operação em produção (SIEM, varreduras agendadas, pentest) depende da equipe de infraestrutura e de segurança da empresa. Os modelos de pipeline trazem as versões e os digests fixados na data da publicação; mantenha-os atualizados com Dependabot ou Renovate. A parte de proteção de dados não é parecer jurídico.

*No process guarantees zero vulnerabilities. Pipeline templates pin versions and digests as of publication; keep them updated with Dependabot or Renovate. The privacy reference is not legal advice.*

## Situação dos modelos de esteira / Pipeline template status

| Plataforma | Situação |
|---|---|
| Bitbucket Pipelines | Testado na nuvem: aprova o app corrigido e barra o vulnerável em todas as etapas |
| GitHub Actions | Validado localmente; usa os mesmos comandos aprovados na nuvem no GitLab e no Bitbucket. No teste, o GitHub desligou o Actions dos repositórios que continham o app de teste com falhas de propósito (provável proteção automática contra abuso), por isso não houve execução na nuvem |
| GitLab CI | Testado na nuvem: aprova o app corrigido e barra o vulnerável em todas as etapas |
| Azure DevOps, Jenkins | Validados localmente; não testados na nuvem |

Todos os comandos das ferramentas (Gitleaks, Semgrep, Trivy, ZAP) foram testados em contêiner contra um app vulnerável e um corrigido. Para conferir os modelos depois de qualquer alteração: `python scripts/validar-modelos.py`.

**Bitbucket, para a empresa saber antes:** em workspace novo, os Pipelines só ligam com a **verificação em duas etapas do próprio Bitbucket** ativa em quem os habilita (a do Google ou da Atlassian não basta); o plano gratuito tem **50 minutos por mês** e **até 5 etapas simultâneas por conta** (dois pipelines juntos podem passar disso).

*Bitbucket: Pipelines in new workspaces require Bitbucket's own two-step verification for the user enabling them; the free plan has 50 build minutes per month and at most 5 concurrent steps per account.*

## Licença / License

CC BY-SA 4.0. Contém resumos do OWASP ASVS 5.0.0 (© OWASP Foundation, CC BY-SA 4.0).
