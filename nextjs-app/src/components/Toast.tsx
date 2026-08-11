"use client";

import { useSyncExternalStore } from "react";
import { getToast, subscribeToast } from "@/lib/toast";

export default function Toast() {
  const toast = useSyncExternalStore(subscribeToast, getToast, () => null);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      className="fixed top-5 left-1/2 z-[10000] max-w-[90%] -translate-x-1/2 rounded-lg border border-white/10 bg-[#1e1b2e] px-4 py-2.5 text-sm text-zinc-100 shadow-2xl"
    >
      {toast.message}
    </div>
  );
}
