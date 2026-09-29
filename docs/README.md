# Signal documentation

Signal is a local-first, single-user workspace for managing multiple AI chat conversations and provider connections. These documents describe the software as it ships today—not a future hosted or multi-agent product.

Read in this order when you are new to the project:

1. [Product concept](PRODUCT_CONCEPT.md) — the problem Signal solves, its principles, and its boundaries.
2. [User guide](USER_GUIDE.md) — first conversation, providers, models, Markdown, proxies, and recovery from common failures.
3. [Architecture](ARCHITECTURE.md) — components, data ownership, security boundaries, and extension seams.
4. [Operations](OPERATIONS.md) — local setup, validation, data handling, troubleshooting, and release checks.
5. [Local API reference](API_REFERENCE.md) — browser-to-local-server routes and their request/response contracts.
6. [Context engine ADR](architecture/adr-001-context-engine.md) — durable workspace and context-budget decisions.

Run `npm run docs:check` after changing a user-visible workflow, storage location, route, provider protocol, or security boundary. It verifies the documentation set exists and contains no common secret-like tokens.
