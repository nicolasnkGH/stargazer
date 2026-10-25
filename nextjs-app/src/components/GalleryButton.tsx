"use client";

import React from "react";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import Icon from "./Icon";
import { API_BASE } from "@/lib/constants";
import type { GalleryCounts } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function GalleryButton({ targetId, targetName }: { targetId: string; targetName: string }) {
  const t = useTranslations();
  const { data: counts } = useSWR<GalleryCounts>(`${API_BASE}/gallery/counts`, fetcher, {
    revalidateOnFocus: false,
  });
  const count = counts?.[targetId] ?? 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(
      new CustomEvent("sg-navigate-tab", { detail: { tab: "showcase" } })
    );
    window.dispatchEvent(
      new CustomEvent("sg-navigate-showcase", { detail: { targetId, targetName } })
    );
    setTimeout(() => {
      const el = document.getElementById("card-showcase");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 60);
  };

  return (
    <a
      href="#card-showcase"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-950/30 hover:bg-purple-900/40 hover:border-purple-400 px-2 py-0.5 text-[0.7rem] font-bold text-purple-200 hover:text-white transition-all shadow-[0_0_10px_rgba(168,85,247,0.15)] no-underline cursor-pointer"
      title={`View ${targetName} astrophotography captures in Observatory Showcase`}
    >
      <Icon name="camera" className="h-3 w-3 text-purple-300" />
      <span>{t("lbl_gallery")}{count > 0 ? ` (${count})` : ""}</span>
      <span className="text-[0.6rem] text-purple-400 font-mono">↓</span>
    </a>
  );
}
