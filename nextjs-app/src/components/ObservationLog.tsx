"use client";

import { useState, useEffect } from "react";
import Icon from "./Icon";
import SourceTooltip from "./SourceTooltip";
import type { LogEntry } from "@/types";
import { DEFAULT_ENTRIES, OBSERVATION_LOG_STORAGE_KEY } from "@/lib/constants";

const EQUIPMENT_PRESETS = [
  "Telescope (130–150mm Reflector)",
  "Telescope (Dobsonian 8\" / 200mm+)",
  "Telescope (Refractor 70–102mm ED/APO)",
  "Telescope (Schmidt-Cassegrain / SCT 6–8\")",
  "Smart Telescope (Seestar S50)",
  "Smart Telescope (DWARF II / Vespera)",
  "Telescope + Dedicated Cooled Camera",
  "Telescope + DSLR / Mirrorless",
  "Binoculars 10x50",
  "Binoculars 15x70 / 20x80",
  "Naked Eye / Widefield",
  "Custom Gear / Other...",
];

export default function ObservationLog() {
  const [entries, setEntries] = useState<LogEntry[]>(DEFAULT_ENTRIES);
  const [hydrated, setHydrated] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [customGear, setCustomGear] = useState("");
  const [savedCustomGears, setSavedCustomGears] = useState<string[]>([]);

  // Load any saved entries once on mount
  useEffect(() => {
    const raw = localStorage.getItem(OBSERVATION_LOG_STORAGE_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEntries(JSON.parse(raw));
      } catch {
        // ignore malformed saved data, keep defaults
      }
    }
    const rawGears = localStorage.getItem("stargazer_custom_gears");
    if (rawGears) {
      try {
        setSavedCustomGears(JSON.parse(rawGears));
      } catch {
        // ignore
      }
    }
    setHydrated(true);
  }, []);

  // Persist on every change
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(OBSERVATION_LOG_STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hydrated]);

  const [newTarget, setNewTarget] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newConditions, setNewConditions] = useState("Good");
  const [newEquipment, setNewEquipment] = useState(EQUIPMENT_PRESETS[0]);

  function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!newTarget.trim()) return;

    const finalEquip =
      newEquipment === "Custom Gear / Other..."
        ? customGear.trim() || "Custom Equipment"
        : newEquipment;

    if (newEquipment === "Custom Gear / Other..." && customGear.trim()) {
      const gearText = customGear.trim();
      if (!savedCustomGears.includes(gearText)) {
        const updated = [...savedCustomGears, gearText];
        setSavedCustomGears(updated);
        localStorage.setItem("stargazer_custom_gears", JSON.stringify(updated));
      }
    }

    const entry: LogEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      target: newTarget.trim(),
      notes: newNotes.trim(),
      conditions: newConditions,
      equipment: finalEquip,
    };
    setEntries([entry, ...entries]);
    setNewTarget("");
    setNewNotes("");
    setCustomGear("");
    setShowForm(false);
  }

  function removeEntry(id: string) {
    setEntries(entries.filter((en) => en.id !== id));
  }

  const conditionsColor = (c: string) =>
    c === "Excellent" ? "text-green-400" : c === "Good" ? "text-yellow-400" : "text-red-400";

  return (
    <section id="card-log" className="card w-full">
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <Icon name="notebook-pen" className="h-5 w-5 text-sky-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Observation Log</h2>
            <p className="text-[0.65rem] text-sky-400/80 font-mono">Field Sessions &amp; Optics Records</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SourceTooltip
            source="Local Observer Log"
            description="Persistent optical field log entries saved in local storage with equipment telemetry, optical conditions, and observational notes."
            attribution="StarGazer Local Observer"
          />
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            New Entry
          </button>
        </div>
      </div>

      <div className="card-body">
      {/* Add entry form */}
      {showForm && (
        <form onSubmit={addEntry} className="rounded-lg bg-white/[0.02] border border-white/5 p-4 mb-4 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Target name (e.g. M31 Andromeda Galaxy, Jupiter)..."
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
            required
          />
          <textarea
            placeholder="Field notes, eyepiece used, filters, sky transparency..."
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            rows={2}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40 resize-none"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={newConditions}
              onChange={(e) => setNewConditions(e.target.value)}
              className="rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500/40"
            >
              <option value="Excellent">Seeing: Excellent</option>
              <option value="Good">Seeing: Good</option>
              <option value="Fair">Seeing: Fair</option>
              <option value="Poor">Seeing: Poor</option>
            </select>
            <select
              value={newEquipment}
              onChange={(e) => setNewEquipment(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500/40"
            >
              <optgroup label="Standard Optics &amp; Scopes">
                {EQUIPMENT_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </optgroup>
              {savedCustomGears.length > 0 && (
                <optgroup label="Your Saved Custom Gear">
                  {savedCustomGears.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-sky-500/20 border border-sky-500/30 px-5 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/30 transition-colors cursor-pointer"
            >
              Save
            </button>
          </div>

          {newEquipment === "Custom Gear / Other..." && (
            <input
              type="text"
              placeholder="Specify your telescope, camera or optics..."
              value={customGear}
              onChange={(e) => setCustomGear(e.target.value)}
              className="rounded-lg bg-white/5 border border-sky-500/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-sky-400"
              required
            />
          )}
        </form>
      )}

      {/* Log entries */}
      {entries.length === 0 ? (
        <div className="py-8 text-center text-sm text-zinc-400">
          No observations logged yet. Add your first entry!
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-lg bg-white/[0.02] border border-white/5 p-4 flex items-start gap-3 group">
              <Icon name="camera" className="h-4 w-4 text-zinc-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-semibold text-zinc-100">{entry.target}</p>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                    title="Delete entry"
                  >
                    <Icon name="trash-2" className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-400">
                  <span className="font-mono">{entry.date}</span>
                  <span className={conditionsColor(entry.conditions)}>{entry.conditions}</span>
                  <span>{entry.equipment}</span>
                </div>
                {entry.notes && (
                  <p className="text-xs text-zinc-500 mt-1.5">{entry.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
