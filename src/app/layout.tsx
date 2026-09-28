import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal — private LLM chat",
  description: "A focused, local-first multi-session LLM chat."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
