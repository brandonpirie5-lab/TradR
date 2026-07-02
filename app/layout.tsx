import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getAppUrl } from '@/lib/app-url';
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
  metadataBase: new URL(getAppUrl()),
  title: "TradR Pit — $5 Daily Trading Contest",
  description:
    "One pit every day. $5 in, trade SPY · QQQ · NVDA · BTC · ETH, top half split the pool. 9:30 AM – 4 PM ET.",
  manifest: "/manifest.json",
  openGraph: {
    title: "TradR Pit — $5 Daily Trading Contest",
    description:
      "One pit. Every day. Ring in for $5, climb the leaderboard, top half cash. Watch the tape live.",
    siteName: "TradR Pit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradR Pit — $5 Daily Trading Contest",
    description: "One pit. Every day. Top half cash. Watch the tape or ring in.",
  },
  appleWebApp: {
    capable: true,
    title: "TradR Pit",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: '/icon', type: 'image/png' }],
    apple: [{ url: '/apple-icon', type: 'image/png', sizes: '180x180' }],
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
