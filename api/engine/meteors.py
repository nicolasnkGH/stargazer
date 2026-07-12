"""Major annual meteor shower schedule.

Peaks recur each year on approximately the same date, so this uses a
curated static schedule (IMO-published averages). For a given call we
return upcoming showers (those whose peak is today or later, within the
next 12 months from now).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo


# (name, code, peak_month, peak_day, zhr, parent_body, activity_period, hemisphere, notes)
_METEOR_SHOWERS = [
    ("Quadrantids", "QUA", 1, 3, 110, "Asteroid 2003 EH1",
     "Dec 28 – Jan 12", "Northern",
     "Short, sharp peak lasting only a few hours. Best after midnight."),
    ("Lyrids", "LYR", 4, 22, 18, "Comet C/1861 G1 (Thatcher)",
     "Apr 16 – Apr 25", "Northern",
     "Occasional bright fireballs. Best after moonset in the pre-dawn hours."),
    ("Eta Aquariids", "ETA", 5, 6, 50, "Comet 1P/Halley",
     "Apr 19 – May 28", "Southern",
     "Fast meteors from Halley's Comet debris. Best in pre-dawn tropics."),
    ("Southern Delta Aquariids", "SDA", 7, 30, 25, "Comet 96P/Machholz",
     "Jul 12 – Aug 23", "Southern",
     "Steady faint meteors. Overlaps with the Perseids."),
    ("Perseids", "PER", 8, 12, 100, "Comet 109P/Swift-Tuttle",
     "Jul 17 – Aug 24", "Northern",
     "The most reliable summer shower. Bright, fast meteors and many fireballs."),
    ("Draconids", "DRA", 10, 8, 10, "Comet 21P/Giacobini-Zinner",
     "Oct 6 – Oct 10", "Northern",
     "Best viewed in the evening, unlike most showers."),
    ("Orionids", "ORI", 10, 21, 20, "Comet 1P/Halley",
     "Oct 2 – Nov 7", "Both",
     "Second annual dose of Halley's Comet debris. Fast meteors, occasional fireballs."),
    ("Leonids", "LEO", 11, 17, 15, "Comet 55P/Tempel-Tuttle",
     "Nov 6 – Nov 30", "Both",
     "Famous for rare meteor storms every ~33 years."),
    ("Geminids", "GEM", 12, 14, 150, "Asteroid 3200 Phaethon",
     "Dec 4 – Dec 20", "Both",
     "The strongest annual shower. Bright, slow, multi-coloured meteors."),
    ("Ursids", "URS", 12, 22, 10, "Comet 8P/Tuttle",
     "Dec 17 – Dec 26", "Northern",
     "Modest shower peaking just before Christmas."),
]


def _peak_date_for(month: int, day: int, ref: date) -> date:
    """Return the next peak date on/after the reference date."""
    year = ref.year
    try:
        candidate = date(year, month, day)
    except ValueError:
        # Handle Feb 29 gracefully by shifting back a day
        candidate = date(year, month, day - 1)
    if candidate < ref:
        try:
            candidate = date(year + 1, month, day)
        except ValueError:
            candidate = date(year + 1, month, day - 1)
    return candidate


def get_meteor_showers(count: int = 5) -> list[dict]:
    """Return the next `count` upcoming major meteor showers.

    Each entry includes name, IAU code, peak ISO date, days until peak,
    Zenithal Hourly Rate, parent body, activity period, favoured
    hemisphere, and observing notes.
    """
    today = datetime.now(ZoneInfo("UTC")).date()

    upcoming = []
    for name, code, month, day, zhr, parent, activity, hemisphere, notes in _METEOR_SHOWERS:
        peak = _peak_date_for(month, day, today)
        days_until = (peak - today).days
        upcoming.append({
            "name": name,
            "code": code,
            "peak_date": peak.isoformat(),
            "days_until_peak": days_until,
            "zhr": zhr,
            "parent_body": parent,
            "activity_period": activity,
            "hemisphere": hemisphere,
            "notes": notes,
        })

    upcoming.sort(key=lambda s: s["days_until_peak"])
    return upcoming[:count]
