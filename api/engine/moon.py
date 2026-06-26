"""Moon phase, rise/set, and altitude calculations."""

from __future__ import annotations

import math
import time as _time
from datetime import datetime, timedelta
from typing import Optional

from skyfield import almanac
from zoneinfo import ZoneInfo

from .skyfield import _get_observer, _get_skyfield, _get_tz, _sf_time, now_local

_moon_cache: dict = {}
_MOON_TTL = 300  # 5 minutes


def _moon_cache_key(lat, lon):
    return (round(lat or 0, 2), round(lon or 0, 2))


def get_moon_info(dt: Optional[datetime] = None, lat=None, lon=None) -> dict:
    key = _moon_cache_key(lat, lon)
    now_mono = _time.monotonic()
    cached = _moon_cache.get(key)
    if cached and now_mono - cached["ts"] < _MOON_TTL:
        return cached["data"]
    ts, eph = _get_skyfield()
    observer, observer_location = _get_observer(lat=lat, lon=lon)
    tz = _get_tz(lat, lon)
    now = dt or now_local(lat=lat, lon=lon)
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

    result = {
        "phase_name": phase_name,
        "illumination_pct": illumination,
        "altitude_deg": round(alt.degrees, 1),
        "azimuth_deg": round(az.degrees, 1),
        "moonrise": moonrise or "N/A",
        "moonset": moonset or "N/A",
        "dso_impact": dso_impact,
    }
    _moon_cache[key] = {"data": result, "ts": now_mono}
    return result
