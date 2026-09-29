# User guide

## Your first five minutes

1. Run `npm run dev` and open the local URL shown in the terminal.
2. In the sidebar, select **Model connection**.
3. Choose the connection type that matches the provider API, fill in the form, and run **Test connection**.
4. Review the result, then select **Save connection**.
5. Use the model picker above the composer to select the saved connection/model pair and send a message.

The connection form and the chat are intentionally separate: testing or editing a connection does not alter a session until you select that model for the session.

## Work with sessions

Each conversation is an independent session. A session retains its title, model selection, messages, unfinished draft, and context plan in the configured local workspace.

- Select **New chat** for a fresh context. It starts with the current model selection.
- Select an item in **Conversations** to return to it. Its draft and model selection reappear.
- You can move between sessions while a response is streaming. Select that streaming session to stop its response; stopping it does not stop another session.
- The first message becomes the session title. Starting a new chat never deletes an existing chat.

## Manage context

Open the top-bar **Context** control to dock the session inspector on the right. It shows the estimated next-send prompt footprint in tokens and words, stored and archived history, output reserve, remaining capacity, model metadata source, and the latest provider-measured token usage.

Signal warns at 75% of a verified usable prompt budget, marks 90% as critical, and blocks a send at 100%. These defaults and the reserved output tokens are configurable in **Data & context settings**. An unknown or custom model is shown as unverified rather than assigned an invented limit; add a model override or configure a signed catalog to enforce a budget.

Choose **Generate summary** only when you are ready to send the marked older history to the session’s selected provider. Review and edit the generated continuity summary, then apply it. Signal preserves the original turns in a local archive and keeps the approved summary plus the newest turns active. It never compacts or deletes history automatically.

### Move or import session data

The default workspace is `data/sessions`. Enter an absolute Unix directory in **Data & context settings** to copy the canonical workspace there; the previous location remains as a recovery copy. On a first run with legacy browser-only chats, use **Import browser backup**. The browser copy remains untouched until you choose to clear it yourself.

## Add a provider connection

Choose the provider type by protocol, not by a model’s marketing name:

| Provider type | Enter | Notes |
| --- | --- | --- |
| Compatible | Chat Completions base URL and model ID | For OpenAI-compatible services. |
| OpenAI | OpenAI Responses base URL and model ID | Uses the Responses API. |
| Azure | Azure resource URL and **deployment name** | A deployment name is not necessarily the underlying model name. Keep the Azure API version with the connection. |
| Gemini | Gemini API base URL and model ID | Uses the Gemini content-generation API. |
| Anthropic | Messages API base URL and model ID | Uses the Anthropic Messages API. |

Use a different saved connection for every distinct endpoint/key pair, including multiple Azure resources or several accounts from the same provider family. A connection can contain several comma-separated model IDs or deployment names.

### Test, save, and edit

**Test connection** sends a minimal request to the first listed model. The result identifies the provider type, endpoint, model/deployment, Azure API version where relevant, token-limit strategy, and application-proxy route. It never shows the API key.

After a successful test, select **Save connection**. Saved connections appear above the form. Select **Edit** to change one. During an edit, leave the API-key field blank to keep the stored key; entering a value replaces it.

Each provider type has its own non-secret form draft. Switching from Azure to Gemini does not copy Azure’s resource URL or deployment name into the Gemini form. Keys remain only in memory until you save a connection.

## Write and read well-formatted messages

The composer accepts plain text and Markdown. Responses render safe GitHub-flavored Markdown: headings, emphasis, lists, links, blockquotes, tables, inline code, and fenced code blocks. Code blocks show a language label and **Copy** action. Raw HTML from a model is not rendered, and remote images are links rather than auto-loaded images.

Press Enter to send and Shift+Enter for a new line. The composer expands up to its maximum height, then scrolls.

## Route provider traffic through a proxy

Open **Model connection → Network routing** to configure an application-only proxy. Test it before saving. When enabled, it applies to provider tests and streamed chats, not to browser storage or other applications.

On macOS, the same pane offers a separate system-wide proxy action for a selected network service. It changes HTTP and HTTPS routing for all applications on that service, so Signal asks for confirmation. Disable that setting from the same pane when it is no longer needed.

## Diagnose a failure

Connection tests and chats report provider errors without revealing the API key. A rejected chat request shows the provider, model/deployment, endpoint, HTTP status, and a sanitized reason.

| If you see | Start with |
| --- | --- |
| A test failure | Confirm the provider type, endpoint, key, model/deployment, Azure API version, and proxy route. |
| Test passes but chat fails | Confirm the current session is using the intended saved model and read the in-app chat diagnostics. |
| An unsupported token parameter error | Update Signal; compatible and Azure requests first use modern token limits and automatically retry legacy limits only when the endpoint explicitly rejects the modern parameter. |
| A connection seems stale | Reload the page. Saved connections load from the local server; non-secret form drafts are separate for each provider type. |
| A provider cannot be reached | Disable the application proxy for a direct test, or start/fix the configured proxy. |
| System proxy controls are unavailable | They are macOS-only and may require local permission to inspect or change network services. |
