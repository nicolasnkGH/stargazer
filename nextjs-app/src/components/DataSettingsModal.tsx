"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { BORTLE_CLASSES, BORTLE_STORAGE_KEY } from "@/lib/constants";
import { exportBackup, importBackup } from "@/lib/backup";
import { subscribeToPush, sendTestPush } from "@/lib/push-subscribe";
import Modal from "./Modal";

interface DataSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DataSettingsModal({ open, onClose }: DataSettingsModalProps) {
  const t = useTranslations();
  const [bortleClass, setBortleClass] = useState("auto");
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBortleClass(localStorage.getItem(BORTLE_STORAGE_KEY) || "auto");
  }, [open]);

  function onBortleChange(value: string) {
    setBortleClass(value);
    if (value === "auto") {
      localStorage.removeItem(BORTLE_STORAGE_KEY);
    } else {
      localStorage.setItem(BORTLE_STORAGE_KEY, value);
    }
    window.location.reload();
  }

  async function onSubscribe() {
    setPushBusy(true);
    setPushStatus(null);
    try {
      await subscribeToPush();
      setPushStatus("Subscribed! You'll receive alerts for ISS passes, auroras, and clear skies.");
    } catch (e) {
      setPushStatus(e instanceof Error ? e.message : "Subscription failed.");
    } finally {
      setPushBusy(false);
    }
  }

  async function onTestPush() {
    setPushBusy(true);
    setPushStatus(null);
    try {
      await sendTestPush();
      setPushStatus("Test notification sent.");
    } catch (e) {
      setPushStatus(e instanceof Error ? e.message : "Test push failed.");
    } finally {
      setPushBusy(false);
    }
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Are you sure you want to import this backup? It will overwrite your current locations and observation logs.")) {
      if (importInputRef.current) importInputRef.current.value = "";
      return;
    }
    importBackup(file)
      .then(() => {
        setImportStatus("Backup successfully imported! Reloading...");
        window.location.reload();
      })
      .catch((err) => setImportStatus(err instanceof Error ? err.message : "Error: Invalid JSON backup file."))
      .finally(() => {
        if (importInputRef.current) importInputRef.current.value = "";
      });
  }

  const activeInfo = BORTLE_CLASSES[bortleClass] ?? BORTLE_CLASSES["6"];

  return (
    <Modal open={open} onClose={onClose} title={t("settings_modal_title")}>
      <div className="flex flex-col gap-6">
        {/* Bortle simulation */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 mb-1">{t("bortle_simulation_title")}</h3>
          <p className="text-xs text-zinc-500 mb-3">
            {t("bortle_simulation_desc")}
          </p>
          <select
            value={bortleClass}
            onChange={(e) => onBortleChange(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500/40 mb-3"
          >
            <option value="auto">{t("auto_detect")}</option>
            {Object.keys(BORTLE_CLASSES).map((cls) => (
              <option key={cls} value={cls}>
                Class {cls} — {BORTLE_CLASSES[cls].shortDesc}
              </option>
            ))}
          </select>
          {bortleClass !== "auto" && (
            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3 text-xs text-zinc-400">
              <p className="mb-1.5">{activeInfo.desc}</p>
              <p className="text-zinc-500">{activeInfo.equip}</p>
            </div>
          )}
        </div>

        {/* Push notifications */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-sm font-semibold text-zinc-100 mb-1">{t("push_notifications_title")}</h3>
          <p className="text-xs text-zinc-500 mb-3">{t("push_notifications_desc")}</p>
          <div className="flex gap-2">
            <button
              onClick={onSubscribe}
              disabled={pushBusy}
              className="flex-1 rounded-lg bg-sky-500/20 border border-sky-500/30 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-500/30 transition-colors disabled:opacity-50"
            >
              {t("btn_enable_notifications")}
            </button>
            <button
              onClick={onTestPush}
              disabled={pushBusy}
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {t("btn_send_test")}
            </button>
          </div>
          {pushStatus && <p className="text-xs text-zinc-400 mt-2">{pushStatus}</p>}
        </div>

        {/* JSON backup */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-sm font-semibold text-zinc-100 mb-1">{t("backup_restore_title")}</h3>
          <p className="text-xs text-zinc-500 mb-3">{t("backup_restore_desc")}</p>
          <div className="flex gap-2">
            <button
              onClick={exportBackup}
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
            >
              {t("btn_export_backup")}
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
            >
              {t("btn_import_backup")}
            </button>
            <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportFile} />
          </div>
          {importStatus && <p className="text-xs text-zinc-400 mt-2">{importStatus}</p>}
        </div>
      </div>
    </Modal>
  );
}
