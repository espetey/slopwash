import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "slopwash — scrub AI from your writing",
  description:
    "A prompt that strips AI tells from any text. Copy it, paste it into your LLM, and get human-sounding output. Also available as an MCP server.",
  openGraph: {
    title: "slopwash",
    description: "Scrub AI tells from your writing. Copy the prompt or use the MCP endpoint.",
    type: "website",
    url: "https://slopwash.com",
  },
  twitter: {
    card: "summary",
    title: "slopwash",
    description: "Scrub AI tells from your writing.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
