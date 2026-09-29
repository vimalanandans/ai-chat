# AionUi UX Research and Interaction Specification

Research date: 2026-09-29  
Product: [AionUi](https://github.com/iOfficeAI/AionUi)  
Repository: [github.com/iOfficeAI/AionUi](https://github.com/iOfficeAI/AionUi)  
Status: evidence-based desk research; live desktop UI not available in this workspace

## Executive overview

AionUi is positioned as a local-first “Cowork” application: a desktop workspace in which AI agents can read and write files, run multi-step tasks, browse the web, generate images, and operate on schedules. Its differentiator is not a single model or chat surface; it is the unification of a built-in agent, detected external CLI agents, file-oriented workspaces, artifact preview/editing, and unattended execution in one interface.

The strongest UX idea is the “agent workbench” rather than the “AI chat window.” A conversation is attached to an agent, model, assistant persona, and optionally a working folder. The result is intended to be a durable work product—code, documents, spreadsheets, slides, images, or diffs—that can be previewed, edited, tracked, and restored without leaving AionUi. This maps closely to an AI-native workspace model: visible scope, explicit agent runs, artifacts, approvals, and recoverable changes.

The principal UX risk is complexity. The product combines provider configuration, model selection, assistant configuration, external agent discovery, MCP tools, project folders, multiple parallel conversations, scheduled tasks, WebUI access, messaging channels, and autonomous modes. Progressive disclosure and strong state communication are therefore not polish; they are core safety and comprehension requirements.

Confidence labels used below:

- **Observed** — directly inspected in a live interface. None of the desktop UI states were available in this research pass.
- **Code-confirmed** — supported by repository/documentation claims or named implementation concepts.
- **Inferred** — a reasoned interpretation of documented behavior, useful for design analysis but not proof of a rendered UI.
- **Unknown** — requires live UI, source inspection at a specific revision, or a controlled task to confirm.

## 1. Scope, method, and coverage

### 1.1 Product identity and access

| Item | Finding | Evidence / confidence |
|---|---|---|
| Product | AionUi, an open-source desktop Cowork application for AI agents | README and Wiki; **Code-confirmed** [E01] |
| Platforms | macOS, Windows, Linux | Wiki home and quick start; **Code-confirmed** [E01], [E02] |
| Architecture context | Electron-based desktop application; local conversation storage is documented | FAQ and quick start; **Code-confirmed** [E02], [E03] |
| Primary access | Desktop app; WebUI and messaging integrations are also documented | Wiki home; **Code-confirmed** [E01] |
| Research access | Public GitHub README, Wiki pages, documentation claims, and the supplied UX specification | **Observed** as research inputs |
| Live UI | Not launched or inspected in this workspace | **Unknown** |
| Exact release under review | Not pinned to a repository commit or release tag in this pass | **Unknown**; behavior may drift |

### 1.2 Areas covered

| Area | Coverage | Basis |
|---|---|---|
| Positioning and product model | High | README and Wiki |
| First-run setup | Medium-high | Quick Start guide |
| Chat and conversation model | Medium-high | Quick Start guide |
| Agent and model selection | Medium-high | README, Wiki, Quick Start |
| Files and project folders | Medium-high | Quick Start and Preview Panel guide |
| Preview and editing | High | Preview Panel guide |
| Multi-agent and team mode | Medium | README and Wiki home |
| Scheduled tasks | High | Scheduled Tasks guide |
| WebUI, messaging channels, MCP | Medium | Wiki index and README; flows not fully inspected |
| Visual design system | Low | No live UI or source-token audit |
| Accessibility and responsive behavior | Low | No controlled UI inspection |
| Error, loading, permission, recovery states | Low-medium | Some documented constraints; most states untested |

### 1.3 Research limitations

The GitHub Wiki contains current-looking pages whose text can change independently of a tagged release. Documentation describes intended or supported behavior; it does not prove every behavior is available in every platform build. The report therefore treats capabilities such as version restore, auto-detection, parallel sessions, and remote channels as documented product behavior, while marking exact control placement, visual styling, timing, focus order, and error copy as unknown.

## 2. Product experience overview

### 2.1 What users do

AionUi helps users delegate computer-based work to AI agents while keeping the work inside a local desktop workspace. Documented activities include:

- asking an agent to analyze, create, transform, or organize files;
- writing and editing code;
- generating Word documents, Excel workbooks, CSVs, and PowerPoint files;
- browsing or gathering information with tools;
- working with images;
- running several independent conversations or agents in parallel;
- configuring external CLI agents such as Claude Code, Codex, Gemini CLI, Qwen Code, OpenCode, and others;
- scheduling recurring prompts against an agent and assistant;
- accessing the system remotely through WebUI or messaging integrations.

These claims are documented in the README and Wiki [E01].

### 2.2 Likely user groups

The following are product-supported user groups, not verified personas:

1. **General productivity users** who want an agent to manipulate local files without learning a CLI.
2. **Developers** who already use CLI agents and want a unified session manager and workspace surface.
3. **Knowledge workers and analysts** who need document, spreadsheet, research, or reporting workflows.
4. **Power users and operators** who configure MCP, model providers, assistants, remote access, and schedules.
5. **Teams experimenting with agent collaboration** through leader/teammate mode and shared task boards.

The experience must serve both a low-setup “paste a key and start” path and a high-control “bring your own agent/toolchain” path. That tension is central to the information architecture.

### 2.3 Primary objects

| Object | User meaning | Visible consequences |
|---|---|---|
| Agent | The execution backend, built-in or external CLI | Determines capabilities, available models, permissions, and execution behavior |
| Model | The model selected for an agent | Appears in the conversation composer and configuration |
| Assistant | A reusable persona/skill bundle, including office-oriented assistants | Shapes task behavior and output type |
| Conversation | A persistent task context with independent memory | Appears in history; may be new or reused by a scheduled run |
| Project / working folder | File-system scope attached to a conversation | Enables a right-side project panel and file picking; documented as locked mid-conversation [E02] |
| Artifact | A generated or edited file/result | Opens in the preview panel; may be editable and versioned |
| Scheduled task | A saved prompt plus agent, assistant, folder, frequency, and execution mode | Appears in a task list with status and next-run time [E04] |
| MCP tool/server | An external capability made available to an agent | Managed centrally, with compatibility dependent on the agent [E01] |

### 2.4 Central interaction model

The documented loop is:

```text
Choose agent / model / assistant
        ↓
Start or select conversation
        ↓
Attach files or open a working folder
        ↓
Describe work in the composer
        ↓
Agent executes with configured tools and permissions
        ↓
Inspect conversation output and generated artifacts
        ↓
Preview, edit, save, compare, or restore files
        ↓
Continue the same context, start a new task, or schedule recurrence
```

The product’s distinctive character is therefore “local agent operations with a GUI safety net”: it reduces CLI setup friction while preserving access to agent ecosystems and file-system work.

## 3. UX philosophy and recurring patterns

### 3.1 Bring the agent to the work

**Statement:** The user should interact with agents in the context of files, projects, and deliverables rather than only exchanging text.

**Evidence:** Project folders, drag-and-drop or disk attachment, a right-side project panel, automatic artifact preview, and editable multi-format output are all documented [E02], [E05]. **Code-confirmed**.

**Benefit:** The user can move from intent to inspectable output without switching between a chat client, file browser, editor, and office application.

**Tradeoff:** File scope becomes a critical mental-model problem. The product must always show which folder and files are in scope.

### 3.2 Progressive disclosure from zero setup to expert control

**Statement:** AionUi offers a low-friction built-in agent path, then exposes external agents, MCP, assistants, schedules, and remote channels for advanced users.

**Evidence:** The README explicitly distinguishes a built-in agent requiring no CLI installation from Multi-Agent Mode and MCP management [E01]. **Code-confirmed**.

**Benefit:** Beginners can reach first value quickly; experts are not forced into a single provider or agent.

**Tradeoff:** The same application can feel like two products. Onboarding should establish a simple default path and progressively reveal configuration surfaces.

### 3.3 Persistent context with explicit task boundaries

**Statement:** Conversations are independent work contexts; projects are attached to a conversation and cannot be changed mid-conversation.

**Evidence:** Quick Start states that each conversation has independent memory and that a project folder is locked per conversation [E02]. **Code-confirmed**.

**Benefit:** Prevents accidental cross-project context contamination and makes “continue this work” easy.

**Tradeoff:** Users who change folders may not understand why they must start a new chat. The UI should explain the boundary before or at the moment of restriction.

### 3.4 Immediate inspectability of generated work

**Statement:** Outputs should be previewable and editable in place as soon as they are generated.

**Evidence:** Preview Panel supports automatic opening, multi-tabs, live editing, synchronization, dirty detection, and Git-based history/restore [E05]. **Code-confirmed**.

**Benefit:** Reduces the gap between “the agent says it created a file” and “the user can verify and use the file.”

**Tradeoff:** Editing and agent mutation can compete for ownership. Unsaved changes, external changes, and agent rewrites need explicit conflict states.

### 3.5 Automation as a first-class workflow

**Statement:** AionUi treats recurring agent work as saved objects with visible schedules, modes, and controls rather than as hidden scripts.

**Evidence:** Scheduled page, task form, status tag, next-run time, enable/disable, edit, delete, run-now, and keep-awake controls [E04]. **Code-confirmed**.

**Benefit:** Makes recurring work discoverable and operationally manageable.

**Tradeoff:** Automation creates real-world side effects while the user may be away. Approval boundaries, execution logs, failure visibility, and safe defaults must be explicit.

### 3.6 Local-first trust claim

**Statement:** The product emphasizes local storage and local execution context while connecting to remote model providers and optional remote channels.

**Evidence:** Documentation says “Everything is local” for conversation storage and the README says the built-in agent can operate on local files [E01], [E02]. **Code-confirmed**.

**Benefit:** Supports privacy and ownership expectations.

**Tradeoff:** “Local” can be misunderstood as “nothing leaves the machine.” Provider/API calls, remote WebUI, channels, and MCP connections need clear data-flow explanations.

## 4. Information architecture and navigation

### 4.1 Documented hierarchy

```text
AionUi
├── Main workspace
│   ├── Chat / conversations
│   │   ├── Conversation history
│   │   ├── Composer
│   │   ├── Agent and model selection
│   │   ├── Attachments / project picker
│   │   └── Project panel / file tree
│   ├── Scheduled tasks
│   ├── Settings
│   │   ├── Models / providers
│   │   ├── Tools / image generation
│   │   ├── MCP
│   │   └── Assistants / skills
│   └── Remote / integrations
│       ├── WebUI
│       ├── Telegram, Lark, DingTalk, WeChat, WeCom
│       └── Remote internet access
└── Contextual preview panel
    ├── File tabs
    ├── Preview modes
    ├── Editors
    ├── Diff / history
    └── Save / restore
```

The left sidebar is explicitly documented for Chat, Settings, and Scheduled pages; the right-side Project panel is documented as contextual to an opened project [E02], [E04]. The broader hierarchy is **Inferred** from the Wiki’s configuration and feature inventory.

### 4.2 Global versus local navigation

- **Global navigation:** left sidebar entries for Chat, Settings, and Scheduled are **Code-confirmed** [E02], [E04].
- **Conversation navigation:** history list switches between independent contexts; **Code-confirmed** [E02].
- **Project navigation:** contextual file tree appears on the right after a folder is opened; **Code-confirmed** [E02].
- **Artifact navigation:** preview tabs hold multiple open files; right-click tab management is documented; **Code-confirmed** [E05].
- **Settings navigation:** provider/model configuration and tool settings are documented, but exact tab structure is **Unknown**.

### 4.3 Location and next-action comprehension

The essential location indicators should be:

1. active conversation name and agent;
2. active model and assistant;
3. current project/working folder;
4. current preview tab and dirty state;
5. active or scheduled execution state.

Only the existence of these concepts is documented. Their actual placement, persistence, and visual prominence are **Unknown** and should be validated in the live app.

## 5. End-to-end task flows

### Flow F01 — First launch to first conversation

1. Install the platform package or Homebrew package. The app supports macOS, Windows, and Linux [E02].
2. Launch AionUi and reach the welcome screen. The exact screen is documented but not inspected here; **Code-confirmed**, visual layout **Unknown**.
3. Choose the built-in Agent or a detected CLI agent. Auto-detection is documented [E01].
4. If using the built-in agent, open Settings → Models, choose Add Model, select a provider, paste an API key, and save [E02].
5. Open Chat, select agent and model, type a prompt, and send [E02].
6. Continue the conversation or create a new one. Each has independent memory [E02].

**Alternate path:** If no model appears, configure a provider or install/use a supported CLI agent [E02].

**UX requirement:** The first-run state must distinguish “no agent detected,” “agent detected but no model configured,” “provider configured but unavailable,” and “ready.”

### Flow F02 — Work with a project and files

1. In the composer, click the plus control.
2. Choose Open Folder or attach files [E02].
3. The project panel appears on the right with a folder tree.
4. Browse and attach files from the panel or use drag-and-drop.
5. Send a task scoped to the conversation/project.
6. Continue work in the same conversation; the project folder remains locked.
7. To change project folders, start a new chat [E02].

**Risk:** The lock is a useful safety boundary but may feel arbitrary. The system should show the current project in the composer and explain “new chat required to change project.”

### Flow F03 — Generate, inspect, edit, and restore an artifact

1. Ask an agent to create or modify a file.
2. When generated, the file opens automatically in the preview panel or can be opened by clicking it in the workspace/conversation [E05].
3. Inspect the format-specific preview.
4. Edit in the Markdown, code, or HTML editor where supported.
5. Save with Cmd/Ctrl+S; dirty changes are tracked [E05].
6. If necessary, open version history, compare versions, and restore a prior version through Git-backed history [E05].

**Unknown:** Whether an agent-generated change is shown as a diff before mutation, whether restore is undoable, and how concurrent external edits are reconciled.

### Flow F04 — Create a scheduled task

1. Open Scheduled from the left sidebar.
2. Click Create Task.
3. Enter task name, agent/model, assistant, optional workspace folder, frequency, time/day or cron, execution mode, and prompt [E04].
4. Save. The task appears with a status tag and next-run time.
5. Later, toggle enable/disable, edit the task, run it now, or delete it [E04].
6. Optionally enable Keep Awake so the machine does not sleep while AionUi is open [E04].

**Critical alternate path:** `new_conversation` starts fresh on each run; `existing` appends to an existing conversation and accumulates context [E04]. This distinction must be prominent because it changes data continuity and cost.

### Flow F05 — Use external agents

1. Install or already have a supported CLI agent.
2. AionUi auto-detects it or provides a configuration path.
3. Select the external agent in the unified interface.
4. Run an independent conversation; multiple agents can run in parallel according to the product claim [E01].
5. Use compatible MCP tools and the agent-specific model/permission behavior.

**Unknown:** Detection failure recovery, capability comparison, permission prompts, and whether external agent output has the same artifact preview and history affordances as the built-in agent.

## 6. Screen-by-screen specification

### S01 — Welcome / first-run screen

- **Entry:** First launch; possibly new conversation.
- **Purpose:** Select an agent and reach a ready state.
- **Documented content:** Built-in Agent and detected CLI agents; exact copy and layout unknown [E01], [E02].
- **Required states:** no provider, model configured, CLI agent detected, agent unavailable, loading detection, error, and ready.
- **Interaction:** Selecting an agent changes available model choices; **Code-confirmed** [E02].
- **Evidence:** E01, E02. Confidence: medium for behavior, low for visual design.

### S02 — Chat workspace

- **Entry:** Chat sidebar or first-run completion.
- **Purpose:** Conduct a persistent task conversation.
- **Layout:** Documented left history, central conversation/input area, and contextual project panel when a folder is open. Exact split and responsive behavior unknown.
- **Controls:** New Chat, history item selection, composer, plus attachment control, model selector at the bottom-left of the input box, send control [E02].
- **States:** Empty welcome, streaming/working, completed response, error, no model, attached files, project selected, and independent conversation context.
- **Behavior:** Switching history changes memory context; model list is agent-specific; project folder is locked per conversation [E02].
- **Evidence:** E02. Confidence: medium-high for behavior, low for visual/accessibility.

### S03 — Project panel

- **Entry:** Open Folder from composer plus control.
- **Purpose:** Show project tree and enable file picking.
- **Content:** Working-folder tree and quick attachment affordance [E02].
- **Rules:** Only appears once a project is opened; project cannot be changed mid-conversation.
- **Unknown:** Filtering, search, hidden files, file permissions, collapse behavior, and mobile/WebUI adaptation.

### S04 — Settings / Models

- **Entry:** Settings icon in left sidebar → Models.
- **Purpose:** Add and manage model providers/API keys.
- **Documented controls:** Add Model, provider choice, API key input, save; supported providers include Gemini, OpenAI, Anthropic, ModelScope, OpenRouter, DeepSeek, and more [E02].
- **Required states:** empty provider list, saved provider, validation error, invalid key, unavailable provider, edit/delete, secret masking.
- **Unknown:** Exact field labels, key storage/security copy, test-connection flow, and model capability indicators.

### S05 — Scheduled task list and detail

- **Entry:** Scheduled left-sidebar item.
- **Purpose:** Inspect and operate recurring tasks.
- **List content:** Task cards/list items with status tag and next-run time [E04].
- **Actions:** Create Task, enable/disable toggle, open detail/edit, run now, delete, Keep Awake [E04].
- **Detail form:** name, agent/model, assistant, folder, frequency, time/day/cron, execution mode, prompt.
- **Required states:** no tasks, saved, disabled, next run, running, succeeded, failed, invalid cron, missing folder, unavailable agent.
- **Unknown:** Run history, logs, notifications, confirmation on delete, and retry behavior.

### S06 — Preview panel

- **Entry:** Click a file, reference a file, or receive an AI-generated file.
- **Purpose:** Preview and edit artifacts without leaving the app.
- **Layout:** Multi-tab file surface; format-specific viewer/editor; possible split-screen editor/preview [E05].
- **Controls:** Tab switching, right-click context menu, save, format-specific zoom/navigation, history/restore.
- **Supported behavior:** PDF navigation/zoom, document and spreadsheet preview, code editor, Markdown live/split preview, HTML live preview, image zoom/full-screen, diff highlighting [E05].
- **States:** loading, unsupported/limited format, dirty, externally changed, saved, history available, restore confirmation/error.
- **Keyboard:** Cmd/Ctrl+S documented; tab close/switch shortcuts are explicitly not implemented according to the guide [E05].

### S07 — Remote and channel surfaces

- **Entry:** Configuration pages or external clients.
- **Purpose:** Reach assistants through browser or messaging platforms.
- **Documented integrations:** WebUI, QR login, LAN/cross-network/server deployment, Telegram, Lark, DingTalk, WeChat, and WeCom [E01].
- **Unknown:** Whether remote surfaces mirror the desktop IA, how approval is handled remotely, session security, reconnect states, and artifact preview support.

## 7. Component and interaction catalog

| Component | Purpose / variants | Documented behavior | Unknown or risk |
|---|---|---|---|
| Left sidebar | Global navigation | Chat, Settings, Scheduled; **Code-confirmed** | Collapsed/mobile states |
| Conversation history list | Persistent task switching | Independent memory per conversation | Rename, search, archive, deletion, unread state |
| Agent selector | Choose built-in or external execution backend | Agent choice changes model list | Capability comparison and permission display |
| Model selector | Choose model for current agent | Bottom-left of input box; agent-specific list [E02] | Cost/context/capability disclosure |
| Composer | Send instruction and attachments | Text input, plus control, drag/drop, send | Streaming cancel, drafts, keyboard shortcuts |
| Attachment picker | Add files/folders | Disk picker, drag/drop, Open Folder | Size/type errors and scope preview |
| Project tree | Browse project context | Right panel; quick file picking | Search, sort, permissions, responsive behavior |
| Assistant picker | Select reusable persona/skill | Used in built-in agent and scheduled tasks | Where surfaced in chat, customization UX |
| Provider form | Configure model/API key | Add provider and save | Validation, secret handling, connection test |
| Task card/list row | Manage automation | Status, next-run, toggle, open detail | Run history and failure prominence |
| Cron/frequency form | Define recurrence | Presets plus custom 5-field cron [E04] | Human-readable preview and timezone handling |
| Preview tab bar | Hold multiple open artifacts | Smart reuse, overflow fade/scroll, context menu [E05] | Unsaved-close behavior, tab persistence |
| Editor | Modify supported artifacts | Markdown, CodeMirror 6 code, HTML | Conflict resolution, undo depth, autosave |
| Diff viewer | Understand changes | Color-coded line-by-line diff for diff files [E05] | Agent change review semantics |
| Version history | Recovery | Git-backed view, compare, restore [E05] | Restore confirmation and scope |
| Approval prompt | Safety boundary | Product README says autonomous work occurs with approval [E01] | Exact UI, granularity, always/auto modes |

## 8. Visual design and branding system

### 8.1 What is evidenced

The public product language is energetic and capability-forward: “Cowork,” “AI on UI,” “Install & Go,” “Team Mode,” “24/7,” and emoji-led feature sections. The brand frames agents as practical collaborators rather than passive chatbots. This is **Observed** in public documentation copy, not in the product UI [E01].

The documented UI vocabulary suggests a productivity desktop pattern: persistent left navigation, a central conversation workspace, contextual right project panel, and a tabbed preview surface. This layout is **Inferred** from documented control locations and panels, not visually inspected.

### 8.2 Values to extract when the live UI is inspected

The following must be measured from source tokens or screenshots before claiming exact values:

- color roles for brand accent, active navigation, agent states, destructive actions, and dirty/error states;
- typography family, scale, weight, and code/editor treatment;
- panel widths and minimum window sizes;
- spacing rhythm and density differences between chat, settings, task lists, and editors;
- radii, borders, shadows, dividers, icon style, and empty-state illustrations;
- light/dark themes and OS-level theme behavior;
- motion on agent execution, tab open/close, streaming, and panel transitions.

Current status for all exact visual values: **Unknown**.

## 9. Content, language, and feedback

### 9.1 Voice and terminology

The public voice is direct, promotional, and feature-rich. Product nouns are stable and useful: Agent, Assistant, Model, Workspace folder, Scheduled Task, Preview Panel, Team Mode, and MCP. The word “Cowork” is a positioning term that communicates collaboration but may require onboarding explanation.

### 9.2 Feedback patterns that the product needs

Documented status tags and next-run times create a basis for explicit operational feedback [E04]. The UI should extend this pattern to:

- agent state: queued, planning, running, waiting for approval, needs input, completed, failed, cancelled;
- tool state: requesting permission, executing, blocked, succeeded, failed;
- artifact state: generated, opening, dirty, externally changed, saved, restored;
- schedule state: enabled, disabled, due, running, failed, never run;
- provider state: configured, validating, ready, invalid, unreachable.

These state names are recommended for the AI-chat workspace contract; only some status concepts are documented in AionUi. Treat the mapping as **Inferred / recommended**, not as a claim about current AionUi copy.

### 9.3 Copy risks

- “Full file access” should be accompanied by a visible scope and permission explanation.
- “Local” should disclose when prompts, file excerpts, or outputs are sent to a configured provider or remote channel.
- “YOLO / Full-Auto Mode” is memorable but should expose exactly what approval protections are disabled or changed [E01].
- “Existing conversation” for scheduled tasks should show the context-retention consequence before save [E04].

## 10. Data, state, and behavior rules

| Rule | Trigger | Visible response | Persistence / evidence |
|---|---|---|---|
| Provider required for built-in agent | User reaches chat without a model | Add a model in Settings → Models | Provider/API key saved; E02 |
| Agent-specific model list | User changes agent | Model choices change | Per-agent model availability; E02 |
| Conversation isolation | User switches history item | Different memory/context opens | Independent memory; E02 |
| Project lock | User opens a folder in a conversation | Project panel appears; folder cannot change in place | Start new chat to change; E02 |
| Artifact auto-open | Agent creates file | File opens in preview | Preview panel; E05 |
| Dirty detection | User or external process changes file | Unsaved/change state is highlighted | Automatic tracking; E05 |
| Version recovery | User opens history | Prior versions can be compared/restored | Git-backed; E05 |
| Schedule execution mode | User saves task | New or existing context chosen | `new_conversation` vs `existing`; E04 |
| Keep Awake | User enables toggle | Machine remains awake while app is open | Only while AionUi is running; E04 |
| Local conversation storage | App persists conversation | Data stored in OS application-support path | E02 |

Important unverified rules include autosave versus explicit save, agent mutation checkpointing, cancellation semantics, concurrent edits, schedule failure retries, timezone behavior, and remote-session restoration.

## 11. Accessibility and usability

No live accessibility audit was possible. The following are inspection requirements rather than findings:

- Verify every icon-only sidebar, composer, tab, and editor control has an accessible name.
- Verify keyboard traversal from sidebar → history → composer → project tree → preview tabs.
- Verify focus remains visible when panels open and when a task changes state.
- Verify screen readers announce agent/tool approval requests, streaming completion, errors, and schedule status changes.
- Verify drag-and-drop has an equivalent keyboard/file-picker path; the documentation suggests both picker and drag/drop for files [E02].
- Verify contrast for agent status tags, dirty indicators, diff colors, and disabled controls.
- Verify editor keyboard handling does not trap focus or conflict with app-level shortcuts.
- Verify reduced-motion behavior for streaming, panel transitions, and live preview updates.
- Verify WebUI and narrow windows preserve task scope, current agent, and approval visibility.

The documented presence of keyboard save and file-picker alternatives is a positive usability signal, but it does not establish WCAG conformance [E05].

## 12. Pattern synthesis

### 12.1 Patterns worth preserving

| Pattern | Where it appears | Why it works | Reuse guidance |
|---|---|---|---|
| One workspace for many agent backends | Multi-Agent Mode | Prevents users from maintaining unrelated agent windows | Normalize agent identity/capabilities while preserving backend-specific differences |
| Project-scoped conversation | Project panel and folder lock | Reduces accidental context leakage | Show scope persistently and make scope changes deliberate |
| Immediate artifact preview | Generated files open automatically | Shortens intent-to-verification loop | Make outputs discoverable in the run timeline and preview dock |
| Editable preview, not read-only output | Markdown/code/HTML editors | Lets users correct and finish work in place | Pair editing with dirty state, diff, and restore |
| Independent conversation memory | History list | Supports parallel work without context mixing | Add clear task names and active-scope indicators |
| Schedule as a visible object | Scheduled page and task cards | Makes automation inspectable and manageable | Show next run, last result, context mode, and failure details |
| Format-aware workspace | PDF, office, code, Markdown, HTML, images, diffs | Matches the artifact instead of forcing one generic viewer | Keep a common shell with specialized renderers |
| Progressive setup | Built-in agent plus advanced integrations | Serves beginners and experts | Default to a ready path; reveal power features contextually |

### 12.2 Inconsistencies and risks

| Risk | Evidence | User impact | Recommended clarification |
|---|---|---|---|
| “Zero setup” versus API-key setup | README says install-and-go, Quick Start requires a provider key for built-in agent [E01], [E02] | Users may interpret “zero setup” literally and feel blocked | Say “no CLI setup; add one model provider to start” |
| Local-first versus remote data flows | Local storage is emphasized alongside model providers, WebUI, and channels [E01], [E02] | Privacy expectations may be wrong | Add a data-flow panel per agent/provider/channel |
| Approval claim versus unattended modes | Approval is promoted, but YOLO/full-auto and schedules also exist [E01], [E04] | Users may not know when side effects can occur without review | Show an execution policy card before enabling automation |
| Many agent capability differences | 20+ agents with agent-dependent models and permissions [E01], [E02] | Controls may appear/disappear unpredictably | Use capability badges and explain unavailable features |
| Project lock is useful but surprising | Folder cannot change mid-conversation [E02] | Users may think the app is broken | Explain the lock at project selection and offer “new chat with same prompt” |
| Preview claims exceed documented keyboard support | Cmd/Ctrl+S exists; tab shortcuts do not [E05] | Power users may expect editor parity | Publish a complete shortcut map and prioritize tab navigation |
| Scheduled existing context can grow indefinitely | Existing mode appends results [E04] | Context, cost, and relevance may degrade | Show retained context size/history and offer rollover |
| Documentation-driven IA may drift | Wiki is revised frequently and not pinned here | Recreated UI may target stale behavior | Tie UX research to a release commit and capture screenshots |

## 13. Reproduction guide for an AI-native workspace

### 13.1 Essential principles

1. Treat the conversation as a task workspace, not a message stream.
2. Keep agent, model, assistant, project scope, and permission policy visible.
3. Make agent work observable through a timeline of states, tool calls, approvals, and artifacts.
4. Treat every file mutation as a reviewable, diffable, rejectable, revisable, cancellable, and undoable change set.
5. Place generated artifacts in a persistent Changed Artifacts area and a preview dock.
6. Use progressive disclosure: a ready default path, then expert configuration.
7. Make unattended execution explicit, inspectable, and recoverable.

### 13.2 Essential layout and component rules

- Persistent left navigation for workspaces, conversations, schedules, and settings.
- Dominant center canvas that can show chat, task timeline, preview, editor, or review.
- Contextual right drawer for project/file scope and details.
- Optional bottom composer that can accept text, attachments, folders, and execution options.
- Preview dock with multi-file tabs, dirty state, diff, history, save, and restore.
- Status vocabulary shared across chat runs, scheduled jobs, tools, and artifacts.
- Capability-aware agent/model selection with plain-language consequences.

### 13.3 Prioritized implementation checklist

**Foundation**

- [ ] Define `CanvasAdapter`, `AgentRun`, `ChangeSet`, `Artifact`, `ApprovalRequest`, `SyncState`, and `Version`.
- [ ] Define agent states: queued, planning, running, waiting_for_approval, needs_input, completed, failed, cancelled.
- [ ] Implement explicit visible scope: conversation, project folder, selected files, agent, model, and permission mode.
- [ ] Implement local persistence and restart restoration.

**Core workflow**

- [ ] Build conversation history with independent contexts and clear names.
- [ ] Build composer with attachment and project selection.
- [ ] Build agent/model/assistant selection with capability explanation.
- [ ] Render an execution timeline with cancellation and approval controls.
- [ ] Surface artifacts in the timeline, Changed Artifacts group, and preview panel.

**Review and recovery**

- [ ] Add diffable ChangeSets before or at mutation boundaries.
- [ ] Add accept, reject, revise, cancel, and undo actions.
- [ ] Add preview/editor adapters for Markdown, code, HTML, images, PDFs, office files, and diffs.
- [ ] Add dirty, external-change, conflict, save, version, and restore states.

**Automation and multi-agent**

- [ ] Add scheduled task objects with human-readable recurrence and timezone.
- [ ] Show last run, next run, logs, failures, and context mode.
- [ ] Add explicit unattended policy and approval escalation.
- [ ] Normalize external-agent capability/permission differences.
- [ ] Add team-mode task board and mailbox only after single-agent state communication is solid.

**Accessibility and polish**

- [ ] Keyboard-complete navigation and shortcut reference.
- [ ] Screen-reader announcements for state changes and approvals.
- [ ] Contrast and reduced-motion audit.
- [ ] Narrow viewport and remote-session layout audit.
- [ ] Instrument task completion, recovery, cancellation, and false-confidence incidents.

## 14. Evidence index and open questions

### 14.1 Evidence index

- **E01 — Product README:** [AionUi GitHub README](https://github.com/iOfficeAI/AionUi). Product positioning, built-in agent, multi-agent mode, supported agents, MCP, team mode, approval claim, remote channels, scheduled automation, and office workflows.
- **E02 — Quick Start:** [AionUi Quick Start Guide](https://github.com/iOfficeAI/AionUi/wiki/Getting-Started). Installation, model setup, conversation creation, model selector location, file attachment, project panel, project lock, independent conversation memory, local storage.
- **E03 — Support limits:** [AionUi FAQ](https://github.com/iOfficeAI/AionUi/wiki/FAQ). Platform/system requirements and configuration/support framing.
- **E04 — Automation:** [AionUi Scheduled Tasks Guide](https://github.com/iOfficeAI/AionUi/wiki/Scheduled-Tasks-Guide). Task form, frequency, cron, execution modes, list actions, next-run status, and Keep Awake.
- **E05 — Artifacts:** [AionUi Preview Panel Guide](https://github.com/iOfficeAI/AionUi/wiki/Preview-Panel-Guide). Formats, automatic opening, multi-tabs, editing, live preview, dirty tracking, keyboard save, diffs, and Git-backed history/restore.
- **E06 — Documentation map:** [AionUi Wiki home](https://github.com/iOfficeAI/AionUi/wiki). Feature and configuration inventory, WebUI, channels, assistants, MCP, schedules, use cases, and preview panel.

### 14.2 Open questions and exact inspection needed

1. **What is the actual desktop layout?** Launch a pinned release, capture welcome, chat, settings, scheduled, project, and preview screens at desktop and narrow widths.
2. **How are approvals implemented?** Run a file-writing task and a shell/tool task; record approval card copy, scope, preview, allow/deny behavior, and cancellation.
3. **Are agent changes diffable before mutation?** Ask the built-in and one external agent to edit an existing file; inspect ChangeSet, history, and undo behavior.
4. **How do external agents differ?** Install or mock at least two supported CLIs; compare discovery, model selection, permissions, output, and error states.
5. **What does “local” mean operationally?** Trace provider requests, file excerpts, logs, WebUI authentication, and channel payloads in source and network/runtime logs.
6. **How does scheduled failure recover?** Create a task with an unavailable model or folder; inspect error, retry, notification, logs, and next-run behavior.
7. **How are conflicts handled?** Edit a previewed file externally while editing it in AionUi and while an agent modifies it.
8. **What accessibility support exists?** Run keyboard-only navigation, inspect the accessibility tree, test VoiceOver/NVDA, and audit contrast/target sizes.
9. **What is the source of truth for visual tokens?** Inspect the current commit’s CSS/theme/token files and compare with screenshots.
10. **How does WebUI differ from desktop?** Configure the current WebUI path and test login, reconnect, remote approvals, artifact preview, and narrow viewport behavior.

## Bottom line

AionUi is most valuable as a reference for the transition from “chat with a model” to “operate a local, multi-agent workbench.” Its strongest patterns are project-scoped conversations, unified agent backends, artifact-first preview/editing, and visible scheduled tasks. For an AI-native workspace, preserve those patterns but strengthen the operational contract around scope, approvals, ChangeSets, run state, data flow, and recovery. The public materials establish a strong product model; a faithful visual recreation still requires a pinned build and live UI audit.
