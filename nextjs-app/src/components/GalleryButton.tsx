"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import Icon from "./Icon";
import GalleryModal from "./GalleryModal";
import { API_BASE } from "@/lib/constants";
import type { GalleryCounts } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function GalleryButton({ targetId, targetName }: { targetId: string; targetName: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const { data: counts } = useSWR<GalleryCounts>(`${API_BASE}/gallery/counts`, fetcher, {
    revalidateOnFocus: false,
  });
  const count = counts?.[targetId] ?? 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded border border-green-500/30 bg-green-500/[0.08] px-2 py-0.5 text-[0.7rem] font-medium text-green-300 hover:bg-green-500/[0.15] transition-colors"
        title={t("title_gallery_share")}
      >
        <Icon name="camera" className="h-3 w-3" />
        {t("lbl_gallery")}{count > 0 ? ` (${count})` : ""}
      </button>
      <GalleryModal targetId={targetId} targetName={targetName} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
