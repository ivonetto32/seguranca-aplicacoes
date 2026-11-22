# OWASP ASVS 5.0.0 — levels 1 and 2

- Source: https://github.com/OWASP/ASVS/blob/master/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv (ASVS 5.0.0, May 2025).
- License CC BY-SA 4.0, with attribution to OWASP (Application Security Verification Standard).
- The descriptions are paraphrased summaries; in case of doubt, the original requirement text, by ID, prevails.
- Use in a review: mark each item as "meets / does not meet / not applicable", with evidence (file:line or test).
- Level 2 = all L1 items + the L2 items (the Level column shows the level at which the item becomes applicable). Items that are exclusively L3 were omitted.

## V1 Encoding and Sanitization

| ID | Level | What to check |
|---|---|---|
| V1.1.1 | L2 | Decode input to its canonical form only once, before any validation or processing. |
| V1.1.2 | L2 | Apply output encoding/escaping as the final step, right before the destination interpreter. |
| V1.2.1 | L1 | Encode output to match the context (element, attribute, HTML comment, CSS, HTTP header). |
| V1.2.2 | L1 | Encode untrusted data when building URLs and allow only safe protocols (no javascript: or data:). |
| V1.2.3 | L1 | Escape data when dynamically building JavaScript or JSON content, preventing injection. |
| V1.2.4 | L1 | Use parameterized queries, an ORM or equivalent protection against SQL/NoSQL and similar injection. |
| V1.2.5 | L1 | Prevent OS command injection through parameterized calls or proper encoding of arguments. |
| V1.2.6 | L2 | Protect against LDAP injection through encoding or specific controls. |
| V1.2.7 | L2 | Protect XPath queries with parameterization or precompiled queries. |
| V1.2.8 | L2 | Configure LaTeX processors securely (no --shell-escape) with an allow list of commands. |
| V1.2.9 | L2 | Escape special characters in input used in regular expressions. |
| V1.3.1 | L1 | Sanitize untrusted HTML from WYSIWYG editors with a well-known sanitization library. |
| V1.3.2 | L1 | Avoid eval() and dynamic code execution; if unavoidable, sanitize any included input first. |
| V1.3.3 | L2 | Sanitize data passed to dangerous contexts, allowing only safe characters and limiting length. |
| V1.3.4 | L2 | Validate or sanitize user-uploaded SVG, keeping only safe tags and attributes (no scripts). |
| V1.3.5 | L2 | Sanitize or disable user-supplied scripting/expression-language content (Markdown, CSS, XSL, BBCode). |
| V1.3.6 | L2 | Protect against SSRF by validating destinations against allow lists of protocols, domains, paths and ports. |
| V1.3.7 | L2 | Prevent template injection: do not build templates from untrusted input. |
| V1.3.8 | L2 | Sanitize input used in JNDI lookups and configure JNDI against injection. |
| V1.3.9 | L2 | Sanitize content sent to memcache to prevent injection. |
| V1.3.10 | L2 | Sanitize format strings that could be resolved in unexpected or malicious ways. |
| V1.3.11 | L2 | Sanitize input passed to mail systems to prevent SMTP/IMAP injection. |
| V1.4.1 | L2 | Use memory-safe string handling, memory copying and pointer arithmetic to prevent stack, buffer or heap overflows. |
| V1.4.2 | L2 | Check sign, range and input to prevent integer overflows. |
| V1.4.3 | L2 | Release allocated memory and resources and clear references, avoiding dangling pointers and use-after-free. |
| V1.5.1 | L1 | Configure XML parsers restrictively, disabling external entities (XXE). |
| V1.5.2 | L2 | Deserialize untrusted data with allow-listed types to prevent deserialization attacks. |

## V2 Validation and Business Logic

| ID | Level | What to check |
|---|---|---|
| V2.1.1 | L1 | Document the input validation rules (expected format and structure of each data item). |
| V2.1.2 | L2 | Document how to validate the logical and contextual consistency of combined data items. |
| V2.1.3 | L2 | Document the business logic limits and validations, per user and global. |
| V2.2.1 | L1 | Validate input against business rules, using an allow list of permitted values, patterns or ranges. |
| V2.2.2 | L1 | Enforce validation in a trusted service layer; client-side validation does not count as a control. |
| V2.2.3 | L2 | Verify that combinations of related data items are consistent according to the defined rules. |
| V2.3.1 | L1 | Process business flows only in the expected order, without allowing steps to be skipped. |
| V2.3.2 | L2 | Implement business logic limits as documented. |
| V2.3.3 | L2 | Use atomic business transactions: complete fully or roll back to the previous state. |
| V2.3.4 | L2 | Use logic-level locking to prevent double-booking of limited resources. |
| V2.4.1 | L2 | Implement anti-automation controls against excessive calls (exfiltration, junk data, quota exhaustion, DoS). |

## V3 Web Frontend Security

| ID | Level | What to check |
|---|---|---|
| V3.2.1 | L1 | Prevent the browser from rendering content or functionality in the wrong context (e.g. an API or file accessed directly). |
| V3.2.2 | L1 | Display text as text, using safe functions (textContent, createTextNode) instead of HTML. |
| V3.3.1 | L1 | Set the Secure attribute on cookies, with the __Host- or __Secure- name prefix. |
| V3.3.2 | L2 | Set SameSite on each cookie according to its purpose, limiting CSRF and clickjacking. |
| V3.3.3 | L2 | Use the __Host- prefix on cookies, except those meant to be shared across hosts. |
| V3.3.4 | L2 | Mark cookies that JavaScript must not read (e.g. the session token) as HttpOnly. |
| V3.4.1 | L1 | Send Strict-Transport-Security on all responses, with a max-age of at least 1 year (and includeSubDomains at L2). |
| V3.4.2 | L1 | Set Access-Control-Allow-Origin to a fixed value or validate it against an allow list of origins. |
| V3.4.3 | L2 | Send a Content-Security-Policy that restricts loading and execution to trusted content. |
| V3.4.4 | L2 | Send X-Content-Type-Options: nosniff on all responses. |
| V3.4.5 | L2 | Set a Referrer-Policy that avoids leaking sensitive data to third parties. |
| V3.4.6 | L2 | Use the CSP frame-ancestors directive on all responses to control who can embed the application. |
| V3.5.1 | L1 | Without relying on CORS preflight, validate the origin of requests to sensitive functions (e.g. anti-CSRF token). |
| V3.5.2 | L1 | When relying on CORS preflight, ensure the sensitive function cannot be called without triggering the preflight. |
| V3.5.3 | L1 | Use POST, PUT, PATCH or DELETE for sensitive functions, never safe methods such as GET. |
| V3.5.4 | L2 | Host separate applications on different hostnames to benefit from the same-origin policy. |
| V3.5.5 | L2 | Discard postMessage messages from untrusted origins or with invalid syntax. |
| V3.7.1 | L2 | Use only client technologies that are still supported and secure (no Flash, ActiveX, NSAPI plugins and the like). |
| V3.7.2 | L2 | Automatically redirect to another domain only if the destination is on an allow list. |

## V4 API and Web Service

| ID | Level | What to check |
|---|---|---|
| V4.1.1 | L1 | Send the correct Content-Type and charset on every response with a body. |
| V4.1.2 | L2 | Redirect from HTTP to HTTPS only on user-facing endpoints, not on APIs and services. |
| V4.1.3 | L2 | Prevent users from overwriting HTTP headers set by intermediaries (load balancer, proxy, BFF). |
| V4.2.1 | L2 | Make all components delimit HTTP messages by the correct mechanism for the version, preventing request smuggling. |
| V4.3.1 | L2 | Limit GraphQL queries (allow list, depth, quantity or cost) against DoS. |
| V4.3.2 | L2 | Disable GraphQL introspection in production, unless the API is meant for third parties. |
| V4.4.1 | L1 | Use WebSocket over TLS (WSS) for all connections. |
| V4.4.2 | L2 | Check the Origin header in the WebSocket handshake against an allow list of origins. |
| V4.4.3 | L2 | If the default session cannot be used, use dedicated tokens that meet the session requirements. |
| V4.4.4 | L2 | Obtain or validate the WebSocket session token through the already authenticated HTTPS session. |

## V5 File Handling

| ID | Level | What to check |
|---|---|---|
| V5.1.1 | L2 | Document, per upload, the types, extensions, maximum size (including uncompressed) and handling of files. |
| V5.2.1 | L1 | Accept only files of a size the application can process without degradation or denial of service. |
| V5.2.2 | L1 | Check the expected extension and validate that the content matches the type, including inside compressed archives. |
| V5.2.3 | L2 | Check the maximum uncompressed size and number of files before decompressing. |
| V5.3.1 | L1 | Ensure uploaded files stored in a public folder cannot be executed as code on the server. |
| V5.3.2 | L1 | Build file paths from internal or trusted data; if a user-supplied name is used, validate against path traversal, LFI/RFI and SSRF. |
| V5.4.1 | L2 | Validate or ignore uploaded file names and set the name in the response Content-Disposition. |
| V5.4.2 | L2 | Encode or sanitize served file names (headers, attachments), for example per RFC 6266. |
| V5.4.3 | L2 | Scan files from untrusted sources with antivirus. |

## V6 Authentication

| ID | Level | What to check |
|---|---|---|
| V6.1.1 | L1 | Document how rate limiting, anti-automation and adaptive response defend against credential stuffing and brute force. |
| V6.1.2 | L2 | Document a list of context-specific words (product names, system names, etc.) that are banned in passwords. |
| V6.1.3 | L2 | Document all authentication paths and the controls and strength required on each. |
| V6.2.1 | L1 | Require passwords of at least 8 characters (15 recommended). |
| V6.2.2 | L1 | Let users change their own password. |
| V6.2.3 | L1 | Require both the current and the new password when changing a password. |
| V6.2.4 | L1 | Check passwords at registration and change against at least the 3000 most common ones that meet the policy. |
| V6.2.5 | L1 | Accept passwords of any composition, with no mandatory character-type rules. |
| V6.2.6 | L1 | Use type=password on password fields, allowing at most a temporary reveal. |
| V6.2.7 | L1 | Allow pasting, browser helpers and password managers. |
| V6.2.8 | L1 | Verify the password exactly as received, without truncating or changing case. |
| V6.2.9 | L2 | Allow passwords of at least 64 characters. |
| V6.2.10 | L2 | Keep a password valid until compromise or change by the user, with no mandatory periodic rotation. |
| V6.2.11 | L2 | Use the documented list of context-specific words to block easy-to-guess passwords. |
| V6.2.12 | L2 | Check passwords at registration and change against sets of breached passwords. |
| V6.3.1 | L1 | Implement the credential stuffing and brute force controls as described in the security documentation. |
| V6.3.2 | L1 | Do not keep default accounts (root, admin, sa), or keep them disabled. |
| V6.3.3 | L2 | Require MFA, or a combination of single-factor mechanisms, to access the application. |
| V6.3.4 | L2 | With several authentication paths, have no undocumented paths and apply the controls consistently. |
| V6.4.1 | L1 | Generate initial passwords and activation codes as secure random values that expire soon or on first use. |
| V6.4.2 | L1 | Have no password hints or security questions. |
| V6.4.3 | L2 | Have a secure password recovery process that does not bypass enabled MFA. |
| V6.4.4 | L2 | When an MFA factor is lost, require identity proofing at the same level as enrollment. |
| V6.5.1 | L2 | Ensure recovery codes, out-of-band codes and TOTP work only once. |
| V6.5.2 | L2 | Store lookup secrets with less than 112 bits of entropy using an approved hash. |
| V6.5.3 | L2 | Generate lookup secrets, out-of-band codes and TOTP seeds with a CSPRNG. |
| V6.5.4 | L2 | Ensure at least 20 bits of entropy in lookup secrets and out-of-band codes. |
| V6.5.5 | L2 | Set a lifetime for out-of-band requests/codes (max. 10 min) and for TOTP (max. 30 s). |
| V6.6.1 | L2 | Offer phone/SMS OTP only with a previously validated number and with stronger alternatives available, informing the user of the risks. |
| V6.6.2 | L2 | Bind out-of-band codes to the original authentication request, with no reuse on others. |
| V6.6.3 | L2 | Protect out-of-band codes against brute force with rate limiting. |
| V6.8.1 | L2 | With multiple IdPs, prevent identity spoofing by another IdP (e.g. the same user identifier). |
| V6.8.2 | L2 | Always validate the presence and integrity of signatures on assertions (JWT, SAML), rejecting invalid ones. |
| V6.8.3 | L2 | Process SAML assertions only once within their validity, preventing replay. |
| V6.8.4 | L2 | When strength, method or recency of authentication is required, verify that information as returned by the IdP. |

## V7 Session Management

| ID | Level | What to check |
|---|---|---|
| V7.1.1 | L2 | Document the idle timeout and the absolute maximum session lifetime, with justification for deviations. |
| V7.1.2 | L2 | Document the number of concurrent sessions per account and the behavior when the limit is reached. |
| V7.1.3 | L2 | Document session systems in a federated (SSO) environment and how they coordinate lifetime and termination. |
| V7.2.1 | L1 | Perform every session token verification in a trusted backend service. |
| V7.2.2 | L1 | Use dynamically generated session tokens (self-contained or reference), not static API keys. |
| V7.2.3 | L1 | Generate unique reference tokens with a CSPRNG and at least 128 bits of entropy. |
| V7.2.4 | L1 | Generate a new session token on every authentication, including re-authentication, and terminate the previous one. |
| V7.3.1 | L2 | Enforce an idle timeout, requiring re-authentication according to risk analysis. |
| V7.3.2 | L2 | Enforce an absolute maximum session lifetime, requiring re-authentication according to risk analysis. |
| V7.4.1 | L1 | Prevent any use of the session after termination (logout or expiry), invalidating it on the server. |
| V7.4.2 | L1 | Terminate all active sessions when the account is disabled or deleted. |
| V7.4.3 | L2 | Offer to terminate the other sessions after an authentication factor is changed or removed. |
| V7.4.4 | L2 | Provide easy, visible access to logout on every authenticated page. |
| V7.4.5 | L2 | Let administrators terminate the sessions of one user or all users. |
| V7.5.1 | L2 | Require full re-authentication before changing sensitive attributes (email, phone, MFA). |
| V7.5.2 | L2 | Let users view and terminate their active sessions, after re-authenticating with at least one factor. |
| V7.6.1 | L2 | Ensure session lifetime and termination between RP and IdP work as documented, with re-authentication when needed. |
| V7.6.2 | L2 | Require user consent or an explicit action to create a session, with no sessions created without interaction. |

## V8 Authorization

| ID | Level | What to check |
|---|---|---|
| V8.1.1 | L1 | Document access rules per function and per data item, based on permissions and resource attributes. |
| V8.1.2 | L2 | Document field-level access rules (read and write) based on permissions and attributes. |
| V8.2.1 | L1 | Restrict function-level access to consumers with explicit permission. |
| V8.2.2 | L1 | Restrict data access to items with explicit permission, mitigating IDOR/BOLA. |
| V8.2.3 | L2 | Restrict field-level access to those with explicit permission, mitigating BOPLA. |
| V8.3.1 | L1 | Enforce authorization in a trusted service layer, without depending on controls that can be manipulated on the client. |
| V8.4.1 | L2 | In multi-tenant applications, use cross-tenant controls so operations never affect tenants without permission. |

## V9 Self-contained Tokens

| ID | Level | What to check |
|---|---|---|
| V9.1.1 | L1 | Validate the signature or MAC of self-contained tokens before accepting their content. |
| V9.1.2 | L1 | Allow only algorithms from an allow list to create and verify tokens (no "none"). |
| V9.1.3 | L1 | Obtain the validation key from pre-configured, trusted sources, never from ones indicated by the token. |
| V9.2.1 | L1 | Accept the token only within its validity period (nbf and exp in JWT). |
| V9.2.2 | L2 | Verify that the token is of the correct type and meant for the purpose (e.g. only an access token to authorize). |
| V9.2.3 | L2 | Accept only tokens meant for the service, validating the audience (aud) against an allow list. |
| V9.2.4 | L2 | When one key serves several audiences, include a single-audience restriction in each token. |

## V10 OAuth and OIDC

| ID | Level | What to check |
|---|---|---|
| V10.1.1 | L2 | Send tokens only to the components that need them (e.g. a BFF keeps tokens out of browser JavaScript). |
| V10.1.2 | L2 | Accept values from the authorization server only from a flow started by the same user-agent session (state, nonce, PKCE). |
| V10.2.1 | L2 | In the code flow, protect the OAuth client against CSRF on token requests (PKCE, state or nonce). |
| V10.2.2 | L2 | With more than one authorization server, defend against mix-up attacks (e.g. validate the iss parameter). |
| V10.3.1 | L2 | Make the resource server accept only access tokens meant for it (audience). |
| V10.3.2 | L2 | Make the resource server base authorization decisions on token claims (sub, scope, authorization_details). |
| V10.3.3 | L2 | Identify the user by claims that cannot be reassigned to another user. |
| V10.3.4 | L2 | Verify that the token meets the required strength, method or recency (e.g. acr, amr, auth_time). |
| V10.4.1 | L1 | Validate redirect URIs against the client's pre-registered list using exact string comparison. |
| V10.4.2 | L1 | Allow an authorization code to be used only once; on reuse, reject it and revoke the tokens issued. |
| V10.4.3 | L1 | Keep the authorization code short-lived (max. 10 minutes at L1 and L2). |
| V10.4.4 | L1 | Allow each client only the grants it needs; no implicit and password grants. |
| V10.4.5 | L1 | Mitigate refresh token replay for public clients, preferably with sender-constrained tokens (DPoP or mTLS). |
| V10.4.6 | L2 | Require PKCE in the code flow to mitigate authorization code interception. |
| V10.4.7 | L2 | With unauthenticated dynamic client registration, mitigate malicious clients by validating metadata and URIs. |
| V10.4.8 | L2 | Give refresh tokens an absolute expiry, even with sliding expiry. |
| V10.4.9 | L2 | Allow refresh tokens and reference access tokens to be revoked through the authorization server's interface. |
| V10.4.10 | L2 | Authenticate the confidential client on backchannel requests (token, PAR, revocation). |
| V10.4.11 | L2 | Assign the OAuth client only the scopes it needs. |
| V10.5.1 | L2 | Mitigate ID Token replay by comparing the nonce sent in the request with the one in the token. |
| V10.5.2 | L2 | Identify the user by an ID Token claim that cannot be reassigned (normally sub). |
| V10.5.3 | L2 | Reject authorization server metadata whose issuer does not match the expected one (impersonation). |
| V10.5.4 | L2 | Validate that the ID Token is meant for the client: aud equals the client_id. |
| V10.5.5 | L2 | In OIDC back-channel logout, validate the logout token and mitigate forced-logout DoS and JWT confusion. |
| V10.6.1 | L2 | At the OpenID Provider, allow only the response modes code, ciba, id_token or id_token code. |
| V10.6.2 | L2 | At the OpenID Provider, mitigate forced-logout DoS with user confirmation or parameter validation. |
| V10.7.1 | L2 | Ensure user consent for each authorization; always ask for consent if the client is not trusted. |
| V10.7.2 | L2 | Present clear and sufficient information about what is being consented to (nature, client, scope). |
| V10.7.3 | L2 | Let users review, change and revoke the consents they have granted. |

## V11 Cryptography

| ID | Level | What to check |
|---|---|---|
| V11.1.1 | L2 | Have a documented key management and lifecycle policy, following a standard such as NIST SP 800-57. |
| V11.1.2 | L2 | Keep an up-to-date cryptographic inventory of keys, algorithms and certificates, including where they may or may not be used. |
| V11.2.1 | L2 | Use industry-validated cryptographic implementations (libraries and hardware). |
| V11.2.2 | L2 | Design for crypto agility: algorithms, key sizes and modes that are configurable and replaceable. |
| V11.2.3 | L2 | Ensure all cryptographic primitives provide at least 128 bits of security. |
| V11.3.1 | L1 | Do not use insecure block modes (ECB) or weak paddings (PKCS#1 v1.5). |
| V11.3.2 | L1 | Use only approved ciphers and modes, such as AES-GCM. |
| V11.3.3 | L2 | Protect encrypted data against modification, preferring authenticated encryption or a cipher plus MAC. |
| V11.4.1 | L1 | Use only approved hash functions (no MD5) in signatures, HMAC, KDFs and random bit generation. |
| V11.4.2 | L2 | Store passwords with an approved, costly key derivation function using current parameters. |
| V11.4.3 | L2 | Use collision-resistant hashes of adequate size in signatures and integrity verification. |
| V11.4.4 | L2 | Use approved KDFs with stretching when deriving keys from passwords, balancing security and performance. |
| V11.5.1 | L2 | Generate unguessable random values with a CSPRNG and at least 128 bits of entropy. |
| V11.6.1 | L2 | Use only approved algorithms and modes for key generation, seeds and digital signatures. |

## V12 Secure Communication

| ID | Level | What to check |
|---|---|---|
| V12.1.1 | L1 | Enable only recent TLS versions (1.2 and 1.3), with the newest preferred. |
| V12.1.2 | L2 | Enable only recommended cipher suites, with the strongest preferred. |
| V12.1.3 | L2 | Validate that mTLS client certificates are trusted before using the identity to authenticate or authorize. |
| V12.2.1 | L1 | Use TLS on every connection between the client and external HTTP services, with no fallback to cleartext. |
| V12.2.2 | L1 | Use publicly trusted TLS certificates on external services. |
| V12.3.1 | L2 | Use an encrypted protocol (TLS) on all inbound and outbound connections (monitoring, SSH, database, email, etc.). |
| V12.3.2 | L2 | In TLS clients, validate the certificates received before communicating. |
| V12.3.3 | L2 | Use TLS between internal HTTP services, with no fallback to unencrypted communication. |
| V12.3.4 | L2 | Use trusted certificates between internal services; if self-signed, trust only specific internal CAs. |

## V13 Configuration

| ID | Level | What to check |
|---|---|---|
| V13.1.1 | L2 | Document all communication needs, including external services and user-supplied destinations. |
| V13.2.1 | L2 | Authenticate communication between backend components that do not use the standard session (APIs, middleware, data). |
| V13.2.2 | L2 | Use least-privilege accounts for communication between backend components. |
| V13.2.3 | L2 | Do not use default credentials (root/root, admin/admin) for authentication between services. |
| V13.2.4 | L2 | Define an allow list of external resources the application may communicate with. |
| V13.2.5 | L2 | Configure the server with an allow list of destinations it may send requests to or load data from. |
| V13.3.1 | L2 | Use a secrets management solution (key vault) to create, store, control and destroy backend secrets. |
| V13.3.2 | L2 | Apply least privilege to access to secrets. |
| V13.4.1 | L1 | Deploy without version control metadata (.git, .svn), or with access to it blocked. |
| V13.4.2 | L2 | Disable debug modes in all components in production. |
| V13.4.3 | L2 | Do not expose directory listings, unless intentional. |
| V13.4.4 | L2 | Do not support the HTTP TRACE method in production. |
| V13.4.5 | L2 | Do not expose documentation (internal APIs) or monitoring endpoints, unless intentional. |

## V14 Data Protection

| ID | Level | What to check |
|---|---|---|
| V14.1.1 | L2 | Identify and classify into protection levels all sensitive data processed, including data that is merely encoded. |
| V14.1.2 | L2 | Document the protection requirements of each level (encryption, integrity, retention, logging, access, privacy). |
| V14.2.1 | L1 | Send sensitive data only in the HTTP body or headers, never in the URL or query string. |
| V14.2.2 | L2 | Prevent sensitive data from remaining in server-side caches (load balancer, application cache) or purge it after use. |
| V14.2.3 | L2 | Do not send sensitive data to untrusted third parties (e.g. trackers). |
| V14.2.4 | L2 | Implement the controls defined for each protection level (encryption, integrity, retention, logging, access, privacy). |
| V14.3.1 | L1 | Clear authenticated data from client storage (e.g. the DOM) when the session ends. |
| V14.3.2 | L2 | Send anti-cache headers (Cache-Control: no-store) so the browser does not keep sensitive data. |
| V14.3.3 | L2 | Do not store sensitive data in localStorage, sessionStorage, IndexedDB or cookies, except the session token. |

## V15 Secure Coding and Architecture

| ID | Level | What to check |
|---|---|---|
| V15.1.1 | L1 | Document risk-based remediation timeframes for vulnerable third-party components and for library updates. |
| V15.1.2 | L2 | Keep an inventory (SBOM) of third-party libraries, from trusted and maintained sources. |
| V15.1.3 | L2 | Document costly or time-consuming functionality and how to prevent loss of availability from its excessive use. |
| V15.2.1 | L1 | Do not keep components that have exceeded the documented update and remediation timeframes. |
| V15.2.2 | L2 | Implement defenses against loss of availability in costly functionality, as documented. |
| V15.2.3 | L2 | Keep only what is needed in production, with no test code, samples or development functions. |
| V15.3.1 | L1 | Return only the necessary subset of fields of a data object. |
| V15.3.2 | L2 | Configure backend calls to external URLs not to follow redirects, unless intentional. |
| V15.3.3 | L2 | Protect against mass assignment by limiting the allowed fields per controller and action. |
| V15.3.4 | L2 | Pass the user's original IP through trusted, non-manipulable fields and use it correctly. |
| V15.3.5 | L2 | Ensure correct types and use strict comparisons, avoiding type juggling and type confusion. |
| V15.3.6 | L2 | Write JavaScript that prevents prototype pollution (e.g. use Set or Map instead of object literals). |
| V15.3.7 | L2 | Defend against HTTP parameter pollution by handling the source of parameters (query, body, cookie). |

## V16 Security Logging and Error Handling

| ID | Level | What to check |
|---|---|---|
| V16.1.1 | L2 | Keep an inventory of logs per layer: events, formats, storage, use and access control. |
| V16.2.1 | L2 | Include in logs the metadata needed for detailed investigation (when, where, who, what). |
| V16.2.2 | L2 | Synchronize log time sources and record timestamps in UTC or with an explicit time zone. |
| V16.2.3 | L2 | Write or transmit logs only to files and services documented in the inventory. |
| V16.2.4 | L2 | Use a common log format that the log processor can read and correlate. |
| V16.2.5 | L2 | Log sensitive data according to its protection level, without logging credentials or payment data. |
| V16.3.1 | L2 | Log all authentication operations, successful or failed, with metadata such as type and factors. |
| V16.3.2 | L2 | Log denied authorization attempts. |
| V16.3.3 | L2 | Log documented security events and attempts to bypass controls (validation, logic, anti-automation). |
| V16.3.4 | L2 | Log unexpected errors and security control failures, such as backend TLS failures. |
| V16.4.1 | L2 | Encode data in all log components to prevent log injection. |
| V16.4.2 | L2 | Protect logs against unauthorized access and modification. |
| V16.4.3 | L2 | Securely transmit logs to a logically separate system, for analysis, alerting and escalation. |
| V16.5.1 | L2 | Return a generic message on unexpected or sensitive errors, without exposing stack traces, queries, keys or tokens. |
| V16.5.2 | L2 | Keep operating securely when external resources fail (circuit breaker, graceful degradation). |
| V16.5.3 | L2 | Fail securely and in a controlled way on exceptions, avoiding fail-open (e.g. processing a transaction despite a validation error). |

## V17 WebRTC

| ID | Level | What to check |
|---|---|---|
| V17.1.1 | L2 | Restrict the TURN service to non-reserved IP addresses (internal networks, broadcast, loopback). |
| V17.2.1 | L2 | Manage and protect the DTLS certificate key according to the key management policy. |
| V17.2.2 | L2 | Configure the media server with approved DTLS cipher suites and a secure protection profile for SRTP. |
| V17.2.3 | L2 | Check SRTP authentication on the media server to prevent RTP injection, DoS or media degradation. |
| V17.2.4 | L2 | Keep the media server processing traffic when it receives malformed SRTP packets. |
| V17.3.1 | L2 | Keep the signaling server processing legitimate messages during a flood, with rate limiting. |
| V17.3.2 | L2 | Keep the signaling server processing legitimate messages in the face of malformed messages. |
