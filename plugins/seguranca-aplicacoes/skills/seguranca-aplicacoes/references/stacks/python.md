# Python: segurança

Aplica-se quando há `requirements.txt`, `pyproject.toml`, `Pipfile`, `manage.py`/`settings.py` (Django), `from flask import` (Flask) ou `from fastapi import` (FastAPI).

## Controles do framework

| Tema | Como fazer neste framework | ASVS |
|---|---|---|
| Codificação de saída | Django e Jinja2 (Flask) escapam HTML por padrão; manter atributos entre aspas (`value="{{ x }}"`). URLs vindas de dado: validar o esquema (sem `javascript:`). | V1.2.1, V1.2.2, V3.2.2 |
| SQL / ORM | Django ORM e SQLAlchemy parametrizam; consulta crua só com placeholders (`cursor.execute(sql, params)`, `text(...).bindparams`). Cuidado com `extra()`, `RawSQL`, f-string em SQL. | V1.2.4 |
| Validação de entrada | Django Forms/Serializers (DRF); Pydantic em FastAPI (tipos, `Field` com limites); Flask com marshmallow/Pydantic. Validar no servidor, lista do permitido. | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | Django: `CsrfViewMiddleware` ativo, sem `csrf_exempt` em view com cookie. Flask não traz proteção: usar Flask-WTF/CSRFProtect. FastAPI: se usar cookie de sessão, adicionar token/verificação de `Origin`; com bearer em cabeçalho o risco é outro. | V3.5.1, V3.5.3 |
| Sessão / cookies | Django: `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SESSION_COOKIE_HTTPONLY`, `SESSION_COOKIE_SAMESITE`, `SESSION_COOKIE_AGE`. Flask: `SESSION_COOKIE_SECURE/HTTPONLY/SAMESITE`, `PERMANENT_SESSION_LIFETIME`, `session.clear()` no login. | V3.3.1–V3.3.4, V7.2.4, V7.3.1 |
| Autenticação OIDC/SAML | Authlib (cliente OIDC para Django/Flask/FastAPI) ou `mozilla-django-oidc` (Django); SAML: `python3-saml`/`pysaml2` com validação de assinatura obrigatória. FastAPI: validar JWT com a chave do emissor (`PyJWT`/Authlib), `iss`, `aud`, `exp`, algoritmo fixo. | V6.8.2, V9.1.1–V9.1.3, V10.5.4 |
| Autorização | Django: `login_required`, `permission_required`, permissões por objeto (ex.: django-guardian) ou filtro de queryset pelo dono. FastAPI: `Depends` com verificação de perfil e do objeto em cada rota. Negar por padrão (middleware/dependência global). | V8.2.1, V8.2.2, V8.3.1 |
| Cabeçalhos / CSP | Django: `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `XFrameOptionsMiddleware`, `SECURE_CONTENT_TYPE_NOSNIFF`; CSP por pacote (django-csp). Flask: Flask-Talisman. FastAPI: middleware próprio. | V3.4.1, V3.4.3–V3.4.6 |
| Upload de arquivo | Limitar tamanho também no servidor web (as configurações do Django não bastam); extensões por lista; ignorar nome enviado; servir upload com `Content-Disposition: attachment` ou de domínio separado; checar conteúdo (Pillow não prova que é imagem inofensiva). | V5.2.1, V5.2.2, V5.3.2, V5.4.1 |
| Desserialização | Nunca `pickle`/`marshal`/`shelve` com dado externo; `yaml.safe_load`, não `yaml.load`; JSON ou formatos com esquema. | V1.5.2 |
| Segredos / config | Variáveis de ambiente ou cofre; `SECRET_KEY` fora do código (Django, com `SECRET_KEY_FALLBACKS` na rotação); `.env` fora do Git. | V13.3.1, V13.3.2 |
| Logging | `logging` com formato estruturado; sem senha/token/PII; escapar quebras de linha de dado externo. | V16.2.5, V16.3.1, V16.4.1 |
| Erros / depuração | Django: `DEBUG = False`, `ALLOWED_HOSTS` explícito, rodar `manage.py check --deploy`. Flask: `debug=False` (o depurador interativo permite executar código), `TRUSTED_HOSTS`. FastAPI: desligar `/docs` e `/openapi.json` em produção se internos. | V13.4.2, V13.4.5, V16.5.1 |

## Armadilhas comuns

- `mark_safe`, filtro `|safe`, `{% autoescape off %}` (Django) e `Markup(...)`/`|safe` (Jinja2) sobre dado do usuário.
- `pickle.loads`, `yaml.load` sem `SafeLoader`, `eval`, `exec` e `compile` com dado externo.
- `render_template_string` com dado do usuário (injeção de template, V1.3.7).
- `subprocess` com `shell=True` ou `os.system` com argumentos montados.
- SQL por f-string/`%`/`.format`, inclusive em `order_by` e em nomes de coluna.
- `csrf_exempt`, `DEBUG=True` e `ALLOWED_HOSTS=['*']` em produção; `request.META["HTTP_HOST"]` sem validação.
- `requests.get(url_do_usuario)` sem lista de destinos (SSRF) e com redirecionamento automático.
- `tarfile`/`zipfile` `extractall` sem validar caminhos (path traversal).

## Ferramentas

- SAST: Semgrep com conjuntos de regras de Python (e de Django/Flask); Bandit (linter de segurança do PyCQA, `bandit -r .`).
- Dependências: `pip-audit` (`pip-audit -r requirements.txt`, base PyPA/OSV; sai com código 1 se achar falha); SBOM com CycloneDX; fixar versões com hashes (`pip-compile --generate-hashes`).

## Fontes

- https://docs.djangoproject.com/en/stable/topics/security/
- https://docs.djangoproject.com/en/stable/howto/deployment/checklist/
- https://flask.palletsprojects.com/en/stable/web-security/
- https://fastapi.tiangolo.com/tutorial/security/
- https://github.com/PyCQA/bandit
- https://github.com/pypa/pip-audit
- https://github.com/semgrep/semgrep-rules
