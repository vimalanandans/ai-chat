# Signal

Signal is a local-first, single-user, multi-session chat client for an OpenAI-compatible LLM endpoint. It stores sessions and drafts in the current browser's IndexedDB; API credentials remain server-side.

## Configure a model

Copy the example file, add your approved provider credentials, and restart the development server:

```sh
cp .env.example .env.local
npm run dev
```

`LLM_MODELS` is a comma-separated list. Each configured model appears in the composer model picker and can be selected independently for every chat session.

## Run

```sh
npm install
npm run dev
```

Run checks with `npm run lint`, `npm run test`, and `npm run build -- --webpack`.
