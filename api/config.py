"""
StarGazer Configuration
Columbus, OH — Celestron StarSense Explorer 5" DX
South-facing 3rd floor porch
"""

import os

# Observer location
LATITUDE = float(os.getenv("OBSERVER_LAT", "39.9612"))   # Default to general Columbus, OH
LONGITUDE = float(os.getenv("OBSERVER_LON", "-82.9988"))
ELEVATION_M = int(os.getenv("OBSERVER_ELEVATION_M", "240"))   # meters above sea level
TIMEZONE = os.getenv("OBSERVER_TIMEZONE", "America/New_York")

# Network
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8181")

# AI Seeing Analysis — Qwen3.5-9B on ROCm (10.27.27.145)
AI_API_URL  = os.getenv("AI_API_URL",   "http://10.27.27.145:8083/v1/chat/completions")
AI_API_KEY  = os.getenv("AI_API_KEY",   "")          # no auth required on local inference server
AI_MODEL    = os.getenv("AI_MODEL",     "qwen-9b")
AI_TIMEOUT  = int(os.getenv("AI_TIMEOUT", "15"))     # seconds — fall back to rule-based on timeout


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
OTHER_TARGETS = [
    {'id': 'm42', 'name': 'Orion Nebula (M42)', 'type': 'Emission Nebula', 'ra_h': 5, 'ra_m': 35, 'ra_s': 17, 'dec_d': -5, 'dec_m': 23, 'dec_s': 28, 'magnitude': 4.0, 'constellation': 'Ori', 'difficulty': 'naked_eye', 'emoji': '🌌', 'description': 'The Great Orion Nebula. The brightest and most famous star-forming region, easily visible to the naked eye. In a 5-inch scope, the Trapezium cluster is obvious.'},
    {'id': 'betelgeuse', 'name': 'Betelgeuse (α Ori)', 'type': 'Red Supergiant', 'ra_h': 5, 'ra_m': 55, 'ra_s': 10, 'dec_d': 7, 'dec_m': 24, 'dec_s': 25, 'magnitude': 0.5, 'constellation': 'Ori', 'difficulty': 'naked_eye', 'emoji': '🔴', 'description': "The bright red supergiant marking Orion's right shoulder. A variable star nearing the end of its life."},
    {'id': 'rigel', 'name': 'Rigel (β Ori)', 'type': 'Blue Supergiant', 'ra_h': 5, 'ra_m': 14, 'ra_s': 32, 'dec_d': -8, 'dec_m': 12, 'dec_s': 5, 'magnitude': 0.13, 'constellation': 'Ori', 'difficulty': 'naked_eye', 'emoji': '🔵', 'description': "The brilliant blue supergiant marking Orion's left foot. The brightest star in the constellation."},
    {'id': 'm81', 'name': "Bode's Galaxy (M81)", 'type': 'Spiral Galaxy', 'ra_h': 9, 'ra_m': 55, 'ra_s': 33, 'dec_d': 69, 'dec_m': 3, 'dec_s': 55, 'magnitude': 6.9, 'constellation': 'UMa', 'difficulty': 'moderate', 'emoji': '🛸', 'description': 'A stunning, bright spiral galaxy in Ursa Major. It often fits in the same low-power eyepiece field as the nearby Cigar Galaxy (M82).'},
    {'id': 'm82', 'name': 'Cigar Galaxy (M82)', 'type': 'Starburst Galaxy', 'ra_h': 9, 'ra_m': 55, 'ra_s': 52, 'dec_d': 69, 'dec_m': 40, 'dec_s': 46, 'magnitude': 8.4, 'constellation': 'UMa', 'difficulty': 'moderate', 'emoji': '🚀', 'description': 'A starburst galaxy with a distinct edge-on, cigar-like shape. Very active region of star formation.'},
    {'id': 'dubhe', 'name': 'Dubhe (α UMa)', 'type': 'Star', 'ra_h': 11, 'ra_m': 3, 'ra_s': 43, 'dec_d': 61, 'dec_m': 45, 'dec_s': 3, 'magnitude': 1.79, 'constellation': 'UMa', 'difficulty': 'naked_eye', 'emoji': '⭐', 'description': 'The upper pointer star in the Big Dipper that points directly to the North Star (Polaris).'},
    {'id': 'm52', 'name': 'M52 (NGC 7654)', 'type': 'Open Cluster', 'ra_h': 23, 'ra_m': 24, 'ra_s': 48, 'dec_d': 61, 'dec_m': 35, 'dec_s': 36, 'magnitude': 6.9, 'constellation': 'Cas', 'difficulty': 'easy', 'emoji': '✨', 'description': 'A rich, compressed open cluster resembling a scattered pile of salt on a black tablecloth.'},
    {'id': 'ngc457', 'name': 'Owl Cluster (NGC 457)', 'type': 'Open Cluster', 'ra_h': 1, 'ra_m': 19, 'ra_s': 35, 'dec_d': 58, 'dec_m': 17, 'dec_s': 12, 'magnitude': 6.4, 'constellation': 'Cas', 'difficulty': 'easy', 'emoji': '🦉', 'description': "Also known as the ET Cluster. Its two brightest stars form 'eyes' with chains of stars forming outstretched wings."},
    {'id': 'albireo', 'name': 'Albireo (β Cyg)', 'type': 'Double Star', 'ra_h': 19, 'ra_m': 30, 'ra_s': 43, 'dec_d': 27, 'dec_m': 57, 'dec_s': 34, 'magnitude': 3.1, 'constellation': 'Cyg', 'difficulty': 'easy', 'emoji': '🔵🟡', 'description': 'Arguably the most beautiful double star in the sky! A striking gold and sapphire-blue pair easily split at low power.'},
    {'id': 'ngc7000', 'name': 'North America Nebula', 'type': 'Emission Nebula', 'ra_h': 20, 'ra_m': 59, 'ra_s': 17, 'dec_d': 44, 'dec_m': 31, 'dec_s': 53, 'magnitude': 4.0, 'constellation': 'Cyg', 'difficulty': 'hard', 'emoji': '🌌', 'description': 'Huge, faint nebula shaped like the North American continent. Requires extremely dark skies and a wide-field view to appreciate.'},
    {'id': 'jewel_box', 'name': 'Jewel Box (NGC 4755)', 'type': 'Open Cluster', 'ra_h': 12, 'ra_m': 53, 'ra_s': 36, 'dec_d': -60, 'dec_m': 22, 'dec_s': 0, 'magnitude': 4.2, 'constellation': 'Cru', 'difficulty': 'easy', 'emoji': '💎', 'description': 'One of the youngest and most stunning open clusters. Features a brilliant mix of blue and orange supergiants.'},
    {'id': 'acrux', 'name': 'Acrux (α Cru)', 'type': 'Multiple Star', 'ra_h': 12, 'ra_m': 26, 'ra_s': 35, 'dec_d': -63, 'dec_m': 5, 'dec_s': 56, 'magnitude': 0.77, 'constellation': 'Cru', 'difficulty': 'easy', 'emoji': '⭐', 'description': 'The brilliant primary star of the Southern Cross. It is actually a visually split triple star system.'},
    {'id': 'sirius', 'name': 'Sirius (α CMa)', 'type': 'Star', 'ra_h': 6, 'ra_m': 45, 'ra_s': 8, 'dec_d': -16, 'dec_m': 42, 'dec_s': 58, 'magnitude': -1.46, 'constellation': 'CMa', 'difficulty': 'naked_eye', 'emoji': '💎', 'description': 'The brightest star in the night sky! Its extreme brightness often causes atmospheric twinkling in a rainbow of colors.'},
    {'id': 'm41', 'name': 'M41 (NGC 2287)', 'type': 'Open Cluster', 'ra_h': 6, 'ra_m': 45, 'ra_s': 59, 'dec_d': -20, 'dec_m': 45, 'dec_s': 15, 'magnitude': 4.5, 'constellation': 'CMa', 'difficulty': 'easy', 'emoji': '✨', 'description': 'A large, bright open cluster easily visible in binoculars. Features a reddish star near its center.'},
    {'id': 'omega_cen', 'name': 'Omega Centauri (NGC 5139)', 'type': 'Globular Cluster', 'ra_h': 13, 'ra_m': 26, 'ra_s': 47, 'dec_d': -47, 'dec_m': 28, 'dec_s': 46, 'magnitude': 3.9, 'constellation': 'Cen', 'difficulty': 'naked_eye', 'emoji': '🎆', 'description': 'The largest and brightest globular cluster in the sky, containing 10 million stars! Appears as a fuzzy ball to the naked eye.'},
    {'id': 'cen_a', 'name': 'Centaurus A (NGC 5128)', 'type': 'Galaxy', 'ra_h': 13, 'ra_m': 25, 'ra_s': 27, 'dec_d': -43, 'dec_m': 1, 'dec_s': 8, 'magnitude': 6.8, 'constellation': 'Cen', 'difficulty': 'moderate', 'emoji': '🍔', 'description': 'A massive peculiar galaxy bisected by a thick, dark dust lane. One of the strongest radio sources in the sky.'},
    {'id': 'mesarthim', 'name': 'Mesarthim (γ Ari)', 'type': 'Double Star', 'ra_h': 1, 'ra_m': 53, 'ra_s': 31, 'dec_d': 19, 'dec_m': 17, 'dec_s': 38, 'magnitude': 3.88, 'constellation': 'Ari', 'difficulty': 'easy', 'emoji': '🔵🔵', 'description': 'A perfect, easily split double star consisting of two identical white stars. One of the first double stars discovered.'},
    {'id': 'hamal', 'name': 'Hamal (α Ari)', 'type': 'Star', 'ra_h': 2, 'ra_m': 7, 'ra_s': 10, 'dec_d': 23, 'dec_m': 27, 'dec_s': 44, 'magnitude': 2.0, 'constellation': 'Ari', 'difficulty': 'naked_eye', 'emoji': '⭐', 'description': 'The brightest star in Aries. An orange giant located 66 light-years away.'},
    {'id': 'pleiades', 'name': 'Pleiades (M45)', 'type': 'Open Cluster', 'ra_h': 3, 'ra_m': 47, 'ra_s': 24, 'dec_d': 24, 'dec_m': 7, 'dec_s': 0, 'magnitude': 1.6, 'constellation': 'Tau', 'difficulty': 'naked_eye', 'emoji': '💠', 'description': 'The Seven Sisters! The most spectacular naked-eye star cluster. Use low magnification to fit its icy blue stars in the field of view.'},
    {'id': 'aldebaran', 'name': 'Aldebaran (α Tau)', 'type': 'Red Giant', 'ra_h': 4, 'ra_m': 35, 'ra_s': 55, 'dec_d': 16, 'dec_m': 30, 'dec_s': 33, 'magnitude': 0.85, 'constellation': 'Tau', 'difficulty': 'naked_eye', 'emoji': '🔴', 'description': "The fiery 'eye' of the Bull. A prominent orange giant that appears to be part of the Hyades cluster, but is actually much closer to Earth."},
    {'id': 'm1', 'name': 'Crab Nebula (M1)', 'type': 'Supernova Remnant', 'ra_h': 5, 'ra_m': 34, 'ra_s': 31, 'dec_d': 22, 'dec_m': 0, 'dec_s': 52, 'magnitude': 8.4, 'constellation': 'Tau', 'difficulty': 'hard', 'emoji': '🦀', 'description': 'The famous remnant of a supernova observed by Chinese astronomers in 1054 AD. Appears as a faint, fuzzy patch in a 5-inch scope.'},
    {'id': 'm35', 'name': 'M35 (NGC 2168)', 'type': 'Open Cluster', 'ra_h': 6, 'ra_m': 9, 'ra_s': 5, 'dec_d': 24, 'dec_m': 20, 'dec_s': 0, 'magnitude': 5.3, 'constellation': 'Gem', 'difficulty': 'easy', 'emoji': '✨', 'description': 'A large, rich open cluster. Right next to it, you can spot NGC 2158, a much more distant and compact cluster, providing a great 3D contrast.'},
    {'id': 'castor', 'name': 'Castor (α Gem)', 'type': 'Multiple Star', 'ra_h': 7, 'ra_m': 34, 'ra_s': 35, 'dec_d': 31, 'dec_m': 53, 'dec_s': 17, 'magnitude': 1.58, 'constellation': 'Gem', 'difficulty': 'moderate', 'emoji': '⭐', 'description': 'Appears as a single bright star to the eye, but a telescope easily splits it into a brilliant white double. Each of those is actually a spectroscopic binary, making it a 6-star system!'},
    {'id': 'm44', 'name': 'Beehive Cluster (M44)', 'type': 'Open Cluster', 'ra_h': 8, 'ra_m': 40, 'ra_s': 24, 'dec_d': 19, 'dec_m': 59, 'dec_s': 0, 'magnitude': 3.7, 'constellation': 'Cnc', 'difficulty': 'naked_eye', 'emoji': '🐝', 'description': 'A beautiful, sprawling open cluster visible to the naked eye as a fuzzy patch. Looks phenomenal at low magnifications, resembling a swarm of bees.'},
    {'id': 'regulus', 'name': 'Regulus (α Leo)', 'type': 'Multiple Star', 'ra_h': 10, 'ra_m': 8, 'ra_s': 22, 'dec_d': 11, 'dec_m': 58, 'dec_s': 1, 'magnitude': 1.36, 'constellation': 'Leo', 'difficulty': 'easy', 'emoji': '🦁', 'description': 'The bright heart of the Lion. It has a magnitude 8.1 companion that is easily visible in small telescopes.'},
    {'id': 'leo_triplet', 'name': 'Leo Triplet (M65/M66)', 'type': 'Galaxy Group', 'ra_h': 11, 'ra_m': 19, 'ra_s': 34, 'dec_d': 13, 'dec_m': 4, 'dec_s': 22, 'magnitude': 8.9, 'constellation': 'Leo', 'difficulty': 'hard', 'emoji': '🌌', 'description': 'A famous group of three spiral galaxies in the same field of view. M65 and M66 are brightest; NGC 3628 (the Hamburger Galaxy) is fainter and edge-on.'},
    {'id': 'spica', 'name': 'Spica (α Vir)', 'type': 'Star', 'ra_h': 13, 'ra_m': 25, 'ra_s': 11, 'dec_d': -11, 'dec_m': 9, 'dec_s': 40, 'magnitude': 0.98, 'constellation': 'Vir', 'difficulty': 'naked_eye', 'emoji': '🌾', 'description': 'A brilliant, extremely hot blue-white binary star system. It is one of the brightest stars in the night sky.'},
    {'id': 'm104', 'name': 'Sombrero Galaxy (M104)', 'type': 'Galaxy', 'ra_h': 12, 'ra_m': 39, 'ra_s': 59, 'dec_d': -11, 'dec_m': 37, 'dec_s': 22, 'magnitude': 8.0, 'constellation': 'Vir', 'difficulty': 'moderate', 'emoji': '🛸', 'description': 'A stunning, bright edge-on galaxy. In dark skies, a 5-inch scope can reveal the dark dust lane bisecting its glowing core.'},
    {'id': 'zubenelgenubi', 'name': 'Zubenelgenubi (α Lib)', 'type': 'Double Star', 'ra_h': 14, 'ra_m': 50, 'ra_s': 52, 'dec_d': -16, 'dec_m': 2, 'dec_s': 29, 'magnitude': 2.75, 'constellation': 'Lib', 'difficulty': 'easy', 'emoji': '⚖️', 'description': 'A wide, beautiful double star easily split in binoculars. One star is white and the other slightly yellowish.'},
    {'id': 'm8', 'name': 'Lagoon Nebula (M8)', 'type': 'Emission Nebula', 'ra_h': 18, 'ra_m': 3, 'ra_s': 37, 'dec_d': -24, 'dec_m': 23, 'dec_s': 12, 'magnitude': 6.0, 'constellation': 'Sgr', 'difficulty': 'easy', 'emoji': '🌌', 'description': "A huge, magnificent star-forming cloud. Easily seen in binoculars, it features a distinct dark 'lagoon' lane slicing through the bright gas."},
    {'id': 'm22', 'name': 'Sagittarius Cluster (M22)', 'type': 'Globular Cluster', 'ra_h': 18, 'ra_m': 36, 'ra_s': 23, 'dec_d': -23, 'dec_m': 54, 'dec_s': 17, 'magnitude': 5.1, 'constellation': 'Sgr', 'difficulty': 'easy', 'emoji': '🎆', 'description': 'One of the brightest and closest globular clusters to Earth. It actually appears larger than the famous Hercules Cluster!'},
    {'id': 'm20', 'name': 'Trifid Nebula (M20)', 'type': 'Nebula', 'ra_h': 18, 'ra_m': 2, 'ra_s': 23, 'dec_d': -23, 'dec_m': 1, 'dec_s': 48, 'magnitude': 6.3, 'constellation': 'Sgr', 'difficulty': 'moderate', 'emoji': '🌸', 'description': "A unique combination of an emission, reflection, and dark nebula. The dark dust lanes form a distinct three-lobed 'trifid' shape."},
    {'id': 'algedi', 'name': 'Algedi (α Cap)', 'type': 'Optical Double', 'ra_h': 20, 'ra_m': 18, 'ra_s': 3, 'dec_d': -12, 'dec_m': 32, 'dec_s': 41, 'magnitude': 3.58, 'constellation': 'Cap', 'difficulty': 'easy', 'emoji': '🐐', 'description': "A fascinating 'fake' double star. The two stars are actually hundreds of light-years apart but happen to line up perfectly. Both are true binaries themselves!"},
    {'id': 'm30', 'name': 'M30 (NGC 7099)', 'type': 'Globular Cluster', 'ra_h': 21, 'ra_m': 40, 'ra_s': 22, 'dec_d': -23, 'dec_m': 10, 'dec_s': 47, 'magnitude': 7.2, 'constellation': 'Cap', 'difficulty': 'moderate', 'emoji': '💫', 'description': "A dense globular cluster with a bright core. It features several distinct 'chains' of stars radiating outward from the center."},
    {'id': 'helix', 'name': 'Helix Nebula (NGC 7293)', 'type': 'Planetary Nebula', 'ra_h': 22, 'ra_m': 29, 'ra_s': 38, 'dec_d': -20, 'dec_m': 50, 'dec_s': 13, 'magnitude': 7.6, 'constellation': 'Aqr', 'difficulty': 'hard', 'emoji': '👁️', 'description': "Often called the 'Eye of God'. A huge, ghost-like planetary nebula. Requires very dark skies and low magnification to spot its massive ring structure."},
    {'id': 'm2', 'name': 'M2 (NGC 7089)', 'type': 'Globular Cluster', 'ra_h': 21, 'ra_m': 33, 'ra_s': 27, 'dec_d': 0, 'dec_m': 49, 'dec_s': 23, 'magnitude': 6.5, 'constellation': 'Aqr', 'difficulty': 'easy', 'emoji': '✨', 'description': 'A very compact and exceptionally bright globular cluster. Looks like a solid snowball of stars in small telescopes.'},
    {'id': 'alrescha', 'name': 'Alrescha (α Psc)', 'type': 'Double Star', 'ra_h': 2, 'ra_m': 2, 'ra_s': 2, 'dec_d': 2, 'dec_m': 45, 'dec_s': 49, 'magnitude': 3.82, 'constellation': 'Psc', 'difficulty': 'moderate', 'emoji': '🐟', 'description': "The 'knot' that ties the two celestial fishes together. It is a close double star consisting of two white A-type main-sequence stars."},
    {'id': 'm74', 'name': 'Phantom Galaxy (M74)', 'type': 'Spiral Galaxy', 'ra_h': 1, 'ra_m': 36, 'ra_s': 41, 'dec_d': 15, 'dec_m': 47, 'dec_s': 1, 'magnitude': 9.4, 'constellation': 'Psc', 'difficulty': 'hard', 'emoji': '👻', 'description': "A beautiful face-on spiral galaxy, but its surface brightness is extremely low. Hence its nickname: the 'Phantom Galaxy'. A tough challenge target."},
]

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
