"use client";

import { useEffect, useState } from "react";
import { FiDownload, FiX } from "react-icons/fi";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex items-center gap-3 rounded-xl border border-sky-500/30 bg-slate-900/95 px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-md">
      <p className="text-sm text-zinc-200">Install StarGazer for quick, offline-friendly access.</p>
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/30 transition-colors"
      >
        <FiDownload className="h-3.5 w-3.5" />
        Install
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-zinc-500 hover:text-zinc-300 transition-colors"
        title="Dismiss"
      >
        <FiX className="h-4 w-4" />
      </button>
    </div>
  );
}
