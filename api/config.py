"""
StarGazer Configuration
Base settings for the observation environment.
Values can be overridden using environment variables.
"""

import os
import json

# --- StarGazer Configuration ---
LATITUDE = float(os.getenv("LATITUDE", "40.0638"))
LONGITUDE = float(os.getenv("LONGITUDE", "-83.0457"))
BORTLE_CLASS = int(os.getenv("BORTLE_CLASS", "6"))
TELESCOPE_APERTURE_MM = int(os.getenv("TELESCOPE_APERTURE_MM", "130"))
ELEVATION_M = int(os.getenv("ELEVATION_M", "250"))
TIMEZONE = os.getenv("OBSERVER_TIMEZONE", "America/New_York")

# Network
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8181")

# AI Seeing Analysis
AI_API_URL  = os.getenv("AI_API_URL",   "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions")
AI_API_KEY  = os.getenv("AI_API_KEY",   "")
AI_MODEL    = os.getenv("AI_MODEL",     "gemini-2.5-flash")
FALLBACK_AI_API_URL = os.getenv("FALLBACK_AI_API_URL", "")
FALLBACK_AI_MODEL   = os.getenv("FALLBACK_AI_MODEL", "")
LOCAL_AI_URL        = os.getenv("LOCAL_AI_URL", "")   # e.g. http://10.27.27.145:8083/v1/chat/completions
LOCAL_AI_MODEL      = os.getenv("LOCAL_AI_MODEL", "") # e.g. /models/Qwen3.5-9B-Q5_K_M.gguf
AI_TIMEOUT          = int(os.getenv("AI_TIMEOUT", "60"))     # seconds — per-API timeout, fall back to rule-based on timeout


# Telescope defaults (can be overridden by environment variables)
TELESCOPE_FOCAL_MM = int(os.getenv("TELESCOPE_FOCAL_MM", "650"))
LIMITING_MAG = float(os.getenv("LIMITING_MAG", "12.5"))  # visual limiting magnitude

# Horizon constraints
# Objects below this altitude are generally blocked by local obstacles or atmosphere
MIN_ALTITUDE_DEG = int(os.getenv("MIN_ALTITUDE_DEG", "15"))

# Target Database
# Example curated targets for amateur telescopes
SCORPIUS_TARGETS = [
    {
        "id": "antares",
        "name": "Antares (α Scorpii)",
        "type": "Star — Red Supergiant",
        "ra_h": 16, "ra_m": 29, "ra_s": 24.4,
        "dec_d": -26, "dec_m": 25, "dec_s": 55,
        "magnitude": 1.06,
        "difficulty": "naked_eye",
        "bortle_min": 1,
        "eyepiece_rec": "Any — try 10mm for color contrast",
        "description": "The 'heart of the scorpion' — brilliant red-orange supergiant 700× the Sun's diameter. Gorgeous orange-red color, sometimes shows a slight disc at high power.",
        "emoji": "🔴",
        "season_peak": "July",
    },
    {
        "id": "m4",
        "name": "M4 (NGC 6121)",
        "type": "Globular Cluster",
        "ra_h": 16, "ra_m": 23, "ra_s": 35.2,
        "dec_d": -26, "dec_m": 31, "dec_s": 32,
        "magnitude": 5.6,
        "difficulty": "easy",
        "bortle_min": 4,
        "eyepiece_rec": "25mm (wide) → 10mm for resolution",
        "description": "One of the nearest globular clusters to Earth (~7,200 ly). Located just 1.3° west of Antares. Large, loose, and easily resolved into individual stars with your 5-inch. A bar of stars across the core is a unique feature.",
        "emoji": "✨",
        "season_peak": "July",
    },
    {
        "id": "m7",
        "name": "M7 — Ptolemy Cluster",
        "type": "Open Cluster",
        "ra_h": 17, "ra_m": 53, "ra_s": 51,
        "dec_d": -34, "dec_m": 47, "dec_s": 34,
        "magnitude": 3.3,
        "difficulty": "naked_eye",
        "bortle_min": 2,
        "eyepiece_rec": "25mm wide-field — or even binoculars",
        "description": "Ptolemy's Cluster — visible to the naked eye even from suburban Columbus on good nights. Huge, sprawling cluster of ~80 bright stars. Use your widest field eyepiece. Known since antiquity (~130 AD).",
        "emoji": "⭐",
        "season_peak": "August",
    },
    {
        "id": "graffias",
        "name": "Graffias (β Scorpii)",
        "type": "Double Star",
        "ra_h": 16, "ra_m": 5, "ra_s": 26.2,
        "dec_d": -19, "dec_m": 48, "dec_s": 20,
        "magnitude": 2.62,
        "difficulty": "easy",
        "bortle_min": 1,
        "eyepiece_rec": "10mm at ~65× — easy clean split",
        "description": "Beautiful double star at the scorpion's head. Easily split even at low magnification — blue-white primary with a companion. Actually a 6-star system! One of the finest doubles in the summer sky.",
        "emoji": "🔵",
        "season_peak": "July",
    }
]

# Nearby region — excellent Scorpius-area targets
NEARBY_TARGETS = [
    {
        "id": "m19",
        "name": "M19 (NGC 6273)",
        "type": "Globular Cluster",
        "ra_h": 17, "ra_m": 2, "ra_s": 37.7,
        "dec_d": -26, "dec_m": 16, "dec_s": 5,
        "magnitude": 6.8,
        "difficulty": "easy",
        "bortle_min": 5,
        "eyepiece_rec": "10mm",
        "description": "Ophiuchus globular just north of Scorpius border. One of the most oblate (flattened) globulars in the sky. Bright and rewarding through a 5-inch.",
        "emoji": "🌀",
    },
]

# Other major deep-sky targets for dynamic constellation tabs
# Loaded from data/targets.json
def _load_targets_json():
    path = os.path.join(os.path.dirname(__file__), "data", "targets.json")
    with open(path, "r") as f:
        return json.load(f)

OTHER_TARGETS = _load_targets_json()

# Telegram config (set via environment variables)
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# API Keys (all optional / free)
NASA_APOD_KEY = os.getenv("NASA_APOD_KEY", "DEMO_KEY")  # free tier

# Scheduling preferences
DAILY_ALERT_HOUR = 19    # 7pm local — before dark
WEEKLY_ALERT_DAY = 6     # Sunday (0=Monday)
WEEKLY_ALERT_HOUR = 20   # 8pm local
MONTHLY_ALERT_DAY = 1    # 1st of month
MONTHLY_ALERT_HOUR = 19  # 7pm local
ISS_CHECK_INTERVAL_MIN = 90  # check for ISS passes every 90 min
ISS_ALERT_ADVANCE_MIN = 30   # alert this many minutes before a pass
