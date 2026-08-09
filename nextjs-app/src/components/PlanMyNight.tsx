"use client";

import { Clock3, FileText, Download, Trash2, ArrowUp, ArrowDown, Calendar } from "lucide-react";
import { DEFAULT_DUSK_HOUR, DEFAULT_DAWN_HOUR } from "@/lib/constants";
import { useNightPlan, addToPlan, removeFromPlan, movePlanItem, clearPlan } from "@/hooks/useNightPlan";
import { exportPlanTxt, exportPlanCsv } from "@/lib/plan-export";

export default function PlanMyNight() {
  const plan = useNightPlan();

  function quickAdd(id: string, name: string, ra = 0, dec = 0) {
    const err = addToPlan(id, name, ra, dec);
    if (err) alert(err);
  }

  function onClear() {
    if (plan.length === 0) return;
    if (confirm(`This will remove all ${plan.length} item${plan.length !== 1 ? "s" : ""} from your plan. This cannot be undone.`)) {
      clearPlan();
    }
  }

  const nightDuration = (DEFAULT_DAWN_HOUR - DEFAULT_DUSK_HOUR + 24) % 24;

  return (
    <section id="card-plan-my-night" className="card w-full">
      <div className="card-header justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-purple-400" strokeWidth={1.6} />
          <h2>Plan My Night</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportPlanTxt(plan)} className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition-colors">
            <FileText className="h-3.5 w-3.5" strokeWidth={1.5} /> Export Text
          </button>
          <button onClick={() => exportPlanCsv(plan)} className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition-colors">
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> Export CSV
          </button>
          <button onClick={onClear} className="flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Clear
          </button>
        </div>
      </div>
      <div className="card-body">
        {/* Quick-add bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-sky-500/15 bg-sky-500/[0.05] px-3.5 py-3">
          <span className="text-xs font-bold text-sky-400">🚀 Quick-Add Sky Objects in Motion:</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => quickAdd("iss_pass", "🛰️ ISS Orbit Pass")} className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-400 hover:bg-sky-500/20 transition-colors">
              + ISS Pass
            </button>
            <button onClick={() => quickAdd("c2023_a3", "☄️ Comet Tsuchinshan-ATLAS", 14.5, -5.2)} className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs text-purple-300 hover:bg-purple-500/20 transition-colors">
              + Bright Comet
            </button>
            <button onClick={() => quickAdd("meteor_shower", "💫 Active Meteor Shower")} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/20 transition-colors">
              + Meteor Shower
            </button>
            <button onClick={() => quickAdd("neo_asteroid", "🪨 Near-Earth Asteroid")} className="rounded-lg border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-300 hover:bg-green-500/20 transition-colors">
              + NEO Asteroid
            </button>
          </div>
        </div>

        {/* Timeline bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
            <span>Sunset ({DEFAULT_DUSK_HOUR}:00)</span>
            <span>Midnight</span>
            <span>Sunrise ({DEFAULT_DAWN_HOUR}:00)</span>
          </div>
          <div id="scheduler-timeline-bar" className="relative h-6 rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden flex">
            {plan.length === 0 ? (
              <div className="w-full flex items-center justify-center text-xs text-zinc-500">No targets scheduled</div>
            ) : (
              plan.map((item, i) => {
                const relativeStart = (item.startHour - DEFAULT_DUSK_HOUR + 24) % 24;
                const widthPct = (1 / nightDuration) * 100;
                const leftPct = (relativeStart / nightDuration) * 100;
                return (
                  <div
                    key={i}
                    title={`${item.name} (${item.startTime} - ${item.endTime})`}
                    className="absolute h-full flex items-center justify-center text-[0.7rem] font-bold text-white overflow-hidden text-ellipsis whitespace-nowrap px-1 cursor-help bg-gradient-to-br from-purple-500 to-indigo-500"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  >
                    {item.name.split(" ")[0]}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Scheduled targets list */}
        {plan.length === 0 ? (
          <div id="scheduler-empty-state" className="rounded-lg border border-dashed border-white/10 bg-white/[0.01] px-4 py-8 text-center">
            <Calendar className="h-9 w-9 text-zinc-600 mx-auto mb-2.5 opacity-50" strokeWidth={1.5} />
            <h3 className="text-sm text-white mb-1">Your night schedule is empty</h3>
            <p className="text-xs text-zinc-500">Click &quot;Add to Plan&quot; on any target card in the database above to plan your night session.</p>
          </div>
        ) : (
          <div id="scheduler-list-container" className="flex flex-col gap-2">
            {plan.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-sm font-bold text-purple-400 whitespace-nowrap">#{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Scheduled slot: <strong className="text-zinc-300">{item.startTime} - {item.endTime}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => movePlanItem(idx, "up")}
                    disabled={idx === 0}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  >
                    <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => movePlanItem(idx, "down")}
                    disabled={idx === plan.length - 1}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  >
                    <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => removeFromPlan(idx)}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                    title="Remove from plan"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
