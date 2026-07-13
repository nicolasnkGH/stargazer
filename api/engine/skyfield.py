"""Skyfield ephemeris setup and time utilities."""

from __future__ import annotations

import functools
import os
from datetime import date, datetime, timedelta
from typing import Optional, Tuple

from config import ELEVATION_M, LATITUDE, LONGITUDE, TIMEZONE
from skyfield.api import N, W, wgs84
from skyfield.api import Loader
from skyfield import almanac
from zoneinfo import ZoneInfo

_ts = None
_eph = None
_loader = None


def _get_skyfield():
    global _ts, _eph, _loader
    if _loader is None:
        _loader = Loader(os.path.expanduser("~/.skyfield"))
    if _ts is None:
        _ts = _loader.timescale()
    if _eph is None:
        _eph = _loader("de421.bsp")
    return _ts, _eph


def _get_observer(lat=None, lon=None):
    _, eph = _get_skyfield()
    use_lat = lat if lat is not None else LATITUDE
    use_lon = lon if lon is not None else LONGITUDE
    observer_location = wgs84.latlon(use_lat * N, abs(use_lon) * W, elevation_m=ELEVATION_M)
    return eph["earth"] + observer_location, observer_location


@functools.lru_cache(maxsize=128)
def _get_tz(lat=None, lon=None) -> ZoneInfo:
    if lat is None or lon is None:
        return ZoneInfo(TIMEZONE)
    try:
        from timezonefinder import TimezoneFinder
        tf = TimezoneFinder()
        tz_str = tf.timezone_at(lng=lon, lat=lat)
        if tz_str:
            return ZoneInfo(tz_str)
    except Exception:
        pass
    return ZoneInfo(TIMEZONE)


def now_local(lat=None, lon=None) -> datetime:
    """Return the current time in the appropriate timezone."""
    return datetime.now(_get_tz(lat, lon))


def _sf_time(dt: datetime):
    ts, _ = _get_skyfield()
    return ts.from_datetime(dt.astimezone(ZoneInfo("UTC")))


def _tonight_window(dt: Optional[date] = None, lat=None, lon=None) -> tuple[datetime, datetime]:
    """Return (astronomical_dusk, astronomical_dawn) for the given date."""
    tz = _get_tz(lat, lon)
    d = dt or now_local(lat=lat, lon=lon).date()
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

def get_twilight_timeline(lat=None, lon=None) -> dict:
    """Return sunrise, sunset, astro_start, and astro_end times for tonight."""
    tz = _get_tz(lat, lon)
    d = now_local(lat=lat, lon=lon).date()
    ts, eph = _get_skyfield()
    _, observer_location = _get_observer(lat=lat, lon=lon)

    # From noon today to noon tomorrow
    midnight = datetime(d.year, d.month, d.day, 12, 0, tzinfo=tz)
    t0 = ts.from_datetime(midnight)
    t1 = ts.from_datetime(midnight + timedelta(hours=24))

    f = almanac.dark_twilight_day(eph, observer_location)
    times, events = almanac.find_discrete(t0, t1, f)

    timeline = {
        "sunset": None,
        "astro_start": None,
        "astro_end": None,
        "sunrise": None,
    }

    for t, e in zip(times, events):
        dt_local = t.utc_datetime().replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)
        if e == 3 and dt_local.hour > 12: # Day to Civil (Sunset)
            timeline["sunset"] = dt_local.strftime("%H:%M")
        elif e == 0 and dt_local.hour > 12: # Astro to Dark (Astro twilight ends)
            timeline["astro_start"] = dt_local.strftime("%H:%M")
        elif e == 1 and dt_local.hour < 12: # Dark to Astro (Astro twilight starts morning)
            timeline["astro_end"] = dt_local.strftime("%H:%M")
        elif e == 4 and dt_local.hour < 12: # Civil to Day (Sunrise)
            timeline["sunrise"] = dt_local.strftime("%H:%M")

    return timeline
