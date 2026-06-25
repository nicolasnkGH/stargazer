"""Telegram message formatting for StarGazer reports."""

from __future__ import annotations


def format_tonight_telegram(report: dict) -> str:
    r = report
    moon = r["moon"]
    seeing = r["seeing"]

    lines = [
        f"🔭 *StarGazer — Tonight's Report*",
        f"📅 {r['date']}",
        f"",
        f"*🌤 Conditions*",
        f"• Seeing: {seeing.get('seeing_label', 'N/A')}",
        f"• Go/No-Go: {seeing.get('go_nogo', '❓')}",
        f"• Cloud cover: {seeing.get('tonight_cloud_pct', 'N/A')}%",
        f"",
        f"*🌙 Moon*",
        f"• {moon['phase_name']} ({moon['illumination_pct']}% illuminated)",
        f"• Rise: {moon['moonrise']} | Set: {moon['moonset']}",
        f"• DSO impact: {moon['dso_impact']}",
        f"",
        f"*🌟 Must-See Tonight*",
    ]
    for item in r.get("must_see", [])[:5]:
        lines.append(f"• {item}")

    if r.get("best_targets_tonight"):
        lines += ["", "*🎯 Top Targets Now*"]
        for t in r["best_targets_tonight"][:4]:
            lines.append(f"• {t.get('emoji','•')} {t['name']} ({t['type']}) — {t['altitude_deg']}° {t['direction']}")

    lines += [
        f"",
        f"*⏰ Observing Window*",
        f"• Dark: {r['astronomical_dusk']} → {r['astronomical_dawn']} ({r['observing_window_hours']}h)",
        f"",
        f"📡 _Telescope | {LATITUDE}, {LONGITUDE} | Bortle {r['telescope']['bortle']}_",
    ]
    return "\n".join(lines)

def format_weekly_telegram(report: dict) -> str:
    lines = [
        f"🔭 *StarGazer — Week Ahead*",
        f"📅 Week of {report['week_start']}",
        f"",
    ]
    for day in report["days"]:
        rating = day["rating"]
        lines.append(f"*{day['date']}* {rating}")
        lines.append(f"  {day['moon_phase']} • {day['weather']}")
        for h in day["highlights"]:
            lines.append(f"  ↳ {h}")
        lines.append("")

    if report.get("best_nights"):
        lines.append("*🏆 Best Nights This Week:*")
        for n in report["best_nights"]:
            lines.append(f"• {n['date']}")

    return "\n".join(lines)

def format_monthly_telegram(report: dict) -> str:
    lines = [
        f"🔭 *StarGazer — {report['month']} Preview*",
        f"",
        f"*{report['scorpius_note']}*",
        f"",
        f"*🌙 Moon Phases*",
    ]
    for phase in report["moon_phases"]:
        lines.append(f"• {phase['phase']}: {phase['date']}")

    if report["meteor_showers"]:
        lines += ["", "*☄️ Meteor Showers*"]
        for s in report["meteor_showers"]:
            lines.append(f"• {s['name']}: Peak ~{s['peak'][1]}/{s['peak'][0]} — ZHR~{s['zhr']}/hr")

    if report["highlights"]:
        lines += ["", "*⭐ Highlights*"]
        for h in report["highlights"]:
            lines.append(f"• {h}")

    lines += [
        f"",
        f"*💡 Tip of the Month*",
        f"_{report['tip_of_month']}_",
        f"",
        f"_{report['bortle_note']}_",
    ]
    return "\n".join(lines)
