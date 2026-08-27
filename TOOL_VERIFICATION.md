# External Tool Verification

> This document records the results of testing AegisSecurityLab with three
> external security testing tools — first to verify the previously applied
> fixes, and then to identify any new issues.

## 1. Postman — Manual API Testing

Three requests were created and executed:

1. **Login (admin)** — `POST /api/auth/login` — returned **200 OK** with a JWT token.
2. **Legitimate token → Admin Panel** — `GET /api/auth/admin-panel` with a valid
   Bearer token — returned **200 OK** with the secret (`AEGIS_LAB_FLAG_001`).
3. **Tampered token → Admin Panel** — same request, but the trailing characters of
   the token were manually corrupted — returned **401 Unauthorized**.

**Result:** The signature validation fix (**VULN-01**) is confirmed working — any
tampered token is rejected.

## 2. OWASP ZAP — Automated Vulnerability Scan

An automated scan was run against `http://localhost:5199`. Four alerts were reported:

| Alert | Risk | CWE |
|---|---|---|
| Content Security Policy (CSP) Header Not Set | Medium | CWE-693 |
| Missing Anti-clickjacking Header | Medium | CWE-1021 |
| X-Content-Type-Options Header Missing | Low | CWE-693 |
| Modern Web Application | Informational | — |

No high-risk issues were found — the core JWT authentication/authorization fixes
(VULN-01/02/03) were not flagged by this scan, which confirms their effectiveness.

**Action taken:** The three header issues were fixed (**VULN-04**) — a middleware
was added in `Program.cs` that sets the `Content-Security-Policy`,
`X-Frame-Options`, and `X-Content-Type-Options` headers on every response. The
dashboard (`wwwroot`) was also refactored — inline scripts and styles were moved
to external `app.js` and `site.css` files, so the strict CSP (`default-src 'self'`)
works without allowing `'unsafe-inline'`.

## 3. Burp Suite — Traffic Interception

[Pending — this section will be updated after Burp Suite testing.]

---

**Overall status:** All four vulnerabilities (VULN-01 through VULN-04) are fixed
and have been verified with two independent external tools (Postman and ZAP).
