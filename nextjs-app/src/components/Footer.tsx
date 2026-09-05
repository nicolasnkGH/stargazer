import Icon from "./Icon";
import { getTranslations } from "next-intl/server";
import { TECH_BADGES, API_SOURCES, NAV_LINKS, RESOURCES, STARGAZER_REPO_URL } from "@/lib/constants";

const REPO = "nicolasnkGH/stargazer";

async function fetchGithubStats() {
  const [repoRes, releaseRes] = await Promise.allSettled([
    fetch(`https://api.github.com/repos/${REPO}`, { next: { revalidate: 3600 } }),
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { next: { revalidate: 3600 } }),
  ]);

  let stars: number | null = null;
  if (repoRes.status === "fulfilled" && repoRes.value.ok) {
    const data = await repoRes.value.json();
    stars = data.stargazers_count ?? null;
  }

  let latestTag: string | null = null;
  if (releaseRes.status === "fulfilled" && releaseRes.value.ok) {
    const data = await releaseRes.value.json();
    latestTag = data.tag_name ?? null;
  }

  return { stars, latestTag };
}

export default async function Footer() {
  const [t, { stars, latestTag }] = await Promise.all([getTranslations(), fetchGithubStats()]);

  return (
    <footer className="w-full border-t border-white/10 bg-slate-950/50 mt-8">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-8 py-10">
        {/* GitHub badges */}
        <div className="flex flex-wrap items-center gap-2.5 mb-8 pb-8 border-b border-white/5">
          <span className="text-xs text-zinc-400">{t("footer_like")}</span>
          <a
            href={STARGAZER_REPO_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
          >
            <Icon name="star" className="h-3 w-3" /> {stars != null ? stars.toLocaleString() : "—"} Stars
          </a>
          {latestTag && (
            <a
              href={`${STARGAZER_REPO_URL}/releases/tag/${encodeURIComponent(latestTag)}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-300 hover:bg-green-500/20 transition-colors"
            >
              <Icon name="tag" className="h-3 w-3" /> {latestTag}
            </a>
          )}
          <a
            href={`${STARGAZER_REPO_URL}/issues`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300 hover:bg-sky-500/20 transition-colors"
          >
            {t("btn_collaborate")} <Icon name="arrow-up-right" className="h-3 w-3" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Creator */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-2">Nicolas Teixeira</h3>
            <p className="text-xs text-zinc-400 mb-3">{t("footer_creator")}</p>
            <p className="text-xs text-zinc-500 mb-4">{t("footer_desc")}</p>
            <div className="flex gap-3">
              <a href="https://www.linkedin.com/in/nicolasdealmeidateixeira" target="_blank" rel="noopener" className="text-zinc-400 hover:text-zinc-200 transition-colors" title="LinkedIn">
                <Icon name="linkedin" className="h-4 w-4" />
              </a>
              <a href="https://github.com/nicolasnkGH" target="_blank" rel="noopener" className="text-zinc-400 hover:text-zinc-200 transition-colors" title="GitHub">
                <Icon name="github" className="h-4 w-4" />
              </a>
              <a href="https://nick-t.net" target="_blank" rel="noopener" className="text-zinc-400 hover:text-zinc-200 transition-colors" title="Portfolio">
                <Icon name="globe" className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">{t("footer_tech")}</h3>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {TECH_BADGES.map((b) => (
                <span key={b} className="rounded bg-white/5 px-2 py-0.5 text-[0.65rem] text-zinc-400">{b}</span>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">{t("footer_api")}</h3>
            <div className="flex flex-wrap gap-1.5">
              {API_SOURCES.map((b) => (
                <span key={b} className="rounded bg-white/5 px-2 py-0.5 text-[0.65rem] text-zinc-400">{b}</span>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">{t("footer_nav")}</h3>
            <ul className="flex flex-col gap-1.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                    {"label" in link ? (link.label as string) : t(link.key, { defaultValue: link.key })}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">{t("card_resources")}</h3>
            <ul className="flex flex-col gap-1.5">
              {RESOURCES.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noopener" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                    {r.icon} {r.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between pt-6 border-t border-white/5">
          <span className="text-xs text-zinc-500">{t("all_rights_reserved")}</span>
          <a href="#top" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            {t("nav_back_to_top")} ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
