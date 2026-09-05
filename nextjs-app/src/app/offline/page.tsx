"use client";

import { useTranslations } from "next-intl";
import Icon from "@/components/Icon";

export default function OfflinePage() {
  const t = useTranslations();
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <Icon name="telescope" className="h-10 w-10 text-sky-400/60" />
      <h1 className="text-lg font-semibold text-zinc-200">{t("offline_title")}</h1>
      <p className="max-w-sm text-sm text-zinc-500">
        {t("offline_desc")}
      </p>
    </div>
  );
}
