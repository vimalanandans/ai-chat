# Operations and maintenance

## Local setup

```sh
npm install
npm run dev
```

Signal’s scripts bind Next.js to `127.0.0.1`. Open only the local URL printed in the terminal. For an optional environment-managed OpenAI-compatible connection, copy `.env.example` to `.env.local`, add local credentials, and restart the server. UI-managed connections do not need a restart.

## Validate a change

Run these checks before a release checkpoint:

```sh
npm run lint
npm run test
npx tsc --noEmit
npm run docs:check
npm run build -- --webpack
```

Do not run a production build while a Next development server uses the same checkout; Next uses a shared build lock. Stop the development server or build from a separate checkout.

When network validation or Git access needs the local corporate proxy, use the locally managed proxy setup rather than embedding proxy settings in scripts or documentation:

```sh
source ~/.proxy_set
npm audit --omit=dev
```

Never print or commit proxy credentials, environment values, or shell history containing them.

## Data handling and recovery

- Back up the configured session workspace (the manifest, `sessions/`, and `archives/`) if chat history needs to survive device migration. Files contain chat content and are created with private permissions; use an encrypted, access-controlled backup.
- Browser IndexedDB is only a legacy import source after this release. Do not clear it until an explicit import has been verified.
- Back up `data/providers.json` only through an encrypted, access-controlled mechanism; it contains provider keys.
- Do not commit `data/`, `.env.local`, browser-storage exports, or diagnostic logs that could contain sensitive content.
- Deleting a provider connection does not delete browser chat history. Clearing browser data does not delete server-side provider connections.
- Moving the configured session directory copies the active workspace first and leaves the old directory as a recovery copy.
- A signed model catalog must use HTTPS and a base64 SPKI public key. Invalid, expired, or unavailable catalogs leave the last verified metadata cache untouched.
- To remove a local provider key, delete that connection in **Model connection** and securely remove any backup that contained the old provider file.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| Connection test fails | Confirm provider type, endpoint, key, model/deployment, Azure API version, and proxy route. Read the test diagnostics. |
| Test passes but chat fails | Read the in-app chat diagnostics and confirm the active session uses the intended saved model. |
| Provider settings seem stale | Reload the page. Saved connections load from the local registry; non-secret drafts are stored independently for each provider type. |
| Provider cannot be reached | Disable the application proxy for a direct test, or ensure the configured proxy is running and reachable. |
| System proxy control is unavailable | It is macOS-only and may require permission to inspect or update network services. |
| A remote client receives 403 | Expected: Signal accepts API requests from the local computer only. Do not bypass the loopback boundary. |
| Git cannot reach a remote | Load the approved local proxy setup and confirm the proxy process is reachable; do not add credentials to repository files. |

## Release checkpoint

For a material user-visible change:

1. Update the affected product, user, architecture, API, or operations document.
2. Run the validation suite above and record any intentionally unverified external integration.
3. Review the diff for secrets and inaccurate claims.
4. Commit the change, create an annotated version tag, and push the branch and tag.

## Current operating boundary

Signal is not a production hosted service. It does not provide remote authentication, rate limits, cloud synchronization, audited secrets management, or CI. Do not make it network-accessible without designing and implementing those capabilities first.
