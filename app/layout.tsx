import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    metadataBase: new URL("https://slopwash.com"),
    title: "slopwash — AI writing quality checker and editorial QA",
    description:
        "Slopwash scores AI-assisted writing against a published standard for AI writing patterns, names what fails, and rewrites it clean. Free scanner and prompt, org voice checks and corpus reports for teams, and a $249 editorial audit.",
    authors: [{ name: "Slopwash.com" }],
    icons: {
        icon: [
            { url: "/slopwash-icon.png", type: "image/png" },
        ],
        apple: "/slopwash-icon.png",
    },
    openGraph: {
        title: "slopwash — the quality layer for AI-assisted writing",
        description: "Score AI-assisted writing against a published standard, inspect every finding, and revise with the patterns named. Free analysis, team checks, and editorial audits.",
        type: "website",
        url: "https://slopwash.com",
        images: [{ url: "/slopwash-dark-sm.png" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "slopwash — the quality layer for AI-assisted writing",
        description: "Score AI-assisted writing against a published standard, inspect every finding, and revise with the patterns named. Free analysis, team checks, and editorial audits.",
        images: ["/slopwash-dark-md.png"],
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
