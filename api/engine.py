"""
StarGazer Astronomy Engine
Columbus, OH — Celestron StarSense Explorer 5" DX

Uses Skyfield for all ephemeris calculations (NASA JPL DE421).
No API key required for core calculations.
"""

from __future__ import annotations
import math
import requests
from datetime import datetime, timedelta, date
from typing import Optional
import pytz
from zoneinfo import ZoneInfo

from skyfield.api import load, wgs84, Star, N, W, EarthSatellite
from skyfield import almanac

from config import (
    LATITUDE, LONGITUDE, ELEVATION_M, TIMEZONE,
    SCORPIUS_TARGETS, NEARBY_TARGETS, OTHER_TARGETS,
    MIN_ALTITUDE_DEG, TELESCOPE_APERTURE_MM, BORTLE_CLASS, LIMITING_MAG
)

# ── Skyfield setup ────────────────────────────────────────────────────────────

_ts = None
_eph = None

def _get_skyfield():
    global _ts, _eph
    if _ts is None:
        _ts = load.timescale()
    if _eph is None:
        _eph = load("de421.bsp")
    return _ts, _eph

def _get_observer(lat=None, lon=None):
    _, eph = _get_skyfield()
    use_lat = lat if lat is not None else LATITUDE
    use_lon = lon if lon is not None else LONGITUDE
    columbus = wgs84.latlon(use_lat * N, abs(use_lon) * W, elevation_m=ELEVATION_M)
    return eph["earth"] + columbus, columbus

# ── Time utilities ─────────────────────────────────────────────────────────────

def now_local() -> datetime:
    return datetime.now(ZoneInfo(TIMEZONE))

def _sf_time(dt: datetime):
    ts, _ = _get_skyfield()
    return ts.from_datetime(dt.astimezone(ZoneInfo("UTC")))

def _tonight_window(dt: Optional[date] = None, lat=None, lon=None) -> tuple[datetime, datetime]:
    """Return (astronomical_dusk, astronomical_dawn) for the given date."""
    tz = ZoneInfo(TIMEZONE)
    d = dt or now_local().date()
    ts, eph = _get_skyfield()
    _, columbus = _get_observer(lat=lat, lon=lon)

    midnight = datetime(d.year, d.month, d.day, 12, 0, tzinfo=tz)  # noon local
    t0 = ts.from_datetime(midnight)
    t1 = ts.from_datetime(midnight + timedelta(hours=24))

    f = almanac.dark_twilight_day(eph, columbus)
    times, events = almanac.find_discrete(t0, t1, f)

    dusk = None
    dawn = None
    for t, e in zip(times, events):
        dt_local = t.utc_datetime().replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)
        if e == 0 and dusk is None and dt_local.hour > 12:  # astronomical dusk
            dusk = dt_local
        if e == 1 and dusk is not None:  # astronomical dawn
            dawn = dt_local
            break

    # Fallback if twilight can't be determined
    if dusk is None:
        dusk = datetime(d.year, d.month, d.day, 21, 30, tzinfo=tz)
    if dawn is None:
        dawn = datetime(d.year, d.month, d.day + 1, 5, 0, tzinfo=tz)

    return dusk, dawn

# ── Moon ──────────────────────────────────────────────────────────────────────

def get_moon_info(dt: Optional[datetime] = None, lat=None, lon=None) -> dict:
    ts, eph = _get_skyfield()
    observer, columbus = _get_observer(lat=lat, lon=lon)
    tz = ZoneInfo(TIMEZONE)
    now = dt or now_local()
    t = _sf_time(now)
    d = now.date()

    moon = eph["moon"]
    earth = eph["earth"]
    sun = eph["sun"]

    # Phase angle
    e = earth.at(t)
    m = e.observe(moon).apparent()
    s = e.observe(sun).apparent()
    phase_angle = m.separation_from(s).degrees
    illumination = round((1 - math.cos(math.radians(phase_angle))) / 2 * 100, 1)

    # Phase name
    phase_pct = illumination / 100
    if illumination < 3:
        phase_name = "🌑 New Moon"
    elif illumination < 45:
        phase_name = "🌒 Waxing Crescent"
    elif illumination < 55:
        phase_name = "🌓 First Quarter"
    elif illumination < 95:
        phase_name = "🌔 Waxing Gibbous"
    elif illumination > 97:
        phase_name = "🌕 Full Moon"
    elif illumination > 55:
        phase_name = "🌖 Waning Gibbous"
    elif illumination > 45:
        phase_name = "🌗 Last Quarter"
    else:
        phase_name = "🌘 Waning Crescent"

    # Moonrise/set
    midnight = datetime(d.year, d.month, d.day, 0, 0, tzinfo=tz)
    t0 = ts.from_datetime(midnight)
    t1 = ts.from_datetime(midnight + timedelta(hours=36))
    f = almanac.risings_and_settings(eph, moon, columbus)
    times, events = almanac.find_discrete(t0, t1, f)

    moonrise = moonset = None
    for t_ev, ev in zip(times, events):
        dt_local = t_ev.utc_datetime().replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)
        if ev == 1 and moonrise is None and dt_local.date() == d:
            moonrise = dt_local.strftime("%I:%M %p")
        if ev == 0 and moonset is None:
            moonset = dt_local.strftime("%I:%M %p")

    # Current altitude
    alt, az, _ = observer.at(t).observe(moon).apparent().altaz()

    # DSO impact
    if illumination < 20:
        dso_impact = "🟢 Excellent — dark skies for DSOs"
    elif illumination < 50:
        dso_impact = "🟡 Good — some sky glow"
    elif illumination < 80:
        dso_impact = "🟠 Fair — brighter objects only"
    else:
        dso_impact = "🔴 Poor — planets & stars only"

    return {
        "phase_name": phase_name,
        "illumination_pct": illumination,
        "altitude_deg": round(alt.degrees, 1),
        "azimuth_deg": round(az.degrees, 1),
        "moonrise": moonrise or "N/A",
        "moonset": moonset or "N/A",
        "dso_impact": dso_impact,
    }

# ── Planets ───────────────────────────────────────────────────────────────────

PLANETS = {
    "Mercury": "mercury",
    "Venus": "venus",
    "Mars": "mars",
    "Jupiter": "jupiter barycenter",
    "Saturn": "saturn barycenter",
    "Uranus": "uranus barycenter",
    "Neptune": "neptune barycenter",
}

def get_planet_positions(dt: Optional[datetime] = None, lat=None, lon=None) -> list[dict]:
    ts, eph = _get_skyfield()
    observer, _ = _get_observer(lat=lat, lon=lon)
    now = dt or now_local()

    # Use 10pm local as prime observing time if before noon
    if now.hour < 20:
        tz = ZoneInfo(TIMEZONE)
        obs_time = now.replace(hour=22, minute=0, second=0)
    else:
        obs_time = now

    t = _sf_time(obs_time)
    results = []

    for name, body_key in PLANETS.items():
        try:
            body = eph[body_key]
            astrometric = observer.at(t).observe(body)
            apparent = astrometric.apparent()
            alt, az, dist = apparent.altaz()

            visible = bool(alt.degrees > MIN_ALTITUDE_DEG)

            # Magnitude estimates (rough)
            mag_map = {
                "Mercury": -0.5, "Venus": -4.0, "Mars": 0.5,
                "Jupiter": -2.5, "Saturn": 0.8, "Uranus": 5.7, "Neptune": 7.8
            }

            direction = _az_to_direction(az.degrees)
            naked_eye = bool(mag_map.get(name, 5) < 6.5)

            results.append({
                "name": name,
                "altitude_deg": round(alt.degrees, 1),
                "azimuth_deg": round(az.degrees, 1),
                "direction": direction,
                "distance_au": round(dist.au, 3),
                "visible_tonight": visible,
                "magnitude_approx": mag_map.get(name, "N/A"),
                "naked_eye": naked_eye,
                "emoji": _planet_emoji(name),
                "obs_time": obs_time.strftime("%I:%M %p"),
            })
        except Exception:
            pass

    results.sort(key=lambda x: -x["altitude_deg"])
    return results

def _planet_emoji(name: str) -> str:
    return {
        "Mercury": "☿", "Venus": "♀", "Mars": "♂",
        "Jupiter": "♃", "Saturn": "♄", "Uranus": "⛢", "Neptune": "♆"
    }.get(name, "🪐")

def _az_to_direction(az: float) -> str:
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    return dirs[round(az / 22.5) % 16]

# ── Scorpius ──────────────────────────────────────────────────────────────────

def get_scorpius_window(dt: Optional[date] = None, lat=None, lon=None) -> dict:
    """Calculate Scorpius rise/culmination/set and best observing window."""
    ts, eph = _get_skyfield()
    observer, columbus = _get_observer(lat=lat, lon=lon)
    tz = ZoneInfo(TIMEZONE)
    d = dt or now_local().date()

    # Antares as proxy for Scorpius center
    antares = Star(ra_hours=(16 + 29/60 + 24.4/3600),
                   dec_degrees=-(26 + 25/60 + 55/3600))

    midnight = datetime(d.year, d.month, d.day, 0, 0, tzinfo=tz)
    t0 = ts.from_datetime(midnight)
    t1 = ts.from_datetime(midnight + timedelta(hours=36))

    # Find rise/set
    f = almanac.risings_and_settings(eph, antares, columbus)
    try:
        times, events = almanac.find_discrete(t0, t1, f)
    except Exception:
        times, events = [], []

    rise_time = set_time = None
    for t_ev, ev in zip(times, events):
        dt_local = t_ev.utc_datetime().replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)
        if ev == 1 and rise_time is None:
            rise_time = dt_local
        if ev == 0 and rise_time is not None:
            set_time = dt_local

    # Culmination — find maximum altitude
    best_alt = -90
    best_time_local = None
    now_dt = datetime(d.year, d.month, d.day, 12, 0, tzinfo=tz)
    for h in range(24):
        check_t = now_dt + timedelta(hours=h)
        t_sf = _sf_time(check_t)
        astrometric = observer.at(t_sf).observe(antares)
        alt, az, _ = astrometric.apparent().altaz()
        if alt.degrees > best_alt:
            best_alt = alt.degrees
            best_time_local = check_t

    # Current altitude
    t_now = _sf_time(now_local())
    astrometric_now = observer.at(t_now).observe(antares)
    alt_now, az_now, _ = astrometric_now.apparent().altaz()

    # Determine status
    if alt_now.degrees > 15:
        status = "🟢 EXCELLENT — Scorpius is high and well-placed"
    elif alt_now.degrees > 5:
        status = "🟡 VISIBLE — Scorpius is above horizon (low)"
    else:
        status = "🔴 NOT VISIBLE — Below horizon or in twilight"

    return {
        "rise_time": rise_time.strftime("%I:%M %p") if rise_time else "N/A",
        "set_time": set_time.strftime("%I:%M %p") if set_time else "N/A",
        "culmination_time": best_time_local.strftime("%I:%M %p") if best_time_local else "N/A",
        "culmination_altitude_deg": round(best_alt, 1),
        "current_altitude_deg": round(alt_now.degrees, 1),
        "current_azimuth_deg": round(az_now.degrees, 1),
        "current_direction": _az_to_direction(az_now.degrees),
        "status": status,
        "best_time": best_time_local.strftime("%I:%M %p") if best_time_local else "N/A",
    }

# ── DSO Visibility ────────────────────────────────────────────────────────────

def get_visible_targets(dt: Optional[datetime] = None, lat=None, lon=None, constellation: str = "Sco") -> list[dict]:
    """Return targets for a specific constellation with current altitude/visibility."""
    ts, _ = _get_skyfield()
    observer, _ = _get_observer(lat=lat, lon=lon)
    now = dt or now_local()
    t = _sf_time(now)

    results = []
    all_targets = SCORPIUS_TARGETS + NEARBY_TARGETS + OTHER_TARGETS
    if constellation and constellation != "All":
        all_targets = [t for t in all_targets if t.get("constellation", "Sco") == constellation]

    for target in all_targets:
        ra_h = target["ra_h"] + target["ra_m"] / 60 + target["ra_s"] / 3600
        dec_d_sign = -1 if target["dec_d"] < 0 else 1
        dec_deg = target["dec_d"] + dec_d_sign * (target["dec_m"] / 60 + target["dec_s"] / 3600)

        star = Star(ra_hours=ra_h, dec_degrees=dec_deg)
        astrometric = observer.at(t).observe(star)
        alt, az, _ = astrometric.apparent().altaz()

        visible = bool(alt.degrees > MIN_ALTITUDE_DEG)
        mag = target.get("magnitude", 99)
        in_limiting_mag = bool(mag <= LIMITING_MAG if mag != 99 else True)
        observable = bool(visible and in_limiting_mag)

        result = {**target}
        result.update({
            "altitude_deg": round(alt.degrees, 1),
            "azimuth_deg": round(az.degrees, 1),
            "direction": _az_to_direction(az.degrees),
            "visible": visible,
            "observable": observable,
            "in_fov": bool(observable and alt.degrees > 10),
        })
        results.append(result)

    results.sort(key=lambda x: (-x["altitude_deg"]))
    return results

# ── ISS Passes ────────────────────────────────────────────────────────────────

def get_iss_passes(count: int = 3, lat=None, lon=None) -> list[dict]:
    """
    Predict ISS passes using Skyfield + live TLE from wheretheiss.at.
    """
    ts, _ = _get_skyfield()
    tz = ZoneInfo(TIMEZONE)
    _lat = float(lat) if lat is not None else LATITUDE
    _lon = float(lon) if lon is not None else LONGITUDE
    observer = wgs84.latlon(_lat * N, abs(_lon) * W, elevation_m=ELEVATION_M)

    # ── Step 1: Fetch live ISS TLE from wheretheiss.at ────────────────────────
    try:
        tle_resp = requests.get(
            "https://api.wheretheiss.at/v1/satellites/25544/tles",
            timeout=8,
        )
        tle_resp.raise_for_status()
        tle_data = tle_resp.json()
        line1 = tle_data["line1"]
        line2 = tle_data["line2"]
        name  = tle_data.get("name", "ISS (ZARYA)")
    except Exception:
        # Fallback: try Celestrak stations group TLE file
        try:
            resp = requests.get(
                "https://celestrak.org/SATCAT/elements/?GROUP=stations&FORMAT=TLE",
                timeout=10,
            )
            resp.raise_for_status()
            lines = [l.strip() for l in resp.text.strip().splitlines() if l.strip()]
            # Find ISS (ZARYA) — it's usually the first entry
            iss_idx = next(
                (i for i, l in enumerate(lines) if "ISS" in l.upper() or "ZARYA" in l.upper()),
                0,
            )
            name  = lines[iss_idx]
            line1 = lines[iss_idx + 1]
            line2 = lines[iss_idx + 2]
        except Exception as e:
            return [{
                "rise": "N/A", "set": "N/A",
                "peak_alt": "N/A", "peak_az": "S",
                "visible": False,
                "error": f"Could not fetch TLE: {e}",
                "fallback_url": f"https://heavens-above.com/PassSummary.aspx?lat={LATITUDE}&lng={LONGITUDE}&loc=Columbus&alt=240&tz=ET",
            }]

    # ── Step 2: Build EarthSatellite and find passes ──────────────────────────
    try:
        iss = EarthSatellite(line1, line2, name, ts)
        now_sf = _sf_time(now_local())
        end_sf = _sf_time(now_local() + timedelta(days=5))

        t_events, events = iss.find_events(
            observer, now_sf, end_sf, altitude_degrees=10.0
        )

        passes = []
        current_pass: dict = {}

        for ti, event in zip(t_events, events):
            dt_local = ti.utc_datetime().replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)
            if event == 0:      # above-horizon rise
                current_pass = {
                    "rise": dt_local.strftime("%a %b %d %I:%M %p"),
                    "rise_dt": dt_local.isoformat(),
                }
            elif event == 1:    # culmination
                diff = iss - observer
                topo = diff.at(ti)
                alt, az, _ = topo.altaz()
                current_pass["peak_alt"] = round(alt.degrees)
                current_pass["peak_az"]  = _az_to_direction(az.degrees)
            elif event == 2:    # set below horizon
                current_pass["set"]     = dt_local.strftime("%I:%M %p")
                current_pass["visible"] = bool(current_pass.get("peak_alt", 0) > 20)
                passes.append(current_pass)
                current_pass = {}
                if len(passes) >= count:
                    break

        return passes[:count] if passes else [{
            "rise": "No passes in next 5 days",
            "set": "N/A", "peak_alt": 0, "peak_az": "S", "visible": False,
        }]

    except Exception as e:
        return [{
            "rise": "Prediction error", "set": "N/A",
            "peak_alt": "N/A", "peak_az": "S", "visible": False,
            "error": str(e),
            "fallback_url": f"https://heavens-above.com/PassSummary.aspx?lat={LATITUDE}&lng={LONGITUDE}&loc=Columbus&alt=240&tz=ET",
        }]

# ── Seeing / Weather ──────────────────────────────────────────────────────────

def get_seeing_forecast(lat=None, lon=None) -> dict:
    """Fetch astronomical seeing forecast from Open-Meteo (free, no key needed)."""
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat if lat else LATITUDE}&longitude={lon if lon else LONGITUDE}"
        f"&hourly=cloudcover,cloudcover_low,cloudcover_mid,cloudcover_high,"
        f"visibility,windspeed_10m,precipitation_probability,temperature_2m"
        f"&daily=sunrise,sunset,precipitation_sum"
        f"&timezone={TIMEZONE}&forecast_days=7"
    )
    try:
        resp = requests.get(url, timeout=8)
        data = resp.json()
        hourly = data.get("hourly", {})
        daily = data.get("daily", {})

        now_hour_idx = now_local().hour
        tonight_start = 20  # 8pm
        tonight_end = 28    # 4am next day (hour index)

        def avg_hours(field, start, end):
            vals = hourly.get(field, [])
            subset = vals[start:end]
            return round(sum(subset) / len(subset), 1) if subset else None

        tonight_cloud = avg_hours("cloudcover", tonight_start, tonight_end)
        tonight_cloud_low = avg_hours("cloudcover_low", tonight_start, tonight_end)
        tonight_vis = avg_hours("visibility", tonight_start, tonight_end)
        tonight_wind = avg_hours("windspeed_10m", tonight_start, tonight_end)
        tonight_precip = avg_hours("precipitation_probability", tonight_start, tonight_end)

        # Seeing score 1-5
        score = 5
        if tonight_cloud and tonight_cloud > 80:
            score -= 3
        elif tonight_cloud and tonight_cloud > 50:
            score -= 2
        elif tonight_cloud and tonight_cloud > 20:
            score -= 1
        if tonight_precip and tonight_precip > 50:
            score -= 1
        if tonight_wind and tonight_wind > 30:
            score -= 1
        score = max(1, score)

        seeing_labels = {
            5: "⭐⭐⭐⭐⭐ Exceptional",
            4: "⭐⭐⭐⭐ Good",
            3: "⭐⭐⭐ Average",
            2: "⭐⭐ Poor",
            1: "⭐ Bad — stay in"
        }

        # 7-day summary
        week_summary = []
        for i in range(7):
            idx_start = i * 24 + tonight_start
            idx_end = idx_start + 8
            cloud = avg_hours("cloudcover", idx_start, idx_end)
            precip = avg_hours("precipitation_probability", idx_start, idx_end)
            d = daily.get("sunrise", [""] * 7)
            label = "🟢 Clear" if cloud and cloud < 30 else ("🟡 Partly Cloudy" if cloud and cloud < 70 else "🔴 Cloudy")
            from datetime import date as dt_date
            day_date = (dt_date.today() + timedelta(days=i)).strftime("%a %b %d")
            week_summary.append({
                "date": day_date,
                "cloud_pct": cloud,
                "precip_prob": precip,
                "status": label
            })

        return {
            "seeing_score": score,
            "seeing_label": seeing_labels[score],
            "tonight_cloud_pct": tonight_cloud,
            "tonight_cloud_low_pct": tonight_cloud_low,
            "tonight_visibility_m": tonight_vis,
            "tonight_wind_kmh": tonight_wind,
            "tonight_precip_prob": tonight_precip,
            "week_forecast": week_summary,
            "go_nogo": "✅ GO" if score >= 3 else ("⚠️ MARGINAL" if score == 2 else "❌ NO GO"),
            "source": "Open-Meteo (free)",
            "clearoutside_embed": f"https://clearoutside.com/forecast_embed/{lat if lat else LATITUDE}/{lon if lon else LONGITUDE}",
        }
    except Exception as e:
        return {
            "seeing_score": None,
            "seeing_label": "Could not fetch weather",
            "go_nogo": "❓ UNKNOWN",
            "clearoutside_embed": f"https://clearoutside.com/forecast_embed/{lat if lat else LATITUDE}/{lon if lon else LONGITUDE}",
            "error": str(e),
        }

# ── Tonight Report ────────────────────────────────────────────────────────────

def get_tonight_report(lat=None, lon=None) -> dict:
    now = now_local()
    dusk, dawn = _tonight_window(lat=lat, lon=lon)

    moon = get_moon_info(now, lat=lat, lon=lon)
    planets = get_planet_positions(now, lat=lat, lon=lon)
    scorpius = get_scorpius_window(lat=lat, lon=lon)
    targets = get_visible_targets(now, lat=lat, lon=lon)
    seeing = get_seeing_forecast(lat=lat, lon=lon)

    visible_planets = [p for p in planets if p["visible_tonight"]]
    best_targets = [t for t in targets if t.get("in_fov") and t.get("bortle_min", 99) <= BORTLE_CLASS + 1][:5]

    # Must-see tonight
    must_see = []
    if scorpius["current_altitude_deg"] > 10:
        must_see.append(f"🦂 Scorpius is UP — {scorpius['status']}")
    for p in visible_planets[:3]:
        must_see.append(f"{p['emoji']} {p['name']} at {p['altitude_deg']}° {p['direction']}")
    if moon["illumination_pct"] < 15:
        must_see.append("🌑 New Moon tonight — best DSO conditions of the month!")

    return {
        "date": now.strftime("%A, %B %d, %Y"),
        "time_generated": now.strftime("%I:%M %p %Z"),
        "astronomical_dusk": dusk.strftime("%I:%M %p"),
        "astronomical_dawn": dawn.strftime("%I:%M %p"),
        "observing_window_hours": round((dawn - dusk).total_seconds() / 3600, 1),
        "seeing": seeing,
        "moon": moon,
        "scorpius": scorpius,
        "visible_planets": visible_planets,
        "best_targets_tonight": best_targets,
        "must_see": must_see,
        "telescope": {
            "aperture_mm": TELESCOPE_APERTURE_MM,
            "bortle": BORTLE_CLASS,
            "limiting_mag": LIMITING_MAG,
        }
    }

# ── Weekly Report ─────────────────────────────────────────────────────────────

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
    now = now_local()
    days = []
    for i in range(7):
        d = (now + timedelta(days=i)).date()
        moon = get_moon_info(datetime(d.year, d.month, d.day, 22, 0, tzinfo=ZoneInfo(TIMEZONE)))
        scorpius = get_scorpius_window(d)
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
        d_dt = datetime(d.year, d.month, d.day, 22, 0, tzinfo=ZoneInfo(TIMEZONE))
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
            "highlights": highlights,
            "rating": _rate_night(moon["illumination_pct"], weather_day.get("cloud_pct", 50)),
        })

    return {
        "week_start": now.strftime("%B %d, %Y"),
        "days": days,
        "best_nights": [d for d in days if d["rating"] == "⭐⭐⭐ Excellent"],
    }

# ── Constellations ────────────────────────────────────────────────────────────

def get_constellations(lat=None, lon=None) -> list[dict]:
    import json
    import os
    file_path = os.path.join(os.path.dirname(__file__), 'constellations.json')
    try:
        with open(file_path, 'r') as f:
            const_data = json.load(f)
    except:
        return []

    ts, _ = _get_skyfield()
    t = _sf_time(now_local())
    observer, _ = _get_observer(lat=lat, lon=lon)

    results = []
    for c in const_data:
        target = Star(ra_hours=c["ra"], dec_degrees=c["dec"])
        astrometric = observer.at(t).observe(target)
        alt, az, _ = astrometric.apparent().altaz()
        
        results.append({
            "name": c["name"],
            "abbr": c["abbr"],
            "altitude_deg": round(alt.degrees, 1),
            "direction": _az_to_direction(az.degrees),
            "visible": alt.degrees > 0
        })

    results.sort(key=lambda x: -x["altitude_deg"])
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
    now = now_local()
    ts, eph = _get_skyfield()
    tz = ZoneInfo(TIMEZONE)

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
        "moon_phases": moon_phases,
        "meteor_showers": showers_this_month,
        "scorpius_note": scorpius_note,
        "bright_planets": bright_planets,
        "highlights": _get_monthly_highlights(year, month),
        "bortle_note": f"Columbus is Bortle {BORTLE_CLASS} — best nights are new moon ± 5 days",
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

# ── Telegram Message Formatting ───────────────────────────────────────────────

def format_tonight_telegram(report: dict) -> str:
    r = report
    moon = r["moon"]
    scorpius = r["scorpius"]
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
        f"*🦂 Scorpius*",
        f"• {scorpius['status']}",
        f"• Culminates at {scorpius['culmination_time']} ({scorpius['culmination_altitude_deg']}° altitude)",
        f"• Current: {scorpius['current_altitude_deg']}° {scorpius['current_direction']}",
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
        f"📡 _Celestron 5\" DX | Columbus OH | Bortle {r['telescope']['bortle']}_",
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
