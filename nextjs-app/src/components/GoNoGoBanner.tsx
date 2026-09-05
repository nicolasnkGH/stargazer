import { useTranslations } from "next-intl";
import Icon from "./Icon";
import type { SeeingData } from "@/types";

export default function GoNoGoBanner({ seeing }: { seeing: SeeingData | null }) {
  const t = useTranslations();
  if (!seeing) return null;

  const data = {
    go_nogo: seeing.go_nogo || "UNKNOWN",
    confidence: seeing.ai_powered ? t("ai_analyzed") : t("rule_based"),
    factors: seeing.warnings || [],
    recommendation: seeing.seeing_label || "",
  };

  // Backend returns emoji-prefixed values ("✅ GO", "⚠️ MARGINAL", "❌ NO GO"), not bare "GO"/"MAYBE".
  const isGo = data.go_nogo.includes("✅");
  const isMaybe = data.go_nogo.includes("⚠️");

  const iconColor = isGo ? "text-green-400" : isMaybe ? "text-yellow-400" : "text-red-400";
  const bgColor = isGo
    ? "bg-green-500/[0.06] border-green-500/20"
    : isMaybe
      ? "bg-yellow-500/[0.06] border-yellow-500/20"
      : "bg-red-500/[0.06] border-red-500/20";

  const iconName = isGo ? "check-circle" : isMaybe ? "alert-triangle" : "x-circle";

  return (
    <div className={`w-full rounded-lg border ${bgColor} px-4 py-3 flex items-center gap-3`}>
      <Icon name={iconName} className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${iconColor}`}>{data.go_nogo}</span>
          <span className="text-xs text-zinc-500 font-mono">{data.confidence}</span>
        </div>
        <p className="text-xs text-zinc-400 truncate">{data.recommendation}</p>
      </div>
      <div className="hidden sm:flex gap-1.5">
        {data.factors.slice(0, 3).map((f, i) => (
          <span key={i} className="rounded bg-white/5 px-2 py-0.5 text-[0.65rem] text-zinc-400">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
