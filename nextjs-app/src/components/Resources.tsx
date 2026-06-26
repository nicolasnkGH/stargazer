import { ExternalLink } from "lucide-react";

const RESOURCES = [
  { icon: "🔭", name: "Clear Outside", desc: "Astronomical weather forecasting", url: "https://clearoutside.com" },
  { icon: "🌐", name: "Stellarium Web", desc: "Real-time sky map for any date/time/location", url: "https://stellarium-web.org" },
  { icon: "📡", name: "TheSkyLive", desc: "Live Scorpius positions and object finder", url: "https://theskylive.com/scorpius-info" },
  { icon: "📆", name: "In-The-Sky.org", desc: "Astronomy event calendar", url: "https://in-the-sky.org/newscal.php" },
  { icon: "🛸", name: "Heavens-Above", desc: "ISS & satellite passes", url: "https://www.heavens-above.com/" },
  { icon: "📸", name: "AstroBin", desc: "Astrophotography community", url: "https://www.astrob.in" },
  { icon: "⭐", name: "KStars", desc: "Free Stellarium alternative with EKOS", url: "https://edu.kde.org/kstars/" },
];

export default function Resources() {
  return (
    <section className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <ExternalLink className="h-5 w-5 text-sky-400" strokeWidth={1.6} />
        <h2 className="text-[0.92rem] font-semibold text-zinc-100 tracking-wide">Resources</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {RESOURCES.map((r) => (
          <a
            key={r.name}
            href={r.url}
            target="_blank"
            rel="noopener"
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3 hover:bg-white/[0.06] hover:border-white/20 transition-colors"
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
    </section>
  );
}
