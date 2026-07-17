"""
Bortle scale estimation from geographic coordinates.

Strategy (in order of priority):
  1. Nominatim reverse-geocode → settlement type (city/town/village/hamlet/county)
     + population field when available
  2. Distance-weighted interpolation from a curated city database as sanity-check
     / blending layer
  3. Latitude heuristic as final fallback (no network)

Results are cached in Redis for 24 hours.
"""

import json
import math
import os
import logging

import requests

from .cache import get_cache, set_cache

logger = logging.getLogger(__name__)

# ── Bortle scale reference data ───────────────────────────────────────────────

_BORTLE_SCALE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "bortle_scale.json"
)


def _load_bortle_scale() -> list[dict]:
    with open(_BORTLE_SCALE_PATH, "r") as f:
        return json.load(f)


# ── Settlement type → Bortle mapping ─────────────────────────────────────────
#
# Nominatim addresstype values and their typical Bortle ranges.
# Refined further by population when available.

_ADDRESSTYPE_BASE: dict[str, int] = {
    # Dense urban
    "city": 8,          # handled separately below (defers to reference)
    "borough": 8,
    "suburb": 7,        # handled separately: suburb-of-named-city → 8
    "neighbourhood": 7,
    # Semi-urban
    "town": 6,
    # Semi-rural
    "village": 4,
    "quarter": 5,
    # Rural / open country
    "hamlet": 3,
    "isolated_dwelling": 2,
    "farm": 2,
    "county": 3,          # US: Nominatim returns county for open countryside
    # Note: 'municipality', 'state_district', 'state', 'country' are intentionally
    # omitted — they are too coarse (Brazil's municipalities cover everything from
    # tiny villages to São Paulo). These fall through to reference interpolation.
}

# Population breakpoints → Bortle offset adjustment
# Used when population tag is present in the Nominatim address
def _pop_to_bortle(population: int) -> int:
    """Map raw population to a Bortle class estimate."""
    if population >= 1_000_000:
        return 9
    if population >= 500_000:
        return 8
    if population >= 100_000:
        return 7
    if population >= 50_000:
        return 7
    if population >= 10_000:
        return 6
    if population >= 2_000:
        return 5
    if population >= 500:
        return 4
    if population >= 100:
        return 3
    return 2


# ── Nominatim lookup ──────────────────────────────────────────────────────────

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
_HEADERS = {"User-Agent": "StarGazer/2.7 (astronomy-dashboard; contact=admin@stargazer.nick-t.net)"}


def _fetch_bortle_from_nominatim(lat: float, lon: float) -> int | None:
    """
    Query Nominatim reverse-geocode for settlement type and derive Bortle class.
    Returns an integer 1-9, or None on failure.
    """
    try:
        r = requests.get(
            _NOMINATIM_URL,
            params={"lat": lat, "lon": lon, "format": "json", "zoom": 10},
            headers=_HEADERS,
            timeout=8,
        )
        r.raise_for_status()
        data = r.json()

        addresstype = data.get("addresstype", "")
        addr = data.get("address", {})

        # --- 1. Try population-based estimate (most accurate when available) ---
        pop_str = (
            addr.get("population")
            or data.get("extratags", {}).get("population")
        )
        if pop_str:
            try:
                pop = int(str(pop_str).replace(",", "").replace(".", ""))
                pop_bortle = _pop_to_bortle(pop)
                logger.debug(
                    f"Bortle from population ({pop:,}): {pop_bortle} "
                    f"at ({lat:.2f}, {lon:.2f})"
                )
                return pop_bortle
            except (ValueError, TypeError):
                pass

        # --- 2. Derive from addresstype + address context ---
        # Special case: suburb addresstype but inside a major city (e.g. Manhattan → NYC)
        # Nominatim sets addresstype=suburb for NYC boroughs/neighborhoods
        if addresstype == "suburb" and addr.get("city"):
            # We're a suburb of a named city — treat as city-level light pollution
            bortle = _ADDRESSTYPE_BASE.get("city", 8)
            logger.debug(
                f"Bortle: suburb of {addr['city']!r} → city-level {bortle} "
                f"at ({lat:.2f}, {lon:.2f})"
            )
            return bortle

        # Special case: addresstype=city but city name contains 'township' / 'bureau' /
        # 'civil' / 'precinct' → US census-designated place, not a real urban center.
        # Fall through to reference-point estimate (return None) for these.
        if addresstype == "city":
            city_name = (addr.get("city") or "").lower()
            pseudo_city_keywords = ("township", "civil", "charter", "precinct", "bureau", "census")
            if any(k in city_name for k in pseudo_city_keywords):
                logger.debug(
                    f"Nominatim: pseudo-city {city_name!r} — deferring to reference estimate"
                )
                return None
            # For real cities without a population figure, return None so the
            # reference-point blending can be more precise (city size varies hugely).
            logger.debug(
                f"Nominatim: real city {city_name!r} but no population — deferring to reference blend"
            )
            return None

        bortle = _ADDRESSTYPE_BASE.get(addresstype)
        if bortle is not None:
            logger.debug(
                f"Bortle from addresstype ({addresstype!r}): {bortle} "
                f"at ({lat:.2f}, {lon:.2f})"
            )
            return bortle

        logger.debug(
            f"Nominatim: unknown addresstype {addresstype!r}, addr={addr}"
        )

    except Exception as e:
        logger.warning(f"Nominatim Bortle lookup failed: {e}")

    return None


# ── City-distance fallback ────────────────────────────────────────────────────

# Curated reference points with verified Bortle classes.
# Format: (name, lat, lon, bortle_class)
_REFERENCE_POINTS = [
    # ── Europe ──
    ("London UK",              51.51,    -0.13,   9),
    ("Paris France",           48.86,     2.35,   9),
    ("Berlin Germany",         52.52,    13.40,   8),
    ("Madrid Spain",           40.42,    -3.70,   8),
    ("Rome Italy",             41.90,    12.49,   8),
    ("Amsterdam Netherlands",  52.37,     4.90,   8),
    ("Munich Germany",         48.14,    11.58,   7),
    ("Glasgow Scotland",       55.86,    -4.25,   7),
    ("Rural Scotland",         57.50,    -4.50,   2),
    ("Rural Norway",           68.00,    15.00,   2),
    ("Rural Sweden",           64.00,    17.00,   2),
    ("Rural Iceland",          65.00,   -19.00,   1),
    ("Rural Spain",            40.00,    -5.00,   3),
    ("Rural France",           45.00,     2.00,   3),
    ("Rural Germany",          50.00,    11.00,   4),
    ("Rural Poland",           52.00,    20.00,   4),
    ("Rural Ireland",          53.50,    -8.00,   3),
    # ── Canada ──
    ("Toronto Canada",         43.65,   -79.38,   8),
    ("Vancouver Canada",       49.28,  -123.12,   7),
    ("Montreal Canada",        45.51,   -73.55,   8),
    ("Rural BC Canada",        54.00,  -124.00,   2),
    ("Rural Ontario Canada",   50.00,   -85.00,   2),
    # ── Australia ──
    ("Sydney Australia",      -33.87,   151.21,   8),
    ("Melbourne Australia",   -37.81,   144.96,   8),
    ("Rural Australia",       -25.00,   135.00,   2),
    # ── South America ──
    ("São Paulo Brazil",      -23.55,   -46.63,   9),
    ("Buenos Aires",          -34.61,   -58.38,   9),
    ("Santiago Chile",        -33.45,   -70.67,   8),
    ("Atacama Desert Chile",  -23.00,   -67.50,   1),
    ("Rural Brazil",          -10.00,   -55.00,   2),
    # Brazil — medium cities and rural SE
    ("Rio de Janeiro city",   -22.91,   -43.17,   9),
    ("Campinas SP",           -22.91,   -47.06,   7),
    ("Belo Horizonte MG",     -19.92,   -43.94,   8),
    ("Curitiba PR",           -25.43,   -49.27,   7),
    ("Florianopolis SC",      -27.60,   -48.55,   6),
    ("Nova Friburgo RJ",      -22.28,   -42.53,   5),  # mountain city, Atlantic Forest
    ("Petropolis RJ",         -22.51,   -43.17,   6),
    ("Rural Minas Gerais",    -18.00,   -46.00,   3),
    ("Rural Goias",           -15.00,   -49.00,   3),
    ("Rural Mato Grosso",     -13.00,   -56.00,   2),
    ("Rural Para",             -4.00,   -53.00,   2),
    ("Rural Parana",          -24.50,   -52.00,   4),
    ("Rural RJ interior",     -22.00,   -43.50,   4),
    # ── Asia ──
    ("Tokyo Japan",            35.68,   139.69,   9),
    ("Beijing China",          39.91,   116.39,   9),
    ("Mumbai India",           19.08,    72.88,   9),
    ("Rural China",            40.00,   105.00,   3),
    ("Rural India",            23.00,    80.00,   4),
    # ── Africa ──
    ("Cairo Egypt",            30.05,    31.24,   8),
    ("Johannesburg SA",       -26.20,    28.04,   8),
    ("Rural Namibia",         -22.00,    17.00,   1),  # Namib Desert
    ("Rural Morocco",          32.00,    -5.50,   3),
    # ── US cities (existing, kept) ──
    ("Mauna Kea, HI",         19.82, -155.47,  1),
    ("White Sands NM",        32.39, -106.47,  2),
    ("Flagstaff AZ",          35.19, -111.65,  2),
    ("Cherry Springs SP PA",  41.66,  -77.82,  2),
    ("Bryce Canyon UT",       37.64, -112.17,  2),
    ("Big Bend TX",           29.25, -103.25,  2),
    ("Rural Wyoming",         43.00, -107.50,  2),
    ("Rural Nevada",          39.50, -117.00,  2),
    ("Rural Montana",         46.88, -110.36,  3),
    ("Rural New Mexico",      34.90, -106.90,  2),
    ("Rural Utah",            39.30, -111.20,  2),
    ("Rural Colorado",        38.50, -107.00,  3),
    ("Rural Idaho",           44.50, -115.50,  2),
    ("Rural Arizona",         33.50, -111.50,  3),
    ("Rural Alaska",          64.00, -150.00,  1),
    ("Rural Hawaii",          20.00, -155.50,  2),
    ("Rural Maine",           45.00,  -69.00,  4),
    ("Rural Vermont",         44.00,  -72.50,  4),
    ("Rural Washington",      47.00, -120.50,  3),
    ("Rural Texas",           31.00, -100.50,  4),
    ("Rural Oklahoma",        35.50,  -98.00,  5),
    ("Rural Missouri",        37.50,  -93.50,  5),
    ("Rural Kentucky",        37.00,  -85.00,  5),
    ("Rural Tennessee",       35.50,  -86.50,  5),
    ("Rural Ohio",            40.30,  -82.90,  4),
    ("Rural NC",              35.80,  -79.00,  5),
    ("Rural Virginia",        38.00,  -78.50,  5),
    ("Rural Pennsylvania",    41.00,  -77.50,  6),
    # Small/medium cities
    ("Flagstaff AZ city",     35.19, -111.65,  5),
    ("Denver CO",             39.74, -104.99,  6),
    ("Minneapolis MN",        44.98,  -93.27,  6),
    ("Portland OR",           45.52, -122.68,  6),
    ("Columbus OH",           40.06,  -83.04,  6),
    # Major cities
    ("Phoenix AZ",            33.45, -112.07,  7),
    ("Seattle WA",            47.61, -122.33,  7),
    ("Atlanta GA",            33.75,  -84.39,  7),
    ("Cleveland OH",          41.50,  -81.69,  7),
    ("Miami FL",              25.76,  -80.19,  8),
    ("Boston MA",             42.36,  -71.06,  8),
    ("Houston TX",            29.76,  -95.37,  8),
    ("Chicago IL",            41.88,  -87.63,  8),
    ("Dallas TX",             32.78,  -96.80,  8),
    ("San Francisco CA",      37.77, -122.42,  8),
    ("San Diego CA",          32.56, -117.05,  8),
    ("Los Angeles CA",        34.05, -118.24,  9),
    ("New York NY",           40.71,  -74.01,  9),
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _estimate_bortle_from_references(lat: float, lon: float) -> int:
    """Distance-weighted Bortle estimate from curated reference points."""
    candidates = []
    for _name, r_lat, r_lon, r_bortle in _REFERENCE_POINTS:
        dist = _haversine_km(lat, lon, r_lat, r_lon)
        if dist < 600:
            candidates.append((dist, r_bortle))

    if not candidates:
        # Latitude heuristic: polar/subpolar regions tend to be darker
        abs_lat = abs(lat)
        if abs_lat >= 65:
            return 2
        elif abs_lat >= 55:
            return 3
        elif abs_lat >= 45:
            return 4
        elif abs_lat >= 30:
            return 5
        return 6

    # Inverse-distance weighted average, with stronger weight for nearby points
    total_w = 0.0
    weighted_sum = 0.0
    for dist, bortle in candidates:
        w = 1.0 / (dist + 0.5) ** 1.5  # steeper falloff than before
        weighted_sum += bortle * w
        total_w += w

    return max(1, min(9, round(weighted_sum / total_w)))


# ── Public API ────────────────────────────────────────────────────────────────

def get_bortle_class(lat: float, lon: float) -> int:
    """
    Return Bortle class (1-9) for given coordinates.

    Tries Nominatim settlement-type lookup first (most accurate, free),
    then falls back to distance-weighted reference-point interpolation.
    Results are cached for 24 hours.
    """
    cache_key = f"bortle_{round(lat, 2)}_{round(lon, 2)}"
    cached = get_cache(cache_key)
    if cached is not None:
        return int(cached)

    # Primary: Nominatim settlement type
    bortle = _fetch_bortle_from_nominatim(lat, lon)

    # Nominatim returned something useful — use it as primary truth,
    # but nudge it 1 step toward the reference if they disagree significantly.
    # This avoids the 50/50 average destroying accuracy in data-sparse regions.
    if bortle is not None:
        ref_estimate = _estimate_bortle_from_references(lat, lon)
        diff = ref_estimate - bortle
        if abs(diff) > 3:
            # Big discrepancy: nudge 1 step toward reference, don't average fully
            bortle += 1 if diff > 0 else -1
            logger.debug(
                f"Bortle nudged 1 toward reference (nominatim={bortle}, ref={ref_estimate}) "
                f"at ({lat:.2f}, {lon:.2f})"
            )
        # If diff <= 3: trust Nominatim completely
        logger.info(f"Bortle final (nominatim-led): {bortle} at ({lat:.2f}, {lon:.2f})")
    else:
        # Fallback: reference-point interpolation
        bortle = _estimate_bortle_from_references(lat, lon)
        logger.info(f"Bortle fallback (reference): {bortle} at ({lat:.2f}, {lon:.2f})")

    bortle = max(1, min(9, bortle))
    set_cache(cache_key, bortle, ttl_seconds=86400)  # 24h
    return bortle


def get_bortle_info(lat: float, lon: float) -> dict:
    """Return full Bortle info dict including name, description, and magnitude limit."""
    bortle = get_bortle_class(lat, lon)
    scale = _load_bortle_scale()
    entry = next((e for e in scale if e["class"] == bortle), scale[4])
    return {
        "bortle": bortle,
        "lat": round(lat, 4),
        "lon": round(lon, 4),
        "name": entry["name"],
        "description": entry["description"],
        "magnitude_limit": entry["mag_limit"],
    }
