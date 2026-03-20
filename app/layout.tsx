import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    metadataBase: new URL("https://slopwash.com"),
    title: "slopwash — scrub AI from your writing",
    description:
        "A prompt that removes AI-generated writing patterns from any text. Copy it, paste it into your LLM, and get human-sounding output. Also available as an MCP server.",
    authors: [{ name: "Slopwash.com" }],
    icons: {
        icon: [
            { url: "/slopwash-icon.png", type: "image/png" },
        ],
        apple: "/slopwash-icon.png",
    },
    openGraph: {
        title: "slopwash",
        description: "A free prompt that scrubs AI tells from any text. Copy it, paste it into your LLM, and get output that reads like a human wrote it.",
        type: "website",
        url: "https://slopwash.com",
        images: [{ url: "/slopwash-dark-sm.png" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "slopwash",
        description: "A free prompt that scrubs AI tells from any text. Copy it, paste it into your LLM, and get output that reads like a human wrote it.",
        images: ["/slopwash-dark-sm.png"],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <Analytics />
            <body className={inter.className}>{children}</body>
        </html>
    );
}
