import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "slopwash — scrub AI from your writing",
    description:
        "A super prompt that strips AI tells from any text. Copy it, paste it into your LLM, and get human-sounding output. Also available as an MCP server.",
    icons: {
        icon: [
            { url: "/slopwash-icon.png", type: "image/png" },
        ],
        apple: "/slopwash-icon.png",
    },
    openGraph: {
        title: "slopwash",
        description: "Scrub AI tells from your writing. Copy the prompt or use the MCP endpoint.",
        type: "website",
        url: "https://slopwash.com",
        images: [{ url: "/slopwash-dark-sm.png" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "slopwash",
        description: "Scrub AI tells from your writing.",
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
