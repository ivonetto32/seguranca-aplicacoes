# Python: security

Applies when there is `requirements.txt`, `pyproject.toml`, `Pipfile`, `manage.py`/`settings.py` (Django), `from flask import` (Flask) or `from fastapi import` (FastAPI).

## Framework controls

| Topic | How to do it in this framework | ASVS |
|---|---|---|
| Output encoding | Django and Jinja2 (Flask) escape HTML by default; keep attributes quoted (`value="{{ x }}"`). URLs coming from data: validate the scheme (no `javascript:`). | V1.2.1, V1.2.2, V3.2.2 |
| SQL / ORM | Django ORM and SQLAlchemy parameterize; raw queries only with placeholders (`cursor.execute(sql, params)`, `text(...).bindparams`). Beware of `extra()`, `RawSQL`, f-strings in SQL. | V1.2.4 |
| Input validation | Django Forms/Serializers (DRF); Pydantic in FastAPI (types, `Field` with limits); Flask with marshmallow/Pydantic. Validate on the server, allow list. | V2.2.1, V2.2.2, V15.3.3 |
| CSRF | Django: `CsrfViewMiddleware` active, no `csrf_exempt` on a view with cookies. Flask provides no protection: use Flask-WTF/CSRFProtect. FastAPI: if using a session cookie, add a token/`Origin` check; with a bearer header the risk is different. | V3.5.1, V3.5.3 |
| Session / cookies | Django: `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SESSION_COOKIE_HTTPONLY`, `SESSION_COOKIE_SAMESITE`, `SESSION_COOKIE_AGE`. Flask: `SESSION_COOKIE_SECURE/HTTPONLY/SAMESITE`, `PERMANENT_SESSION_LIFETIME`, `session.clear()` at login. | V3.3.1–V3.3.4, V7.2.4, V7.3.1 |
| OIDC/SAML authentication | Authlib (OIDC client for Django/Flask/FastAPI) or `mozilla-django-oidc` (Django); SAML: `python3-saml`/`pysaml2` with mandatory signature validation. FastAPI: validate the JWT with the issuer's key (`PyJWT`/Authlib), `iss`, `aud`, `exp`, fixed algorithm. | V6.8.2, V9.1.1–V9.1.3, V10.5.4 |
| Authorization | Django: `login_required`, `permission_required`, per-object permissions (e.g. django-guardian) or a queryset filtered by owner. FastAPI: `Depends` with role and object checks on every route. Deny by default (global middleware/dependency). | V8.2.1, V8.2.2, V8.3.1 |
| Headers / CSP | Django: `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `XFrameOptionsMiddleware`, `SECURE_CONTENT_TYPE_NOSNIFF`; CSP via a package (django-csp). Flask: Flask-Talisman. FastAPI: your own middleware. | V3.4.1, V3.4.3–V3.4.6 |
| File upload | Limit size on the web server too (Django's settings are not enough); extensions by allow list; ignore the uploaded name; serve uploads with `Content-Disposition: attachment` or from a separate domain; check the content (Pillow does not prove an image is harmless). | V5.2.1, V5.2.2, V5.3.2, V5.4.1 |
| Deserialization | Never `pickle`/`marshal`/`shelve` with external data; `yaml.safe_load`, not `yaml.load`; JSON or formats with a schema. | V1.5.2 |
| Secrets / config | Environment variables or a vault; `SECRET_KEY` outside the code (Django, with `SECRET_KEY_FALLBACKS` during rotation); `.env` outside Git. | V13.3.1, V13.3.2 |
| Logging | `logging` with a structured format; no password/token/PII; escape line breaks from external data. | V16.2.5, V16.3.1, V16.4.1 |
| Errors / debugging | Django: `DEBUG = False`, explicit `ALLOWED_HOSTS`, run `manage.py check --deploy`. Flask: `debug=False` (the interactive debugger allows code execution), `TRUSTED_HOSTS`. FastAPI: turn off `/docs` and `/openapi.json` in production if internal. | V13.4.2, V13.4.5, V16.5.1 |

## Common pitfalls

- `mark_safe`, the `|safe` filter, `{% autoescape off %}` (Django) and `Markup(...)`/`|safe` (Jinja2) on user data.
- `pickle.loads`, `yaml.load` without `SafeLoader`, `eval`, `exec` and `compile` with external data.
- `render_template_string` with user data (template injection, V1.3.7).
- `subprocess` with `shell=True` or `os.system` with built arguments.
- SQL via f-string/`%`/`.format`, including in `order_by` and column names.
- `csrf_exempt`, `DEBUG=True` and `ALLOWED_HOSTS=['*']` in production; `request.META["HTTP_HOST"]` without validation.
- `requests.get(user_url)` without a destination allow list (SSRF) and with automatic redirects.
- `tarfile`/`zipfile` `extractall` without validating paths (path traversal).

## Tools

- SAST: Semgrep with Python rule sets (and Django/Flask); Bandit (PyCQA security linter, `bandit -r .`).
- Dependencies: `pip-audit` (`pip-audit -r requirements.txt`, PyPA/OSV database; exits with code 1 if it finds a flaw); SBOM with CycloneDX; pin versions with hashes (`pip-compile --generate-hashes`).

## Sources

- https://docs.djangoproject.com/en/stable/topics/security/
- https://docs.djangoproject.com/en/stable/howto/deployment/checklist/
- https://flask.palletsprojects.com/en/stable/web-security/
- https://fastapi.tiangolo.com/tutorial/security/
- https://github.com/PyCQA/bandit
- https://github.com/pypa/pip-audit
- https://github.com/semgrep/semgrep-rules
