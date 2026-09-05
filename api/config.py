"""
StarGazer Configuration
Base settings for the observation environment.
Values can be overridden using environment variables.
"""

import os
import json
from dotenv import load_dotenv

# Find and load .env from parent root or current directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()


# --- StarGazer Configuration ---
LATITUDE = float(os.getenv("LATITUDE", "19.8207"))
LONGITUDE = float(os.getenv("LONGITUDE", "-155.4681"))
TELESCOPE_APERTURE_MM = int(os.getenv("TELESCOPE_APERTURE_MM", "130"))
ELEVATION_M = int(os.getenv("ELEVATION_M", "4205"))
TIMEZONE = os.getenv("OBSERVER_TIMEZONE", "Pacific/Honolulu")

# Telescope defaults (can be overridden by environment variables)
TELESCOPE_FOCAL_MM = int(os.getenv("TELESCOPE_FOCAL_MM", "650"))
LIMITING_MAG = float(os.getenv("LIMITING_MAG", "12.5"))  # visual limiting magnitude

# Horizon constraints
MIN_ALTITUDE_DEG = int(os.getenv("MIN_ALTITUDE_DEG", "15"))

# Network
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8181")

# AI Seeing Analysis
AI_API_URL  = os.getenv("AI_API_URL",   "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions")
AI_API_KEY  = os.getenv("AI_API_KEY",   "")
AI_MODEL    = os.getenv("AI_MODEL",     "gemini-2.5-flash")
CF_ACCESS_CLIENT_ID = os.getenv("CF_ACCESS_CLIENT_ID", "")
CF_ACCESS_CLIENT_SECRET = os.getenv("CF_ACCESS_CLIENT_SECRET", "")
FALLBACK_AI_API_URL = os.getenv("FALLBACK_AI_API_URL", "")
FALLBACK_AI_API_KEY = os.getenv("FALLBACK_AI_API_KEY", "")
FALLBACK_AI_MODEL   = os.getenv("FALLBACK_AI_MODEL", "")
LOCAL_AI_URL        = os.getenv("LOCAL_AI_URL", "")   
LOCAL_AI_MODEL      = os.getenv("LOCAL_AI_MODEL", "") 
AI_TIMEOUT          = int(os.getenv("AI_TIMEOUT", "60"))     # seconds — per-API timeout, fall back to rule-based on timeout

# API Keys
NASA_APOD_KEY = os.getenv("NASA_APOD_KEY") or os.getenv("NASA_API_KEY", "DEMO_KEY")

# Target Database — loaded dynamically from data/targets.json
def _load_targets_json():
    path = os.path.join(os.path.dirname(__file__), "data", "targets.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

OTHER_TARGETS = _load_targets_json()
SCORPIUS_TARGETS = [t for t in OTHER_TARGETS if t.get("constellation") == "Sco"]
NEARBY_TARGETS = []

BORTLE_CLASS = int(os.getenv("BORTLE_CLASS", "4"))

# Scheduling preferences
DAILY_ALERT_HOUR = 19    # 7pm local — before dark
WEEKLY_ALERT_DAY = 6     # Sunday (0=Monday)
WEEKLY_ALERT_HOUR = 20   # 8pm local
MONTHLY_ALERT_DAY = 1    # 1st of month
MONTHLY_ALERT_HOUR = 19  # 7pm local
ISS_CHECK_INTERVAL_MIN = 90  # check for ISS passes every 90 min
ISS_ALERT_ADVANCE_MIN = 30   # alert this many minutes before a pass
