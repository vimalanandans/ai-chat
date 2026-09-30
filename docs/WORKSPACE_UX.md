# Signal workspace UX

This iteration takes the strongest ideas from the [AionUi research](../document/aionui-ux-research.md)—returning to work, visible scope, and inspectable activity—and expresses them within Signal's existing local chat model. Signal remains a single-user conversation app. It does not currently execute file editing agents, run scheduled tasks, or manage generated file versions.

## Experience map

| Surface | User question | Interaction |
| --- | --- | --- |
| Workspace overview | What can I do or resume? | Start a blank conversation, choose a starter, open a recent conversation, review previously attached files, or connect a model. |
| Conversation list | Where was that work? | Search titles and short message previews; open a saved conversation. |
| Conversation scope | What context am I using? | See the selected model, number of prompts, and number of local files; open activity. |
| Activity | What happened in this conversation? | Read a chronological list of sent prompts, model responses, interruptions, and file counts. |
| Composer | What will I send? | Select a model, attach files, edit the draft, send, or stop a response. |
| Context drawer | How much context remains? | Review usage, model metadata, history, and deliberate compaction. |

## Main paths

1. **First use:** The overview shows the connection state. With no configured model, the user opens Models & connections. After setup, they start a blank conversation or pick a starter. A starter creates a new local conversation with an editable draft; it does not send automatically.
2. **Continue work:** The user opens a recent item from the overview or finds it in the sidebar. Its saved model, messages, draft, and attachments remain with that conversation. The scope strip and activity panel make the current context visible.
3. **Use a file:** The user attaches a supported local file in the composer. Once included in a sent prompt, its name appears in the message and the overview's Files in conversations list links back to that conversation. The file list is a way to find context, not a separate file editor.
4. **Review or recover:** The activity panel shows the order and state of messages. The context drawer retains the existing usage and compaction controls. Stopping a response is handled by the existing stream registry.

## Design choices

- The overview is a landing surface, not an agent dashboard. It presents actions supported by the product today.
- The visual language uses Signal's own calm typography and a muted green workspace palette. Cards are navigation and prompt starting points, not copies of AionUi screens.
- Search and recent work are derived from saved sessions. No separate index or duplicate source of truth is introduced.
- Starter prompts remain editable drafts. This keeps the user's intent and model choice explicit before any request is sent.
- The activity panel describes real conversation events. It avoids implying that a model response changed files.
- The context drawer is kept as an optional detail surface. A new conversation starts with it closed because its server-side record may not yet exist.

## Next capability boundary

If Signal later adds autonomous execution, the interface will need a genuine run model, scoped file access, approvals, change review, cancellation, artifact discovery, and undo. These should be backed by durable server behavior before they appear as active controls. The [product concept](PRODUCT_CONCEPT.md) records the current trust and scope boundaries.
