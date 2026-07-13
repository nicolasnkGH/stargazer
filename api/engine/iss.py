"""ISS pass predictions using Skyfield + live TLE data."""

from __future__ import annotations

import time as _time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import tempfile, os
import requests

from skyfield.api import wgs84, EarthSatellite

from .skyfield import _get_skyfield, _get_tz, _sf_time, now_local
from .planets import _az_to_direction
from .cache import get_cache, set_cache
from config import LATITUDE, LONGITUDE, ELEVATION_M

N, W = 1, -1

def _iss_cache_key(lat, lon, count):
    return f"iss_passes_{round(lat or 0, 2)}_{round(lon or 0, 2)}_{count}"


def get_iss_passes(count: int = 3, lat=None, lon=None) -> list[dict]:
    key = _iss_cache_key(lat, lon, count)
    cached = get_cache(key)
    if cached:
        return cached

    """
    Predict ISS passes using Skyfield + live TLE from wheretheiss.at.
    """
    ts, _ = _get_skyfield()
    tz = _get_tz(lat, lon)
    _lat = float(lat) if lat is not None else LATITUDE
    _lon = float(lon) if lon is not None else LONGITUDE
    observer = wgs84.latlon(_lat * N, abs(_lon) * W, elevation_m=ELEVATION_M)

    # ── Step 1: Fetch live ISS TLE with caching ─────────────────────────────────
    name, line1, line2 = None, None, None
    tle_cache_key = "iss_tle_live"
    
    tle_data = get_cache(tle_cache_key)
    if tle_data:
        name, line1, line2 = tle_data["name"], tle_data["line1"], tle_data["line2"]

    if not name:
        try:
            tle_resp = requests.get("https://api.wheretheiss.at/v1/satellites/25544/tles", timeout=8)
            tle_resp.raise_for_status()
            t_data = tle_resp.json()
            line1, line2, name = t_data["line1"], t_data["line2"], t_data.get("name", "ISS (ZARYA)")
        except Exception:
            try:
                resp = requests.get("https://live.ariss.org/iss.txt", timeout=10)
                resp.raise_for_status()
                lines = [l.strip() for l in resp.text.strip().splitlines() if l.strip()]
                name, line1, line2 = lines[0], lines[1], lines[2]
            except Exception as e:
                return [{
                    "rise": "N/A", "set": "N/A",
                    "peak_alt": "N/A", "peak_az": "S",
                    "visible": False,
                    "error": f"Could not fetch TLE: {e}",
                    "fallback_url": f"https://heavens-above.com/PassSummary.aspx?satid=25544&lat={LATITUDE}&lng={LONGITUDE}",
                }]

        if name and line1 and line2:
            set_cache(tle_cache_key, {"name": name, "line1": line1, "line2": line2}, ttl_seconds=86400)

    # ── Step 2: Build EarthSatellite and find passes ──────────────────────────
    try:
        iss = EarthSatellite(line1, line2, name, ts)
        now_sf = _sf_time(now_local(lat=lat, lon=lon))
        end_sf = _sf_time(now_local(lat=lat, lon=lon) + timedelta(days=5))

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
                current_pass["peak_az_deg"] = round(az.degrees, 1)
            elif event == 2:    # set below horizon
                current_pass["set"]     = dt_local.strftime("%I:%M %p")
                current_pass["visible"] = bool(current_pass.get("peak_alt", 0) > 20)
                passes.append(current_pass)
                current_pass = {}
                if len(passes) >= count:
                    break

        result = passes[:count] if passes else [{
            "rise": "No passes in next 5 days",
            "set": "N/A", "peak_alt": 0, "peak_az": "S", "visible": False,
        }]
        
        set_cache(key, result, ttl_seconds=300)

    except Exception as e:
        result = [{
            "rise": "Prediction error", "set": "N/A",
            "peak_alt": "N/A", "peak_az": "S", "visible": False,
            "error": str(e),
            "fallback_url": f"https://heavens-above.com/PassSummary.aspx?satid=25544&lat={LATITUDE}&lng={LONGITUDE}",
        }]

    _iss_cache[key] = {"data": result, "ts": _time.monotonic()}
    return result
