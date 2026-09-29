import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ChatAttachment, ChatSession, ChatStore, WorkspaceSettings } from "./types";

const settingsVersion = 1;
const defaultSessionDirectory = join(process.cwd(), "data", "sessions");
const defaultCatalogUrl = "https://github.com/vimalanandans/ai-chat/releases/latest/download/signal-model-catalog.v1.json";

function settingsFile() { return process.env.SIGNAL_WORKSPACE_SETTINGS || join(process.cwd(), "data", "workspace-settings.json"); }
export function defaultWorkspaceSettings(): WorkspaceSettings {
  return { sessionDirectory: defaultSessionDirectory, attachmentDirectory: join(defaultSessionDirectory, "attachments"), maxAttachmentBytes: 10 * 1024 * 1024, toolPolicy: { access: "read-only", allowCommands: false, allowNetwork: false }, reservedOutputTokens: 2048, warningPercent: 75, criticalPercent: 90, catalogUrl: defaultCatalogUrl, catalogPublicKey: "", modelOverrides: {}, metadataCache: {} };
}

async function atomicWrite(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temporary, path);
}

async function atomicWriteBytes(path: string, value: Uint8Array) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, value, { mode: 0o600 });
  await rename(temporary, path);
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  try {
    const parsed = JSON.parse(await readFile(settingsFile(), "utf8")) as Partial<WorkspaceSettings>;
    return { ...defaultWorkspaceSettings(), ...parsed, toolPolicy: { ...defaultWorkspaceSettings().toolPolicy, ...parsed.toolPolicy }, modelOverrides: parsed.modelOverrides || {}, metadataCache: parsed.metadataCache || {} };
  } catch { return defaultWorkspaceSettings(); }
}

export async function saveWorkspaceSettings(input: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
  const current = await getWorkspaceSettings();
  const attachmentDirectory = input.attachmentDirectory ?? (input.sessionDirectory && current.attachmentDirectory === join(current.sessionDirectory, "attachments") ? join(input.sessionDirectory, "attachments") : current.attachmentDirectory);
  const next: WorkspaceSettings = { ...current, ...input, attachmentDirectory, modelOverrides: input.modelOverrides || current.modelOverrides, metadataCache: input.metadataCache || current.metadataCache };
  if (!isAbsolute(next.sessionDirectory)) throw new Error("The session directory must be an absolute Unix path.");
  if (!isAbsolute(next.attachmentDirectory)) throw new Error("The attachment directory must be an absolute Unix path.");
  if (!Number.isInteger(next.maxAttachmentBytes) || next.maxAttachmentBytes < 1 || next.maxAttachmentBytes > 100 * 1024 * 1024) throw new Error("Attachment size must be between 1 byte and 100 MB.");
  if (!Number.isInteger(next.reservedOutputTokens) || next.reservedOutputTokens < 1) throw new Error("Reserve at least one output token.");
  if (!Number.isInteger(next.warningPercent) || !Number.isInteger(next.criticalPercent) || next.warningPercent < 1 || next.warningPercent >= next.criticalPercent || next.criticalPercent > 99) throw new Error("Warning and critical thresholds must be ascending percentages below 100.");
  for (const override of Object.values(next.modelOverrides)) for (const limit of [override.contextWindow, override.maxInputTokens, override.maxOutputTokens]) if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) throw new Error("Model context limits must be positive whole numbers.");
  if (next.toolPolicy.access !== "read-only" && next.toolPolicy.access !== "read-write") throw new Error("Tool access must be read-only or read-write.");
  await mkdir(next.sessionDirectory, { recursive: true, mode: 0o700 });
  await mkdir(next.attachmentDirectory, { recursive: true, mode: 0o700 });
  if (next.sessionDirectory !== current.sessionDirectory) {
    const existing = await loadWorkspaceFromSettings(current);
    if (existing) await saveWorkspaceAt(next, existing);
  }
  await atomicWrite(settingsFile(), { ...next, version: settingsVersion });
  return next;
}

function manifestFile(settings: WorkspaceSettings) { return join(settings.sessionDirectory, "workspace.json"); }
function sessionFile(settings: WorkspaceSettings, id: string) { return join(settings.sessionDirectory, "sessions", `${id}.json`); }
function archiveFile(settings: WorkspaceSettings, sessionId: string, archiveId: string) { return join(settings.sessionDirectory, "archives", sessionId, `${archiveId}.json`); }

export async function loadWorkspace(): Promise<ChatStore | undefined> {
  const settings = await getWorkspaceSettings();
  return loadWorkspaceFromSettings(settings);
}

async function loadWorkspaceFromSettings(settings: WorkspaceSettings): Promise<ChatStore | undefined> {
  try {
    const manifest = JSON.parse(await readFile(manifestFile(settings), "utf8")) as Omit<ChatStore, "sessions"> & { sessionIds: string[] };
    const sessions = (await Promise.all(manifest.sessionIds.map(async (id) => JSON.parse(await readFile(sessionFile(settings, id), "utf8")) as ChatSession))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { version: 2, sessions, activeSessionId: manifest.activeSessionId, sidebarOpen: manifest.sidebarOpen, sidebarWidth: manifest.sidebarWidth, contextPanelOpen: manifest.contextPanelOpen, contextPanelWidth: manifest.contextPanelWidth };
  } catch { return undefined; }
}

export async function saveWorkspace(store: ChatStore): Promise<ChatStore> {
  const settings = await getWorkspaceSettings();
  return saveWorkspaceAt(settings, store);
}

async function saveWorkspaceAt(settings: WorkspaceSettings, store: ChatStore): Promise<ChatStore> {
  await mkdir(join(settings.sessionDirectory, "sessions"), { recursive: true, mode: 0o700 });
  await Promise.all(store.sessions.map((session) => atomicWrite(sessionFile(settings, session.id), session)));
  await atomicWrite(manifestFile(settings), { version: 2, sessionIds: store.sessions.map((session) => session.id), activeSessionId: store.activeSessionId, sidebarOpen: store.sidebarOpen, sidebarWidth: store.sidebarWidth || 268, contextPanelOpen: Boolean(store.contextPanelOpen), contextPanelWidth: store.contextPanelWidth || 340 });
  return { ...store, version: 2 };
}

export async function saveArchive(sessionId: string, archive: unknown): Promise<string> {
  const settings = await getWorkspaceSettings();
  const id = randomUUID();
  await atomicWrite(archiveFile(settings, sessionId, id), archive);
  return id;
}

function safeSegment(value: string) { if (!/^[a-zA-Z0-9_-]+$/u.test(value)) throw new Error("The attachment session identifier is invalid."); return value; }
function detectedMediaType(bytes: Uint8Array) {
  const has = (...expected: number[]) => expected.every((value, index) => bytes[index] === value);
  if (has(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (has(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (has(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (has(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (has(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf";
  return undefined;
}
function safeAttachmentName(name: string) { return name.replace(/[\\/\0]/gu, "_").trim().slice(0, 160) || "attachment"; }
function validText(bytes: Uint8Array) { try { const sample = new TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(0, 8_192)); return !sample.includes("\0"); } catch { return false; } }

export async function saveAttachment(sessionId: string, file: { name: string; type: string; size: number; bytes: Uint8Array }): Promise<ChatAttachment> {
  const settings = await getWorkspaceSettings();
  if (file.size !== file.bytes.byteLength) throw new Error("Attachment size verification failed.");
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > settings.maxAttachmentBytes) throw new Error(`Attachments must be between 1 byte and ${Math.floor(settings.maxAttachmentBytes / 1024 / 1024)} MB.`);
  const magicType = detectedMediaType(file.bytes);
  const textType = /^text\/(plain|markdown|csv)$/u.test(file.type) || /^(application\/json|application\/yaml|application\/x-yaml)$/u.test(file.type);
  if (!magicType && !(textType && validText(file.bytes))) throw new Error("Only verified images, PDFs, and UTF-8 text files can be attached.");
  const id = randomUUID(); const mediaType = magicType || file.type; const kind = mediaType.startsWith("image/") ? "image" : "document";
  await atomicWriteBytes(join(settings.attachmentDirectory, safeSegment(sessionId), id), file.bytes);
  return { id, name: safeAttachmentName(file.name), mediaType, size: file.size, kind };
}

export async function clearWorkspaceForTests() {
  const settings = await getWorkspaceSettings();
  await rm(settings.sessionDirectory, { recursive: true, force: true });
}
