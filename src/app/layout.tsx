import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Synca",
    description: "Synca - 日々のサポートアプリ",
    icons: {
        icon: "/icon.svg",
        apple: "/icon.svg",
    },
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Synca",
    },
};

export const viewport: Viewport = {
    themeColor: "#274a78",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <body>{children}</body>
        </html>
    );
}
