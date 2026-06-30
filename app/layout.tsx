import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./arena-landing.css";
import "./battles.css";
import "./pit-chrome.css";
import "./vault.css";
import "./profile-tab.css";
import "./trade-sheet.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradR Pit • Fake Money, Real Ego",
  description: "Live multiplayer fantasy trading. Ring in free, size up in paid pits, read the tape when the bell hits. Outtrade the room.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "TradR Pit",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${geistSans.className} min-h-full flex flex-col bg-background text-[var(--text)]`}>{children}</body>
    </html>
  );
}
