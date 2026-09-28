# Signal

Signal is a local-first, single-user, multi-session chat client. It stores sessions and drafts in the current browser's IndexedDB. Provider keys are stored only in a Git-ignored local server file.

## Configure providers in the UI

Open **Model connection** in the chat sidebar and add any combination of:

- OpenAI-compatible endpoints;
- OpenAI Responses API endpoints for newer OpenAI models;
- Azure OpenAI resource endpoints and deployment names;
- Google Gemini API endpoints and model IDs.
- Anthropic Messages API endpoints and model IDs.

Each provider can expose multiple models. Select the exact provider/model pair from the composer for any chat session. API keys are sent only to the local Signal server and saved to `data/providers.json`, which is ignored by Git.

Use **Test connection** before saving a new connection, or **Test** beside an existing provider. The test sends a minimal request to the first configured model and returns the provider's HTTP error details when configuration, model/deployment names, or credentials are invalid.

For different endpoints or keys in the same provider family, add separate connections; each remains independently selectable in the composer.

## Optional environment connection

Copy the example file, add your approved provider credentials, and restart the development server:

```sh
cp .env.example .env.local
npm run dev
```

`LLM_MODELS` is a comma-separated list. This configures an additional environment-managed OpenAI-compatible connection; UI-managed providers do not require a server restart.

## Run

```sh
npm install
npm run dev
```

Run checks with `npm run lint`, `npm run test`, and `npm run build -- --webpack`.
