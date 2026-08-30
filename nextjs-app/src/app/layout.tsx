import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { SerwistProvider } from "@serwist/turbopack/react";
import "./globals.css";
import Header from "@/components/Header";
import InstallPrompt from "@/components/InstallPrompt";
import NightVisionButton from "@/components/NightVisionButton";
import Toast from "@/components/Toast";

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
  metadataBase: new URL("https://stargazer.nick-t.net"),
  title: "StarGazer — Observatory Dashboard",
  description: "Personal stargazing dashboard. Celestron StarSense Explorer 5\" DX. Scorpius targets, planet tracker, ISS alerts, and nightly conditions.",
  openGraph: {
    type: "website",
    url: "https://stargazer.nick-t.net/",
    title: "StarGazer — Observatory Dashboard",
    description: "Personal stargazing dashboard — nightly sky conditions, planet tracker, ISS alerts, and target database for amateur astronomers.",
    siteName: "StarGazer",
  },
  twitter: {
    card: "summary_large_image",
    title: "StarGazer — Observatory Dashboard",
    description: "Nightly sky conditions, planet monitor, ISS alerts, and target database for amateur astronomers.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StarGazer",
  },
};

export const viewport: Viewport = {
  themeColor: "#05050f",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className="min-h-screen flex flex-col overflow-x-hidden">
        <SerwistProvider swUrl="/serwist/sw.js">
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Header />
            <main className="flex flex-1 w-full flex-col items-center overflow-x-hidden">{children}</main>
            <InstallPrompt />
            <NightVisionButton />
            <Toast />
          </NextIntlClientProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
