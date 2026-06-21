"""
StarGazer Observation Engine

Uses Skyfield for all ephemeris calculations (NASA JPL DE421).
No API key required for core calculations.
"""

from __future__ import annotations
import json
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
    MIN_ALTITUDE_DEG, TELESCOPE_APERTURE_MM, BORTLE_CLASS, LIMITING_MAG,
    AI_API_URL, AI_API_KEY, AI_MODEL, AI_TIMEOUT,
)

import time
import hashlib

import json as _json
import os as _os

CACHE_FILE = "/app/data/ai_cache.json"

def _load_ai_cache():
    if _os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return _json.load(f)
        except Exception:
            return {}
    return {}

def _save_ai_cache(cache_dict):
    try:
        _os.makedirs(_os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, "w") as f:
            _json.dump(cache_dict, f)
    except Exception:
        pass

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
    observer_location = wgs84.latlon(use_lat * N, abs(use_lon) * W, elevation_m=ELEVATION_M)
    return eph["earth"] + observer_location, observer_location

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
    _, observer_location = _get_observer(lat=lat, lon=lon)

    midnight = datetime(d.year, d.month, d.day, 12, 0, tzinfo=tz)  # noon local
    t0 = ts.from_datetime(midnight)
    t1 = ts.from_datetime(midnight + timedelta(hours=24))

    f = almanac.dark_twilight_day(eph, observer_location)
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
    observer, observer_location = _get_observer(lat=lat, lon=lon)
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
    f = almanac.risings_and_settings(eph, moon, observer_location)
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

    # Always use real-time for planet calculations
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

FAMOUS_CONSTELLATIONS = {
    "UMa": "🐻", "Ori": "🏹", "Cas": "👑", "Cyg": "🦢", "Cru": "✝️",
    "Sco": "🦂", "CMa": "🐕", "Cen": "🏇", "Ari": "♈", "Tau": "♉",
    "Gem": "♊", "Cnc": "♋", "Leo": "♌", "Vir": "♍", "Lib": "♎",
    "Sgr": "♐", "Cap": "♑", "Aqr": "♒", "Psc": "♓", "Lyr": "🪕", "Her": "💪"
}

def get_constellation_window(abbr: str, dt: Optional[date] = None, lat=None, lon=None) -> dict:
    """Calculate constellation rise/culmination/set and best observing window."""
    import json
    import os
    file_path = os.path.join(os.path.dirname(__file__), 'constellations.json')
    try:
        with open(file_path, 'r') as f:
            const_data = json.load(f)
    except:
        return {"status": "Database error"}
    
    c = next((x for x in const_data if x["abbr"] == abbr), None)
    if not c:
        return {"status": "Constellation not found"}

    ts, eph = _get_skyfield()
    observer, observer_location = _get_observer(lat=lat, lon=lon)
    tz = ZoneInfo(TIMEZONE)
    d = dt or now_local().date()

    # Use constellation central RA/DEC as proxy
    proxy = Star(ra_hours=c["ra"], dec_degrees=c["dec"])

    midnight = datetime(d.year, d.month, d.day, 0, 0, tzinfo=tz)
    t0 = ts.from_datetime(midnight)
    t1 = ts.from_datetime(midnight + timedelta(hours=36))

    # Find rise/set
    f = almanac.risings_and_settings(eph, proxy, observer_location)
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
        astrometric = observer.at(t_sf).observe(proxy)
        alt, az, _ = astrometric.apparent().altaz()
        if alt.degrees > best_alt:
            best_alt = alt.degrees
            best_time_local = check_t

    # Current altitude
    t_now = _sf_time(now_local())
    astrometric_now = observer.at(t_now).observe(proxy)
    alt_now, az_now, _ = astrometric_now.apparent().altaz()

    # Determine status
    if alt_now.degrees > 15:
        status = f"🟢 EXCELLENT — {c['name']} is high and well-placed"
    elif alt_now.degrees > 5:
        status = f"🟡 VISIBLE — {c['name']} is above horizon (low)"
    else:
        status = f"🔴 NOT VISIBLE — Below horizon or in twilight"

    return {
        "rise_time": rise_time.strftime("%I:%M %p") if rise_time else "N/A",
        "set_time": set_time.strftime("%I:%M %p") if set_time else "N/A",
        "culmination_time": best_time_local.strftime("%I:%M %p") if best_time_local else "N/A",
        "culmination_altitude_deg": round(best_alt, 1),
        "current_altitude_deg": round(alt_now.degrees, 1),
        "current_azimuth_deg": round(az_now.degrees, 1),
        "current_direction": _az_to_direction(az_now.degrees),
        "status": status,
        "name": c["name"],
        "abbr": abbr,
        "emoji": FAMOUS_CONSTELLATIONS.get(abbr, "✨"),
        "best_time": best_time_local.strftime("%I:%M %p") if best_time_local else "N/A",
        "ra_hours": c["ra"],
        "dec_degrees": c["dec"],
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
        
        equipment = target.get("equipment")
        if not equipment:
            diff = target.get("difficulty", "")
            if diff == "naked_eye":
                equipment = "👀 Naked Eye"
            elif diff == "easy":
                equipment = "🔭 Binoculars"
            else:
                equipment = "🔭 Telescope"

        result.update({
            "equipment": equipment,
            "ra_hours": ra_h,
            "dec_degrees": dec_deg,
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

    # ── Step 1: Fetch live ISS TLE with caching ─────────────────────────────────
    import tempfile, os
    name, line1, line2 = None, None, None
    cache_file = os.path.join(tempfile.gettempdir(), "iss_tle_cache.json")
    # Try reading valid cache first (under 24h old)
    try:
        import json
        import time
        with open(cache_file, "r") as f:
            c = json.load(f)
            if time.time() - c.get("timestamp", 0) < 86400:
                name, line1, line2 = c["name"], c["line1"], c["line2"]
    except Exception:
        pass

    if not name:
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
            # Fallback: try ARISS live ISS TLE
            try:
                resp = requests.get(
                    "https://live.ariss.org/iss.txt",
                    timeout=10,
                )
                resp.raise_for_status()
                lines = [l.strip() for l in resp.text.strip().splitlines() if l.strip()]
                name  = lines[0]
                line1 = lines[1]
                line2 = lines[2]
            except Exception as e:
                # As a last resort, try reading expired cache if available
                try:
                    with open(cache_file, "r") as f:
                        c = json.load(f)
                        name, line1, line2 = c["name"], c["line1"], c["line2"]
                except Exception:
                    return [{
                        "rise": "N/A", "set": "N/A",
                        "peak_alt": "N/A", "peak_az": "S",
                        "visible": False,
                        "error": f"Could not fetch TLE and no cache available: {e}",
                        "fallback_url": f"https://heavens-above.com/PassSummary.aspx?satid=25544&lat={LATITUDE}&lng={LONGITUDE}",
                    }]

        # Save successful fetch to cache
        if name and line1 and line2:
            try:
                import json
                import time
                with open(cache_file, "w") as f:
                    json.dump({"name": name, "line1": line1, "line2": line2, "timestamp": time.time()}, f)
            except Exception:
                pass

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
            "fallback_url": f"https://heavens-above.com/PassSummary.aspx?satid=25544&lat={LATITUDE}&lng={LONGITUDE}",
        }]



def _ai_seeing_analysis(weather: dict, moon_illum: float, moon_alt: float, visible_targets: list = None, window_label: str = "averaged 8 PM – 4 AM local time", lat: float = 0.0, lon: float = 0.0, lang: str = "en") -> Optional[dict]:
    """
    Call Qwen3.5-9B with a structured astronomy seeing prompt.
    Returns dict with score (1-10), label, explanation, best_window, warnings[].
    Returns None on timeout or any failure — caller falls back to rule-based scorer.
    """
    if not AI_API_URL or not AI_MODEL:
        raise ValueError("AI_API_URL or AI_MODEL is not configured in .env")

    # Cache key: lat, lon, and a 3-hour time block (10800 seconds)
    # This ensures stability across minor weather float changes and page refreshes.
    import time
    time_block = int(time.time()) // 10800
    current_hash = f"{round(float(lat), 2)}_{round(float(lon), 2)}_{time_block}_{lang}"
    
    # Cache Hit
    cache_db = _load_ai_cache()
    if current_hash in cache_db:
        entry = cache_db[current_hash]
        import logging
        logging.getLogger("stargazer").info("AI Seeing: Returning fresh cached response from disk")
        return entry["data"]
            
    if visible_targets:
        # Just grab the top 15 highest altitude targets so we don't blow up the prompt context
        targets_str = ", ".join([f"{t['name']} (Mag {t.get('magnitude', '?')})" for t in visible_targets[:15]])
        target_prompt = f"\n- Top visible deep-sky targets tonight: {targets_str}\nSelect up to 3 of these as 'recommended_targets' considering the moon and weather."
    else:
        target_prompt = ""

    lang_instruction = f"\nCRITICAL: All string values in your JSON response (label, explanation, moon_fact, warnings, recommended_targets names and reasons) MUST be written in the ISO language code '{lang}'. Do not use English unless '{lang}' is 'en'." if lang != "en" else ""

    prompt = f"""You are an expert astronomical seeing forecaster helping amateur astronomers decide whether to observe tonight.

Tonight's atmospheric data ({window_label}):
- Cloud cover: {weather.get('cloud_total', '?')}% (low: {weather.get('cloud_low', '?')}%, mid: {weather.get('cloud_mid', '?')}%, high/cirrus: {weather.get('cloud_high', '?')}%)
- Surface wind: {weather.get('wind_surface', '?')} km/h
- Upper-atmosphere wind (500hPa jet stream proxy): {weather.get('wind_upper', '?')} km/h
- Precipitation probability: {weather.get('precip', '?')}%
- Relative humidity: {weather.get('humidity', '?')}%
- Dew point spread (temp − dewpoint): {weather.get('dew_spread', '?')}°C  [<3°C = fogging risk]
- Surface pressure: {weather.get('pressure', '?')} hPa
- Visibility: {weather.get('visibility_km', '?')} km
- High cirrus clouds present: {'Yes' if (weather.get('cloud_high') or 0) > 20 else 'No'}
- Moon: {moon_illum:.0f}% illuminated, currently {moon_alt:.1f}° above horizon{target_prompt}

Rate the astronomical seeing quality on a scale of 1–10 (10 = perfect, 1 = stay inside).
Consider: transparency (cloud/humidity/cirrus), atmospheric stability (jet stream), dew risk, moon interference, and overall observing potential.

Respond ONLY with valid JSON — no markdown, no explanation outside the JSON:
{{"score": <int 1-10>, "label": "<short label e.g. Exceptional transparency>", "explanation": "<2 sentences for a beginner astronomer>", "moon_fact": "<1 short interesting sentence about the moon's phase tonight>", "best_window": "<e.g. 10 PM – Midnight or All night>", "warnings": [<list of short warning strings, empty list if none>], "recommended_targets": [{{"name": "<Target Name>", "reason": "<Why it's good tonight>"}}]}}{lang_instruction}"""

    headers = {"Content-Type": "application/json"}
    if AI_API_KEY:
        headers["Authorization"] = f"Bearer {AI_API_KEY}"

    payload = {
        "model": AI_MODEL,
        "messages": [
            {"role": "system", "content": "You are a precise astronomical seeing forecaster. Always respond with valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 4000,
        "stream": False,
    }

    try:
        resp = requests.post(AI_API_URL, json=payload, headers=headers, timeout=AI_TIMEOUT)
        resp.raise_for_status()
        
        msg = resp.json()["choices"][0]["message"]
        content = msg.get("content", "").strip()
        reasoning = msg.get("reasoning_content", "").strip()
        
        # Some reasoning models (like DeepSeek R1) output their entire thought process in reasoning_content
        # and may hit max_tokens before ever writing 'content'. We check both.
        raw = content if content else reasoning

        # Ultra-robust JSON extraction & truncated JSON repair
        result = None
        
        # 1. Look for markdown block first
        if "```json" in raw:
            block = raw.split("```json")[-1]
            if "```" in block:
                block = block.split("```")[0]
            try:
                result = json.loads(block.strip())
            except Exception:
                pass
                
        # 2. If no valid block found, find the first JSON-like structure
        if result is None:
            first_brace = raw.find('{')
            if first_brace != -1:
                candidate = raw[first_brace:].strip()
                # Attempt to parse, appending closing syntax if it was truncated by max_tokens
                for suffix in ["", "}", "]}", '"]}', '"}']:
                    try:
                        result = json.loads(candidate + suffix)
                        break
                    except Exception:
                        pass
                    try:
                        result = json.loads(candidate + '"' + suffix)
                        break
                    except Exception:
                        pass
        
        if result is None:
            raise ValueError("Could not extract valid JSON from AI response")

        # Validate required fields
        score = int(result.get("score", 0))
        if not (1 <= score <= 10):
            raise ValueError(f"Score out of range: {score}")

        result = {
            "score": score,
            "label": str(result.get("label", ""))[:60],
            "explanation": str(result.get("explanation", ""))[:300],
            "moon_fact": str(result.get("moon_fact", ""))[:150],
            "best_window": str(result.get("best_window", "Check conditions"))[:60],
            "warnings": [str(w)[:80] for w in result.get("warnings", [])[:4]],
            "recommended_targets": result.get("recommended_targets", []),
            "ai_powered": True,
        }
        
        # Save back to persistent cache
        import time
        cache_db[current_hash] = {
            "timestamp": time.time(),
            "data": result
        }
        
        # Prune old cache entries to prevent unbounded growth (keep last 50)
        if len(cache_db) > 50:
            oldest = min(cache_db.keys(), key=lambda k: cache_db[k]["timestamp"])
            del cache_db[oldest]
            
        _save_ai_cache(cache_db)

        return result

    except Exception as e:
        import logging
        logger = logging.getLogger("stargazer")
        logger.warning(f"AI seeing analysis failed ({type(e).__name__}): {e}")
        # Resilient Fallback: If we have ANY cached data for this location, serve it
        # Try to find the most recent cache entry for this lat/lon
        prefix = f"{round(float(lat), 2)}_{round(float(lon), 2)}_"
        for key in sorted(cache_db.keys(), reverse=True):
            if key.startswith(prefix) and cache_db[key].get("data"):
                logger.warning("AI Seeing: Falling back to stale cached response due to LLM failure")
                return cache_db[key]["data"]
        return None


def _rule_based_seeing_score(weather: dict, moon_illum: float, moon_alt: float) -> dict:
    """
    Improved deterministic fallback scorer on 1–10 scale.
    Used when Qwen is unreachable or times out.
    """
    cloud  = weather.get("cloud_total") or 50
    wind_s = weather.get("wind_surface") or 0
    wind_u = weather.get("wind_upper") or 0
    precip = weather.get("precip") or 0
    humid  = weather.get("humidity") or 50
    spread = weather.get("dew_spread")   # may be None
    cirrus = weather.get("cloud_high") or 0

    score = 10

    # Cloud cover — biggest factor
    if cloud > 80:   score -= 4
    elif cloud > 50: score -= 2
    elif cloud > 20: score -= 1

    # Jet stream / upper wind — seeing turbulence
    if wind_u > 80:   score -= 2
    elif wind_u > 50: score -= 1

    # Surface wind
    if wind_s > 40:   score -= 1

    # Rain risk
    if precip > 50:   score -= 1

    # Dew / fogging risk
    if spread is not None and spread < 2:  score -= 2
    elif spread is not None and spread < 4: score -= 1

    # Humidity
    if humid > 90:    score -= 1

    # High cirrus — kills transparency
    if cirrus > 50:   score -= 1

    # Moon interference (only counts when moon is above horizon)
    if moon_illum > 80 and moon_alt > 20: score -= 1

    score = max(1, min(10, score))

    labels = {
        10: "Perfect — rare, exceptional night",
        9:  "Excellent transparency",
        8:  "Very good conditions",
        7:  "Good — solid observing night",
        6:  "Decent — most targets reachable",
        5:  "Average — bright objects only",
        4:  "Below average — limiting",
        3:  "Poor — consider waiting",
        2:  "Very poor conditions",
        1:  "Bad — stay in",
    }

    warnings = []
    if spread is not None and spread < 4:
        warnings.append(f"Dew risk — spread only {spread:.1f}°C, bring dew heater")
    if wind_u > 50:
        warnings.append(f"Jet stream turbulence likely ({wind_u:.0f} km/h at altitude)")
    if cirrus > 30:
        warnings.append(f"High cirrus clouds ({cirrus:.0f}%) — affects transparency")
    if moon_illum > 60 and moon_alt > 10:
        warnings.append(f"Moon {moon_illum:.0f}% lit — DSO contrast reduced")
    if precip > 30:
        warnings.append(f"Rain chance {precip:.0f}% — watch the sky")

    # Rough best window suggestion
    if cloud < 30 and precip < 20:
        best_window = "All night"
    elif cloud < 60:
        best_window = "Early evening (8–11 PM)"
    else:
        best_window = "Check hourly cloud forecast"

    return {
        "score": score,
        "label": labels[score],
        "explanation": "",   # rule-based doesn't generate prose
        "moon_fact": "",     # rule-based doesn't generate prose
        "best_window": best_window,
        "warnings": warnings,
        "recommended_targets": [],
        "ai_powered": False,
    }


def get_seeing_forecast(lat=None, lon=None, ai_enabled: bool = False, lang: str = "en") -> dict:
    """
    Fetch astronomical seeing forecast from Open-Meteo (expanded parameters)
    and conditionally analyse with Qwen3.5-9B AI.
    """
    import json as _json

    use_lat = lat if lat is not None else LATITUDE
    use_lon = lon if lon is not None else LONGITUDE

    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={use_lat}&longitude={use_lon}"
        # Surface
        f"&hourly=cloudcover,cloudcover_low,cloudcover_mid,cloudcover_high,"
        f"visibility,windspeed_10m,winddirection_10m,"
        f"precipitation_probability,temperature_2m,dewpoint_2m,"
        f"relativehumidity_2m,surface_pressure"
        # Upper atmosphere (jet stream proxy)
        f"&hourly=windspeed_500hPa"
        f"&daily=sunrise,sunset,precipitation_sum"
        f"&timezone=auto&forecast_days=7"
    )

    try:
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        return {
            "seeing_score": None,
            "seeing_label": "Could not fetch weather",
            "seeing_explanation": "",
            "best_window": "Unknown",
            "warnings": [],
            "ai_powered": False,
            "go_nogo": "❓ UNKNOWN",
            "clearoutside_embed": f"https://clearoutside.com/forecast_embed/{use_lat}/{use_lon}",
            "error": str(e),
        }

    hourly = data.get("hourly", {})
    daily  = data.get("daily",  {})

    # ── Average the overnight observing window (dynamic 8-hour block) ──
    current_hour = now_local().hour
    if current_hour < 12:
        # After midnight: observing right now
        tonight_start = current_hour
    elif current_hour < 20:
        # Daytime/afternoon: planning for tonight
        tonight_start = 20
    else:
        # Evening: observing right now
        tonight_start = current_hour
        
    tonight_end = tonight_start + 8
    
    start_h = tonight_start % 24
    end_h = tonight_end % 24
    start_str = f"{start_h % 12 or 12} {'AM' if start_h < 12 else 'PM'}"
    end_str = f"{end_h % 12 or 12} {'AM' if end_h < 12 else 'PM'}"
    window_label = f"averaged {start_str} – {end_str} local time"

    def avg(field, start=tonight_start, end=tonight_end):
        vals = [v for v in (hourly.get(field, []) or [])[start:end] if v is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    cloud_total = avg("cloudcover")
    cloud_low   = avg("cloudcover_low")
    cloud_mid   = avg("cloudcover_mid")
    cloud_high  = avg("cloudcover_high")
    wind_s      = avg("windspeed_10m")
    wind_u      = avg("windspeed_500hPa")
    precip      = avg("precipitation_probability")
    temp        = avg("temperature_2m")
    dewpoint    = avg("dewpoint_2m")
    humidity    = avg("relativehumidity_2m")
    pressure    = avg("surface_pressure")
    visibility  = avg("visibility")

    dew_spread = round(temp - dewpoint, 1) if (temp is not None and dewpoint is not None) else None
    visibility_km = round(visibility / 1000, 1) if visibility is not None else None

    weather_snapshot = {
        "cloud_total": cloud_total,
        "cloud_low":   cloud_low,
        "cloud_mid":   cloud_mid,
        "cloud_high":  cloud_high,
        "wind_surface": wind_s,
        "wind_upper":  wind_u,
        "precip":      precip,
        "humidity":    humidity,
        "dew_spread":  dew_spread,
        "pressure":    pressure,
        "visibility_km": visibility_km,
    }

    # Moon context for AI/fallback scoring
    try:
        moon_now = get_moon_info(lat=lat, lon=lon)
        moon_illum = moon_now.get("illumination_pct", 50)
        moon_alt   = moon_now.get("altitude_deg", 0)
    except Exception:
        moon_illum, moon_alt = 50, 0
        
    try:
        targets = get_visible_targets(constellation="All", lat=lat, lon=lon)
    except Exception:
        targets = []

    # ── AI analysis (Qwen3.5-9B) → fallback to rule-based ────────────────────
    if ai_enabled:
        try:
            analysis = _ai_seeing_analysis(weather_snapshot, moon_illum, moon_alt, targets, window_label, lat=use_lat, lon=use_lon, lang=lang)
        except Exception:
            analysis = None
    else:
        analysis = None

    if analysis is None:
        analysis = _rule_based_seeing_score(weather_snapshot, moon_illum, moon_alt)

    score = analysis["score"]

    # Map 1-10 AI score → 1-5 stars for legacy badge compatibility
    stars = max(1, round(score / 2))

    seeing_labels_5 = {
        5: "⭐⭐⭐⭐⭐ Exceptional",
        4: "⭐⭐⭐⭐ Good",
        3: "⭐⭐⭐ Average",
        2: "⭐⭐ Poor",
        1: "⭐ Bad — stay in",
    }

    go_nogo = "✅ GO" if score >= 6 else ("⚠️ MARGINAL" if score >= 4 else "❌ NO GO")

    # ── 7-day summary (unchanged logic, extended field) ───────────────────────
    week_summary = []
    for i in range(7):
        idx_s = i * 24 + tonight_start
        idx_e = idx_s + 8
        day_cloud  = avg("cloudcover", idx_s, idx_e)
        day_precip = avg("precipitation_probability", idx_s, idx_e)
        day_temp = avg("temperature_2m", idx_s, idx_e)
        label = "🟢 Clear" if (day_cloud or 100) < 30 else ("🟡 Partly Cloudy" if (day_cloud or 100) < 70 else "🔴 Cloudy")
        from datetime import date as _date
        day_date = (_date.today() + timedelta(days=i)).strftime("%a %b %d")
        week_summary.append({
            "date":        day_date,
            "cloud_pct":   day_cloud,
            "precip_prob": day_precip,
            "temp":        day_temp,
            "status":      label,
        })

    return {
        # Core score (1-10) and 5-star display
        "seeing_score":       stars,          # 1-5 for badge/stars UI
        "seeing_score_raw":   score,          # 1-10 for display/tooltip
        "seeing_label":       seeing_labels_5[stars],
        "seeing_label_ai":    analysis["label"],       # AI's own short label
        "seeing_explanation": analysis["explanation"], # prose for beginners
        "moon_fact":          analysis.get("moon_fact", ""), # fun fact
        "best_window":        analysis["best_window"],
        "warnings":           analysis["warnings"],
        "recommended_targets": analysis.get("recommended_targets", []),
        "ai_powered":         analysis["ai_powered"],
        # Weather snapshot (kept for frontend metrics)
        "tonight_cloud_pct":     cloud_total,
        "tonight_cloud_low_pct": cloud_low,
        "tonight_wind_kmh":      wind_s,
        "tonight_precip_prob":   precip,
        "tonight_humidity":      humidity,
        "tonight_dew_spread":    dew_spread,
        "tonight_visibility_km": visibility_km,
        # Go/No-Go
        "go_nogo":  go_nogo,
        "source":   "Open-Meteo + Qwen3.5-9B" if analysis["ai_powered"] else "Open-Meteo (rule-based fallback)",
        "clearoutside_embed": f"https://clearoutside.com/forecast_embed/{use_lat}/{use_lon}",
        "week_forecast": week_summary,
    }

# ── Tonight Report ────────────────────────────────────────────────────────────


def get_tonight_report(lat=None, lon=None, lang: str = "en") -> dict:
    """Aggregate data for tonight's dashboard view."""
    now = now_local()
    dusk, dawn = _tonight_window(lat=lat, lon=lon)

    moon = get_moon_info(now, lat=lat, lon=lon)
    planets = get_planet_positions(now, lat=lat, lon=lon)
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
        must_see.append(f"{best_c['emoji']} {best_c['name']} is UP — 🟢 EXCELLENT")

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
        moon = get_moon_info(datetime(d.year, d.month, d.day, 22, 0, tzinfo=ZoneInfo(TIMEZONE)), lat=lat, lon=lon)
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

def get_constellations(lat=None, lon=None, filter_famous=False) -> list[dict]:
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
            "direction": _az_to_direction(az.degrees),
            "visible": bool(alt.degrees > 0)
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
