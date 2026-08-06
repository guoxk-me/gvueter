# Security policy

## Supported versions

| Version           | Security updates |
| ----------------- | ---------------- |
| 0.1.x             | Supported        |
| Earlier snapshots | Unsupported      |

This repository is a frontend template. Production identity, session rotation, tenant isolation, server authorization, storage scanning, durable audit logs, and edge policy remain deployment responsibilities; see `docs/security.md` for the complete boundary.

## Reporting a vulnerability

Do not open a public issue for an undisclosed vulnerability. Use the repository's private [GitHub Security Advisory](https://github.com/guoxk-me/gvueter/security/advisories/new) form and include:

- affected commit or version;
- reproduction steps and required role/tenant;
- expected and observed impact;
- proof-of-concept material with credentials and personal data removed;
- any proposed mitigation.

Maintainers will acknowledge the report through the advisory, validate severity, coordinate a fix and disclosure, and credit the reporter when requested. If the advisory form is unavailable, open a public issue containing no exploit details and ask for a private contact channel.

## Safe research

Use only accounts and data you are authorized to test. Do not access other tenants, degrade shared services, persist access, or publish secrets. Stop once impact is demonstrated and remove collected data after the report is accepted.
