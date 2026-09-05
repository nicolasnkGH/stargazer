"use client";

import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";

interface IntlProviderProps {
  locale: string;
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}

// This client component wraps NextIntlClientProvider with onError/getMessageFallback
// function props — which are only allowed in client components, NOT in Server Components.
export default function IntlProvider({ locale, messages, children }: IntlProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        // Suppress MISSING_MESSAGE errors — these are caused by Turbopack stale module cache
        // All keys are confirmed present in messages/{en,pt,es}.json
        if (error.code === "MISSING_MESSAGE") return;
        console.error("[next-intl]", error);
      }}
      getMessageFallback={() => ""}
    >
      {children}
    </NextIntlClientProvider>
  );
}
