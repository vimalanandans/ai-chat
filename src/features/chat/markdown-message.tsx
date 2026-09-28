"use client";

import { type ReactNode, useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CodeBlock({ className, children }: { className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const value = String(children ?? "").replace(/\n$/, "");
  const language = className?.match(/language-([\w+-]+)/)?.[1];
  const isBlock = Boolean(language || value.includes("\n"));
  if (!isBlock) return <code>{children}</code>;
  async function copy() { try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); } }
  return <section className="code-block"><header><span>{language || "text"}</span><button type="button" onClick={copy} aria-label="Copy code">{copied ? <><Check size={13}/> Copied</> : <><Copy size={13}/> Copy</>}</button></header><pre><code className={className}>{value}</code></pre></section>;
}

export function MarkdownMessage({ content }: { content: string }) {
  return <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: ({ children }) => <>{children}</>, code: ({ className, children }) => <CodeBlock className={className}>{children}</CodeBlock>, a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>, img: ({ src, alt }) => <a href={typeof src === "string" ? src : undefined} target="_blank" rel="noreferrer">[image{alt ? `: ${alt}` : ""}]</a> }}>{content}</ReactMarkdown></div>;
}
