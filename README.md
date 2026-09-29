# Signal

Signal is a calm, local-first chat workspace for one person using one or more AI providers. It keeps each conversation, its selected model, unfinished draft, and model-aware context plan separate—so changing models or starting a new thought does not erase the work already in progress.

It is intentionally a desktop-style local application, not a hosted team service. The browser owns conversation history; the local Next.js server owns provider credentials and performs provider requests.

## What Signal is for

- Keep independent, persistent chat sessions in a configurable local Unix workspace.
- Connect several provider accounts, endpoints, deployments, and models at once.
- Select the exact connection/model pair for each conversation.
- Test a connection before relying on it, with useful diagnostics that do not expose keys.
- Read model output comfortably with safe Markdown, tables, and copyable code blocks.

## What Signal does not do yet

Signal has no sign-in, cloud synchronization, collaboration, file attachments, background agents, or hosted deployment mode. It should only run on a computer you trust.

## Start here

```sh
npm install
npm run dev
```

Open the loopback URL printed by Next.js, then:

1. Select **Model connection** in the conversation sidebar.
2. Choose the provider protocol, enter a connection name, endpoint, API key, and one or more model IDs or Azure deployment names.
3. Run **Test connection**, review the result, and save the connection.
4. Choose the connection/model pair in the composer and send a message.

The app binds to `127.0.0.1`, and its API routes independently reject non-loopback requests. This is a local-machine trust boundary, not multi-user authentication. Do not publish Signal through a public or shared reverse proxy.

## Providers and models

Signal supports these provider protocols from the UI:

| Connection type | Use it for | Model field |
| --- | --- | --- |
| Compatible | Chat Completions-compatible services | Model ID |
| OpenAI | OpenAI Responses-compatible services | Model ID |
| Azure | Azure OpenAI resources | Deployment name |
| Gemini | Google Gemini API | Model ID |
| Anthropic | Anthropic Messages API | Model ID |

Create a separate saved connection for every endpoint/key combination, including connections from the same provider family. One connection may list multiple models. Provider keys are never returned to the browser and are written only to the Git-ignored `data/providers.json` file on the local server.

## Privacy and routing

Sessions, selected session, drafts, context summaries, and layout state are stored in a local file workspace. By default it is `data/sessions/`; change it from **Context → Data & context settings**. Each session is a separate private JSON file, with a workspace manifest and immutable compaction archives. The first-run **Import browser backup** action can copy legacy IndexedDB chats without clearing the browser data.

Select the context button in the top bar to inspect the active prompt’s estimated tokens and words, stored versus archived history, output reserve, remaining model budget, and the most recent provider-measured usage. Estimates are deliberately labeled; provider usage is shown only when a provider reports it. Context compaction is explicit: Signal generates an editable continuity summary with the selected model, then archives the replaced raw turns only after your approval.

An optional application proxy applies to provider tests and chat traffic and is persisted separately in Git-ignored `data/proxy.json`. On macOS, Signal can also change HTTP/HTTPS proxy settings for one chosen network service after explicit confirmation. That system-level control affects other applications and should be used deliberately.

## Optional environment-managed connection

For a single OpenAI-compatible connection managed outside the UI, copy the example file, set local values, and restart the server:

```sh
cp .env.example .env.local
npm run dev
```

`LLM_MODELS` accepts a comma-separated model list. UI-managed connections do not require a server restart.

## Verify a change

```sh
npm run lint
npm run test
npm run docs:check
npm run build -- --webpack
```

See the [documentation index](docs/README.md) for product intent, the user guide, architecture, local API reference, and operating notes.
