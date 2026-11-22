# Identity and MFA (delegated to the identity provider)

Principle: the application **does not implement passwords or MFA**. It delegates to the corporate identity provider (IdP) and only consumes the result, verifying it. As a result, the ASVS credential requirements (V6.2, V6.4, V6.5) belong to the IdP; the application is responsible for V6.8 (assertions), V7 (session), V9 (tokens) and V10 (OIDC). If a local login path exists (emergency account, API), document it (V6.1.3, V6.3.4) and apply the same controls.

## 1. OIDC (recommended default)

- **Flow:** authorization code with **PKCE (S256)**, even for a confidential client (V10.4.6, V10.2.1). No implicit or password grant (V10.4.4). Each client receives only the grants and scopes it needs (V10.4.4, V10.4.11).
- **Confidential client** authenticated at the token endpoint, preferably by `private_key_jwt` or mTLS instead of a shared secret (V10.4.10). A secret, if any, goes in the vault (V13.3.1).
- **`state`** random and bound to the browser that started the flow; **`nonce`** in the ID Token, checked on return (V10.1.2, V10.5.1). Keep the `state`/`nonce`/`code_verifier` set in the pre-login session, never in a URL.
- **Redirect URI:** pre-registered list, exact string comparison, HTTPS only (V10.4.1). No wildcards and no open redirects (V3.7.2).
- **ID Token validation** (use a mature library, not your own code): signature against the issuer's JWKS, algorithm from an allowlist and never `none` (V9.1.1, V9.1.2); key obtained from trusted configuration, not from the token (V9.1.3); `iss` equal to the expected value (V10.5.3); `aud` contains the `client_id` (V10.5.4); `exp`/`nbf` (V9.2.1); `nonce` (V10.5.1). With more than one IdP, also validate `iss` to prevent mix-up, and do not accept the same `sub` from different IdPs as the same person (V10.2.2, V6.8.1).
- **User identity** = immutable (`iss`, `sub`) pair. Email, name and UPN change and can be reassigned: they are not suitable as a key or for authorization decisions (V10.5.2, V10.3.3).
- **Access token** intended for an API: validate `aud`, scopes and token type (V9.2.2, V9.2.3, V10.3.1, V10.3.2). Never in the URL.
- **Token storage:** on the server, bound to the session (V10.1.1). In an SPA, use the **BFF** (backend for frontend) pattern: the backend is the confidential OAuth client, holds the tokens and hands the browser only an `HttpOnly` session cookie; it requires CSRF protection and an allowlist of proxy destinations. This is the option recommended by IETF guidance for browser apps with sensitive data. Tokens in `localStorage` or `sessionStorage` are not acceptable (V14.3.3).
- **Refresh token:** backend only; rotation on every use or sender binding (DPoP or mTLS) (V10.4.5); absolute expiry even with sliding expiry (V10.4.8); revocation available at the IdP (V10.4.9). Reuse of the authorization code must be rejected (V10.4.2), with a short lifetime (V10.4.3).
- **Logout:** (a) *RP-initiated*: end the local session on the server and redirect to the IdP's `end_session_endpoint` with `id_token_hint` and a previously registered `post_logout_redirect_uri`; (b) *back-channel*: expose an endpoint that receives the logout token and check signature, `iss`, `aud`, `iat`, `exp`, presence of `sid` or `sub`, the back-channel logout `events` claim, **absence of `nonce`**, and a non-repeated `jti`; reject with 400 on failure, and rate-limit against forced logout (V10.5.5, V7.6.1, V7.1.3). Not every IdP offers both: see section 5.

## 2. SAML 2.0

- **Signature mandatory and verified** on the response or, preferably, on the assertion the application actually uses; reject anything unsigned or failing verification (V6.8.2). The verification key comes from the configured IdP's metadata, ignoring the document's `KeyInfo`. Require RSA-SHA-256 or stronger; reject SHA-1.
- **XML signature wrapping:** validate the schema with a local copy, use the library to locate the signed element (never `getElementsByTagName` before validating) and confirm that the signature's reference covers the assertion being consumed. XML parser without external entities (V1.5.1).
- **Conditions:** `Audience` = the application's EntityID; `Recipient` and `Destination` = the ACS URL; `NotBefore`/`NotOnOrAfter` of the assertion and of the `SubjectConfirmationData` with a small clock tolerance; `InResponseTo` equal to the ID of the `AuthnRequest` sent.
- **Replay:** store the IDs of assertions already used until they expire and process each one only once (V6.8.3). Do not cache SAML messages.
- **Maintained library** (from the framework or an active project); do not write a SAML parser. Keep it updated as a critical dependency (V15.1.1).
- Required strength, method or recency: check `AuthnContextClassRef` and `AuthnInstant` (V6.8.4).

## 3. Identity via reverse proxy or header

Acceptable (for example oauth2-proxy or an authentication gateway), **only if**:

1. The application is **unreachable from outside the proxy**: NetworkPolicy or firewall allow traffic only from the proxy, ideally with mTLS between the two (V12.3.3, V12.1.3).
2. The proxy **removes** any identity header sent by the client before setting its own (V4.1.3). In oauth2-proxy, keep the default that discards these headers and configure `trusted_proxy_ips`: without it, all IPs are trusted and the client can forge the `X-Forwarded-*` headers.
3. Prefer a **signed token (JWT)** passed on by the proxy over a plain header (`X-User`, `X-Email`). The application validates signature, `iss`, `aud`, `exp` as in section 1 (V9.1.x, V9.2.x). A plain-text header only with conditions 1 and 2 proven by a test (try calling the application directly, with a forged header: it must fail).
4. The client's original IP comes from a trusted proxy field (V15.3.4). Authorization remains inside the application (`references/controle-acesso.md`).

## 4. MFA assurance and reauthentication

- The IdP says how the user authenticated. The application **verifies** what it requires, instead of presuming MFA at sign-in (V6.8.4, V10.3.4): `amr` (methods used, RFC 8176 values such as `mfa`, `pwd`, `hwk`), `acr` (authentication context class reached) and `auth_time` (time of authentication). Names and values vary by IdP (section 5).
- A **critical action** (changing permissions, bulk data export, approving a payment, changing an authentication factor) requires **step-up**: a recent re-authentication at an adequate level, not just a valid session (V7.5.1, V7.3.1).
  - `prompt=login` forces re-authentication; `max_age=N` limits the age of the authentication (with `max_age`, the ID Token carries `auth_time`; `max_age=0` is equivalent to `prompt=login`); `acr_values` requests a level or class. The application checks the result in the new token: the request alone proves nothing.
  - After step-up, **generate a new session identifier** (V7.2.4) and record `auth_time`/`acr` in the session for the next decision.
- Failure to satisfy the required level (IdP error or missing claim) = access to the action denied, never "proceed anyway".

## 5. Notes by provider (always check the provider's documentation and the version in use)

| Provider | Where MFA appears | Step-up / conditional access | Logout |
|---|---|---|---|
| Microsoft Entra ID | `amr` claim (optional in v2.0 tokens; values such as `pwd`, `mfa`, `fido`, `hwk`; `mfa` only when MFA was completed); `acr` and `auth_time` appear in the discovery `claims_supported`; optional `auth_time` | Authentication through Conditional Access; fine-grained step-up through *authentication context* (`acrs`, IDs C1 onwards) requested via claims request and the `insufficient_claims` challenge (requires a P1 license); `prompt=login` accepted | RP-initiated: `end_session_endpoint` (GET or POST) with `post_logout_redirect_uri`; front-channel logout. **Back-channel: not documented**; the v2.0 discovery document advertises only `frontchannel_logout_supported`, so do not count on receiving a logout token from Entra (shorten the session lifetime and re-check the account on sensitive actions) |
| Keycloak | `acr` by mapping ACR to authentication level (LoA) in the realm; the **Authentication Method Reference (AMR) protocol mapper** fills `amr` in the access and ID tokens from reference values set on the authentication executions (RFC 8176) | Step-up through a conditional authentication flow; the level is requested with the `claims` parameter (`acr`) or `acr_values`, and the token returns the `acr` reached | RP-initiated logout (`/realms/{realm}/protocol/openid-connect/logout`, `post_logout_redirect_uri` validated per client) and back-channel logout supported: the client has the *Backchannel logout URL* and *Backchannel logout session required* (`sid` in the logout token) settings |
| AD FS | `amr` and `acr` in the ID Token: not confirmed in the AD FS documentation read (check on a test token from your own server; the `amr` may require a claim issuance rule) | Authentication method requested with `amr_values` or with `resource_params` (acr element); `max_age` (behavior level 2 or higher); `mfa_max_age` (level 3 or higher; adds `mfa_auth_time` to the ID Token); `prompt=login` accepted | RP-initiated: `end_session_endpoint` in discovery, with `id_token_hint` and a `post_logout_redirect_uri` registered in `RedirectUris`; front-channel logout supported. **Back-channel: not documented**; PKCE since Windows Server 2019 |
| Okta | `amr` in the ID Token (e.g., `pwd`); the `acr` claim (in the access and ID tokens) says the level of assurance reached; `auth_time` | `acr_values` such as `urn:okta:loa:2fa:any` (and `phr`/`phrh` for phishing-resistant in Identity Engine); `max_age` (`max_age=0` forces re-authentication in Identity Engine; `max_age=1` in Classic Engine); `unmet_authentication_requirements` error if not met | RP-initiated: `/logout` endpoint with `id_token_hint` and a registered redirect URI, through the browser. Single logout in the documentation is **front-channel only** (needs the *Front-channel Single Logout* feature); **back-channel: not documented** |
| Ping Identity (PingFederate) | `acr` and `auth_time`: filled from the authentication context and instant of the flow (`SAML_AUTHN_CTX`, `SAML_AUTHN_INSTANT`) and mapped into the OIDC policy contract; `amr`: not confirmed in the documentation read (check). PingOne was not checked | Authentication policies and selectors; the authorization endpoint accepts `acr_values` (in order of preference), `max_age` (beyond it, PingFederate asks for authentication again) and `prompt` | RP-initiated logout since 12.0 (`post_logout_redirect_uri` must be registered in the client); back-channel logout since 11.3 (client *Logout Mode* = OIDC Back-Channel, with *Back-Channel Logout URI*) |
| Google Workspace | `amr` only if requested via the `claims` parameter (with the option enabled in the settings); no `acr`; `auth_time` also on request | No `max_age` or `acr_values` on the OIDC page; `prompt` accepts only `none`, `consent` and `select_account`: enforce MFA by Workspace policy (mandatory 2-step verification, per the admin help) | No `end_session_endpoint` in discovery: end the local session; token revocation exists, it is not logout. No back-channel logout in discovery |

For all: restrict the accepted tenant/domain (`tid` claim in Entra; `hd` in Google, which is only a hint and must be verified in the token, not in the request parameter). JWKS keys change: fetch them from the endpoint with caching and periodic re-reading.

## 6. Session inside the application (V7)

- Identifier generated by a CSPRNG, minimum 128 bits (V7.2.3), verified in the backend (V7.2.1); do not use a static API key as a session (V7.2.2).
- Cookie: `Secure`, `HttpOnly`, `SameSite=Lax` or `Strict`, `__Host-` prefix (no `Domain`, `Path=/`) (V3.3.1 to V3.3.4). CSRF: token or origin check in addition to `SameSite` (V3.5.1, V3.5.3).
- **Inactivity** timeout and **absolute** duration documented and enforced on the server (V7.1.1, V7.3.1, V7.3.2). OWASP reference: inactivity of 2 to 5 minutes for a high-value application and 15 to 30 for low risk; absolute of 4 to 8 hours for a working-hours application. Adjust by risk and record the deviation.
- **Rotation** of the identifier at login, at reauthentication and on privilege change; discard the previous one (V7.2.4).
- **Logout** invalidates the session on the server (not just deleting the cookie), on all authenticated pages, and propagates to the IdP (V7.4.1, V7.4.4). A disabled account ends all sessions (V7.4.2); an administrator can end sessions (V7.4.5).
- A session is only created by an explicit user action (V7.6.2). Clear authenticated data from the client on exit (V14.3.1).

## 7. Service to service

- Prefer **client credentials** (OAuth) with a confidential client and minimum scopes, or **mTLS** with validation of the client certificate before using the identity (V13.2.1, V12.1.3, V10.4.11). Short-lived tokens, `aud` validated by the receiver (V9.2.3).
- **No static key shared** between services and no default credentials (V13.2.3). Secret in the vault, with least-privilege access and rotation (V13.3.1, V13.3.2).
- Service account with minimum privilege (V13.2.2); external destinations on an allowlist (V13.2.4).

## Sources

- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
- OpenID Connect Back-Channel Logout 1.0: https://openid.net/specs/openid-connect-backchannel-1_0.html
- OpenID Connect RP-Initiated Logout 1.0: https://openid.net/specs/openid-connect-rpinitiated-1_0.html
- RFC 9700, OAuth 2.0 Security BCP: https://www.rfc-editor.org/rfc/rfc9700.html
- OAuth 2.0 for Browser-Based Applications (IETF, BCP): https://datatracker.ietf.org/doc/draft-ietf-oauth-browser-based-apps/
- OWASP OAuth2 Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html
- OWASP SAML Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- oauth2-proxy, configuration: https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview
- Microsoft Entra, access tokens: https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- Microsoft Entra, optional claims and `amr` values: https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference
- Microsoft Entra, authentication context (step-up): https://learn.microsoft.com/en-us/entra/identity-platform/developer-guide-conditional-access-authentication-context
- Microsoft Entra, OIDC and logout: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
- Keycloak, administration guide: https://www.keycloak.org/docs/latest/server_admin/index.html
- Keycloak, AmrProtocolMapper: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/mappers/AmrProtocolMapper.html
- AD FS, OIDC/OAuth flows: https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/overview/ad-fs-openid-connect-oauth-flows-scenarios
- Okta, step-up authentication: https://developer.okta.com/docs/guides/step-up-authentication/main/
- Ping Identity (PingFederate, special contract attributes): https://docs.pingidentity.com/r/en-us/pingfederate-120/pf_special_attr_names_contracts
- Google, OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
- Microsoft Entra, v2.0 discovery document (`frontchannel_logout_supported`, `end_session_endpoint`, `claims_supported`): https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration
- Keycloak, securing apps (logout endpoint): https://www.keycloak.org/securing-apps/oidc-layers
- AD FS, logout with OpenID Connect: https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/development/ad-fs-logout-openid-connect
- AD FS, [MS-OAPX] processing details (`amr_values`, `resource_params`, `max_age`, `mfa_max_age`): https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-oapx/a9921868-71c8-4644-95ff-cb0ab8436e5d
- PingFederate, authorization endpoint (`acr_values`, `max_age`, `prompt`): https://docs.pingidentity.com/pingfederate/13.1/developers_reference_guide/pf_authorization_endpoint.html
- PingFederate, configuring OAuth clients (logout mode, back-channel logout URI, post-logout redirect URIs): https://docs.pingidentity.com/pingfederate/13.0/administrators_reference_guide/pf_configuring_oauth_clients.html
- PingFederate 11.3 release notes (back-channel logout): https://docs.pingidentity.com/pingfederate/13.0/release_notes/pf_release_notes_113.html
- PingFederate 12.0 release notes (RP-initiated logout): https://docs.pingidentity.com/pingfederate/13.1/release_notes/pf_release_notes_120.html
- Okta, single logout (front-channel): https://developer.okta.com/docs/guides/single-logout/openidconnect/main/
- Okta, OpenID Connect and OAuth 2.0 API (`amr`, `auth_time`): https://developer.okta.com/docs/reference/api/oidc/
- Google, discovery document: https://accounts.google.com/.well-known/openid-configuration
- Google Workspace, deploy 2-Step Verification: https://support.google.com/a/answer/9176657
- OWASP ASVS 5.0.0: https://github.com/OWASP/ASVS/tree/master/5.0
