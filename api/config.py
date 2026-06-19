"""
StarGazer Configuration
Columbus, OH — Celestron StarSense Explorer 5" DX
South-facing 3rd floor porch
"""

# Observer location
LATITUDE = 40.126   # Columbus, OH (7099 Sawmill Village Dr)
LONGITUDE = -83.037
ELEVATION_M = 240   # meters above sea level
TIMEZONE = "America/New_York"

# Telescope
TELESCOPE_APERTURE_MM = 130
TELESCOPE_FOCAL_MM = 650
BORTLE_CLASS = 8     # Columbus suburban sky
LIMITING_MAG = 12.5  # visual limiting magnitude

# Horizon constraint — south-facing porch
# Objects below this altitude are blocked
MIN_ALTITUDE_DEG = 5
SOUTH_FACING_BEST_AZ_MIN = 135  # SE
SOUTH_FACING_BEST_AZ_MAX = 225  # SW

# Scorpius DSO Target Database
# Curated for 5" aperture under Bortle 7-8 skies
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
        "id": "m80",
        "name": "M80 (NGC 6093)",
        "type": "Globular Cluster",
        "ra_h": 16, "ra_m": 17, "ra_s": 2.4,
        "dec_d": -22, "dec_m": 58, "dec_s": 34,
        "magnitude": 7.3,
        "difficulty": "easy",
        "bortle_min": 5,
        "eyepiece_rec": "10mm at ~65× — compact bright core",
        "description": "Compact, bright globular halfway between Antares and Graffias. Dense core that looks almost star-like at low power but resolves at medium magnification. One of the most densely packed globulars in the sky.",
        "emoji": "💫",
        "season_peak": "July",
    },
    {
        "id": "m6",
        "name": "M6 — Butterfly Cluster",
        "type": "Open Cluster",
        "ra_h": 17, "ra_m": 40, "ra_s": 20,
        "dec_d": -32, "dec_m": 15, "dec_s": 12,
        "magnitude": 4.2,
        "difficulty": "easy",
        "bortle_min": 3,
        "eyepiece_rec": "25mm — cluster fills the field beautifully",
        "description": "The 'Butterfly Cluster' near the scorpion's tail. At low power, the star arrangement clearly resembles a butterfly in flight. Over 80 stars. One of the most photogenic open clusters in the summer sky.",
        "emoji": "🦋",
        "season_peak": "August",
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
        "id": "ngc6231",
        "name": "NGC 6231",
        "type": "Open Cluster",
        "ra_h": 16, "ra_m": 54, "ra_s": 12,
        "dec_d": -41, "dec_m": 49, "dec_s": 30,
        "magnitude": 2.6,
        "difficulty": "easy",
        "bortle_min": 3,
        "eyepiece_rec": "25mm — packed bright cluster",
        "description": "The 'Northern Jewel Box' — a stunning, compact open cluster at the base of the scorpion's tail. Very bright and concentrated. Part of the Sco OB1 association. Note: at -41° it's very low from Columbus, best in July at peak altitude.",
        "emoji": "💎",
        "season_peak": "July",
        "horizon_note": "⚠️ Very low (~8° max from Columbus) — needs clear southern horizon",
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
    },
    {
        "id": "nu_sco",
        "name": "Nu Scorpii (Jabbah)",
        "type": "Multiple Star System",
        "ra_h": 16, "ra_m": 11, "ra_s": 59.7,
        "dec_d": -19, "dec_m": 27, "dec_s": 38,
        "magnitude": 4.0,
        "difficulty": "moderate",
        "bortle_min": 1,
        "eyepiece_rec": "10mm first, then try 6mm for split",
        "description": "A quadruple (4-star) system! At low power it appears double, but increase magnification to split the close pair. A fun challenge and a gorgeous sight — 4 suns in one system.",
        "emoji": "🌟",
        "season_peak": "July",
    },
    {
        "id": "ngc6144",
        "name": "NGC 6144",
        "type": "Globular Cluster",
        "ra_h": 16, "ra_m": 27, "ra_s": 13.8,
        "dec_d": -26, "dec_m": 1, "dec_s": 29,
        "magnitude": 9.0,
        "difficulty": "moderate",
        "bortle_min": 6,
        "eyepiece_rec": "10mm — look 0.5° NW of Antares",
        "description": "A faint globular cluster just ½° northwest of Antares. Often overlooked because Antares glare washes it out. On dark nights (new moon), look for a faint fuzzy patch NW of Antares. Rewarding challenge for your 5-inch.",
        "emoji": "🌫️",
        "season_peak": "July",
        "horizon_note": "Requires new moon and best transparency",
    },
    {
        "id": "shaula_lesath",
        "name": "Shaula & Lesath (λ & υ Sco)",
        "type": "Naked Eye / Optical Pair",
        "ra_h": 17, "ra_m": 33, "ra_s": 36.5,
        "dec_d": -37, "dec_m": 6, "dec_s": 13,
        "magnitude": 1.62,
        "difficulty": "naked_eye",
        "bortle_min": 1,
        "eyepiece_rec": "Naked eye or binoculars",
        "description": "The 'Stinger' — the two bright stars at the tip of Scorpius's tail. Shaula is the 25th brightest star in the sky. Although they appear as a pair, they are not physically related — just a beautiful line-of-sight alignment.",
        "emoji": "🦂",
        "season_peak": "August",
        "horizon_note": "⚠️ Very low (~5-10°) from Columbus — needs crystal-clear southern horizon",
    },
]

# Nearby region — excellent Scorpius-area targets
NEARBY_TARGETS = [
    {
        "id": "rho_oph",
        "name": "Rho Ophiuchi Cloud Complex",
        "type": "Reflection/Emission Nebula",
        "ra_h": 16, "ra_m": 25, "ra_s": 35,
        "dec_d": -23, "dec_m": 26, "dec_s": 49,
        "magnitude": 5.0,
        "difficulty": "hard",
        "bortle_min": 8,
        "description": "One of the most colorful regions in the sky — orange Antares, blue nebula, red clouds. Visual detection requires very dark skies; best as astrophotography target.",
        "emoji": "🌈",
    },
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

# Telegram config (set via environment variables)
import os
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
