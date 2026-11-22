# Access control (authorization)

Authenticating (including MFA at the IdP) tells you **who** the user is. This reference covers what they **may** do. The most common flaw in applications is missing or inconsistent authorization, not weak cryptography. ASVS: V8 (and V15.3.x, V16.3.2).

## 1. Basic rules

1. **Deny by default.** Every route, action and object requires explicit permission; whatever was not allowed is denied, without relying on the framework's default (V8.2.1, V8.2.2). A new route without a rule must fail the tests.
2. **On the server, on every request.** Client-side control (hidden button, front-end route, hidden field) is only usability (V8.3.1). Apply the check in a central, trusted layer (middleware, filter, policy), not repeated by hand in each controller.
3. **By function and by object.** Knowing the user "can edit orders" is not enough: the decision considers **which order**, whose it is and what state it is in (V8.2.1 and V8.2.2).
4. **Least privilege.** Each profile receives only what is necessary; review periodically (permissions accumulate over time).
5. **Fail securely.** Error in the permission check = deny (V16.5.3). Generic message to the user (V16.5.1); respond 404 instead of 403 when the existence of the object is sensitive information.
6. **Document the access rules** by function and by data (and by field, where applicable) in a profile x resource x action matrix (V8.1.1, V8.1.2). The matrix is the source of the tests.

## 2. Model: RBAC, ABAC and relationships

- **RBAC** (roles) suits a few functions and stable profiles. With many roles, "role explosion" appears.
- **ABAC** (attributes: owner, department, data classification, time, authentication level) or **ReBAC** (relationships: "member of project X") express per-object and multi-tenant rules better. OWASP prefers ABAC/ReBAC to pure RBAC for fine-grained needs.
- Practical combination: coarse roles coming from the IdP (groups/roles in the token) for **entry**, plus attribute and owner rules in code/policy for **each object**. Map IdP groups to application permissions at a single point.
- Roles and groups read from the token are valid for as long as the token is (V10.3.2); for immediate revocation effect, query the source of truth or use a short session.
- Authentication level is also an attribute: a critical action requires adequate `acr`/`amr`/`auth_time` (`references/identidade-mfa.md`, section 4; V10.3.4).

## 3. Objects: IDOR / BOLA

- Every access to an object by an identifier coming from the client (URL, body, header, file name) checks that the **current user** has permission over **that** object (V8.2.2). Random IDs (UUID) do not replace the check.
- Prefer queries that already embed the owner/scope (`WHERE id = ? AND owner_id = :user`) over fetching and then verifying; this way the lack of permission becomes "not found".
- Applies to reading, writing, deletion, file downloads, exports, reports, attachments, signed URLs and queues/jobs that process the object later.
- By **field** (BOPLA): return only the permitted fields (V15.3.1) and restrict reading/writing of sensitive fields by permission (V8.2.3).

## 4. Mass assignment

- Do not bind the request body directly to the domain model. Use a **DTO** or an allowlist of writable fields per action (V15.3.3).
- Fields such as `role`, `is_admin`, `tenant_id`, `owner_id`, `status`, `price` never come from the client; the server sets them.
- A denylist is only a complement: a new field escapes it. Also check nested objects and constructors.
- An allowlist of fields does not replace the permission check on the object and the operation.

## 5. APIs: function-level authorization

- Each endpoint declares the required profile/scope, including "internal", administration, health and documentation endpoints (V8.2.1, V13.4.5).
- Also authorize by **HTTP method**: GET allowed does not imply PUT/DELETE allowed. Sensitive functions never on GET (V3.5.3).
- GraphQL: authorization per field and per resolver, not just at query entry; depth and cost limits (V4.3.1).
- API tokens: the receiver validates `aud` and scopes (V10.3.1, V10.3.2). The token's scope is a ceiling; the per-object rule still applies.
- Anti-automation controls on listings and exports to contain exfiltration (V2.4.1).

## 6. Multi-tenant (V8.4.1)

- The `tenant_id` comes from the **authenticated session/identity**, never from a parameter, header or body. If the client provides a tenant, treat it as a selector and verify it against the user's membership.
- Every query and every write filters by tenant in a single layer (repository/ORM with a global scope), not query by query.
- **Defense in depth in the database:** PostgreSQL with *row-level security* enabled and `FORCE ROW LEVEL SECURITY` on tenant tables, a policy reading the tenant from a transaction-local setting (`SET LOCAL`/`set_config(..., true)`), failing closed if absent. The application connection uses a role that is **not** superuser nor `BYPASSRLS` (superuser, `BYPASSRLS` and the table owner, without `FORCE`, bypass the policy). Other databases: an equivalent mechanism, or schema/database per tenant.
- **Cache** keys, queues, search indexes, files and logs include the tenant; background jobs re-establish and re-authorize the tenant context.

## 7. Separate administrative functions

- Administration on a separate route, panel and, where possible, **service/hostname**, with its own profile, reinforced MFA (step-up) and network-restricted access (V3.5.4, V7.5.1).
- No "admin mode" enabled by a parameter or header. Whoever administers the application does not thereby inherit access to users' data.
- Administrative actions and permission changes are logged (V16.3.3) and, if possible, require approval by a second person.
- Default accounts disabled or removed (V6.3.2).

## 8. Authorization tests

- **Automated test matrix** derived from the permissions matrix: for each route and profile, the expected result (allowed/denied). A route without a test = a gap.
- **Two-user test** (and two tenants): user A creates objects; user B tries to read, change, delete and download each one, swapping IDs on all routes and methods. Expected result: denied. Repeat with an ordinary profile trying an administrative function and with a request without a session.
- Mass assignment test: send extra fields (`role`, `tenant_id`) and confirm they are ignored.
- In multi-tenant, test on the deployed configuration (same database role and same connection pool), with requests from two tenants on the same connection to prove there is no context leakage, and discover the tables from the schema, not from a manual list.
- Integration tests run in the pipeline; DAST with two users covers what the unit test does not reach. Automated testing does not replace manual review.

## 9. Access-denied logging (V16.3.2)

- Log every denial: when (UTC), where (route, method, version), who (user, trusted source IP), what (action and object, reason), with a request correlation identifier (V16.2.1, V16.2.2).
- No unnecessary data: no token, clear-text session identifier, password or personal data beyond what is needed (V16.2.5). Encode CR/LF and control what the attacker chooses (IDs) against log injection (V16.4.1).
- Send to the SIEM, on a separate, protected system (V16.4.2, V16.4.3). Alert on spikes in denials per user or route (a sign of IDOR scanning). If denials feed account lockout, prevent them from being used to lock out third parties.

## Sources

- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP Mass Assignment Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html
- OWASP Multi-Tenant Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- PostgreSQL, Row Security Policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- OWASP ASVS 5.0.0: https://github.com/OWASP/ASVS/tree/master/5.0
