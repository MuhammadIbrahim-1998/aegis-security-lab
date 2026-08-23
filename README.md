# AegisSecurityLab

> ⚠️ **INTENTIONALLY VULNERABLE — TRAINING LAB ONLY, NOT FOR PRODUCTION USE**
>
> This repository contains deliberate security vulnerabilities and exists **only**
> for authorized security training and CTF-style exercises. Do **not** deploy it,
> expose it to a network, or reuse its code in a real application.

## Overview

AegisSecurityLab is a deliberately vulnerable **Clean Architecture .NET Web API**
(`net10.0`) built as a training target for **JWT authentication & authorization
vulnerabilities**. It ships with a working JWT login flow and an admin-only
endpoint whose protection can be bypassed through token forgery — see
[`EXPLOIT_LOG.md`](./EXPLOIT_LOG.md) for the full, reproduced walkthrough.

The lab intentionally mirrors real-world JWT misconfiguration mistakes so that
defenders can learn to recognize and fix them.

## Architecture

The solution follows a classic Clean Architecture split into three projects:

| Layer | Project | Responsibility |
|---|---|---|
| Core | `src/AegisLab.Core` | Domain models / core contracts |
| Infrastructure | `src/AegisLab.Infrastructure` | Data access / external concerns |
| WebApi | `src/AegisLab.WebApi` | Controllers, JWT auth config, HTTP entry point |

## Vulnerability Register

| ID | CWE | Location | Description | Attack it enables |
|---|---|---|---|---|
| **VULN-01** | [CWE-347](https://cwe.mitre.org/data/definitions/347.html) — Improper Verification of Cryptographic Signature | `src/AegisLab.WebApi/Program.cs` (`AddJwtBearer`) | JWT signature verification is effectively disabled: `ValidateIssuerSigningKey = false`, `RequireSignedTokens = false`, and a custom `SignatureValidator` that only parses the token without verifying its signature. `ValidateLifetime` and `ValidateAudience` are also `false`. | **Token forgery / authentication bypass** — a token signed with **any** key (or unsigned) is accepted as fully authenticated. |
| **VULN-02** | [CWE-321](https://cwe.mitre.org/data/definitions/321.html) — Use of Hard-Coded Cryptographic Key | `src/AegisLab.WebApi/Program.cs` (`fallbackKey`) and `src/AegisLab.WebApi/Controllers/AuthController.cs` (`FallbackKey`) | The HS256 signing key `AegisLab_SuperSecret_Dev_Key_2024` is hardcoded in source in **two** places. The config override (`Jwt:Key`) is never set, so the fallback is always used for both signing and validating. | **Key disclosure** — anyone with source/repo access learns the real key and can sign legitimate-looking tokens (e.g. as `admin`). |
| **VULN-03** | [CWE-863](https://cwe.mitre.org/data/definitions/863.html) — Incorrect Authorization | `src/AegisLab.WebApi/Controllers/AuthController.cs` (`AdminPanel()`) | Access control relies entirely on a client-controlled JWT claim: `AdminPanel()` reads `role` from the token and checks `role != "Admin"`, with no server-side source of truth. Combined with VULN-01, the role claim is trivially forgeable. | **Privilege escalation** — any user (e.g. `alice`) forges a token with `role: Admin` and reaches `/api/auth/admin-panel`, exposing `AEGIS_LAB_FLAG_001`. |

## How to Run

Requirements: .NET 10 SDK.

```bash
dotnet run --project src/AegisLab.WebApi
```

The API starts on **`http://localhost:5199`** (the Kestrel address is fixed in
`Program.cs`; the `5017` from `launchSettings.json` is overridden at startup).

Quick smoke test:

```bash
curl -s -X POST http://localhost:5199/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}'
```

## Exploit Walkthrough

Full exploit walkthrough: see [`EXPLOIT_LOG.md`](./EXPLOIT_LOG.md).

## Planned Hardening

- **VULN-01** — Re-enable real JWT validation: `ValidateIssuerSigningKey = true`,
  `RequireSignedTokens = true`, remove the custom `SignatureValidator`, and
  validate issuer, audience, and lifetime (`exp` / `nbf`).
- **VULN-02** — Remove the hardcoded fallback key and load the signing key from a
  secure secret store (environment variable, .NET User Secrets, or Key Vault);
  plan for key rotation.
- **VULN-03** — Stop trusting client-supplied role claims. Authorize against a
  server-side source of truth (roles from a validated identity / database) using
  ASP.NET Core policy-based authorization backed by properly validated tokens.
