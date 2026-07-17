"""
StarGazer FastAPI — REST API for astronomy data
Serves tonight, weekly, monthly, and event reports.
"""

# Load .env file automatically — works for bare Python AND Docker
# (Docker's env_file: takes precedence, so this is safe in both cases)
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Query, Depends, HTTPException, Header, Request
from typing import Optional, Annotated
from pydantic import AfterValidator, BaseModel
from fastapi.responses import JSONResponse, PlainTextResponse
from contextlib import asynccontextmanager
import uvicorn
import os
from datetime import datetime
from zoneinfo import ZoneInfo
from urllib.parse import urlparse

from engine import (
    get_tonight_report,
    get_weekly_report,
    get_monthly_report,
    get_moon_info,
    get_planet_positions,
    get_visible_targets,
    get_iss_passes,
    get_meteor_showers,
    get_seeing_forecast,
    get_aurora_forecast,
    get_bortle_info,

    get_constellations,
    get_constellation_window,
    now_local,
    SCORPIUS_TARGETS,
    NEARBY_TARGETS,
)
from engine.cache import get_cache, set_cache
from engine.push import save_subscription, broadcast_notification, PUSH_AVAILABLE, VAPID_PUBLIC_KEY
from engine.scheduler import start_scheduler, stop_scheduler
from config import LATITUDE, LONGITUDE, BORTLE_CLASS, TELESCOPE_APERTURE_MM, ELEVATION_M
from fastapi import Request

def _is_allowed_origin(origin: str) -> bool:
    """Check if an origin is allowed to access the API."""
    if not origin:
        return False
    try:
        parsed = urlparse(origin)
        host = parsed.hostname or ""
    except Exception:
        return False

    # Production domain and subdomains
    if host == "stargazer.nick-t.net":
        return True
    if host.endswith(".nick-t.net"):
        return True

    # Localhost variants
    if host in ("localhost", "127.0.0.1"):
        return True
    if host.endswith(".local"):
        return True

    # Private IP ranges
    if host.startswith("10."):
        return True
    if host.startswith("192.168."):
        return True
    if host.startswith("172."):
        parts = host.split(".")
        if len(parts) >= 2:
            try:
                second_octet = int(parts[1])
                if 16 <= second_octet <= 31:
                    return True
            except ValueError:
                pass

    return False


def validate_latitude(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    if not (-90 <= value <= 90):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
    return value


def validate_longitude(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    if not (-180 <= value <= 180):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
    return value


async def verify_origin(request: Request):
    if request.url.path in ["/", "/health"]:
        return

    origin = request.headers.get("origin") or request.headers.get("referer", "")
    if not origin or not _is_allowed_origin(origin):
        raise HTTPException(status_code=403, detail="Unauthorized Origin.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start and stop the push notification scheduler."""
    start_scheduler(lat=float(LATITUDE), lon=float(LONGITUDE))
    yield
    stop_scheduler()


app = FastAPI(
    title="StarGazer API",
    description="Personal astronomy assistant and dashboard API",
    version="2.0.0",
    dependencies=[Depends(verify_origin)],
    lifespan=lifespan,
)


@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    """Add CORS headers for allowed origins."""
    response = await call_next(request)

    origin = request.headers.get("origin", "")
    if origin and _is_allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"

    # Cache-Control for API responses (5 min, matches server-side TTLs)
    if not request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "public, max-age=300"

    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print(f"Unhandled Exception: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "StarGazer API",
        "status": "online",
        "location": f"{LATITUDE}°N, {abs(LONGITUDE)}°W",
        "telescope": f"Telescope ({TELESCOPE_APERTURE_MM}mm)",
        "bortle": BORTLE_CLASS,
        "time": now_local().isoformat(),
        "endpoints": ["/tonight", "/weekly", "/monthly", "/scorpius",
                      "/moon", "/planets", "/iss", "/seeing",
                      "/targets", "/api/meteors"],
    }

@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Handle CORS preflight requests."""
    return JSONResponse(content={})


@app.get("/health")
def health():
    version = "v?.?.?"
    try:
        # First check parent dir (local dev), then same dir (Docker volume mount)
        pkg_path = os.path.join(os.path.dirname(__file__), "..", "package.json")
        if not os.path.exists(pkg_path):
            pkg_path = os.path.join(os.path.dirname(__file__), "package.json")
            
        with open(pkg_path, "r") as f:
            pkg_data = json.load(f)
            if "version" in pkg_data:
                version = f"v{pkg_data['version']}"
    except Exception:
        pass
    return {"status": "ok", "version": version}

# ── Dynamic API Proxies (NASA & SIMBAD) ──────────────────────────────────────

import urllib.request
import urllib.parse
import json

@app.get("/api/moon")
def get_moon():
    moon = get_moon_info()
    response = {
        "illumination_pct" : moon["illumination_pct"],
        "phase_name" : moon["phase_name"],
        "distance_km" : moon["distance_km"]
    }
    return response


@app.get("/api/asteroids")
def get_asteroids():
    cache_key = "nasa_asteroids"
    cached = get_cache(cache_key)
    if cached:
        return JSONResponse(content=cached)
    today = datetime.now(ZoneInfo("UTC")).strftime("%Y-%m-%d")
    api_key = os.getenv("NASA_APOD_KEY", os.getenv("NASA_API_KEY", "DEMO_KEY"))
    url = f"https://api.nasa.gov/neo/rest/v1/feed?start_date={today}&end_date={today}&api_key={api_key}"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:  # nosec B310
            data = json.loads(response.read().decode())
            
            neos = data.get("near_earth_objects", {}).get(today, [])
            
            # Sort by miss_distance ascending
            neos.sort(key=lambda x: float(x["close_approach_data"][0]["miss_distance"]["kilometers"]))
            
            results = []
            for neo in neos[:4]:
                results.append({
                    "name": neo["name"],
                    "diameter_m": round(neo["estimated_diameter"]["meters"]["estimated_diameter_max"], 1),
                    "miss_distance_km": round(float(neo["close_approach_data"][0]["miss_distance"]["kilometers"])),
                    "velocity_kmh": round(float(neo["close_approach_data"][0]["relative_velocity"]["kilometers_per_hour"])),
                    "is_hazardous": neo["is_potentially_hazardous_asteroid"]
                })
                
            set_cache(cache_key, results, ttl_seconds=43200) # 12 hours
            return JSONResponse(content=results)
    except Exception as e:
        print(f"Error fetching asteroids: {e}")
        return JSONResponse(content=[])

@app.get("/api/meteors")
def get_meteors(count: int = Query(5, ge=1, le=10)):
    """Upcoming major meteor showers with peak dates and Zenithal Hourly Rate."""
    try:
        return {"showers": get_meteor_showers(count=count)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/aurora")
def get_aurora(lat: Optional[float] = None):
    """Live aurora forecast based on NOAA Kp index."""
    try:
        use_lat = lat if lat is not None else float(LATITUDE)
        return get_aurora_forecast(lat=use_lat)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/bortle")
def get_bortle(
    lat: Annotated[Optional[float], AfterValidator(validate_latitude)] = Query(None),
    lon: Annotated[Optional[float], AfterValidator(validate_longitude)] = Query(None),
):
    """Estimate Bortle light pollution class from coordinates."""
    try:
        use_lat = lat if lat is not None else float(LATITUDE)
        use_lon = lon if lon is not None else float(LONGITUDE)
        return get_bortle_info(lat=use_lat, lon=use_lon)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ── Web Push Notifications ────────────────────────────────────────────────────

class PushSubscriptionRequest(BaseModel):
    endpoint: str
    expirationTime: Optional[float] = None
    keys: dict  # {"p256dh": "...", "auth": "..."}


@app.get("/api/push/vapid-key")
def get_vapid_key():
    """Return the VAPID public key for the frontend to use with pushManager.subscribe()."""
    if not VAPID_PUBLIC_KEY:
        return JSONResponse(status_code=503, content={"error": "VAPID not configured"})
    return {"publicKey": VAPID_PUBLIC_KEY}


@app.post("/api/push/subscribe")
async def push_subscribe(sub: PushSubscriptionRequest):
    """Store a browser PushSubscription for future notifications."""
    ok = save_subscription(sub.model_dump())
    if not ok:
        return JSONResponse(status_code=400, content={"error": "Invalid subscription"})
    return {"status": "subscribed"}


@app.post("/api/push/test")
async def push_test():
    """Send a test push to all subscriptions (useful for local verification)."""
    if not PUSH_AVAILABLE:
        return JSONResponse(status_code=503, content={"error": "VAPID not configured on server"})
    result = broadcast_notification(
        title="🌌 StarGazer Test Alert",
        body="Push notifications are working! You'll be notified about ISS passes, auroras, and clear skies.",
        url="/"
    )
    return result


@app.get("/api/star")
def get_star(name: Optional[str] = None, ra: Optional[float] = None, dec: Optional[float] = None):
    cache_key = f"star_{name}" if name else f"star_{ra}_{dec}"
    cached = get_cache(cache_key)
    if cached:
        return JSONResponse(content=cached)
        
    # Use modern SIMBAD TAP API via ADQL
    if name:
        query = f"SELECT main_id, sp_type, plx_value FROM basic WHERE ident = '{name}'"
    elif ra is not None and dec is not None:
        # Search within 2 arcmin (2/60 = 0.033 degrees)
        query = f"SELECT main_id, sp_type, plx_value FROM basic WHERE 1=CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', {ra}, {dec}, 0.033))"
    else:
        return JSONResponse(content={"error": "Must provide name or ra/dec"}, status_code=400)
        
    url = f"http://simbad.u-strasbg.fr/simbad/sim-tap/sync?request=doQuery&lang=adql&query={urllib.parse.quote(query)}&format=json"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:  # nosec B310
            data = json.loads(response.read().decode())
            
            if "data" in data and len(data["data"]) > 0:
                # Get the first closest match
                best_match = data["data"][0]
                main_id = best_match[0]
                sp_type = best_match[1] if best_match[1] else "Unknown"
                plx = best_match[2]
                
                # Calculate distance in lightyears from parallax (mas)
                distance_ly = "Unknown"
                if plx and float(plx) > 0:
                    try:
                        d_pc = 1000.0 / float(plx)
                        distance_ly = f"{round(d_pc * 3.262, 1)} ly"
                    except:
                        pass
                        
                result = {
                    "name": main_id,
                    "spectral_type": sp_type,
                    "distance_ly": distance_ly
                }
                set_cache(cache_key, result, ttl_seconds=604800) # 1 week
                return JSONResponse(content=result)
            else:
                return JSONResponse(content={"error": "Not found"}, status_code=404)
    except Exception as e:
        print(f"Simbad API error: {e}")
        return JSONResponse(content={"error": "API error"}, status_code=500)

# ── Tonight ───────────────────────────────────────────────────────────────────

@app.get("/constellations")
def get_constellations_endpoint(
    filter_famous: bool = Query(False),
    lat: Annotated[Optional[float], AfterValidator(validate_latitude)] = Query(None),
    lon: Annotated[Optional[float], AfterValidator(validate_longitude)] = Query(None),
):
    try:
        data = get_constellations(filter_famous=filter_famous, lat=lat, lon=lon)
        return {"constellations": data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/tonight")
def tonight(
    lat: Annotated[Optional[float], AfterValidator(validate_latitude)] = Query(None),
    lon: Annotated[Optional[float], AfterValidator(validate_longitude)] = Query(None),
    lang: str = Query("en"),
    bortle: Optional[int] = Query(None, ge=1, le=9),
):
    """Full tonight's observing report."""
    try:
        use_lat = lat if lat is not None else float(LATITUDE)
        use_lon = lon if lon is not None else float(LONGITUDE)
        return get_tonight_report(lat=use_lat, lon=use_lon, lang=lang, bortle=bortle)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ── Weekly ────────────────────────────────────────────────────────────────────

@app.get("/weekly")
def weekly(
    lat: Annotated[Optional[float], AfterValidator(validate_latitude)] = Query(None),
    lon: Annotated[Optional[float], AfterValidator(validate_longitude)] = Query(None),
):
    """7-day celestial event calendar."""
    try:
        return get_weekly_report(lat=lat, lon=lon)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ── Monthly ───────────────────────────────────────────────────────────────────

@app.get("/monthly")
def monthly(
    lat: Annotated[Optional[float], AfterValidator(validate_latitude)] = Query(None),
    lon: Annotated[Optional[float], AfterValidator(validate_longitude)] = Query(None),
):
    """Monthly preview of celestial events."""
    try:
        return get_monthly_report(lat=lat, lon=lon)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ── Individual Endpoints ──────────────────────────────────────────────────────



@app.get("/moon")
def moon(
    lat: Annotated[Optional[float], AfterValidator(validate_latitude)] = Query(None),
    lon: Annotated[Optional[float], AfterValidator(validate_longitude)] = Query(None),
):
    """Current moon phase and rise/set times."""
    try:
        return get_moon_info(lat=lat, lon=lon)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/planets")
def planets(
    lat: Annotated[Optional[float], AfterValidator(validate_latitude)] = Query(None),
    lon: Annotated[Optional[float], AfterValidator(validate_longitude)] = Query(None),
):
    """All planets with current altitude/azimuth."""
    try:
        return {"planets": get_planet_positions(lat=lat, lon=lon)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/iss")
def iss(
    count: int = Query(3),
    lat: Annotated[Optional[float], AfterValidator(validate_latitude)] = Query(None),
    lon: Annotated[Optional[float], AfterValidator(validate_longitude)] = Query(None),
):
    """Next ISS passes."""
    try:
        passes = get_iss_passes(count, lat=lat, lon=lon)
        loc_str = f"{lat}°N, {abs(lon)}°W" if lat and lon else f"{LATITUDE}°N, {abs(LONGITUDE)}°W"
        return {
            "location": loc_str,
            "passes": passes,
            "heavens_above": f"https://heavens-above.com/PassSummary.aspx?satid=25544&lat={lat or LATITUDE}&lng={lon or LONGITUDE}"
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/seeing")
def seeing(
    lat: Annotated[Optional[float], AfterValidator(validate_latitude)] = Query(None),
    lon: Annotated[Optional[float], AfterValidator(validate_longitude)] = Query(None),
):
    """Astronomical seeing forecast (cloud cover, wind, visibility) - Rule Based Only."""
    try:
        return get_seeing_forecast(lat=lat, lon=lon, ai_enabled=False)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/seeing/ai")
def seeing_ai(
    lat: Annotated[Optional[float], AfterValidator(validate_latitude)] = Query(None),
    lon: Annotated[Optional[float], AfterValidator(validate_longitude)] = Query(None),
    lang: str = Query("en"),
):
    """Astronomical seeing forecast - AI Analysis."""
    try:
        return get_seeing_forecast(lat=lat, lon=lon, ai_enabled=True, lang=lang)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/targets")
def targets(
    lat: Annotated[Optional[float], AfterValidator(validate_latitude)] = Query(None),
    lon: Annotated[Optional[float], AfterValidator(validate_longitude)] = Query(None),
    constellation: str = Query(default="Sco", description="Filter by constellation abbreviation"),
    visible_only: bool = Query(default=False, description="Only return currently visible targets"),
    type_filter: str = Query(default="all", description="Filter by type: all, globular, open, star, double, nebula"),
    bortle: Optional[int] = Query(None, ge=1, le=9, description="Bortle Class (1-9) for light pollution filtering"),
):
    """Full Target database filtered by constellation."""
    try:
        use_bortle = bortle if bortle is not None else BORTLE_CLASS
        all_targets = get_visible_targets(lat=lat, lon=lon, constellation=constellation, bortle=use_bortle)
        if visible_only:
            all_targets = [t for t in all_targets if t.get("visible")]
        if type_filter != "all":
            all_targets = [t for t in all_targets
                           if type_filter.lower() in t.get("type", "").lower()]
        return {
            "total": len(all_targets),
            "bortle": BORTLE_CLASS,
            "limiting_mag": 12.5,
            "targets": all_targets,
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# ── Run ───────────────────────────────────────────────────────────────────────

@app.get("/constellation_window")
def constellation_window(
    abbr: str,
    lat: Annotated[Optional[float], AfterValidator(validate_latitude)] = Query(None),
    lon: Annotated[Optional[float], AfterValidator(validate_longitude)] = Query(None),
):
    try:
        return get_constellation_window(abbr=abbr, lat=lat, lon=lon)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8181, reload=False)
