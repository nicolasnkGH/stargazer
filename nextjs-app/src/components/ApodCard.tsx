import Icon from "./Icon";
import type { ApodData } from "@/types";

interface ApodCardProps {
  apod: ApodData | null;
}

export default function ApodCard({ apod }: ApodCardProps) {
  if (!apod) return null;

  return (
    <section id="apod-card" className="card w-full">
      <div className="card-header justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Icon name="image" className="h-5 w-5 text-sky-400" />
          <h2>🌌 NASA Astronomy Picture of the Day</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-zinc-500 font-medium">{apod.date}</span>
          <span className="rounded-full border border-sky-500/30 bg-sky-500/[0.15] px-2.5 py-1 text-[0.7rem] text-sky-400">
            Powered by NASA
          </span>
        </div>
      </div>
      <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        <div className="relative rounded-xl overflow-hidden bg-black/40 min-h-[220px] flex items-center justify-center">
          {apod.media_type === "video" ? (
            <iframe src={apod.url} title={apod.title} className="w-full h-[260px] border-0 rounded-xl" allowFullScreen />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={apod.url}
              alt={apod.title}
              title="Click to view in HD"
              className="w-full h-full object-cover rounded-xl transition-transform hover:scale-[1.02]"
            />
          )}
        </div>
        <div className="flex flex-col gap-3 py-1">
          <h3 className="text-[1.1rem] font-bold text-white leading-snug m-0">{apod.title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed m-0">{apod.explanation}</p>
          <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-white/[0.06]">
            <span className="text-xs text-zinc-500">{apod.copyright}</span>
            <a
              href="https://apod.nasa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              Full Archive <Icon name="external-link" className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
