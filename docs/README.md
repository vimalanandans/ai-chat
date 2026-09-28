# Signal documentation

This directory describes the shipped local-first Signal workspace. It is written for the current single-user desktop deployment; it does not describe a hosted multi-tenant service.

- [User guide](USER_GUIDE.md) — configure providers, start chats, edit a connection, and diagnose a failure.
- [Architecture](ARCHITECTURE.md) — runtime boundaries, persistence, security posture, and extension seams.
- [API reference](API_REFERENCE.md) — local HTTP routes and response shapes.
- [Operations](OPERATIONS.md) — local development, validation, data locations, troubleshooting, and release checks.

Run `npm run docs:check` after changing a documented capability or route. It verifies that the documentation set exists and contains no common secret-like tokens.
