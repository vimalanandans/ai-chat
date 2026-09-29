# ADR-001: File-backed context engine

## Status

Accepted

## Context

Signal needs durable, independently managed sessions and truthful context visibility across provider models with different limits and usage telemetry.

## Decision

Use a configurable private Unix file workspace as the canonical session store. Build prompts on the local server with a model-aware context engine, show estimates separately from provider measurements, and compact only after explicit user review. Resolve model metadata by override, provider API, signed catalog, then unknown.

## Trade-offs

File storage is simple, portable, and recoverable but does not provide multi-user synchronization or encryption at rest. Conservative cross-provider estimates can differ from provider tokenizers; measured usage is retained whenever an adapter exposes it. Catalog availability is operationally required for verified limits on providers that do not expose them through their model API.

## Consequences

Raw history remains recoverable in archives, model changes immediately re-evaluate the same session, and unsafe verified overflows are blocked. A future hosted or multi-user version requires a separate persistence, authentication, and secret-management design.
