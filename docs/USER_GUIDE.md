# User guide

## Start a conversation

1. Start the app with `npm run dev` and open the local URL shown by Next.js.
2. Select **Model connection** in the sidebar.
3. Add and test a provider connection, then save it.
4. Choose an exact provider/model pair from the composer and send a message.

Each chat is an independent session. Creating a new chat keeps the previous session, selected model, draft, and message history in the browser.

## Add a provider connection

Choose the provider tab that matches the endpoint protocol:

| Provider type | Enter | Notes |
| --- | --- | --- |
| Compatible | Chat Completions base URL and model ID | For OpenAI-compatible services. |
| OpenAI | OpenAI Responses base URL and model ID | Uses the Responses API. |
| Azure | Azure resource URL and **deployment name** | A deployment name is not necessarily the underlying model name. Keep the Azure API version with the connection. |
| Gemini | Gemini API base URL and model ID | Uses the Gemini content-generation API. |
| Anthropic | Messages API base URL and model ID | Uses the Anthropic Messages API. |

Use one saved connection for every distinct endpoint/key pair, even when the provider family is the same. A connection can list several comma-separated model IDs or deployment names.

### Test, save, and edit

**Test connection** sends a minimal request to the first listed model. A result includes the provider type, endpoint, model/deployment, API version when applicable, selected token parameter, and proxy route. It does not show the key.

After a successful test, select **Save connection**. Saved connections appear above the form. Use **Edit** to change a saved connection. Leave the API-key field blank during an edit to retain the stored key; entering a value replaces it.

The form keeps a separate non-secret draft for every provider type. Switching from Azure to Gemini, for example, never transfers the Azure resource URL or deployment name. Keys remain only in memory until a connection is saved.

## Send formatted prompts and read formatted answers

The composer accepts plain text and Markdown. Responses render safe GitHub-flavored Markdown: headings, emphasis, lists, links, blockquotes, tables, inline code, and fenced code blocks. Code blocks include a language label and **Copy** action. Raw HTML from a model is not rendered. Remote images are displayed as explicit links rather than being loaded automatically.

The composer grows vertically up to its maximum height. Press Enter to send and Shift+Enter for a newline.

## Route provider traffic through a proxy

Open **Model connection → Network routing** to configure an application-only proxy. Test it before saving. When enabled, it applies to provider tests and streaming chats.

On macOS, the same pane has an explicit system-wide proxy action for a selected network service. That action changes HTTP and HTTPS routing for all applications on that service. It is separate from the app-only setting and always asks for confirmation.

## Diagnose failures

Connection tests and chats report the provider error without revealing the API key. For a rejected chat request, the error panel shows the provider, model/deployment, endpoint, HTTP status, and a sanitized reason. Common fixes are:

- confirm that an Azure deployment name—not only a model family name—is configured;
- select the provider tab matching the endpoint protocol;
- use the configured API version for Azure;
- test the connection after changing endpoint, deployment, key, or proxy;
- verify that the application proxy is reachable, or disable it for a direct test.
