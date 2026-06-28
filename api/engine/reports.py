"""Tonight, weekly, monthly reports and constellation data."""

from __future__ import annotations

from datetime import datetime, timedelta, date
from typing import Optional
import json
import hashlib
from zoneinfo import ZoneInfo

from .skyfield import _get_skyfield, _get_observer, _get_tz, _sf_time, now_local, _tonight_window
from skyfield.api import Star
from skyfield import almanac
from .moon import get_moon_info
from .planets import get_planet_positions, _az_to_direction
from .targets import get_visible_targets
from .seeing import get_seeing_forecast
from config import BORTLE_CLASS, TELESCOPE_APERTURE_MM, LATITUDE, LONGITUDE, LIMITING_MAG

FAMOUS_CONSTELLATIONS = {
    "Urs Major": "UMa", "Urs Minor": "UMi", "Leo": "Leo",
    "Scorpius": "Sco", "Cygnus": "Cyg", "Lyra": "Lyr",
    "Orion": "Ori", "Cassiopeia": "Cas", "Sagittarius": "Sgr",
    "Crux": "Cru", "Aquila": "Aql", "Corvus": "Crv",
    "Centaurus": "Cen", "Pegasus": "Peg", "Andromeda": "And",
    "Gemini": "Gem", "Taurus": "Tau", "Virgo": "Vir",
    "Aries": "Ari", "Pisces": "Psc", "Cancer": "Cnc",
    "Capricornus": "Cap", "Aquarius": "Aqr", "Ophiuchus": "Oph",
    "Hydra": "Hya", "Hydrus": "Hyi", "Indus": "Ind",
    "Microscopium": "Mic", "Pavo": "Pav", "Puppis": "Pup",
    "Pyxis": "Pyx", "Reticulum": "Ret", "Sculptor": "Scl",
    "Telescopium": "Tel", "Triangulum": "Tri", "Vela": "Vel",
}


def get_tonight_report(lat=None, lon=None, lang: str = "en") -> dict:
    """Aggregate data for tonight's dashboard view."""
    now = now_local(lat=lat, lon=lon)
    dusk, dawn = _tonight_window(lat=lat, lon=lon)

    moon = get_moon_info(now, lat=lat, lon=lon)
    planets = get_planet_positions(now, lat=lat, lon=lon, dusk=dusk, dawn=dawn)
    targets = get_visible_targets(now, lat=lat, lon=lon)
    seeing = get_seeing_forecast(lat=lat, lon=lon, lang=lang)

    visible_planets = [p for p in planets if p["visible_tonight"]]
    best_targets = [t for t in targets if t.get("in_fov") and t.get("bortle_min", 99) <= BORTLE_CLASS + 1][:5]

    # Must-see tonight
    must_see = []
    
    # Get highest famous constellation
    consts = get_constellations(lat=lat, lon=lon, filter_famous=True)
    if consts and consts[0]["altitude_deg"] > 20:
        best_c = consts[0]
        must_see.append({
            "title": f"{best_c['name']} is UP",
            "subtitle": "Excellent conditions",
            "icon": best_c['emoji'],
            "meta": "Excellent",
            "type": "constellation"
        })

    planet_facts = {
        "Venus": "look for its phases through a telescope!",
        "Jupiter": "spot the 4 Galilean moons!",
        "Saturn": "the rings are spectacular right now!",
        "Mars": "look for the polar ice caps!",
        "Mercury": "catch it quickly before it sets!",
        "Uranus": "a tiny blue-green disc in binoculars!",
        "Neptune": "a faint blue dot, needs a telescope!"
    }
    for p in visible_planets[:3]:
        fact = planet_facts.get(p['name'], "a great target tonight!")
        must_see.append({
            "title": p['name'],
            "subtitle": fact,
            "icon": p['emoji'],
            "meta": f"{p['altitude_deg']}° {p['direction']} ({p['azimuth_deg']}°)",
            "type": "planet"
        })
    if moon["illumination_pct"] < 15:
        must_see.append({
            "title": "New Moon tonight",
            "subtitle": "Best DSO conditions of the month!",
            "icon": "🌑",
            "meta": "",
            "type": "moon"
        })

    planet_fact_date = now.strftime("%Y-%m-%d")
    idx = int(hashlib.md5(planet_fact_date.encode(), usedforsecurity=False).hexdigest(), 16) % len(PLANET_FACTS)

    return {
        "date": now.strftime("%A, %B %d, %Y"),
        "time_generated": now.strftime("%I:%M %p %Z"),
        "location_timezone": str(_get_tz(lat, lon).key),
        "astronomical_dusk": dusk.strftime("%I:%M %p"),
        "astronomical_dawn": dawn.strftime("%I:%M %p"),
        "observing_window_hours": round((dawn - dusk).total_seconds() / 3600, 1),
        "seeing": seeing,
        "moon": moon,
        "visible_planets": visible_planets,
        "best_targets_tonight": best_targets,
        "must_see": must_see,
        "planet_fact": PLANET_FACTS[idx],
        "telescope": {
            "aperture_mm": TELESCOPE_APERTURE_MM,
            "bortle": BORTLE_CLASS,
            "limiting_mag": LIMITING_MAG,
        }
    }

# ── Weekly Report ─────────────────────────────────────────────────────────────

# Fun planet facts — one per day, selected deterministically by date
PLANET_FACTS = [
    "A day on Venus is longer than a year on Venus.",
    "Jupiter's Great Red Spot is a storm that has been raging for over 300 years.",
    "Saturn's rings are mostly made of chunks of ice and rock.",
    "Uranus rotates on its side, making it unique among the planets.",
    "Neptune has the strongest winds in the solar system, reaching 2,100 km/h.",
    "Mars has the largest volcano in the solar system, Olympus Mons.",
    "Mercury is the closest planet to the Sun, but Venus is hotter.",
    "Jupiter is so large that all the other planets in the solar system could fit inside it.",
    "Saturn is the only planet in our solar system that is less dense than water.",
    "A year on Mercury is just 88 Earth days long.",
    "Venus spins backward compared to most other planets.",
    "Mars has two tiny moons, Phobos and Deimos, which are likely captured asteroids.",
    "Uranus was the first planet discovered using a telescope (in 1781).",
    "Neptune was discovered through mathematical predictions rather than regular observation.",
    "Earth is the only planet not named after a mythological god or goddess.",
]

# Known meteor showers (approximate peak dates)
METEOR_SHOWERS = [
    {"name": "Quadrantids", "peak": (1, 3), "zhr": 110, "radiant": "Boötes"},
    {"name": "Lyrids", "peak": (4, 22), "zhr": 20, "radiant": "Lyra"},
    {"name": "Eta Aquarids", "peak": (5, 6), "zhr": 60, "radiant": "Aquarius"},
    {"name": "Delta Aquarids", "peak": (7, 28), "zhr": 20, "radiant": "Aquarius"},
    {"name": "Alpha Capricornids", "peak": (7, 30), "zhr": 5, "radiant": "Capricornus"},
    {"name": "Perseids", "peak": (8, 12), "zhr": 100, "radiant": "Perseus"},
    {"name": "Draconids", "peak": (10, 8), "zhr": 10, "radiant": "Draco"},
    {"name": "Orionids", "peak": (10, 21), "zhr": 20, "radiant": "Orion"},
    {"name": "Leonids", "peak": (11, 17), "zhr": 15, "radiant": "Leo"},
    {"name": "Geminids", "peak": (12, 13), "zhr": 150, "radiant": "Gemini"},
    {"name": "Ursids", "peak": (12, 22), "zhr": 10, "radiant": "Ursa Minor"},
]

def get_weekly_report(lat=None, lon=None) -> dict:
    now = now_local(lat=lat, lon=lon)
    days = []
    for i in range(7):
        d = (now + timedelta(days=i)).date()
        moon = get_moon_info(datetime(d.year, d.month, d.day, 22, 0, tzinfo=_get_tz(lat, lon)), lat=lat, lon=lon)
        seeing_data = get_seeing_forecast(lat=lat, lon=lon)
        weather_day = seeing_data.get("week_forecast", [{} for _ in range(7)])[i] if i < 7 else {}

        # Check for meteor showers
        showers_today = [s for s in METEOR_SHOWERS
                         if s["peak"][0] == d.month and abs(s["peak"][1] - d.day) <= 2]

        highlights = []
        if showers_today:
            for s in showers_today:
                highlights.append(f"☄️ {s['name']} peak! ZHR~{s['zhr']}/hr")
        if moon["illumination_pct"] < 5:
            highlights.append("🌑 New Moon — prime DSO night!")
        if moon["illumination_pct"] > 95:
            highlights.append("🌕 Full Moon — planets & moon only")
            
        # Get planets info for this day
        d_dt = datetime(d.year, d.month, d.day, 22, 0, tzinfo=_get_tz(lat, lon))
        planets = get_planet_positions(d_dt, lat=lat, lon=lon)
        visible_planets = [p for p in planets if p.get("visible_tonight") and p.get("altitude_deg", 0) > 20]
        if visible_planets:
            p = sorted(visible_planets, key=lambda x: -x["altitude_deg"])[0]
            highlights.append(f"{p['emoji']} {p['name']} peaks at {p['altitude_deg']}°")
            
        if not highlights:
            highlights.append("✨ Clear skies (no major events)")

        days.append({
            "date": d.strftime("%A, %B %d"),
            "moon_phase": moon["phase_name"],
            "moon_illumination": moon["illumination_pct"],
            "weather": weather_day.get("status", "N/A"),
            "cloud_pct": weather_day.get("cloud_pct"),
            "temp_c": weather_day.get("temp"),
            "highlights": highlights,
            "rating": _rate_night(moon["illumination_pct"], weather_day.get("cloud_pct", 50)),
        })

    return {
        "week_start": now.strftime("%B %d, %Y"),
        "days": days,
        "best_nights": [d for d in days if d["rating"] == "⭐⭐⭐ Excellent"],
    }

# ── Constellations ────────────────────────────────────────────────────────────

import time as _time

_constellation_cache: dict = {}
_CONSTELLATION_TTL = 300  # 5 minutes — positions change <0.25° in that window


def _constellation_cache_key(lat, lon, filter_famous):
    return (round(lat or 0, 2), round(lon or 0, 2), filter_famous)


def get_constellations(lat=None, lon=None, filter_famous=False) -> list[dict]:
    key = _constellation_cache_key(lat, lon, filter_famous)
    now = _time.monotonic()
    cached = _constellation_cache.get(key)
    if cached and now - cached["ts"] < _CONSTELLATION_TTL:
        return cached["data"]

    import json
    import os
    file_path = os.path.join(os.path.dirname(__file__), 'constellations_enriched.json')
    try:
        with open(file_path, 'r') as f:
            const_data = json.load(f)
    except:
        return []

    ts, _ = _get_skyfield()
    t = _sf_time(now_local(lat=lat, lon=lon))
    observer, _ = _get_observer(lat=lat, lon=lon)

    results = []
    for c in const_data:
        if filter_famous and c["abbr"] not in FAMOUS_CONSTELLATIONS:
            continue
        target = Star(ra_hours=c["ra"], dec_degrees=c["dec"])
        astrometric = observer.at(t).observe(target)
        alt, az, _ = astrometric.apparent().altaz()

        results.append({
            "name": c["name"],
            "abbr": c["abbr"],
            "emoji": FAMOUS_CONSTELLATIONS.get(c["abbr"], "✨"),
            "altitude_deg": round(alt.degrees, 1),
            "azimuth_deg": round(az.degrees, 1),
            "direction": _az_to_direction(az.degrees),
            "visible": bool(alt.degrees > 0)
        })

    results.sort(key=lambda x: -x["altitude_deg"])
    _constellation_cache[key] = {"data": results, "ts": now}
    return results

def _rate_night(moon_illum: float, cloud_pct: Optional[float]) -> str:
    cloud = cloud_pct or 50
    if moon_illum < 30 and cloud < 30:
        return "⭐⭐⭐ Excellent"
    elif moon_illum < 60 and cloud < 50:
        return "⭐⭐ Good"
    elif cloud < 70:
        return "⭐ Fair"
    else:
        return "❌ Poor"

# ── Monthly Report ────────────────────────────────────────────────────────────

def get_monthly_report(lat=None, lon=None) -> dict:
    now = now_local(lat=lat, lon=lon)
    ts, eph = _get_skyfield()
    tz = _get_tz(lat, lon)

    # Moon phases for the month
    from calendar import monthrange
    year, month = now.year, now.month
    _, days_in_month = monthrange(year, month)
    t0 = ts.from_datetime(datetime(year, month, 1, tzinfo=ZoneInfo("UTC")))
    t1 = ts.from_datetime(datetime(year, month, days_in_month, 23, 59, tzinfo=ZoneInfo("UTC")))

    moon_phases = []
    try:
        times, phases = almanac.find_discrete(t0, t1, almanac.moon_phases(eph))
        phase_names = ["🌑 New Moon", "🌓 First Quarter", "🌕 Full Moon", "🌗 Last Quarter"]
        for t_p, ph in zip(times, phases):
            dt_local = t_p.utc_datetime().replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)
            moon_phases.append({
                "phase": phase_names[ph],
                "date": dt_local.strftime("%B %d at %I:%M %p"),
            })
    except Exception:
        pass

    # This month's meteor showers
    showers_this_month = [s for s in METEOR_SHOWERS if s["peak"][0] == month]

    # Scorpius season notes
    if month in [6, 7, 8]:
        scorpius_note = "🦂 PEAK SCORPIUS SEASON — prime time for all targets!"
    elif month in [5, 9]:
        scorpius_note = "🦂 Good Scorpius season — visible in evening sky"
    elif month in [4, 10]:
        scorpius_note = "🦂 Scorpius in morning/evening fringe — limited window"
    else:
        scorpius_note = "🦂 Scorpius not well-placed this month"

    # Visible planet highlights (simplified)
    planets = get_planet_positions(now, lat=lat, lon=lon)
    bright_planets = [p for p in planets if p["magnitude_approx"] < 1]

    return {
        "month": now.strftime("%B %Y"),
        "location_timezone": str(_get_tz(lat, lon).key),
        "moon_phases": moon_phases,
        "meteor_showers": showers_this_month,
        "scorpius_note": scorpius_note,
        "bright_planets": bright_planets,
        "highlights": _get_monthly_highlights(year, month),
        "bortle_note": f"Current Location is Bortle {BORTLE_CLASS} — best nights are new moon ± 5 days",
        "tip_of_month": _get_tip_of_month(month),
    }

def _get_monthly_highlights(year: int, month: int) -> list[str]:
    highlights = []
    if month == 8:
        highlights.append("🔥 Perseid Meteor Shower peak Aug 11-13 — up to 100/hr!")
    if month == 12:
        highlights.append("💫 Geminid Meteor Shower peak Dec 13-14 — best shower of year!")
    if month in [6, 7, 8]:
        highlights.append("🦂 Scorpius/Ophiuchus region rich with globular clusters")
    if month in [7, 8]:
        highlights.append("🌌 Milky Way core is overhead — ideal for wide-field views")
    if month in [11, 12, 1, 2]:
        highlights.append("♃ Jupiter and Saturn well-placed in evening sky")
    return highlights

def _get_tip_of_month(month: int) -> str:
    tips = {
        6: "Scorpius is rising! Start with M4 (globular near Antares) — easy first target.",
        7: "Peak Scorpius month! Try M6 & M7 clusters near the stinger. Low on horizon but worth it.",
        8: "Perseid meteor shower peaks Aug 12. Let your eyes dark-adapt first (20+ min).",
        9: "Saturn at its best — rings are stunning at 100x in your 5-inch.",
        10: "Good time for Andromeda Galaxy (M31) — face NE after dark.",
        11: "Jupiter opposition season — look for all 4 Galilean moons!",
        12: "Geminids are the year's best shower. Try from midnight to 3am.",
        1: "Orion Nebula (M42) is at its best — bright and easy in any eyepiece.",
        2: "Beehive Cluster (M44) and Pleiades (M45) are overhead — use low power.",
        3: "Leo Triplet galaxies — M65, M66, NGC 3628 — challenge for suburban skies.",
        4: "Virgo Cluster of galaxies — dozens of faint fuzzies in a small area.",
        5: "Scorpius rising in the SE before dawn. Preview season begins!",
    }
    return tips.get(month, "Let your eyes dark-adapt for 20 minutes before observing.")
