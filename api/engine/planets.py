"""Planet positions, rise/set, and constellation window calculations."""

from __future__ import annotations

import json
import logging
import os
from datetime import date, datetime, timedelta
from typing import Optional

from skyfield.api import Star
from skyfield import almanac
from zoneinfo import ZoneInfo

from config import MIN_ALTITUDE_DEG

from .skyfield import _get_observer, _get_skyfield, _get_tz, _sf_time, now_local

PLANETS = {
    "Mercury": "mercury",
    "Venus": "venus",
    "Mars": "mars",
    "Jupiter": "jupiter barycenter",
    "Saturn": "saturn barycenter",
    "Uranus": "uranus barycenter",
    "Neptune": "neptune barycenter",
}

FAMOUS_CONSTELLATIONS = {
    "UMa": "🐻", "Ori": "🏹", "Cas": "👑", "Cyg": "🦢", "Cru": "✝️",
    "Sco": "🦂", "CMa": "🐕", "Cen": "🏇", "Ari": "♈", "Tau": "♉",
    "Gem": "♊", "Cnc": "♋", "Leo": "♌", "Vir": "♍", "Lib": "♎",
    "Sgr": "♐", "Cap": "♑", "Aqr": "♒", "Psc": "♓", "Lyr": "🪕", "Her": "💪"
}


def get_planet_positions(dt: Optional[datetime] = None, lat=None, lon=None, dusk: Optional[datetime] = None, dawn: Optional[datetime] = None) -> list[dict]:
    ts, eph = _get_skyfield()
    observer, observer_location = _get_observer(lat=lat, lon=lon)
    now = dt or now_local(lat=lat, lon=lon)

    obs_time = now
    t = _sf_time(obs_time)
    results = []

    tz = _get_tz(lat, lon)
    d = now.date()
    midnight = datetime(d.year, d.month, d.day, 12, 0, tzinfo=tz)
    t0 = ts.from_datetime(midnight)
    t1 = ts.from_datetime(midnight + timedelta(hours=24))
    sunset_dt = dusk
    try:
        f_sun = almanac.sunrise_sunset(eph, observer_location)
        times_sun, events_sun = almanac.find_discrete(t0, t1, f_sun)
        for t_ev, ev in zip(times_sun, events_sun):
            dt_local = t_ev.utc_datetime().replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)
            if ev == 0 and sunset_dt == dusk:
                sunset_dt = dt_local
    except Exception as e:
        logging.error("Error computing sunset: %s", e)

    for name, body_key in PLANETS.items():
        try:
            body = eph[body_key]
            astrometric = observer.at(t).observe(body)
            apparent = astrometric.apparent()
            alt, az, dist = apparent.altaz()

            visible = bool(alt.degrees > MIN_ALTITUDE_DEG)

            from skyfield.api import load_constellation_map
            constellation_at = load_constellation_map()
            constellation = constellation_at(astrometric)

            dist_mkm = round(dist.km / 1_000_000, 1)
            light_time_min = round(dist.au * 8.316746397, 1)

            mag_map = {
                "Mercury": -0.5, "Venus": -4.0, "Mars": 0.5,
                "Jupiter": -2.5, "Saturn": 0.8, "Uranus": 5.7, "Neptune": 7.8
            }

            direction = _az_to_direction(az.degrees)
            naked_eye = bool(mag_map.get(name, 5) < 6.5)

            # Planet Rise/Set
            midnight = datetime(d.year, d.month, d.day, 0, 0, tzinfo=tz)
            t0 = ts.from_datetime(midnight)
            t1 = ts.from_datetime(midnight + timedelta(hours=36))
            f = almanac.risings_and_settings(eph, body, observer_location)

            try:
                times, events = almanac.find_discrete(t0, t1, f)
            except Exception:
                times, events = [], []

            rise_time_dt = set_time_dt = None
            for t_ev, ev in zip(times, events):
                dt_local = t_ev.utc_datetime().replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)
                if ev == 1 and rise_time_dt is None and dt_local.date() == d:
                    rise_time_dt = dt_local
                if ev == 0 and set_time_dt is None:
                    set_time_dt = dt_local

            if rise_time_dt and sunset_dt and rise_time_dt < sunset_dt:
                rise_time_dt = sunset_dt
            if set_time_dt and dawn and set_time_dt > dawn:
                set_time_dt = dawn

            if rise_time_dt and set_time_dt and set_time_dt <= rise_time_dt:
                rise_time_dt = None
                set_time_dt = None

            rise_time = rise_time_dt.strftime("%I:%M %p") if rise_time_dt else "N/A"
            set_time = set_time_dt.strftime("%I:%M %p") if set_time_dt else "N/A"

            mag_str = mag_map.get(name, "N/A")
            how_to_find = f"Look towards the {direction} ({round(az.degrees)}°). {name} is currently traveling through {constellation} and shines at Mag {mag_str}."

            results.append({
                "name": name,
                "altitude_deg": round(alt.degrees, 1),
                "azimuth_deg": round(az.degrees, 1),
                "direction": direction,
                "distance_au": round(dist.au, 3),
                "distance_mkm": dist_mkm,
                "light_time_minutes": light_time_min,
                "constellation": constellation,
                "visible_tonight": visible,
                "magnitude_approx": mag_str,
                "naked_eye": naked_eye,
                "emoji": _planet_emoji(name),
                "obs_time": obs_time.strftime("%I:%M %p"),
                "rise_time": rise_time or "N/A",
                "set_time": set_time or "N/A",
                "how_to_find": how_to_find,
            })
        except Exception as e:
            print(f"Error calculating planet {name}: {e}")

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


def get_constellation_window(abbr: str, dt: Optional[date] = None, lat=None, lon=None) -> dict:
    """Calculate constellation rise/culmination/set and best observing window."""
    file_path = os.path.join(os.path.dirname(__file__), '..', 'constellations_enriched.json')
    try:
        with open(file_path, 'r') as f:
            const_data = json.load(f)
    except Exception:
        return {"status": "Database error"}

    c = next((x for x in const_data if x["abbr"] == abbr), None)
    if not c:
        return {"status": "Constellation not found"}

    ts, eph = _get_skyfield()
    observer, observer_location = _get_observer(lat=lat, lon=lon)
    tz = _get_tz(lat, lon)
    d = dt or now_local(lat=lat, lon=lon).date()

    proxy = Star(ra_hours=c["ra"], dec_degrees=c["dec"])

    midnight = datetime(d.year, d.month, d.day, 0, 0, tzinfo=tz)
    t0 = ts.from_datetime(midnight)
    t1 = ts.from_datetime(midnight + timedelta(hours=36))

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

    t_now = _sf_time(now_local(lat=lat, lon=lon))
    astrometric_now = observer.at(t_now).observe(proxy)
    alt_now, az_now, _ = astrometric_now.apparent().altaz()

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
