# Operations and maintenance

## Local setup

```sh
npm install
npm run dev
```

For an optional environment-managed OpenAI-compatible connection, copy `.env.example` to `.env.local`, enter approved credentials locally, and restart the dev server. UI-managed connections do not need a restart.

## Validation

Run the following before a release checkpoint:

```sh
npm run lint
npm run test
npx tsc --noEmit
npm run docs:check
npm run build -- --webpack
```

Do not run a production build concurrently with an active Next development server in the same checkout; Next uses a shared build lock. Stop the dev server first or perform the build in a separate checkout.

## Data handling

- Back up the browser profile if chat history must be retained.
- Back up the local provider file only through an encrypted, access-controlled mechanism; it contains provider keys.
- Do not commit the local data directory, environment files containing keys, browser storage exports, or console logs that might contain sensitive content.
- Deleting a provider connection does not delete browser chat history; deleting browser data does not delete a server-side provider connection.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| Connection test fails | Confirm provider tab, endpoint, key, model/deployment, Azure API version, and proxy route. Read the test diagnostics. |
| Test passes but chat fails | Read the in-app chat diagnostics. Confirm the selected session model points to the intended saved connection. |
| Provider settings seem stale | Reload the page. Non-secret drafts persist separately per provider type; saved connections load from the local server registry. |
| Provider cannot be reached | Disable the application proxy for a direct test, or ensure the configured proxy is running and reachable. |
| System proxy action unavailable | It is available only on macOS and may require the local process to have permission to inspect or update network services. |
| Git cannot reach a remote | Check inherited `HTTP_PROXY` and `HTTPS_PROXY` variables as well as the configured proxy process. |

## Documentation maintenance

When changing a route, provider type, storage location, security boundary, or user-visible workflow, update the corresponding document in this directory. Then run `npm run docs:check` and the normal code checks.

## Current gaps

This is not yet a production hosted deployment. It lacks authentication, remote rate limits, cloud sync, audited secrets management, and a CI workflow. Those should be addressed before exposing the app outside a trusted single-user local environment.
