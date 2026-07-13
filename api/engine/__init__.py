"""StarGazer engine package — split from monolithic engine.py."""

from .cache import _load_ai_cache, _save_ai_cache
from .skyfield import _get_skyfield, _get_observer, _get_tz, now_local, _sf_time, _tonight_window
from .moon import get_moon_info
from .planets import (
    PLANETS,
    get_planet_positions,
    _planet_emoji,
    _az_to_direction,
    get_constellation_window,
)
from config import SCORPIUS_TARGETS, NEARBY_TARGETS
from .targets import get_visible_targets
from .iss import get_iss_passes
from .meteors import get_meteor_showers
from .seeing import get_seeing_forecast
from .aurora import get_aurora_forecast
from .reports import (
    get_tonight_report,
    get_weekly_report,
    get_monthly_report,
    get_constellations,
    _rate_night,
)


__all__ = [
    "get_tonight_report",
    "get_weekly_report",
    "get_monthly_report",
    "get_moon_info",
    "get_planet_positions",
    "get_visible_targets",
    "get_iss_passes",
    "get_meteor_showers",
    "get_seeing_forecast",
    "get_aurora_forecast",

    "get_constellations",
    "get_constellation_window",
    "now_local",
    "SCORPIUS_TARGETS",
    "NEARBY_TARGETS",
    "_load_ai_cache",
    "_save_ai_cache",
    "_get_skyfield",
    "_get_observer",
    "_get_tz",
    "_sf_time",
    "_tonight_window",
    "PLANETS",
    "_planet_emoji",
    "_az_to_direction",
    "_rate_night",
]
