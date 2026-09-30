# Local API reference

These routes are private browser-to-local-server contracts used by Signal’s UI. They are not a public or multi-tenant API.

The server binds to `127.0.0.1`. Every route also rejects a request with a non-loopback host, origin, `X-Forwarded-For`, or `X-Real-IP` value. A rejected request returns `403` with a safe local-only error. Do not expose the server behind a public or shared reverse proxy.

All JSON errors use `{ "error": "…" }`; provider test and chat errors may also include sanitized `diagnostics`. API keys are never returned.

## Chat and models

### `POST /api/chat`

The request contains only `{ "sessionId": "local-session-id" }`. The server loads the saved session, its selected model, and active text context; it does not accept client-supplied provider credentials or attachment bytes. The model cannot read locally attached files. The SSE response emits `delta` events with `{ "text": "…" }`, optional `usage`, and `complete`; failures include a sanitized `error` and optional `diagnostics`.

```json
{
  "sessionId": "local-session-id"
}
```

The server rejects sends above a verified usable budget. Provider failures include safe diagnostics with provider type, model/deployment, endpoint, HTTP status, reason, API version when relevant, and route.

## Workspace and context

### `GET`, `PUT`, `PATCH /api/workspace`

`GET` returns `{ "workspace": ChatStore | null, "settings": WorkspaceSettings }`. `PUT` accepts a complete `ChatStore` and returns `{ "workspace": ChatStore }`; it persists canonical sessions. `PATCH` accepts a partial `WorkspaceSettings` and returns `{ "settings": WorkspaceSettings }`. Invalid updates return `400`.

Settings include the absolute session directory, attachment directory and size limit, read-only tool policy, output reserve, thresholds, catalog URL/key, and model overrides. Saving validates private local directories and preserves the existing workspace during relocation. Session data is never returned by provider routes.

### `POST /api/attachments`

Returns `{ "attachment": Attachment }` with safe metadata, never a filesystem path. A missing session returns `404`; invalid form data or files return `400`. Storage does not enable model-side file reading.

Accepts loopback-only multipart form data with `sessionId` and `file`. Signal verifies the target session, size, safe name, and image/PDF magic bytes (or valid UTF-8 text) before storing the file below that session’s configured private attachment directory.

### `GET`, `POST /api/context`

`GET /api/context?sessionId={id}` returns `{ "snapshot": ContextSnapshot }`. `POST` accepts a `sessionId` and optional `action`: `propose` returns `snapshot` and proposed `messageIds`; `generate` also returns a provider-generated `summary`; `apply` requires an edited `summary` and `messageIds` and returns the updated `session` after archiving selected raw turns. `{ "action": "refresh" }` needs no session and returns `metadataCache`, `refreshedModelIds`, and `warnings`; it may contact configured providers or a signed catalog. With no action, `POST` returns `snapshot` and active text `messages`.

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
