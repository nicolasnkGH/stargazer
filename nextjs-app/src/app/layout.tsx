import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StarGazer — Observatory Dashboard",
  description: "Personal stargazing dashboard. Celestron StarSense Explorer 5\" DX. Scorpius targets, planet tracker, ISS alerts, and nightly conditions.",
  openGraph: {
    type: "website",
    url: "https://stargazer.nick-t.net/",
    title: "StarGazer — Observatory Dashboard",
    description: "Personal stargazing dashboard — nightly sky conditions, planet tracker, ISS alerts, and target database for amateur astronomers.",
    images: ["https://stargazer.nick-t.net/og-preview.png"],
    siteName: "StarGazer",
  },
  twitter: {
    card: "summary_large_image",
    title: "StarGazer — Observatory Dashboard",
    description: "Nightly sky conditions, planet monitor, ISS alerts, and target database for amateur astronomers.",
    images: ["https://stargazer.nick-t.net/og-preview.png"],
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
      className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex flex-1 w-full max-w-5xl mx-auto flex-col items-center gap-6 p-4 sm:p-8">{children}</main>
      </body>
    </html>
  );
}
