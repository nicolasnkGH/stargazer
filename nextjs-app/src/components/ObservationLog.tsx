"use client";

import { useState, useEffect } from "react";
import Icon from "./Icon";
import type { LogEntry } from "@/types";
import { DEFAULT_ENTRIES, OBSERVATION_LOG_STORAGE_KEY } from "@/lib/constants";

export default function ObservationLog() {
  const [entries, setEntries] = useState<LogEntry[]>(DEFAULT_ENTRIES);
  const [hydrated, setHydrated] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Load any saved entries once on mount (after DEFAULT_ENTRIES' initial render, to match
  // SSR output) — localStorage doesn't exist during SSR, so this can't be a lazy useState
  // initializer without a hydration mismatch.
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
    setHydrated(true);
  }, []);

  // Persist on every change, but only after the initial load above has run —
  // otherwise this would immediately overwrite saved data with DEFAULT_ENTRIES.
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(OBSERVATION_LOG_STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hydrated]);
  const [newTarget, setNewTarget] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newConditions, setNewConditions] = useState("Good");
  const [newEquipment, setNewEquipment] = useState("Celestron StarSense 5DX");

  function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!newTarget.trim()) return;
    const entry: LogEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      target: newTarget.trim(),
      notes: newNotes.trim(),
      conditions: newConditions,
      equipment: newEquipment,
    };
    setEntries([entry, ...entries]);
    setNewTarget("");
    setNewNotes("");
    setShowForm(false);
  }

  function removeEntry(id: string) {
    setEntries(entries.filter((en) => en.id !== id));
  }

  const conditionsColor = (c: string) =>
    c === "Excellent" ? "text-green-400" : c === "Good" ? "text-yellow-400" : "text-red-400";

  return (
    <section className="card w-full">
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <Icon name="notebook-pen" className="h-5 w-5 text-sky-400" />
          <h2>Observation Log</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          New Entry
        </button>
      </div>

      <div className="card-body">
      {/* Add entry form */}
      {showForm && (
        <form onSubmit={addEntry} className="rounded-lg bg-white/[0.02] border border-white/5 p-4 mb-4 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Target name..."
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40"
            required
          />
          <textarea
            placeholder="Notes..."
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            rows={2}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/40 resize-none"
          />
          <div className="flex gap-2">
            <select
              value={newConditions}
              onChange={(e) => setNewConditions(e.target.value)}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500/40"
            >
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
            <select
              value={newEquipment}
              onChange={(e) => setNewEquipment(e.target.value)}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sky-500/40"
            >
              <option>Celestron StarSense 5DX</option>
              <option>Binoculars 10x50</option>
              <option>Telescope + Camera</option>
              <option>Naked Eye</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-sky-500/20 border border-sky-500/30 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/30 transition-colors"
            >
              Save
            </button>
          </div>
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
