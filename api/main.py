"""
StarGazer FastAPI — REST API for astronomy data
Serves tonight, weekly, monthly, and event reports.
"""

# Load .env file automatically — works for bare Python AND Docker
# (Docker's env_file: takes precedence, so this is safe in both cases)
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Query, Depends, HTTPException, Header
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
import uvicorn
from datetime import datetime
from zoneinfo import ZoneInfo

from engine import (
    get_tonight_report,
    get_weekly_report,
    get_monthly_report,
    get_moon_info,
    get_planet_positions,
    get_visible_targets,
    get_iss_passes,
    get_seeing_forecast,
    format_tonight_telegram,
    format_weekly_telegram,
    format_monthly_telegram,
    get_constellations,
    get_constellation_window,
    now_local,
    SCORPIUS_TARGETS,
    NEARBY_TARGETS,
)
from config import LATITUDE, LONGITUDE, BORTLE_CLASS, TELESCOPE_APERTURE_MM, ELEVATION_M
import re
from fastapi import Request

async def verify_origin(request: Request):
    if request.url.path in ["/", "/health"]:
        return
        
    origin = request.headers.get("origin") or request.headers.get("referer", "")
    if not origin:
        raise HTTPException(status_code=403, detail="Direct API access is blocked.")
        
    allowed_domains = ["stargazer.nick-t.net", "localhost", "127.0.0.1", "10.", "192.168.", ".local"]
    
    if any(domain in origin for domain in allowed_domains):
        return
        
    # Check for other private IPs like 172.16.x.x
    if re.search(r"https?://(?:172\.(?:1[6-9]|2[0-9]|3[0-1])\.)", origin):
        return
        
    raise HTTPException(status_code=403, detail="Unauthorized Origin.")

app = FastAPI(
    title="StarGazer API",
    description="Personal astronomy assistant for Columbus, OH — Celestron 5\" DX",
    version="1.0.0",
    dependencies=[Depends(verify_origin)]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "StarGazer API",
        "status": "online",
        "location": f"{LATITUDE}°N, {abs(LONGITUDE)}°W — Columbus, OH",
        "telescope": f"Celestron StarSense Explorer 5\" DX ({TELESCOPE_APERTURE_MM}mm)",
        "bortle": BORTLE_CLASS,
        "time": now_local().isoformat(),
        "endpoints": ["/tonight", "/weekly", "/monthly", "/scorpius",
                      "/moon", "/planets", "/iss", "/seeing",
                      "/targets", "/tonight/telegram", "/weekly/telegram", "/monthly/telegram"],
    }

@app.get("/health")
def health():
    return {"status": "ok", "time": now_local().isoformat()}

# ── Tonight ───────────────────────────────────────────────────────────────────

@app.get("/constellations")
def get_constellations_endpoint(lat: Optional[float] = None, lon: Optional[float] = None):
    try:
        data = get_constellations(lat=lat, lon=lon)
        return {"constellations": data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/tonight")
def tonight(lat: Optional[float] = Query(None), lon: Optional[float] = Query(None), lang: Optional[str] = Query("en")):
    """Full tonight's observing report."""
    try:
        return get_tonight_report(lat=lat, lon=lon, lang=lang)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/tonight/telegram")
def tonight_telegram(lat: Optional[float] = Query(None), lon: Optional[float] = Query(None)):
    """Tonight's report formatted as Telegram markdown message."""
    try:
        report = get_tonight_report(lat=lat, lon=lon)
        return PlainTextResponse(format_tonight_telegram(report))
    except Exception as e:
        return PlainTextResponse(f"❌ Error: {str(e)}")

# ── Weekly ────────────────────────────────────────────────────────────────────

@app.get("/weekly")
def weekly(lat: Optional[float] = Query(None), lon: Optional[float] = Query(None)):
    """7-day celestial event calendar."""
    try:
        return get_weekly_report(lat=lat, lon=lon)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/weekly/telegram")
def weekly_telegram(lat: Optional[float] = Query(None), lon: Optional[float] = Query(None)):
    """Weekly report formatted as Telegram markdown message."""
    try:
        report = get_weekly_report(lat=lat, lon=lon)
        return PlainTextResponse(format_weekly_telegram(report))
    except Exception as e:
        return PlainTextResponse(f"❌ Error: {str(e)}")

# ── Monthly ───────────────────────────────────────────────────────────────────

@app.get("/monthly")
def monthly(lat: Optional[float] = Query(None), lon: Optional[float] = Query(None)):
    """Monthly preview of celestial events."""
    try:
        return get_monthly_report(lat=lat, lon=lon)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/monthly/telegram")
def monthly_telegram(lat: Optional[float] = Query(None), lon: Optional[float] = Query(None)):
    """Monthly report formatted as Telegram markdown message."""
    try:
        report = get_monthly_report(lat=lat, lon=lon)
        return PlainTextResponse(format_monthly_telegram(report))
    except Exception as e:
        return PlainTextResponse(f"❌ Error: {str(e)}")

# ── Individual Endpoints ──────────────────────────────────────────────────────



@app.get("/moon")
def moon(lat: Optional[float] = Query(None), lon: Optional[float] = Query(None)):
    """Current moon phase and rise/set times."""
    try:
        return get_moon_info(lat=lat, lon=lon)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/planets")
def planets(lat: Optional[float] = Query(None), lon: Optional[float] = Query(None)):
    """All planets with current altitude/azimuth."""
    try:
        return {"planets": get_planet_positions(lat=lat, lon=lon)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/iss")
def iss(count: int = Query(3), lat: Optional[float] = Query(None), lon: Optional[float] = Query(None)):
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
def seeing(lat: Optional[float] = Query(None), lon: Optional[float] = Query(None)):
    """Astronomical seeing forecast (cloud cover, wind, visibility) - Rule Based Only."""
    try:
        return get_seeing_forecast(lat=lat, lon=lon, ai_enabled=False)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/seeing/ai")
def seeing_ai(lat: Optional[float] = Query(None), lon: Optional[float] = Query(None), lang: Optional[str] = Query("en")):
    """Astronomical seeing forecast - AI Analysis."""
    try:
        return get_seeing_forecast(lat=lat, lon=lon, ai_enabled=True, lang=lang)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/targets")
def targets(
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    constellation: str = Query(default="Sco", description="Filter by constellation abbreviation"),
    visible_only: bool = Query(default=False, description="Only return currently visible targets"),
    type_filter: str = Query(default="all", description="Filter by type: all, globular, open, star, double, nebula")
):
    """Full Target database filtered by constellation."""
    try:
        all_targets = get_visible_targets(lat=lat, lon=lon, constellation=constellation)
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
def constellation_window(abbr: str, lat: Optional[float] = None, lon: Optional[float] = None):
    try:
        return get_constellation_window(abbr=abbr, lat=lat, lon=lon)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8181, reload=False)
