"""
StarGazer FastAPI — REST API for astronomy data
Serves tonight, weekly, monthly, and event reports.
"""

# Load .env file automatically — works for bare Python AND Docker
# (Docker's env_file: takes precedence, so this is safe in both cases)
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
import uvicorn
from datetime import datetime
from zoneinfo import ZoneInfo

from engine import (
    get_tonight_report, get_weekly_report, get_monthly_report,
    get_moon_info, get_planet_positions, get_scorpius_window,
    get_visible_targets, get_iss_passes, get_seeing_forecast,
    format_tonight_telegram, format_weekly_telegram, format_monthly_telegram,
    now_local, SCORPIUS_TARGETS, NEARBY_TARGETS,
)
from config import LATITUDE, LONGITUDE, BORTLE_CLASS, TELESCOPE_APERTURE_MM

app = FastAPI(
    title="StarGazer API",
    description="Personal astronomy assistant for Columbus, OH — Celestron 5\" DX",
    version="1.0.0",
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

@app.get("/tonight")
def tonight():
    """Full tonight's observing report."""
    try:
        return get_tonight_report()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/tonight/telegram")
def tonight_telegram():
    """Tonight's report formatted as Telegram markdown message."""
    try:
        report = get_tonight_report()
        return PlainTextResponse(format_tonight_telegram(report))
    except Exception as e:
        return PlainTextResponse(f"❌ Error: {str(e)}")

# ── Weekly ────────────────────────────────────────────────────────────────────

@app.get("/weekly")
def weekly():
    """7-day celestial event calendar."""
    try:
        return get_weekly_report()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/weekly/telegram")
def weekly_telegram():
    """Weekly report formatted as Telegram markdown message."""
    try:
        report = get_weekly_report()
        return PlainTextResponse(format_weekly_telegram(report))
    except Exception as e:
        return PlainTextResponse(f"❌ Error: {str(e)}")

# ── Monthly ───────────────────────────────────────────────────────────────────

@app.get("/monthly")
def monthly():
    """Monthly preview of celestial events."""
    try:
        return get_monthly_report()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/monthly/telegram")
def monthly_telegram():
    """Monthly report formatted as Telegram markdown message."""
    try:
        report = get_monthly_report()
        return PlainTextResponse(format_monthly_telegram(report))
    except Exception as e:
        return PlainTextResponse(f"❌ Error: {str(e)}")

# ── Individual Endpoints ──────────────────────────────────────────────────────

@app.get("/scorpius")
def scorpius():
    """Scorpius visibility window and current status."""
    try:
        window = get_scorpius_window()
        targets = [t for t in get_visible_targets() if t.get("visible")]
        return {
            "window": window,
            "visible_targets": targets,
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/moon")
def moon():
    """Current moon phase and rise/set times."""
    try:
        return get_moon_info()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/planets")
def planets():
    """All planets with current altitude/azimuth."""
    try:
        return {"planets": get_planet_positions()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/iss")
def iss(count: int = Query(default=3, ge=1, le=10)):
    """Next ISS visible passes over Columbus."""
    try:
        passes = get_iss_passes(count=count)
        return {
            "location": f"Columbus OH ({LATITUDE}°N, {abs(LONGITUDE)}°W)",
            "passes": passes,
            "heavens_above": f"https://www.heavens-above.com/PassSummary.aspx?lat={LATITUDE}&lng={LONGITUDE}&loc=Columbus&alt=240&tz=ET",
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/seeing")
def seeing():
    """Astronomical seeing forecast (cloud cover, wind, visibility)."""
    try:
        return get_seeing_forecast()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/targets")
def targets(
    visible_only: bool = Query(default=False, description="Only return currently visible targets"),
    type_filter: str = Query(default="all", description="Filter by type: all, globular, open, star, double, nebula")
):
    """Full Scorpius DSO target database."""
    try:
        all_targets = get_visible_targets()
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8181, reload=False)
