import { ExternalLink } from "lucide-react";
import { RESOURCES } from "@/lib/constants";

export default function Resources() {
  return (
    <section className="card w-full">
      <div className="card-header">
        <ExternalLink className="h-5 w-5 text-sky-400" strokeWidth={1.6} />
        <h2>Resources</h2>
      </div>
      <div className="card-body">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {RESOURCES.map((r) => (
          <a
            key={r.name}
            href={r.url}
            target="_blank"
            rel="noopener"
            className="rounded-lg bg-white/[0.02] border border-white/5 p-4 flex items-start gap-3 hover:bg-white/[0.06] hover:border-white/20 transition-colors"
          >
            <span className="text-2xl flex-shrink-0">{r.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-100">{r.name}</p>
              <p className="text-xs text-zinc-500">{r.desc}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          </a>
        ))}
      </div>
      </div>
    </section>
  );
}
