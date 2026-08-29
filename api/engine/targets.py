"""DSO target visibility calculations."""

from __future__ import annotations

import time as _time
from datetime import datetime
from typing import Optional

from .skyfield import _get_skyfield, _get_observer, _sf_time, now_local
from .planets import _az_to_direction
from skyfield.api import Star
from config import SCORPIUS_TARGETS, NEARBY_TARGETS, OTHER_TARGETS, MIN_ALTITUDE_DEG, LIMITING_MAG

_targets_cache: dict = {}
_TARGETS_TTL = 300  # 5 minutes


def _targets_cache_key(lat, lon, constellation, bortle):
    return (round(lat or 0, 2), round(lon or 0, 2), constellation, bortle)


def get_visible_targets(dt: Optional[datetime] = None, lat=None, lon=None, constellation: str = "Sco", bortle: Optional[int] = None) -> list[dict]:
    """Return targets for a specific constellation with current altitude/visibility."""
    if bortle is None and lat is not None and lon is not None:
        from .bortle import get_bortle_class
        bortle = get_bortle_class(lat, lon)
    key = _targets_cache_key(lat, lon, constellation, bortle)
    now = _time.monotonic()
    cached = _targets_cache.get(key)
    if cached and now - cached["ts"] < _TARGETS_TTL:
        return cached["data"]

    ts, eph = _get_skyfield()
    observer, _ = _get_observer(lat=lat, lon=lon)
    now_dt = dt or now_local(lat=lat, lon=lon)
    t = _sf_time(now_dt)

    # Check daytime (civil twilight ending at -6 deg altitude)
    sun = eph["sun"]
    alt_sun, _, _ = observer.at(t).observe(sun).apparent().altaz()
    is_daytime = bool(alt_sun.degrees > -6)

    results = []
    all_targets = SCORPIUS_TARGETS + NEARBY_TARGETS + OTHER_TARGETS
    if constellation and constellation.lower() not in ["all", "all_visible", "*", "visible", "all constellations (full db)"]:
        c_search = constellation.lower().strip()
        all_targets = [
            target for target in all_targets
            if (
                target.get("constellation", "").lower() == c_search
                or (len(c_search) >= 3 and target.get("constellation", "").lower().startswith(c_search[:3]))
                or (len(target.get("constellation", "")) >= 3 and c_search.startswith(target.get("constellation", "").lower()[:3]))
            )
        ]

    for target in all_targets:
        ra_h = target["ra_h"] + target["ra_m"] / 60 + target["ra_s"] / 3600
        dec_d_sign = -1 if target["dec_d"] < 0 else 1
        dec_deg = target["dec_d"] + dec_d_sign * (target["dec_m"] / 60 + target["dec_s"] / 3600)

        star = Star(ra_hours=ra_h, dec_degrees=dec_deg)
        astrometric = observer.at(t).observe(star)
        alt, az, _ = astrometric.apparent().altaz()

        visible = bool(alt.degrees > MIN_ALTITUDE_DEG and not is_daytime)
        mag = target.get("magnitude")
        if mag is None:
            mag = 99
        in_limiting_mag = bool(mag <= LIMITING_MAG if mag != 99 else True)
        
        # Check light pollution requirement
        target_bortle_min = target.get("bortle_min")
        t_type = str(target.get("type", "")).lower()
        if target_bortle_min == 1 and (mag <= 3 or "star" in t_type):
            target_bortle_min = 9
        elif target_bortle_min is None:
            if "planet" in t_type or "moon" in t_type or "star" in t_type or mag <= 2.5:
                target_bortle_min = 9
            elif mag <= 4.5 or "open cluster" in t_type:
                target_bortle_min = 7
            elif mag <= 7.0 or "globular" in t_type or "nebula" in t_type or "galaxy" in t_type:
                target_bortle_min = 6
            elif mag <= 8.5:
                target_bortle_min = 5
            else:
                target_bortle_min = 4

        bortle_ok = True
        if bortle is not None:
            bortle_ok = int(bortle) <= target_bortle_min
            
        observable = bool(visible and in_limiting_mag and bortle_ok)

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
            "bortle_ok": bortle_ok,
            "bortle_min": target_bortle_min,
            "in_fov": bool(observable and alt.degrees > 10),
            "is_daytime": is_daytime,
        })
        results.append(result)

    if constellation.lower() in ["all", "*", "all constellations (full db)"]:
        results.sort(key=lambda x: (x.get("constellation", ""), x.get("name", x.get("id", ""))))
    else:
        results.sort(key=lambda x: (-x["altitude_deg"]))
    _targets_cache[key] = {"data": results, "ts": now}
    return results
