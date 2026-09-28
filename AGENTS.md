<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Delivery checkpoints

After each user-requested major feature or milestone:

1. Run the relevant automated checks and review the working-tree changes.
2. Create one focused conventional commit for the completed milestone.
3. Create an annotated semantic-version or milestone tag when the change is a
   user-visible release checkpoint.
4. Push the branch and any newly created tag to `origin`.

Do not tag or push incomplete, failing, experimental, or unrelated changes.
