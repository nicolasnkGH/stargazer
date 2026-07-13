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
    key = _targets_cache_key(lat, lon, constellation, bortle)
    now = _time.monotonic()
    cached = _targets_cache.get(key)
    if cached and now - cached["ts"] < _TARGETS_TTL:
        return cached["data"]

    ts, _ = _get_skyfield()
    observer, _ = _get_observer(lat=lat, lon=lon)
    now_dt = dt or now_local(lat=lat, lon=lon)
    t = _sf_time(now_dt)

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
        
        # Check light pollution requirement
        target_bortle_min = target.get("bortle_min", 9)
        bortle_ok = True
        if bortle is not None:
            # If user's sky is worse (higher number) than the target requires (lower number), it's washed out
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
            "in_fov": bool(observable and alt.degrees > 10),
        })
        results.append(result)

    results.sort(key=lambda x: (-x["altitude_deg"]))
    _targets_cache[key] = {"data": results, "ts": now}
    return results
