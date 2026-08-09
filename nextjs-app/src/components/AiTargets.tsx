import Icon from "./Icon";
import type { MustSeeTarget } from "@/types";

export default function AiTargets({
  bestTargets = [],
  mustSee = [],
}: {
  bestTargets?: MustSeeTarget[];
  mustSee?: MustSeeTarget[];
}) {
  const allTargets = [...bestTargets, ...mustSee];
  if (allTargets.length === 0) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="sparkles" className="h-5 w-5 text-violet-400" />
          <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Must See Tonight</h3>
        </div>
        <p className="text-sm text-zinc-400">No targets available for tonight.</p>
      </div>
    );
  }

  return (
    <div className="card card-body">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="sparkles" className="h-5 w-5 text-violet-400" />
        <h3 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Must See Tonight</h3>
        <span className="ml-auto text-xs text-zinc-500">AI Powered</span>
      </div>

      <div className="flex flex-col gap-3">
        {allTargets.map((t, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors"
          >
            <span className="text-2xl flex-shrink-0">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-zinc-100">{t.title}</h4>
                <Icon name="star" className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</p>
              <p className="text-[0.65rem] text-zinc-500 mt-1 font-mono">{t.metadata}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
