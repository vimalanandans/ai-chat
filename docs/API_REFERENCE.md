# Local API reference

These routes are private browser-to-local-server contracts used by Signal’s UI. They are not a public or multi-tenant API.

The server binds to `127.0.0.1`. Every route also rejects a request with a non-loopback host, origin, `X-Forwarded-For`, or `X-Real-IP` value. A rejected request returns `403` with a safe local-only error. Do not expose the server behind a public or shared reverse proxy.

All JSON errors use `{ "error": "…" }`; provider test and chat errors may also include sanitized `diagnostics`. API keys are never returned.

## Chat and models

### `POST /api/chat`

Streams typed server-sent events from the selected saved provider/model and the server-built active session context.

```json
{
  "sessionId": "local-session-id"
}
```

The server loads the canonical local session, plans its active context, and rejects sends above a verified usable budget. A successful response is an SSE stream with `delta`, optional `usage`, and `complete` events. A provider failure includes safe diagnostics with provider type, model/deployment, endpoint, HTTP status, reason, API version when relevant, and route.

## Workspace and context

### `GET`, `PUT`, `PATCH /api/workspace`

Reads or saves the canonical workspace, and updates settings such as the absolute session directory, attachment directory and size limit, read-only tool policy, output reserve, thresholds, catalog URL/key, and model overrides. Saving validates private local directories and preserves the existing workspace during relocation. Session data is never returned by provider routes.

### `POST /api/attachments`

Accepts loopback-only multipart form data with `sessionId` and `file`. Signal verifies the target session, size, safe name, and image/PDF magic bytes (or valid UTF-8 text) before storing the file below that session’s configured private attachment directory. The response returns safe attachment metadata; it never exposes a filesystem path.

### `GET`, `POST /api/context`

`GET` returns a session context snapshot. `POST` refreshes supported model metadata, proposes/generates a compaction summary, or applies an approved compaction and writes its raw-turn archive.

### `GET /api/models`

Returns `{ "models": ModelOption[] }`. A model option includes an ID, display label, provider name, provider ID, and configuration state.

## Provider connections

### `GET /api/providers`

Returns `{ "providers": ProviderSummary[], "models": ModelOption[] }`. Provider summaries contain ID, name, type, endpoint, model list, optional Azure API version, and configuration state—not API keys.

### `POST /api/providers`

Creates or updates a local provider connection. A new connection requires a provider kind, name, endpoint, API key, and one or more model/deployment IDs. Send an existing connection ID to update it. Omit the API key during an update to preserve the stored key.

### `DELETE /api/providers?id={id}`

Removes a UI-managed provider connection. The environment-managed `environment` connection cannot be removed through this route.

### `POST /api/providers/test`

Accepts the same provider connection shape and sends a minimal, non-streaming request to the first model/deployment. A successful response contains a message and safe diagnostics. A failed test returns `400` with `error` and diagnostics where available.

## Proxy settings

### `GET /api/proxy`

Returns application proxy settings and currently discoverable macOS system-proxy services.

### `POST /api/proxy`

Saves `{ "enabled": boolean, "endpoint": "http-or-https-proxy-url" }` for provider traffic. Enabling it requires a valid `http://` or `https://` proxy URL.

### `DELETE /api/proxy`

Disables application proxy routing and clears the saved endpoint.

### `PATCH /api/proxy`

Tests a supplied application-proxy configuration with a short external connectivity request. It does not save the supplied values.

### `GET /api/proxy/system`

Returns macOS system-proxy capability and network-service states. Non-macOS hosts report unsupported status.

### `POST /api/proxy/system`

Accepts a selected network service, requested enabled state, and a proxy endpoint when enabling. It updates HTTP and HTTPS proxy settings for that macOS service. This is a machine-wide network setting, so the UI requires confirmation before calling it.
