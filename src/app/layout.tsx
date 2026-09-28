import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal — AI workspace",
  description: "A focused, multi-agent workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
