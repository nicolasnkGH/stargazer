import { ExternalLink } from "lucide-react";

const TECH_BADGES = ["Python", "FastAPI", "Skyfield", "Next.js", "Tailwind"];
const API_SOURCES = ["Heavens-Above", "Open-Meteo", "wheretheiss.at"];

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-slate-950/50 mt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Creator */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-2">Nicolas Teixeira</h3>
            <p className="text-xs text-zinc-400 mb-3">StarGazer Creator | Cloud & DevOps</p>
            <p className="text-xs text-zinc-500 mb-4">Personal stargazing dashboard to track active constellations, planets, and ISS passes.</p>
            <div className="flex gap-3">
              <a href="https://www.linkedin.com/in/nicolasdealmeidateixeira" target="_blank" rel="noopener" className="text-zinc-400 hover:text-zinc-200 transition-colors" title="LinkedIn">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="https://github.com/nicolasnkGH" target="_blank" rel="noopener" className="text-zinc-400 hover:text-zinc-200 transition-colors" title="GitHub">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="https://nick-t.net" target="_blank" rel="noopener" className="text-zinc-400 hover:text-zinc-200 transition-colors" title="Portfolio">
                <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">Tech Stack</h3>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {TECH_BADGES.map((b) => (
                <span key={b} className="rounded bg-white/5 px-2 py-0.5 text-[0.65rem] text-zinc-400">{b}</span>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">API Sources</h3>
            <div className="flex flex-wrap gap-1.5">
              {API_SOURCES.map((b) => (
                <span key={b} className="rounded bg-white/5 px-2 py-0.5 text-[0.65rem] text-zinc-400">{b}</span>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">Navigation</h3>
            <ul className="flex flex-col gap-1.5">
              {["Tonight's Outlook", "Active Constellation", "Target Database", "Sky Objects in Motion", "7-Day Forecast"].map((label) => (
                <li key={label}>
                  <a href={`#${label.toLowerCase().replace(/ /g, "-")}`} className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between pt-6 border-t border-white/5">
          <span className="text-xs text-zinc-500">2026 Nicolas Teixeira. All rights reserved.</span>
          <a href="#top" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
