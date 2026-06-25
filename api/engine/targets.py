"""DSO target visibility calculations."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from .skyfield import _get_skyfield, _get_observer, _sf_time, now_local
from .planets import _az_to_direction
from skyfield.api import Star
from config import SCORPIUS_TARGETS, NEARBY_TARGETS, OTHER_TARGETS, MIN_ALTITUDE_DEG, LIMITING_MAG


def get_visible_targets(dt: Optional[datetime] = None, lat=None, lon=None, constellation: str = "Sco") -> list[dict]:
    """Return targets for a specific constellation with current altitude/visibility."""
    ts, _ = _get_skyfield()
    observer, _ = _get_observer(lat=lat, lon=lon)
    now = dt or now_local(lat=lat, lon=lon)
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
