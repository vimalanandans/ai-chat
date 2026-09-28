# Local API reference

These routes are consumed by the local Signal UI. They are not a public multi-tenant API and do not implement authentication. Do not expose this server directly to untrusted networks.

## Chat and models

### `POST /api/chat`

Streams text from the selected saved provider/model.

Request:

```json
{
  "model": "provider-record-id:model-or-deployment",
  "messages": [{ "role": "user", "content": "Hello" }]
}
```

Successful responses are UTF-8 text streams. Error responses contain `error` and may include sanitized `diagnostics` with provider type, model/deployment, endpoint, HTTP status, reason, API version, and route.

### `GET /api/models`

Returns `{ "models": ModelOption[] }`. A model option includes an ID, display label, provider name, provider ID, and configuration state.

## Provider connections

### `GET /api/providers`

Returns `{ "providers": ProviderSummary[], "models": ModelOption[] }`. API keys are never included.

### `POST /api/providers`

Creates or updates a local provider connection. Required values for a new connection are provider kind, name, endpoint, key, and one or more model/deployment IDs. Include an existing connection ID to update it. An omitted key during an update retains the existing key.

### `DELETE /api/providers?id={id}`

Removes a UI-managed provider connection. Environment-managed connections cannot be deleted through this route.

### `POST /api/providers/test`

Accepts the same provider connection shape and sends a minimal non-streaming request. A success response contains a message and safe diagnostics. A failure returns HTTP 400 with `error` and, where available, diagnostics. The key is never returned.

## Proxy settings

### `GET /api/proxy`

Returns application proxy settings and the currently discoverable macOS system proxy services.

### `POST /api/proxy`

Saves `{ "enabled": boolean, "endpoint": "http-or-https-proxy-url" }` for application provider traffic.

### `DELETE /api/proxy`

Disables application proxy routing.

### `PATCH /api/proxy`

Tests a supplied application proxy configuration using a short external connectivity request.

### `GET /api/proxy/system`

Returns macOS system-proxy capability and network service states. Non-macOS hosts report unsupported status.

### `POST /api/proxy/system`

Accepts a selected network service, requested enabled state, and proxy endpoint when enabling. It changes HTTP and HTTPS proxy settings for that macOS service.
